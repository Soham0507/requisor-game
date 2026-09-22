import { eq } from "drizzle-orm";
import { db, generationsTable, type Generation } from "@workspace/db";
import { logger } from "./logger";
import { pollVideoJob } from "./grok";

export function toApiGeneration(row: Generation) {
  return {
    id: row.id,
    sceneId: row.sceneId,
    sceneName: row.sceneName,
    visitorName: row.visitorName,
    photoStatus: row.photoStatus,
    videoStatus: row.videoStatus,
    photoUrl: row.photoStatus === "ready" ? `/api/media/${row.id}/photo` : null,
    videoUrl: row.videoStatus === "ready" ? `/api/media/${row.id}/video` : null,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
  };
}

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_MS = 5 * 60 * 1000;

/**
 * Background polling loop for a submitted video job. Not awaited by the request.
 * Downloads and stores the finished video, or marks the generation failed.
 */
const MAX_CONSECUTIVE_ERRORS = 5;

export function pollVideoInBackground(id: string, requestId: string): void {
  const startedAt = Date.now();
  let consecutiveErrors = 0;

  const tick = async (): Promise<void> => {
    try {
      const result = await pollVideoJob(requestId);
      consecutiveErrors = 0;

      if (result.status === "pending") {
        if (Date.now() - startedAt > MAX_POLL_MS) {
          await db
            .update(generationsTable)
            .set({ videoStatus: "failed", error: "Video generation timed out" })
            .where(eq(generationsTable.id, id));
          logger.warn({ id, requestId }, "Video generation timed out");
          return;
        }
        setTimeout(() => void tick(), POLL_INTERVAL_MS);
        return;
      }

      if (result.status === "failed") {
        await db
          .update(generationsTable)
          .set({ videoStatus: "failed", error: result.error })
          .where(eq(generationsTable.id, id));
        logger.warn({ id, requestId, error: result.error }, "Video generation failed");
        return;
      }

      await db
        .update(generationsTable)
        .set({
          videoStatus: "ready",
          videoData: result.video.data.toString("base64"),
          videoMime: result.video.mime,
          error: null,
        })
        .where(eq(generationsTable.id, id));
      logger.info({ id, requestId }, "Video generation ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      consecutiveErrors += 1;

      if (
        consecutiveErrors < MAX_CONSECUTIVE_ERRORS &&
        Date.now() - startedAt < MAX_POLL_MS
      ) {
        logger.warn(
          { id, requestId, err: message, attempt: consecutiveErrors },
          "Transient video polling error, will retry",
        );
        setTimeout(() => void tick(), POLL_INTERVAL_MS);
        return;
      }

      await db
        .update(generationsTable)
        .set({ videoStatus: "failed", error: message })
        .where(eq(generationsTable.id, id))
        .catch(() => undefined);
      logger.error({ id, requestId, err: message }, "Video polling failed");
    }
  };

  setTimeout(() => void tick(), POLL_INTERVAL_MS);
}

/**
 * Resumes polling for any video jobs left "pending" (e.g. after a restart).
 * Jobs without a provider request id are marked failed since they can't resume.
 */
export async function resumePendingVideoJobs(): Promise<void> {
  const rows = await db
    .select()
    .from(generationsTable)
    .where(eq(generationsTable.videoStatus, "pending"));

  for (const row of rows) {
    if (row.videoRequestId) {
      logger.info({ id: row.id, requestId: row.videoRequestId }, "Resuming video job");
      pollVideoInBackground(row.id, row.videoRequestId);
    } else {
      await db
        .update(generationsTable)
        .set({ videoStatus: "failed", error: "Job lost during restart" })
        .where(eq(generationsTable.id, row.id));
    }
  }
}
