import { Router, type IRouter } from "express";
import { GetServerTimeResponse } from "@workspace/api-zod";
import { nowKST, getDayOfWeekKST, isSundayKST } from "../utils/kst";

const router: IRouter = Router();

router.get("/server-time", (_req, res) => {
  const now = nowKST();
  const dayOfWeek = getDayOfWeekKST(); // 0 = Sunday (KST)
  const isSunday = isSundayKST();
  const daysUntilSunday = isSunday ? 0 : 7 - dayOfWeek;

  const data = GetServerTimeResponse.parse({
    timestamp: now.toISOString(),
    isSunday,
    dayOfWeek,
    daysUntilSunday,
  });

  res.json(data);
});

export default router;
