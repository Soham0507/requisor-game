import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Player scores table
export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  playerTitle: text("player_title").notNull(),
  playerCompany: text("player_company").notNull(),
  playerEmail: text("player_email").notNull().default(""),
  score: integer("score").notNull(),
  shotsTaken: integer("shots_taken").notNull(),
  shotsMade: integer("shots_made").notNull(),
  outagesPrevented: integer("outages_prevented").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertScoreSchema = createInsertSchema(scores).omit({
  id: true,
  createdAt: true,
});

export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scores.$inferSelect;

// Email captures table for lead generation
export const emailCaptures = pgTable("email_captures", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
});

export const insertEmailCaptureSchema = createInsertSchema(emailCaptures).omit({
  id: true,
  capturedAt: true,
});

export type InsertEmailCapture = z.infer<typeof insertEmailCaptureSchema>;
export type EmailCapture = typeof emailCaptures.$inferSelect;
