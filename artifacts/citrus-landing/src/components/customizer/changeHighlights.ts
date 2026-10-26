import type { BrandThemeMessage } from "./GamePreviewFrame";

/**
 * Works out what a branding edit actually changed inside the embedded game.
 * The preview is same-origin, so the customizer can snapshot the game's DOM
 * before and after pushing a theme update and diff the two. That finds the
 * exact elements that changed in every game without per-game code.
 */

type Category = "color" | "image" | "size" | "text" | "font";

interface FieldInfo {
  label: string;
  categories: Category[];
}

const FIELDS: Partial<Record<keyof BrandThemeMessage, FieldInfo>> = {
  primaryColor: { label: "Primary color", categories: ["color"] },
  secondaryColor: { label: "Secondary color", categories: ["color"] },
  accentColor: { label: "Accent color", categories: ["color"] },
  navbarColor: { label: "Navbar color", categories: ["color"] },
  brandNameColor: { label: "Brand name color", categories: ["color"] },
  headingColor: { label: "Title color", categories: ["color"] },
  logoUrl: { label: "Logo", categories: ["image"] },
  logoSize: { label: "Logo size", categories: ["size"] },
  brandName: { label: "Brand name", categories: ["text"] },
  brandNameSize: { label: "Brand name size", categories: ["size"] },
  heading: { label: "Game title", categories: ["text"] },
  headingSize: { label: "Game title size", categories: ["size"] },
  tagline: { label: "Tagline", categories: ["text"] },
  bgUrl: { label: "Background", categories: ["image", "color"] },
  fontUrl: { label: "Font", categories: ["font"] },
  gameContent: { label: "Game content", categories: ["text", "image"] },
  quiz: { label: "Quiz questions", categories: ["text"] },
};

export interface ChangedFields {
  labels: string[];
  categories: Set<Category>;
}

export function changedFields(prev: BrandThemeMessage, next: BrandThemeMessage): ChangedFields {
  const labels: string[] = [];
  const categories = new Set<Category>();
  for (const key of Object.keys(FIELDS) as (keyof BrandThemeMessage)[]) {
    if (JSON.stringify(prev[key] ?? null) === JSON.stringify(next[key] ?? null)) continue;
    const info = FIELDS[key]!;
    labels.push(info.label);
    info.categories.forEach((c) => categories.add(c));
  }
  return { labels, categories };
}

type Signature = Record<Category, string>;
/**
 * Keyed by each element's position in the page (tag and sibling index down
 * from <body>), not by the element itself: some games rebuild their whole
 * tree on every branding update, so the same on-screen element is a new DOM
 * node afterwards.
 */
export type Snapshot = Map<string, Signature>;

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "HEAD", "TITLE", "NOSCRIPT", "BR"]);
const MEDIA_TAGS = new Set(["IMG", "VIDEO", "CANVAS"]);
const MAX_ELEMENTS = 4000;

function ownText(el: Element): string {
  let text = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) text += n.textContent ?? "";
  });
  return text.trim();
}

export function takeSnapshot(doc: Document): Snapshot {
  const snapshot: Snapshot = new Map();
  const win = doc.defaultView;
  if (!win || !doc.body) return snapshot;
  const all = doc.body.querySelectorAll("*");
  const limit = Math.min(all.length, MAX_ELEMENTS);
  const paths = new Map<Element, string>();
  paths.set(doc.body, "body");
  for (let i = 0; i < limit; i++) {
    const el = all[i];
    // Document order lists a parent before its children, so its path exists.
    let index = 0;
    for (let sib = el.previousElementSibling; sib; sib = sib.previousElementSibling) index++;
    const path = `${paths.get(el.parentElement as Element) ?? ""}>${el.tagName}:${index}`;
    paths.set(el, path);
    if (SKIP_TAGS.has(el.tagName)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const cs = win.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const text = ownText(el);
    const isMedia = MEDIA_TAGS.has(el.tagName) || el instanceof win.SVGSVGElement;
    const src =
      el instanceof win.HTMLImageElement || el instanceof win.HTMLVideoElement ? el.currentSrc || el.src : "";
    snapshot.set(path, {
      // Text color only counts where the element draws text, so a color change
      // that merely inherits down a tree does not light up every wrapper.
      color: [
        text ? cs.color : "",
        cs.backgroundColor,
        cs.borderTopColor,
        cs.backgroundImage,
        el instanceof win.SVGElement ? cs.fill : "",
      ].join("|"),
      image: [src, cs.backgroundImage.includes("url(") ? cs.backgroundImage : ""].join("|"),
      size: [isMedia ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : "", text ? cs.fontSize : ""].join("|"),
      text,
      font: text ? cs.fontFamily : "",
    });
  }
  return snapshot;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Covers most of the screen (a background): drawn as an inset frame. */
  full: boolean;
}

function overlaps(a: Box, b: Box, gap: number): boolean {
  return a.x <= b.x + b.w + gap && b.x <= a.x + a.w + gap && a.y <= b.y + b.h + gap && b.y <= a.y + a.h + gap;
}

function mergeBoxes(boxes: Box[]): Box[] {
  const out = [...boxes];
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) {
      for (let j = i + 1; j < out.length && !merged; j++) {
        if (!overlaps(out[i], out[j], 10)) continue;
        const x = Math.min(out[i].x, out[j].x);
        const y = Math.min(out[i].y, out[j].y);
        const w = Math.max(out[i].x + out[i].w, out[j].x + out[j].w) - x;
        const h = Math.max(out[i].y + out[i].h, out[j].y + out[j].h) - y;
        out.splice(j, 1);
        out[i] = { x, y, w, h, full: false };
        merged = true;
      }
    }
  }
  return out;
}

/** Elements that changed in the given categories, as boxes in the game's own viewport coordinates. */
export function diffSnapshots(before: Snapshot, after: Snapshot, categories: Set<Category>, doc: Document): Box[] {
  const view = doc.defaultView;
  if (!view || !doc.body) return [];
  const viewArea = Math.max(1, view.innerWidth * view.innerHeight);
  const boxes: Box[] = [];
  // Resolve each position back to the element now living there.
  const live = new Map<string, Element>();
  const all = doc.body.querySelectorAll("*");
  const paths = new Map<Element, string>([[doc.body, "body"]]);
  for (let i = 0; i < Math.min(all.length, MAX_ELEMENTS); i++) {
    const el = all[i];
    let index = 0;
    for (let sib = el.previousElementSibling; sib; sib = sib.previousElementSibling) index++;
    const path = `${paths.get(el.parentElement as Element) ?? ""}>${el.tagName}:${index}`;
    paths.set(el, path);
    live.set(path, el);
  }
  after.forEach((sig, path) => {
    const el = live.get(path);
    if (!el || !el.isConnected) return;
    const prev = before.get(path);
    let changed = false;
    if (!prev) {
      // A brand-new image/video (e.g. a logo that did not exist before).
      changed = categories.has("image") && MEDIA_TAGS.has(el.tagName) && el.tagName !== "CANVAS";
    } else {
      for (const c of categories) {
        if (prev[c] !== sig[c]) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;
    const r = el.getBoundingClientRect();
    if (r.right < 0 || r.bottom < 0 || r.left > view.innerWidth || r.top > view.innerHeight) return;
    const full = (r.width * r.height) / viewArea > 0.6;
    boxes.push({ x: r.left, y: r.top, w: r.width, h: r.height, full });
  });
  const fulls = boxes.filter((b) => b.full).slice(0, 1);
  const rest = mergeBoxes(boxes.filter((b) => !b.full));
  return [...fulls, ...rest.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 8)];
}
