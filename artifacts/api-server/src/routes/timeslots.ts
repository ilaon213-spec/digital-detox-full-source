import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { timeSlotsTable, settingsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDayOfWeekKST } from "../utils/kst";

const router: IRouter = Router();

// 144 slots = 24 hours × 6 (10-minute intervals)
const TOTAL_SLOTS = 144;

function todayDayOfWeek() {
  return getDayOfWeekKST();
}

function generateDefaultSlotsForDay(dayOfWeek: number) {
  const slots = [];
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const totalMinutes = i * 10;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    // Weekday: lock sleep 00:00-08:00 (i<48) and work 09:00-18:00 (i>=54, i<108)
    // Weekend: lock only sleep 00:00-08:00 (i<48)
    const isLocked = isWeekend
      ? i < 48
      : i < 48 || (i >= 54 && i < 108);
    slots.push({ index: i, dayOfWeek, time, isLocked });
  }
  return slots;
}

async function getSettings() {
  let rows = await db.select().from(settingsTable).limit(1);
  if (rows.length === 0) {
    const [inserted] = await db
      .insert(settingsTable)
      .values({ nickname: "디톡서", notificationsEnabled: true, lockReminderEnabled: true, challengeAlertEnabled: true })
      .returning();
    rows = [inserted];
  }
  return rows[0];
}

router.get("/timeslots", async (req, res) => {
  try {
    const day = req.query.day !== undefined
      ? parseInt(req.query.day as string)
      : todayDayOfWeek();

    const validDay = Math.max(0, Math.min(6, isNaN(day) ? todayDayOfWeek() : day));

    let slots = await db
      .select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.dayOfWeek, validDay))
      .orderBy(timeSlotsTable.index);

    if (slots.length !== TOTAL_SLOTS) {
      const existingIndices = new Set(slots.map((s) => s.index));
      const defaults = generateDefaultSlotsForDay(validDay);
      const missing = defaults.filter((d) => !existingIndices.has(d.index));
      if (missing.length > 0) {
        const inserted = await db.insert(timeSlotsTable).values(missing).returning();
        slots = [...slots, ...inserted].sort((a, b) => a.index - b.index);
      }
    }

    res.json(slots.map((s) => ({
      index: s.index,
      time: s.time,
      isLocked: s.isLocked,
      dayOfWeek: s.dayOfWeek,
    })));
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to fetch time slots" });
  }
});

router.put("/timeslots", async (req, res) => {
  try {
    const settings = await getSettings();
    const today = getDayOfWeekKST();
    const isSunday = today === 0;

    // Allow if: initial setup (not yet configured) OR it's Sunday
    if (settings.timeslotsConfigured && !isSunday) {
      res.status(403).json({
        error: "settings_locked",
        message: "타임슬롯은 일요일에만 변경 가능합니다",
      });
      return;
    }

    const body = z.object({
      day: z.number().int().min(0).max(6),
      slots: z.array(z.object({ index: z.number().int(), isLocked: z.boolean() })),
    }).parse(req.body);

    const targetDay = body.day;

    // Ensure all 144 rows exist before updating (upsert-like safety)
    const existingSlots = await db
      .select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.dayOfWeek, targetDay));

    if (existingSlots.length < TOTAL_SLOTS) {
      const existingIndices = new Set(existingSlots.map((s) => s.index));
      const defaults = generateDefaultSlotsForDay(targetDay);
      const missing = defaults.filter((d) => !existingIndices.has(d.index));
      if (missing.length > 0) {
        await db.insert(timeSlotsTable).values(missing);
      }
    }

    // Apply all slot updates in a single transaction (144 individual updates → 1 tx)
    const updatedAt = new Date();
    await db.transaction(async (tx) => {
      for (const slot of body.slots) {
        await tx
          .update(timeSlotsTable)
          .set({ isLocked: slot.isLocked, updatedAt })
          .where(
            and(
              eq(timeSlotsTable.index, slot.index),
              eq(timeSlotsTable.dayOfWeek, targetDay)
            )
          );
      }
    });

    // 첫 일요일 저장 시에만 timeslotsConfigured = true로 설정
    // → 초기 설정 시 여러 요일을 자유롭게 저장할 수 있음
    // → 첫 일요일 저장 이후부터만 일요일 전용 잠금 적용
    if (!settings.timeslotsConfigured && isSunday) {
      await db.update(settingsTable).set({ timeslotsConfigured: true });
    }

    const updated = await db
      .select()
      .from(timeSlotsTable)
      .where(eq(timeSlotsTable.dayOfWeek, targetDay))
      .orderBy(timeSlotsTable.index);

    res.json(updated.map((s) => ({
      index: s.index,
      time: s.time,
      isLocked: s.isLocked,
      dayOfWeek: s.dayOfWeek,
    })));
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to update time slots" });
  }
});

export default router;
