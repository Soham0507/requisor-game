import { pgTable, text, uuid, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gamesTable } from "./games";

export const draftStatusEnum = pgEnum("draft_status", ["draft", "finalized"]);

export const brandingDraftsTable = pgTable("branding_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id),
  draftToken: text("draft_token").notNull(),
  primaryColor: text("primary_color").notNull(),
  secondaryColor: text("secondary_color").notNull(),
  accentColor: text("accent_color").notNull(),
  logoDataUrl: text("logo_data_url"),
  // Per-game opt-in (currently basketball-shootout only) — the landing
  // screen's background image/video, as a data: URI. Mime type is read
  // back from the URI itself when serving, so no separate "type" column.
  bgDataUrl: text("bg_data_url"),
  // Custom uploaded font (woff2/woff/ttf/otf) applied to the brand name and
  // game title text, as a data: URI. Universal across every game, unlike
  // bgDataUrl above.
  fontDataUrl: text("font_data_url"),
  heading: text("heading").notNull(),
  tagline: text("tagline"),
  status: draftStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBrandingDraftSchema = createInsertSchema(brandingDraftsTable).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBrandingDraft = z.infer<typeof insertBrandingDraftSchema>;
export type BrandingDraft = typeof brandingDraftsTable.$inferSelect;
