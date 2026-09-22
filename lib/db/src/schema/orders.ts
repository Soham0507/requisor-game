import { pgTable, text, integer, uuid, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gamesTable } from "./games";
import { brandingDraftsTable } from "./branding-drafts";

export const orderStatusEnum = pgEnum("order_status", ["pending_payment"]);

export const ordersTable = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandingDraftId: uuid("branding_draft_id")
    .notNull()
    .references(() => brandingDraftsTable.id),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id),
  status: orderStatusEnum("status").notNull().default("pending_payment"),
  totalAmountCents: integer("total_amount_cents").notNull(),
  contactEmail: text("contact_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  status: true,
  createdAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
