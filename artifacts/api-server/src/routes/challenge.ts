import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { challengesTable, timeSlotsTable, challengeEventsTable, settingsTable } from "@workspace/db/schema";
import { desc, eq, gt } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const MAX_FAILURES = 3;
const STALE_HEARTBEAT_HOURS = 4;

// ── SSE client registry ──────────────────────────────────────────────────────
const sseClients = new Set<Response>();

function broadcastEvent(event: {
  id: number;
  type: string;
  nickname: string;
  tier: string;
  tierName: string;
  createdAt: string;
}) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try { client.write(data); } catch { sseClients.delete(client); }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function isSunday() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDay() === 0;
}

function todayDateString() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isHeartbeatStale(lastHeartbeat: Date | null): boolean {
  if (!lastHeartbeat) return true;
  const diffMs = Date.now() - new Date(lastHeartbeat).getTime();
  return diffMs / (1000 * 60 * 60) > STALE_HEARTBEAT_HOURS;
}

async function isCurrentlyInLockedSlot(): Promise<boolean> {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dow = kstNow.getUTCDay();
  const currentIndex = Math.floor((kstNow.getUTCHours() * 60 + kstNow.getUTCMinutes()) / 10);
  const slots = await db
    .select()
    .from(timeSlotsTable)
    .where(eq(timeSlotsTable.dayOfWeek, dow));
  return slots.find((s) => s.index === currentIndex)?.isLocked ?? false;
}

async function getNickname(): Promise<string> {
  const rows = await db.select().from(settingsTable).limit(1);
  return rows[0]?.nickname ?? "디톡서";
}

async function insertEvent(type: string, nickname: string, tier: string, tierName: string) {
  const [ev] = await db
    .insert(challengeEventsTable)
    .values({ type, nickname, tier, tierName })
    .returning();
  if (ev) {
    broadcastEvent({
      id: ev.id,
      type: ev.type,
      nickname: ev.nickname,
      tier: ev.tier,
      tierName: ev.tierName,
      createdAt: ev.createdAt?.toISOString() ?? new Date().toISOString(),
    });
  }
}

// feeRate: 플랫폼 수수료 비율 (나머지가 생존자에게 배분)
// maxDailyHours: 하루 최대 스마트폰 사용 가능 시간 (참여자가 이 범위 내에서 설정)
const TIER_CONFIG = {
  beginner:  { name: "입문자", amount: 5000,   participants: 1234, survivors: 1102, feeRate: 0.30, maxDailyHours: 10 },
  motivated: { name: "실천자", amount: 10000,  participants: 672,  survivors: 581,  feeRate: 0.25, maxDailyHours: 8  },
  focused:   { name: "집중자", amount: 50000,  participants: 347,  survivors: 289,  feeRate: 0.15, maxDailyHours: 4  },
  hardcore:  { name: "독종",   amount: 100000, participants: 89,   survivors: 71,   feeRate: 0.05, maxDailyHours: 1  },
};

function formatChallenge(c: typeof challengesTable.$inferSelect) {
  const config = TIER_CONFIG[c.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.focused;
  const startDate = c.startDate ? new Date(c.startDate) : new Date();
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = Math.min(daysDiff + 1, c.totalDays);
  const totalPool = config.survivors * c.depositAmount;
  const survivorShare = 1 - config.feeRate;
  const potentialReward = Math.floor((totalPool * survivorShare) / config.survivors);

  return {
    id: c.id,
    tier: c.tier,
    tierName: c.tierName,
    depositAmount: c.depositAmount,
    currentDay,
    totalDays: c.totalDays,
    successDays: c.successDays,
    failedDays: c.failedDays,
    maxFailures: MAX_FAILURES,
    totalParticipants: c.totalParticipants || config.participants,
    currentSurvivors: c.currentSurvivors || config.survivors,
    totalPool,
    potentialReward,
    feeRate: config.feeRate,
    maxDailyHours: config.maxDailyHours,
    dailyLimitHours: c.dailyLimitHours,
    isActive: c.isActive,
    eliminatedReason: c.eliminatedReason ?? null,
    startDate: startDate.toISOString(),
    endDate: c.endDate ? new Date(c.endDate).toISOString() : null,
    lastHeartbeat: c.lastHeartbeat ? new Date(c.lastHeartbeat).toISOString() : null,
  };
}

// ── GET /challenge ────────────────────────────────────────────────────────────
router.get("/challenge", async (_req, res) => {
  try {
    const challenges = await db
      .select()
      .from(challengesTable)
      .orderBy(desc(challengesTable.id))
      .limit(1);

    if (challenges.length === 0) {
      res.json({
        tier: "none",
        tierName: "미참여",
        depositAmount: 0,
        totalDays: 30,
        maxFailures: MAX_FAILURES,
        isActive: false,
        eliminatedReason: null,
      });
      return;
    }

    res.json(formatChallenge(challenges[0]));
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to fetch challenge" });
  }
});

// ── POST /challenge — 참가 ────────────────────────────────────────────────────
router.post("/challenge", async (req, res) => {
  if (!isSunday()) {
    res.status(403).json({
      error: "settings_locked",
      message: "챌린지 참가는 일요일에만 가능합니다",
    });
    return;
  }

  try {
    const body = z.object({
      tier: z.string(),
      dailyLimitHours: z.number().int().min(1).max(24).optional(),
    }).parse(req.body);
    const config = TIER_CONFIG[body.tier as keyof typeof TIER_CONFIG];
    if (!config) {
      res.status(400).json({ error: "invalid_tier", message: "유효하지 않은 티어입니다" });
      return;
    }

    // dailyLimitHours: 사용자 지정값(있으면) 또는 티어 기본값, 단 티어 최대값 초과 불가
    const dailyLimitHours = Math.min(
      body.dailyLimitHours ?? config.maxDailyHours,
      config.maxDailyHours
    );

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const [challenge] = await db
      .insert(challengesTable)
      .values({
        tier: body.tier,
        tierName: config.name,
        depositAmount: config.amount,
        totalDays: 30,
        totalParticipants: config.participants,
        currentSurvivors: config.survivors,
        isActive: true,
        endDate,
        lastHeartbeat: new Date(),
        lastEvaluatedDate: todayDateString(),
        dailyLimitHours,
      })
      .returning();

    // 이벤트 기록 & 브로드캐스트
    const nickname = await getNickname();
    await insertEvent("joined", nickname, body.tier, config.name);

    res.json(formatChallenge(challenge));
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to join challenge" });
  }
});

// ── POST /challenge/quit — 포기 ───────────────────────────────────────────────
router.post("/challenge/quit", async (_req, res) => {
  try {
    const challenges = await db
      .select()
      .from(challengesTable)
      .orderBy(desc(challengesTable.id))
      .limit(1);

    if (challenges.length === 0 || !challenges[0].isActive) {
      res.status(400).json({ error: "no_active_challenge", message: "활성 챌린지가 없습니다" });
      return;
    }

    const challenge = challenges[0];

    await db
      .update(challengesTable)
      .set({ isActive: false, eliminatedReason: "quit" })
      .where(eq(challengesTable.id, challenge.id));

    // 이벤트 기록 & 브로드캐스트
    const nickname = await getNickname();
    await insertEvent("quit", nickname, challenge.tier, challenge.tierName);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to quit challenge" });
  }
});

// ── GET /challenge/events — SSE (웹 실시간) ───────────────────────────────────
router.get("/challenge/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // 연결 확인용 ping
  res.write(": ping\n\n");

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// ── GET /challenge/events/recent — 폴링 (모바일) ─────────────────────────────
router.get("/challenge/events/recent", async (req, res) => {
  try {
    const sinceParam = req.query.since as string | undefined;
    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60 * 1000);

    const events = await db
      .select()
      .from(challengeEventsTable)
      .where(gt(challengeEventsTable.createdAt, since))
      .orderBy(desc(challengeEventsTable.createdAt))
      .limit(20);

    res.json(
      events.map((e) => ({
        id: e.id,
        type: e.type,
        nickname: e.nickname,
        tier: e.tier,
        tierName: e.tierName,
        createdAt: e.createdAt?.toISOString() ?? new Date().toISOString(),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to fetch events" });
  }
});

// ── GET /challenge/stats — 티어별 통계 ────────────────────────────────────────
router.get("/challenge/stats", async (_req, res) => {
  try {
    const all = await db.select().from(challengesTable);
    const tiers = ["beginner", "motivated", "focused", "hardcore"] as const;

    const stats = tiers.map((tier) => {
      const group = all.filter((c) => c.tier === tier);
      return {
        tier,
        total: group.length,
        active: group.filter((c) => c.isActive).length,
        completed: group.filter((c) => !c.isActive && !c.eliminatedReason).length,
      };
    });

    const totalActive = all.filter((c) => c.isActive).length;
    const grandTotal = all.length;

    res.json({ tiers: stats, totalActive, grandTotal });
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to fetch stats" });
  }
});

// ── POST /challenge/heartbeat ─────────────────────────────────────────────────
router.post("/challenge/heartbeat", async (req, res) => {
  try {
    const body = z.object({ compliant: z.boolean().optional() }).parse(req.body);
    const compliant = body.compliant ?? true;

    const challenges = await db
      .select()
      .from(challengesTable)
      .orderBy(desc(challengesTable.id))
      .limit(1);

    if (challenges.length === 0) {
      res.json({ ok: true, eliminated: false, eliminatedReason: null, timestamp: new Date().toISOString() });
      return;
    }

    if (!challenges[0].isActive) {
      res.json({
        ok: true,
        eliminated: true,
        eliminatedReason: challenges[0].eliminatedReason ?? null,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const challenge = challenges[0];
    const today = todayDateString();

    const updates: Record<string, unknown> = {
      lastHeartbeat: new Date(),
    };

    let eliminated = false;
    let eliminatedReason: string | null = null;

    if (challenge.lastEvaluatedDate !== today) {
      if (!compliant) {
        const newFailedDays = challenge.failedDays + 1;
        updates.failedDays = newFailedDays;
        updates.lastEvaluatedDate = today;

        if (newFailedDays >= MAX_FAILURES) {
          updates.isActive = false;
          updates.eliminatedReason = "failed_days";
          eliminated = true;
          eliminatedReason = "failed_days";

          // 탈락 이벤트 기록
          const nickname = await getNickname();
          await insertEvent("eliminated", nickname, challenge.tier, challenge.tierName);
        }
      } else {
        updates.successDays = challenge.successDays + 1;
        updates.lastEvaluatedDate = today;
      }
    }

    await db
      .update(challengesTable)
      .set(updates)
      .where(eq(challengesTable.id, challenge.id));

    res.json({
      ok: true,
      eliminated,
      eliminatedReason,
      failedDays: (updates.failedDays as number) ?? challenge.failedDays,
      successDays: (updates.successDays as number) ?? challenge.successDays,
      maxFailures: MAX_FAILURES,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to process heartbeat" });
  }
});

// ── 앱 삭제 감지 (대시보드 로드 시 호출) ─────────────────────────────────────
export async function checkAppDeletionAndEliminateIfNeeded(): Promise<void> {
  const challenges = await db
    .select()
    .from(challengesTable)
    .orderBy(desc(challengesTable.id))
    .limit(1);

  if (challenges.length === 0 || !challenges[0].isActive) return;

  const challenge = challenges[0];
  const today = todayDateString();

  if (challenge.lastEvaluatedDate === today) return;

  const stale = isHeartbeatStale(challenge.lastHeartbeat);
  const inLock = await isCurrentlyInLockedSlot();

  if (stale && inLock) {
    const newFailedDays = challenge.failedDays + 1;
    const isEliminated = newFailedDays >= MAX_FAILURES;

    await db
      .update(challengesTable)
      .set({
        failedDays: newFailedDays,
        lastEvaluatedDate: today,
        isActive: isEliminated ? false : challenge.isActive,
        eliminatedReason: isEliminated ? "app_deleted" : null,
      })
      .where(eq(challengesTable.id, challenge.id));

    if (isEliminated) {
      const nickname = await getNickname();
      await insertEvent("eliminated", nickname, challenge.tier, challenge.tierName);
    }
  }
}

export default router;
