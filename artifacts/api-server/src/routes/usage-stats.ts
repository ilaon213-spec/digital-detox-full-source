import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usageStatsTable } from "@workspace/db/schema";
import { UpdateUsageStatsBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/usage-stats", async (_req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    let stats = await db
      .select()
      .from(usageStatsTable)
      .where(eq(usageStatsTable.date, today))
      .limit(1);

    if (stats.length === 0) {
      res.json({ date: today, totalMinutes: 0, byApp: [] });
      return;
    }

    const s = stats[0];
    res.json({
      date: s.date,
      totalMinutes: s.totalMinutes,
      byApp: s.byApp || [],
    });
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to fetch usage stats" });
  }
});

router.post("/usage-stats", async (req, res) => {
  try {
    const body = UpdateUsageStatsBody.parse(req.body);
    const today = new Date().toISOString().split("T")[0];

    const existing = await db
      .select()
      .from(usageStatsTable)
      .where(eq(usageStatsTable.date, today))
      .limit(1);

    if (existing.length === 0) {
      const [inserted] = await db
        .insert(usageStatsTable)
        .values({ date: today, totalMinutes: body.totalMinutes, byApp: body.byApp || [] })
        .returning();
      res.json({ date: inserted.date, totalMinutes: inserted.totalMinutes, byApp: inserted.byApp || [] });
    } else {
      await db
        .update(usageStatsTable)
        .set({ totalMinutes: body.totalMinutes, byApp: body.byApp || [] })
        .where(eq(usageStatsTable.date, today));
      res.json({ date: today, totalMinutes: body.totalMinutes, byApp: body.byApp || [] });
    }
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to update usage stats" });
  }
});

export default router;
