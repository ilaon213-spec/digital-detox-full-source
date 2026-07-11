import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { focusSessionsTable } from "@workspace/db/schema";
import { StartFocusTimerBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/focus-timer", async (_req, res) => {
  try {
    const sessions = await db
      .select()
      .from(focusSessionsTable)
      .orderBy(focusSessionsTable.startedAt);

    res.json(
      sessions.map((s) => ({
        id: s.id,
        durationMinutes: s.durationMinutes,
        completedMinutes: s.completedMinutes,
        startedAt: s.startedAt?.toISOString(),
        completedAt: s.completedAt?.toISOString(),
        isCompleted: s.isCompleted,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to fetch focus sessions" });
  }
});

router.post("/focus-timer", async (req, res) => {
  try {
    const body = StartFocusTimerBody.parse(req.body);
    const [session] = await db
      .insert(focusSessionsTable)
      .values({ durationMinutes: body.durationMinutes })
      .returning();

    res.json({
      id: session.id,
      durationMinutes: session.durationMinutes,
      completedMinutes: session.completedMinutes,
      startedAt: session.startedAt?.toISOString(),
      completedAt: null,
      isCompleted: session.isCompleted,
    });
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to start focus session" });
  }
});

router.post("/focus-timer/:sessionId/complete", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const [session] = await db
      .update(focusSessionsTable)
      .set({
        isCompleted: true,
        completedAt: new Date(),
        completedMinutes: focusSessionsTable.durationMinutes,
      })
      .where(eq(focusSessionsTable.id, sessionId))
      .returning();

    if (!session) {
      res.status(404).json({ error: "not_found", message: "Session not found" });
      return;
    }

    res.json({
      id: session.id,
      durationMinutes: session.durationMinutes,
      completedMinutes: session.durationMinutes,
      startedAt: session.startedAt?.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      isCompleted: true,
    });
  } catch (error) {
    res.status(500).json({ error: "server_error", message: "Failed to complete focus session" });
  }
});

export default router;
