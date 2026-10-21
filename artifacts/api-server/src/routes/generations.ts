import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, generationsTable } from "@workspace/db";
import {
  CreateGenerationBody,
  GetGenerationParams,
  GetGenerationResponse,
  ListGenerationsQueryParams,
  ListGenerationsResponse,
  StartVideoParams,
} from "@workspace/api-zod";
import { getScene } from "../lib/scenes";
import { editImage, startVideoJob } from "../lib/grok";
import { toApiGeneration, pollVideoInBackground } from "../lib/generations";

const router: IRouter = Router();

function normalizeDataUri(input: string): string {
  return input.startsWith("data:") ? input : `data:image/jpeg;base64,${input}`;
}

router.get("/generations", async (req, res): Promise<void> => {
  const parsed = ListGenerationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const limit = parsed.data.limit ?? 12;

  const rows = await db
    .select()
    .from(generationsTable)
    .orderBy(desc(generationsTable.createdAt))
    .limit(limit);

  res.json(ListGenerationsResponse.parse(rows.map(toApiGeneration)));
});

router.post("/generations", async (req, res): Promise<void> => {
  const parsed = CreateGenerationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const scene = getScene(parsed.data.sceneId);
  if (!scene) {
    res.status(400).json({ error: "Unknown scene" });
    return;
  }

  const [row] = await db
    .insert(generationsTable)
    .values({
      sceneId: scene.id,
      sceneName: scene.name,
      visitorName: parsed.data.visitorName ?? null,
      photoStatus: "pending",
      videoStatus: "idle",
    })
    .returning();

  try {
    const image = await editImage(normalizeDataUri(parsed.data.photoBase64), scene.imagePrompt);

    const [updated] = await db
      .update(generationsTable)
      .set({
        photoStatus: "ready",
        photoData: image.data.toString("base64"),
        photoMime: image.mime,
        error: null,
      })
      .where(eq(generationsTable.id, row.id))
      .returning();

    res.status(201).json(GetGenerationResponse.parse(toApiGeneration(updated)));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    req.log.error({ err: message, id: row.id }, "Photo generation failed");
    await db
      .update(generationsTable)
      .set({ photoStatus: "failed", error: message })
      .where(eq(generationsTable.id, row.id));
    res.status(502).json({ error: message });
  }
});

router.get("/generations/:id", async (req, res): Promise<void> => {
  const params = GetGenerationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(generationsTable)
    .where(eq(generationsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Generation not found" });
    return;
  }

  res.json(GetGenerationResponse.parse(toApiGeneration(row)));
});

router.post("/generations/:id/video", async (req, res): Promise<void> => {
  const params = StartVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(generationsTable)
    .where(eq(generationsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Generation not found" });
    return;
  }

  if (row.photoStatus !== "ready") {
    res.status(400).json({ error: "Photo is not ready yet" });
    return;
  }

  if (!row.photoData) {
    res.status(400).json({ error: "Photo data is missing" });
    return;
  }

  const scene = getScene(row.sceneId);
  if (!scene) {
    res.status(400).json({ error: "Unknown scene" });
    return;
  }

  // Atomically claim the job: only one request can move idle/failed -> pending.
  // This prevents concurrent requests from starting duplicate (paid) jobs.
  const [claimed] = await db
    .update(generationsTable)
    .set({ videoStatus: "pending", videoRequestId: null, error: null })
    .where(
      and(eq(generationsTable.id, row.id), inArray(generationsTable.videoStatus, ["idle", "failed"])),
    )
    .returning();

  if (!claimed) {
    // Already pending or ready — return the current state without re-submitting.
    const [current] = await db.select().from(generationsTable).where(eq(generationsTable.id, row.id));
    res.status(202).json(GetGenerationResponse.parse(toApiGeneration(current)));
    return;
  }

  try {
    // Pass the generated photo as a base64 data URI so xAI animates the actual
    // visitor's image as the first frame (no dependency on public reachability).
    const photoDataUri = `data:${row.photoMime ?? "image/png"};base64,${row.photoData}`;
    const requestId = await startVideoJob(photoDataUri, scene.videoPrompt);

    const [updated] = await db
      .update(generationsTable)
      .set({ videoRequestId: requestId })
      .where(eq(generationsTable.id, row.id))
      .returning();

    pollVideoInBackground(row.id, requestId);

    res.status(202).json(GetGenerationResponse.parse(toApiGeneration(updated)));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Video start failed";
    req.log.error({ err: message, id: row.id }, "Video start failed");
    await db
      .update(generationsTable)
      .set({ videoStatus: "failed", error: message })
      .where(eq(generationsTable.id, row.id));
    res.status(502).json({ error: message });
  }
});

router.get("/media/:id/photo", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [row] = await db.select().from(generationsTable).where(eq(generationsTable.id, raw));

  if (!row || !row.photoData) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }

  res.setHeader("Content-Type", row.photoMime ?? "image/png");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(Buffer.from(row.photoData, "base64"));
});

router.get("/media/:id/video", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [row] = await db.select().from(generationsTable).where(eq(generationsTable.id, raw));

  if (!row || !row.videoData) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  const buffer = Buffer.from(row.videoData, "base64");
  const total = buffer.length;
  const contentType = row.videoMime ?? "video/mp4";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Accept-Ranges", "bytes");

  const rangeHeader = req.headers.range;
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (match && (match[1] !== "" || match[2] !== "")) {
      const sendUnsatisfiable = (): void => {
        res.status(416).setHeader("Content-Range", `bytes */${total}`);
        res.end();
      };

      let start: number;
      let end: number;

      if (match[1] === "") {
        // Suffix range: bytes=-N means the last N bytes.
        const suffixLength = parseInt(match[2], 10);
        if (Number.isNaN(suffixLength) || suffixLength <= 0) {
          sendUnsatisfiable();
          return;
        }
        start = Math.max(total - suffixLength, 0);
        end = total - 1;
      } else {
        start = parseInt(match[1], 10);
        end = match[2] === "" ? total - 1 : parseInt(match[2], 10);
      }

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
        sendUnsatisfiable();
        return;
      }

      if (end >= total) {
        end = total - 1;
      }

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
      res.setHeader("Content-Length", end - start + 1);
      res.end(buffer.subarray(start, end + 1));
      return;
    }
  }

  res.setHeader("Content-Length", total);
  res.end(buffer);
});

export default router;
