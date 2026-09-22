import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import { db, generationsTable } from "@workspace/db";
import { GetBoothStatsResponse } from "@workspace/api-zod";
import { SCENES } from "../lib/scenes";

const router: IRouter = Router();

router.get("/booth/stats", async (_req, res): Promise<void> => {
  const [totals] = await db
    .select({
      totalCreations: sql<number>`count(*)::int`,
      videosCreated: sql<number>`count(*) filter (where ${generationsTable.videoStatus} = 'ready')::int`,
    })
    .from(generationsTable)
    .where(eq(generationsTable.photoStatus, "ready"));

  const counts = await db
    .select({
      sceneId: generationsTable.sceneId,
      count: sql<number>`count(*)::int`,
    })
    .from(generationsTable)
    .where(eq(generationsTable.photoStatus, "ready"))
    .groupBy(generationsTable.sceneId);

  const countMap = new Map(counts.map((c) => [c.sceneId, c.count]));

  const sceneBreakdown = SCENES.map((s) => ({
    sceneId: s.id,
    sceneName: s.name,
    count: countMap.get(s.id) ?? 0,
  }));

  res.json(
    GetBoothStatsResponse.parse({
      totalCreations: totals?.totalCreations ?? 0,
      videosCreated: totals?.videosCreated ?? 0,
      sceneBreakdown,
    }),
  );
});

export default router;
