import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, gamesTable, playerSubmissionsTable } from "@workspace/db";
import { CreatePlayerSubmissionBody, CreatePlayerSubmissionResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/player-submissions", async (req, res) => {
  const body = CreatePlayerSubmissionBody.parse(req.body);

  // The embedded game only knows its own slug (hardcoded in its bundle),
  // not this row's database id, so it's resolved here rather than trusted
  // from the client.
  const [game] = await db
    .select({ id: gamesTable.id })
    .from(gamesTable)
    .where(eq(gamesTable.slug, body.gameSlug))
    .limit(1);

  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const [submission] = await db
    .insert(playerSubmissionsTable)
    .values({
      gameId: game.id,
      orderId: body.orderId ?? null,
      name: body.name,
      email: body.email,
      extra: body.extra ?? null,
    })
    .returning();

  res.json(CreatePlayerSubmissionResponse.parse(submission));
});

export default router;
