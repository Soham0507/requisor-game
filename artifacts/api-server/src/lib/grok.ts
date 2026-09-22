import { logger } from "./logger";

const XAI_BASE_URL = "https://api.x.ai/v1";
const IMAGE_MODEL = process.env.XAI_IMAGE_MODEL ?? "grok-imagine-image-quality";
const VIDEO_MODEL = process.env.XAI_VIDEO_MODEL ?? "grok-imagine-video";

function apiKey(): string {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    throw new Error("XAI_API_KEY is not set");
  }
  return key;
}

export interface GeneratedImage {
  data: Buffer;
  mime: string;
}

async function fetchUrlAsBuffer(
  url: string,
): Promise<{ data: Buffer; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download asset (${res.status})`);
  }
  const mime = res.headers.get("content-type") ?? "application/octet-stream";
  const arr = await res.arrayBuffer();
  return { data: Buffer.from(arr), mime };
}

function decodeImagePayload(payload: {
  b64_json?: string;
  url?: string;
}): Promise<GeneratedImage> | GeneratedImage {
  if (payload.b64_json) {
    return { data: Buffer.from(payload.b64_json, "base64"), mime: "image/png" };
  }
  if (payload.url) {
    return fetchUrlAsBuffer(payload.url).then(({ data, mime }) => ({
      data,
      mime: mime.startsWith("image/") ? mime : "image/jpeg",
    }));
  }
  throw new Error("Image response contained no image data");
}

/**
 * Edits/regenerates a visitor photo into a boat scene while preserving likeness.
 * Returns the generated image bytes.
 */
export async function editImage(
  photoDataUri: string,
  prompt: string,
): Promise<GeneratedImage> {
  const res = await fetch(`${XAI_BASE_URL}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      image: { type: "image_url", image_url: photoDataUri },
      n: 1,
      response_format: "b64_json",
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    logger.error({ status: res.status, body: text.slice(0, 500) }, "Grok image edit failed");
    throw new Error(`Image generation provider error (${res.status})`);
  }

  let json: { data?: Array<{ b64_json?: string; url?: string }> };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid response from image provider");
  }

  const first = json.data?.[0];
  if (!first) {
    throw new Error("Image provider returned no image");
  }
  return decodeImagePayload(first);
}

/**
 * Submits an image-to-video job that animates `image` (an https URL or a
 * base64 data URI) as the first frame. Returns the provider request id to poll.
 *
 * NOTE: the xAI REST API expects the source image as a nested object
 * `image: { url }`. A flat `image_url` string is silently ignored, which makes
 * the model fall back to text-to-video and produce a random person.
 */
export async function startVideoJob(
  image: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(`${XAI_BASE_URL}/videos/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VIDEO_MODEL,
      prompt,
      image: { url: image },
      duration: 6,
      aspect_ratio: "16:9",
      resolution: "720p",
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    logger.error({ status: res.status, body: text.slice(0, 500) }, "Grok video submit failed");
    throw new Error(`Video generation provider error (${res.status})`);
  }

  let json: { request_id?: string; id?: string };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid response from video provider");
  }

  const requestId = json.request_id ?? json.id;
  if (!requestId) {
    throw new Error("Video provider returned no request id");
  }
  return requestId;
}

export type VideoJobStatus =
  | { status: "pending" }
  | { status: "done"; video: { data: Buffer; mime: string } }
  | { status: "failed"; error: string };

/**
 * Polls a video job once. When done, downloads the video bytes.
 */
export async function pollVideoJob(requestId: string): Promise<VideoJobStatus> {
  const res = await fetch(`${XAI_BASE_URL}/videos/${requestId}`, {
    headers: {
      Authorization: `Bearer ${apiKey()}`,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    logger.error({ status: res.status, body: text.slice(0, 500) }, "Grok video poll failed");
    throw new Error(`Video poll provider error (${res.status})`);
  }

  let json: {
    status?: string;
    video?: { url?: string };
    url?: string;
    data?: Array<{ url?: string }>;
    error?: string;
  };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid response from video provider");
  }

  const status = (json.status ?? "").toLowerCase();

  if (status === "failed" || status === "error") {
    return { status: "failed", error: json.error ?? "Video generation failed" };
  }

  if (status === "done" || status === "succeeded" || status === "completed") {
    const url = json.video?.url ?? json.url ?? json.data?.[0]?.url;
    if (!url) {
      return { status: "failed", error: "Video finished but no URL was returned" };
    }
    const { data, mime } = await fetchUrlAsBuffer(url);
    return {
      status: "done",
      video: { data, mime: mime.startsWith("video/") ? mime : "video/mp4" },
    };
  }

  return { status: "pending" };
}
