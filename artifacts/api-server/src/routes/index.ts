import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gamesRouter from "./games";
import brandingDraftsRouter from "./branding-drafts";
import customUiRequestsRouter from "./custom-ui-requests";
import playerSubmissionsRouter from "./player-submissions";
import scenesRouter from "./scenes";
import generationsRouter from "./generations";
import boothRouter from "./booth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gamesRouter);
router.use(brandingDraftsRouter);
router.use(customUiRequestsRouter);
router.use(playerSubmissionsRouter);
router.use(scenesRouter);
router.use(generationsRouter);
router.use(boothRouter);

export default router;
