import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, gamesTable } from "@workspace/db";
import { ListGamesResponse, GetGameResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/games", async (_req, res) => {
  const games = await db.select().from(gamesTable);
  res.json(ListGamesResponse.parse(games));
});

router.get("/games/:slug", async (req, res) => {
  const [game] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.slug, req.params.slug))
    .limit(1);

  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  res.json(GetGameResponse.parse(game));
});

export default router;
