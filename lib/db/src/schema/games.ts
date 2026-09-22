import { pgTable, text, integer, uuid, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandSupportEnum = pgEnum("brand_support", ["full", "chrome_only"]);

export const gamesTable = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  folderPath: text("folder_path").notNull(),
  previewBasePath: text("preview_base_path"),
  brandSupport: brandSupportEnum("brand_support").notNull().default("chrome_only"),
  defaultPrimaryColor: text("default_primary_color").notNull(),
  defaultSecondaryColor: text("default_secondary_color").notNull(),
  defaultAccentColor: text("default_accent_color").notNull(),
  defaultLogoUrl: text("default_logo_url"),
  defaultHeading: text("default_heading").notNull(),
  priceCents: integer("price_cents").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGameSchema = createInsertSchema(gamesTable).omit({ id: true, createdAt: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof gamesTable.$inferSelect;
