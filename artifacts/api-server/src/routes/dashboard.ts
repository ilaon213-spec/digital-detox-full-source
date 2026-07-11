import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { timeSlotsTable, challengesTable, focusSessionsTable } from "@workspace/db/schema";
import { desc, eq, and, gte } from "drizzle-orm";
import { checkAppDeletionAndEliminateIfNeeded } from "./challenge";

const router: IRouter = Router();

const TIER_CONFIG = {
  beginner:  { participants: 1234, survivors: 1102, feeRate: 0.30 },
  motivated: { participants: 672,  survivors: 581,  feeRate: 0.25 },
  focused:   { participants: 347,  survivors: 289,  feeRate: 0.15 },
  hardcore:  { participants: 89,   survivors: 71,   feeRate: 0.05 },
};

const TOTAL_SLOTS = 144;

function generateDefaultSlotsForDay(dayOfWeek: number) {
  const slots = [];
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const totalMinutes = i * 10;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isLocked = isWeekend ? i < 48 : i < 48 || (i >= 54 && i < 108);
    slots.push({ index: i, dayOfWeek, time, isLocked });
  }
  return slots;
}

router.get("/dashboard", async (_req, res) => {
  try {
    await checkAppDeletionAndEliminateIfNeeded().catch(() => {});

    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayDow = kstNow.getUTCDay(); // 0=Sun, 1=Mon...6=Sat (KST)

    let slots = await db
      .select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.dayOfWeek, todayDow))
      .orderBy(timeSlotsTable.index);

    // Auto-create today's default slots if missing — ensures isLocked is never
    // falsely false just because the user hasn't opened the timeslots tab yet
    if (slots.length < TOTAL_SLOTS) {
      const existingIndices = new Set(slots.map((s) => s.index));
      const defaults = generateDefaultSlotsForDay(todayDow);
      const missing = defaults.filter((d) => !existingIndices.has(d.index));
      if (missing.length > 0) {
        await db.insert(timeSlotsTable).values(missing).catch(() => {});
        slots = await db
          .select()
          .from(timeSlotsTable)
          .where(eq(timeSlotsTable.dayOfWeek, todayDow))
          .orderBy(timeSlotsTable.index);
      }
    }

    const currentMinutes = kstNow.getUTCHours() * 60 + kstNow.getUTCMinutes();
    const currentIndex = Math.floor(currentMinutes / 10); // 10-min slots
    const currentSlot = slots.find((s) => s.index === currentIndex);
    const isLocked = currentSlot?.isLocked ?? false;

    const challenges = await db
      .select()
      .from(challengesTable)
      .orderBy(desc(challengesTable.id))
      .limit(1);

    let challengeData = null;
    if (challenges.length > 0) {
      const c = challenges[0];
      const config = TIER_CONFIG[c.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.focused;
      const startDate = c.startDate ? new Date(c.startDate) : kstNow;
      const daysDiff = Math.floor((kstNow.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDay = Math.min(daysDiff + 1, c.totalDays);
      const totalPool = config.survivors * c.depositAmount;
      const survivorShare = 1 - (config.feeRate ?? 0.15);
      const potentialReward = Math.floor((totalPool * survivorShare) / config.survivors);

      challengeData = {
        id: c.id,
        tier: c.tier,
        tierName: c.tierName,
        depositAmount: c.depositAmount,
        currentDay,
        totalDays: c.totalDays,
        successDays: c.successDays,
        failedDays: c.failedDays,
        totalParticipants: c.totalParticipants || config.participants,
        currentSurvivors: c.currentSurvivors || config.survivors,
        totalPool,
        potentialReward,
        isActive: c.isActive,
        startDate: startDate.toISOString(),
      };
    }

    const today = kstNow.toISOString().split("T")[0];
    const todaySessions = await db
      .select()
      .from(focusSessionsTable)
      .where(gte(focusSessionsTable.startedAt, new Date(today)));

    const todayFocusMinutes = todaySessions
      .filter((s) => s.isCompleted)
      .reduce((sum, s) => sum + s.completedMinutes, 0);

    const lockedCount = slots.filter((s) => s.isLocked).length;
    const totalSlots = slots.length || 144; // BUG 6 FIX: 96 → 144 (24h × 6 slots)
    const todayComplianceRate = totalSlots > 0 ? Math.round((lockedCount / totalSlots) * 100) : 0;

    const weeklyFocusMinutes = [120, 90, 145, 80, 200, 60, todayFocusMinutes];

    res.json({
      isLocked,
      todayDow,
      currentStreak: 12,
      todayComplianceRate,
      totalDays: 28,
      challenge: challengeData,
      timeSlots: slots.map((s) => ({ index: s.index, time: s.time, isLocked: s.isLocked })),
      todayFocusMinutes,
      weeklyFocusMinutes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "server_error", message: "Failed to fetch dashboard" });
  }
});

export default router;
