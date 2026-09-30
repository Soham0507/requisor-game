import { Router, type IRouter, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, brandingDraftsTable, gamesTable, ordersTable } from "@workspace/db";
import {
  UpsertBrandingDraftBody,
  UpsertBrandingDraftResponse,
  GetBrandingDraftResponse,
  FinalizeBrandingDraftBody,
  FinalizeBrandingDraftResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const LOGO_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const BACKGROUND_MIME_TYPES = new Set([
  ...LOGO_MIME_TYPES,
  "video/mp4",
  "video/webm",
]);
const FONT_MIME_TYPES = new Set([
  "application/font-woff",
  "application/vnd.ms-fontobject",
  "font/otf",
  "font/ttf",
  "font/woff",
  "font/woff2",
]);

function parseSafeDataUri(value: string | null, allowedTypes: Set<string>) {
  const match = value ? /^data:([^;,]+);base64,([a-zA-Z0-9+/=\s]+)$/.exec(value) : null;
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  if (!allowedTypes.has(mimeType)) return { unsupported: true as const };
  return { mimeType, buffer: Buffer.from(match[2], "base64") };
}

function setSafeMediaHeaders(res: Response, mimeType: string) {
  res.setHeader("Content-Type", mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
}

router.post("/branding-drafts", async (req, res) => {
  const body = UpsertBrandingDraftBody.parse(req.body);

  const [existing] = await db
    .select()
    .from(brandingDraftsTable)
    .where(
      and(
        eq(brandingDraftsTable.gameId, body.gameId),
        eq(brandingDraftsTable.draftToken, body.draftToken),
        eq(brandingDraftsTable.status, "draft"),
      ),
    )
    .limit(1);

  const values = {
    gameId: body.gameId,
    draftToken: body.draftToken,
    primaryColor: body.primaryColor,
    secondaryColor: body.secondaryColor,
    accentColor: body.accentColor,
    logoDataUrl: body.logoDataUrl ?? null,
    bgDataUrl: body.bgDataUrl ?? null,
    fontDataUrl: body.fontDataUrl ?? null,
    quiz: body.quiz ?? null,
    heading: body.heading,
    tagline: body.tagline ?? null,
    updatedAt: new Date(),
  };

  const [draft] = existing
    ? await db
        .update(brandingDraftsTable)
        .set(values)
        .where(eq(brandingDraftsTable.id, existing.id))
        .returning()
    : await db.insert(brandingDraftsTable).values(values).returning();

  res.json(UpsertBrandingDraftResponse.parse(draft));
});

router.get("/branding-drafts/:id", async (req, res) => {
  const [draft] = await db
    .select()
    .from(brandingDraftsTable)
    .where(eq(brandingDraftsTable.id, req.params.id))
    .limit(1);

  if (!draft) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }

  res.json(GetBrandingDraftResponse.parse(draft));
});

// Serves an already-persisted draft's logo by URL instead of embedding the
// base64 data URI in the live link query string, which blows past Node's
// request header size limit (431) for anything but a tiny image.
router.get("/branding-drafts/:id/logo", async (req, res) => {
  const [draft] = await db
    .select({ logoDataUrl: brandingDraftsTable.logoDataUrl })
    .from(brandingDraftsTable)
    .where(eq(brandingDraftsTable.id, req.params.id))
    .limit(1);

  const media = parseSafeDataUri(draft?.logoDataUrl ?? null, LOGO_MIME_TYPES);
  if (!media) {
    res.status(404).end();
    return;
  }
  if ("unsupported" in media) {
    res.status(415).end();
    return;
  }

  setSafeMediaHeaders(res, media.mimeType);
  res.send(media.buffer);
});

// Same trick as /logo above, but for the (optionally much larger) landing
// screen background image/video — serves it as a real HTTP response with
// Range support so the browser can seek/stream a video instead of the whole
// thing landing in memory as one <video src> fetch.
router.get("/branding-drafts/:id/bg", async (req, res) => {
  const [draft] = await db
    .select({ bgDataUrl: brandingDraftsTable.bgDataUrl })
    .from(brandingDraftsTable)
    .where(eq(brandingDraftsTable.id, req.params.id))
    .limit(1);

  const media = parseSafeDataUri(draft?.bgDataUrl ?? null, BACKGROUND_MIME_TYPES);
  if (!media) {
    res.status(404).end();
    return;
  }
  if ("unsupported" in media) {
    res.status(415).end();
    return;
  }

  const buffer = media.buffer;
  setSafeMediaHeaders(res, media.mimeType);
  res.setHeader("Accept-Ranges", "bytes");

  const range = req.headers.range;
  if (!range) {
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
    return;
  }

  const match2 = /^bytes=(\d+)-(\d*)$/.exec(range);
  const start = match2 ? Number(match2[1]) : 0;
  const end = match2 && match2[2] ? Number(match2[2]) : buffer.length - 1;

  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${buffer.length}`);
  res.setHeader("Content-Length", end - start + 1);
  res.send(buffer.subarray(start, end + 1));
});

// Same trick as /logo above — serves an already-persisted draft's custom
// uploaded font by URL instead of embedding the base64 data URI in the live
// link query string.
router.get("/branding-drafts/:id/font", async (req, res) => {
  const [draft] = await db
    .select({ fontDataUrl: brandingDraftsTable.fontDataUrl })
    .from(brandingDraftsTable)
    .where(eq(brandingDraftsTable.id, req.params.id))
    .limit(1);

  const media = parseSafeDataUri(draft?.fontDataUrl ?? null, FONT_MIME_TYPES);
  if (!media) {
    res.status(404).end();
    return;
  }
  if ("unsupported" in media) {
    res.status(415).end();
    return;
  }

  setSafeMediaHeaders(res, media.mimeType);
  res.send(media.buffer);
});

router.post("/branding-drafts/:id/finalize", async (req, res) => {
  const body = FinalizeBrandingDraftBody.parse(req.body ?? {});

  const [draft] = await db
    .select()
    .from(brandingDraftsTable)
    .where(eq(brandingDraftsTable.id, req.params.id))
    .limit(1);

  if (!draft) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, draft.gameId)).limit(1);

  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  await db
    .update(brandingDraftsTable)
    .set({ status: "finalized", updatedAt: new Date() })
    .where(eq(brandingDraftsTable.id, draft.id));

  const [order] = await db
    .insert(ordersTable)
    .values({
      brandingDraftId: draft.id,
      gameId: game.id,
      totalAmountCents: game.priceCents,
      contactEmail: body.contactEmail ?? null,
    })
    .returning();

  res.json(FinalizeBrandingDraftResponse.parse(order));
});

export default router;
