import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, gamesTable, playerSubmissionsTable } from "@workspace/db";
import { ListBasketballScoresQueryParams, ListBasketballScoresResponse, SubmitBasketballScoreBody, SubmitBasketballScoreResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const path = "/games/basketball-shootout/scores";
// Short-lived rate-limit keys are never logged or persisted.
const submissionWindows = new Map<string, { count: number; resetAt: number }>();
router.post(path, (req, res, next) => {
  const now = Date.now();
  for (const [key, value] of submissionWindows) {
    if (value.resetAt <= now) submissionWindows.delete(key);
  }
  const key = req.ip ?? "unknown";
  const window = submissionWindows.get(key) ?? { count: 0, resetAt: now + 60_000 };
  if (window.count >= 20 || (!submissionWindows.has(key) && submissionWindows.size >= 10_000)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Too many submissions. Please retry in a minute." });
    return;
  }
  window.count++;
  submissionWindows.set(key, window);
  next();
});

// Explicit projection: contacts and private metadata never leave this store.
const publicFields = {
  id: playerSubmissionsTable.id,
  playerName: playerSubmissionsTable.name,
  playerTitle: sql<string>`${playerSubmissionsTable.extra}->>'playerTitle'`,
  playerCompany: sql<string>`${playerSubmissionsTable.extra}->>'playerCompany'`,
  score: sql<number>`(${playerSubmissionsTable.extra}->>'score')::integer`,
  shotsTaken: sql<number>`(${playerSubmissionsTable.extra}->>'shotsTaken')::integer`,
  shotsMade: sql<number>`(${playerSubmissionsTable.extra}->>'shotsMade')::integer`,
  outagesPrevented: sql<number>`(${playerSubmissionsTable.extra}->>'outagesPrevented')::integer`,
  createdAt: playerSubmissionsTable.createdAt,
};
const basketballOnly = and(
  eq(gamesTable.slug, "basketball-shootout"),
  sql`${playerSubmissionsTable.extra}->>'kind' = 'basketball-score'`,
);

router.get(path, async (req, res): Promise<void> => {
  const parsed = ListBasketballScoresQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Limit must be an integer between 1 and 100." });
    return;
  }
  try {
    const rows = await db.select(publicFields).from(playerSubmissionsTable)
      .innerJoin(gamesTable, eq(gamesTable.id, playerSubmissionsTable.gameId))
      .where(basketballOnly)
      .orderBy(desc(publicFields.score), playerSubmissionsTable.createdAt, playerSubmissionsTable.id)
      .limit(parsed.data.limit ?? 20);
    res.setHeader("Cache-Control", "no-store");
    res.json(ListBasketballScoresResponse.parse(rows));
  } catch {
    req.log.error({ operation: "basketball.leaderboard" }, "Leaderboard unavailable");
    res.status(500).json({ error: "The leaderboard is temporarily unavailable. Please retry." });
  }
});

router.post(path, async (req, res): Promise<void> => {
  const parsed = SubmitBasketballScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter valid player details and round statistics." });
    return;
  }
  const body = parsed.data;
  const name = body.playerName.trim();
  const title = body.playerTitle.trim();
  const company = body.playerCompany.trim();
  if (!name || !title || !company || body.shotsMade > body.shotsTaken
      || body.score !== body.shotsMade * 3 || body.outagesPrevented !== body.shotsMade) {
    res.status(400).json({ error: "Player details or round statistics are inconsistent." });
    return;
  }
  try {
    const [game] = await db.select({ id: gamesTable.id }).from(gamesTable)
      .where(eq(gamesTable.slug, "basketball-shootout")).limit(1);
    if (!game) {
      res.status(503).json({ error: "Basketball Shootout is not available yet." });
      return;
    }
    const email = body.playerEmail.trim();
    await db.insert(playerSubmissionsTable).values({
      id: body.submissionId, gameId: game.id, name, email,
      extra: {
        kind: "basketball-score", playerTitle: title, playerCompany: company,
        score: body.score, shotsTaken: body.shotsTaken,
        shotsMade: body.shotsMade, outagesPrevented: body.outagesPrevented,
      },
    }).onConflictDoNothing({ target: playerSubmissionsTable.id });
    const [saved] = await db.select({ ...publicFields, privateEmail: playerSubmissionsTable.email })
      .from(playerSubmissionsTable)
      .innerJoin(gamesTable, eq(gamesTable.id, playerSubmissionsTable.gameId))
      .where(and(basketballOnly, eq(playerSubmissionsTable.id, body.submissionId))).limit(1);
    if (!saved || saved.playerName !== name || saved.playerTitle !== title
        || saved.playerCompany !== company || saved.privateEmail !== email
        || saved.score !== body.score || saved.shotsTaken !== body.shotsTaken
        || saved.shotsMade !== body.shotsMade || saved.outagesPrevented !== body.outagesPrevented) {
      res.status(409).json({ error: "This round was already saved with different details." });
      return;
    }
    const { privateEmail: _privateEmail, ...publicScore } = saved;
    req.log.info({ operation: "basketball.submit", submissionId: body.submissionId }, "Score saved");
    res.status(201).json(SubmitBasketballScoreResponse.parse(publicScore));
  } catch {
    req.log.error({ operation: "basketball.submit" }, "Score submission failed");
    res.status(500).json({ error: "Your score could not be saved. Please retry." });
  }
});

export default router;
