import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/settings", async (_req, res) => {
  try {
    let settings = await db.select().from(settingsTable).limit(1);
    if (settings.length === 0) {
      const [inserted] = await db
        .insert(settingsTable)
        .values({ nickname: "디톡서", notificationsEnabled: true, lockReminderEnabled: true, challengeAlertEnabled: true })
        .returning();
      settings = [inserted];
    }
    const s = settings[0];
    res.json({
      nickname: s.nickname,
      notificationsEnabled: s.notificationsEnabled,
      lockReminderEnabled: s.lockReminderEnabled,
      challengeAlertEnabled: s.challengeAlertEnabled,
      pushPermissionGranted: s.pushPermissionGranted,
      deviceType: s.deviceType,
      timeslotsConfigured: s.timeslotsConfigured,
      appsConfigured: s.appsConfigured,
    });
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to fetch settings" });
  }
});

// timeslotsConfigured 리셋 — 배포 후 한 번만 호출하면 됨
router.post("/settings/reset-timeslots-config", async (_req, res) => {
  try {
    let existing = await db.select().from(settingsTable).limit(1);
    if (existing.length === 0) {
      const [inserted] = await db.insert(settingsTable).values({ nickname: "디톡서", notificationsEnabled: true, lockReminderEnabled: true, challengeAlertEnabled: true }).returning();
      existing = [inserted];
    } else {
      await db.update(settingsTable).set({ timeslotsConfigured: false });
      existing = await db.select().from(settingsTable).limit(1);
    }
    res.json({ ok: true, timeslotsConfigured: existing[0].timeslotsConfigured });
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to reset" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const body = UpdateSettingsBody.parse(req.body);
    let existing = await db.select().from(settingsTable).limit(1);

    if (existing.length === 0) {
      const [inserted] = await db.insert(settingsTable).values(body).returning();
      existing = [inserted];
    } else {
      await db.update(settingsTable).set(body);
      existing = await db.select().from(settingsTable).limit(1);
    }

    const s = existing[0];
    res.json({
      nickname: s.nickname,
      notificationsEnabled: s.notificationsEnabled,
      lockReminderEnabled: s.lockReminderEnabled,
      challengeAlertEnabled: s.challengeAlertEnabled,
      pushPermissionGranted: s.pushPermissionGranted,
      deviceType: s.deviceType,
      timeslotsConfigured: s.timeslotsConfigured,
      appsConfigured: s.appsConfigured,
    });
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to update settings" });
  }
});

export default router;
