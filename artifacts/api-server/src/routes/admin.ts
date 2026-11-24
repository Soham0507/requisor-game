import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db, brandingDraftsTable, gamesTable, ordersTable, playerSubmissionsTable } from "@workspace/db";

const router: IRouter = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Operator-only. The key lives in the server environment (ADMIN_KEY); with no
// key configured the whole admin API stays closed rather than open.
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_KEY ?? "";
  if (expected.length < 12) {
    res.status(503).json({ error: "Admin access is not configured on this server." });
    return;
  }
  const given = String(req.header("x-admin-key") ?? "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: "Invalid admin key." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  next();
}
router.use("/admin", requireAdmin);

router.get("/admin/overview", async (_req, res) => {
  try {
    const games = await db.select({ id: gamesTable.id, slug: gamesTable.slug, name: gamesTable.name }).from(gamesTable).orderBy(gamesTable.name);
    const counts = async (table: typeof ordersTable | typeof brandingDraftsTable | typeof playerSubmissionsTable) => {
      const rows = await db.select({ gameId: table.gameId, n: sql<number>`count(*)::int` }).from(table).groupBy(table.gameId);
      return new Map(rows.map((r) => [r.gameId, r.n]));
    };
    const [orders, drafts, submissions] = await Promise.all([counts(ordersTable), counts(brandingDraftsTable), counts(playerSubmissionsTable)]);
    const perGame = games.map((g) => ({
      slug: g.slug,
      name: g.name,
      orders: orders.get(g.id) ?? 0,
      drafts: drafts.get(g.id) ?? 0,
      submissions: submissions.get(g.id) ?? 0,
    }));
    const totals = perGame.reduce(
      (t, g) => ({ orders: t.orders + g.orders, drafts: t.drafts + g.drafts, submissions: t.submissions + g.submissions }),
      { orders: 0, drafts: 0, submissions: 0 },
    );
    res.json({ totals, perGame });
  } catch {
    res.status(500).json({ error: "Could not load the overview." });
  }
});

// Who customized and ordered which game. Large uploads (logo/background/font
// data URLs) are reduced to booleans so the list stays small.
router.get("/admin/orders", async (req, res) => {
  const gameSlug = typeof req.query.game === "string" ? req.query.game : "";
  try {
    const rows = await db
      .select({
        id: ordersTable.id,
        createdAt: ordersTable.createdAt,
        status: ordersTable.status,
        totalAmountCents: ordersTable.totalAmountCents,
        contactEmail: ordersTable.contactEmail,
        gameSlug: gamesTable.slug,
        gameName: gamesTable.name,
        heading: brandingDraftsTable.heading,
        tagline: brandingDraftsTable.tagline,
        primaryColor: brandingDraftsTable.primaryColor,
        secondaryColor: brandingDraftsTable.secondaryColor,
        accentColor: brandingDraftsTable.accentColor,
        hasLogo: sql<boolean>`${brandingDraftsTable.logoDataUrl} is not null`,
        hasBackground: sql<boolean>`${brandingDraftsTable.bgDataUrl} is not null`,
        hasFont: sql<boolean>`${brandingDraftsTable.fontDataUrl} is not null`,
        hasCustomContent: sql<boolean>`(${brandingDraftsTable.gameContent} is not null or ${brandingDraftsTable.quiz} is not null)`,
        submissions: sql<number>`(select count(*)::int from ${playerSubmissionsTable} s where s.order_id = ${ordersTable.id})`,
      })
      .from(ordersTable)
      .innerJoin(gamesTable, eq(gamesTable.id, ordersTable.gameId))
      .innerJoin(brandingDraftsTable, eq(brandingDraftsTable.id, ordersTable.brandingDraftId))
      .where(gameSlug ? eq(gamesTable.slug, gameSlug) : undefined)
      .orderBy(desc(ordersTable.createdAt))
      .limit(500);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Could not load orders." });
  }
});

function filters(req: Request): SQL | undefined {
  const parts: SQL[] = [];
  if (typeof req.query.order === "string" && req.query.order) {
    parts.push(
      req.query.order === "none"
        ? sql`${playerSubmissionsTable.orderId} is null`
        : eq(playerSubmissionsTable.orderId, req.query.order),
    );
  }
  if (typeof req.query.game === "string" && req.query.game) parts.push(eq(gamesTable.slug, req.query.game));
  return parts.length ? and(...parts) : undefined;
}

const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  // Stop spreadsheet formula injection from player-typed values.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

// Data collected from players: leads and scores, for one order, one game or all.
router.get("/admin/submissions", async (req, res) => {
  if (typeof req.query.order === "string" && req.query.order && req.query.order !== "none" && !UUID.test(req.query.order)) {
    res.status(400).json({ error: "Invalid order id." });
    return;
  }
  try {
    const rows = await db
      .select({
        id: playerSubmissionsTable.id,
        createdAt: playerSubmissionsTable.createdAt,
        orderId: playerSubmissionsTable.orderId,
        gameSlug: gamesTable.slug,
        gameName: gamesTable.name,
        name: playerSubmissionsTable.name,
        email: playerSubmissionsTable.email,
        extra: playerSubmissionsTable.extra,
      })
      .from(playerSubmissionsTable)
      .innerJoin(gamesTable, eq(gamesTable.id, playerSubmissionsTable.gameId))
      .where(filters(req))
      .orderBy(desc(playerSubmissionsTable.createdAt))
      .limit(5000);

    if (req.query.format === "csv") {
      const keys = [...new Set(rows.flatMap((r) => Object.keys(r.extra ?? {})))].sort();
      const head = ["time", "game", "order", "name", "email", ...keys];
      const lines = [head.map(csvCell).join(",")].concat(
        rows.map((r) =>
          [r.createdAt.toISOString(), r.gameName, r.orderId ?? "", r.name, r.email, ...keys.map((k) => (r.extra ?? {})[k])]
            .map(csvCell)
            .join(","),
        ),
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="activate8-submissions.csv"');
      res.send("﻿" + lines.join("\r\n"));
      return;
    }
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Could not load submissions." });
  }
});

export default router;
