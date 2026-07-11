import { Router, type IRouter } from "express";
import healthRouter from "./health";
import serverTimeRouter from "./server-time";
import timeSlotsRouter from "./timeslots";
import blockedAppsRouter from "./blocked-apps";
import challengeRouter from "./challenge";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";
import focusTimerRouter from "./focus-timer";
import usageStatsRouter from "./usage-stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(serverTimeRouter);
router.use(timeSlotsRouter);
router.use(blockedAppsRouter);
router.use(challengeRouter);
router.use(dashboardRouter);
router.use(settingsRouter);
router.use(focusTimerRouter);
router.use(usageStatsRouter);

export default router;
