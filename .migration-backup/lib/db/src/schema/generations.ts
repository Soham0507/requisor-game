import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Boat Booth kiosk generations — one row per visitor photo/video. photoData
// and videoData are base64 image/video bytes stored directly in the row
// (kiosk volume, not worth a separate object store; see boat-booth's
// replit.md "Architecture decisions").
export const generationsTable = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sceneId: text("scene_id").notNull(),
  sceneName: text("scene_name").notNull(),
  visitorName: text("visitor_name"),
  photoStatus: text("photo_status").notNull().default("pending"),
  videoStatus: text("video_status").notNull().default("idle"),
  photoData: text("photo_data"),
  photoMime: text("photo_mime"),
  videoData: text("video_data"),
  videoMime: text("video_mime"),
  videoRequestId: text("video_request_id"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertGenerationSchema = createInsertSchema(generationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGeneration = z.infer<typeof insertGenerationSchema>;
export type Generation = typeof generationsTable.$inferSelect;
