import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gamesTable } from "./games";
import { ordersTable } from "./orders";

// Captured by each brandable game's own "player info" form at game-over
// (see game/BRANDING_CONTRACT.md) — every game except Boat Booth has one,
// so a booth operator gets a real lead (name + email) out of every
// playthrough, not just a leaderboard handle. One shared table across every
// game rather than a table per game: gameId is what tells them apart, and
// it's what makes "leads across all games" a single query instead of a
// federation problem. orderId is set only when the game was loaded through
// a finalized live link (see customize.tsx's `orderId` query param) — it's
// null for plays against a game's raw/dev preview URL, which is expected.
export const playerSubmissionsTable = pgTable("player_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id),
  orderId: uuid("order_id").references(() => ordersTable.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  // Whatever else a given game happens to capture (company, job title,
  // score, level, maxCombo, ...) — varies per game, not worth a column
  // each.
  extra: jsonb("extra").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlayerSubmissionSchema = createInsertSchema(playerSubmissionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPlayerSubmission = z.infer<typeof insertPlayerSubmissionSchema>;
export type PlayerSubmission = typeof playerSubmissionsTable.$inferSelect;
