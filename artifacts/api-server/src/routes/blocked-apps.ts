import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { appsTable, settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

function isSundayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDay() === 0;
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

router.get("/blocked-apps", async (_req, res) => {
  try {
    const apps = await db.select().from(appsTable).orderBy(appsTable.id);
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to fetch apps" });
  }
});

router.post("/blocked-apps", async (req, res) => {
  try {
    const body = z.object({
      packageName: z.string(),
      name: z.string(),
      category: z.string().optional(),
    }).parse(req.body);

    const existing = await db.select().from(appsTable).where(eq(appsTable.packageName, body.packageName));
    if (existing.length > 0) {
      const updated = await db
        .update(appsTable)
        .set({ blocked: true })
        .where(eq(appsTable.packageName, body.packageName))
        .returning();
      res.json(updated[0]);
      return;
    }

    const [inserted] = await db.insert(appsTable).values({
      name: body.name,
      category: body.category ?? "앱",
      blocked: true,
      packageName: body.packageName,
    }).returning();

    res.json(inserted);
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to add app" });
  }
});

router.put("/blocked-apps", async (req, res) => {
  try {
    const settings = await getSettings();
    if (settings.appsConfigured && !isSundayKST()) {
      res.status(403).json({
        error: "settings_locked",
        message: "앱 차단 설정은 일요일에만 변경 가능합니다",
      });
      return;
    }

    const body = z.object({
      apps: z.array(z.object({ id: z.number(), blocked: z.boolean() })),
    }).parse(req.body);

    for (const app of body.apps) {
      await db.update(appsTable).set({ blocked: app.blocked }).where(eq(appsTable.id, app.id));
    }

    if (!settings.appsConfigured) {
      await db.update(settingsTable).set({ appsConfigured: true });
    }

    const updated = await db.select().from(appsTable).orderBy(appsTable.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to update apps" });
  }
});

router.delete("/blocked-apps/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }
    await db.delete(appsTable).where(eq(appsTable.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to delete app" });
  }
});

export default router;
