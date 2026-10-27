import { CARD_IMAGE_MAX_CHARS } from "@workspace/game-content";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const SIDE = 480;

/**
 * Prepares an uploaded picture for a memory card: fits it inside a square on a
 * white background (nothing is cropped, transparency becomes white like the
 * card face) and shrinks it, so a saved draft with six pictures stays small.
 * Returns a data URL the game accepts.
 */
export async function shrinkCardImage(file: File): Promise<string> {
  if (!TYPES.includes(file.type)) throw new Error("Choose a PNG, JPG, WebP or GIF image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Choose an image smaller than 10 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That image could not be read. Try a different file.");
  }
  const side = Math.min(SIDE, Math.max(bitmap.width, bitmap.height));
  const scale = side / Math.max(bitmap.width, bitmap.height);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot prepare images.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, side, side);
  ctx.drawImage(bitmap, Math.round((side - w) / 2), Math.round((side - h) / 2), w, h);
  bitmap.close?.();
  // WebP is smallest; browsers without WebP encoding return PNG, so fall back to JPEG if that is too big.
  let data = canvas.toDataURL("image/webp", 0.85);
  if (data.length > CARD_IMAGE_MAX_CHARS) data = canvas.toDataURL("image/jpeg", 0.75);
  if (data.length > CARD_IMAGE_MAX_CHARS) throw new Error("That image is too detailed to use. Try a simpler or smaller one.");
  return data;
}
