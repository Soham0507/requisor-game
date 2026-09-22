import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gamesTable } from "./games";

export const customUiRequestsTable = pgTable("custom_ui_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").references(() => gamesTable.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomUiRequestSchema = createInsertSchema(customUiRequestsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCustomUiRequest = z.infer<typeof insertCustomUiRequestSchema>;
export type CustomUiRequest = typeof customUiRequestsTable.$inferSelect;
