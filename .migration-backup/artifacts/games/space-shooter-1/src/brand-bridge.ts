import { useSyncExternalStore } from "react";

/**
 * Reference implementation of the branding contract documented in
 * `game/BRANDING_CONTRACT.md`. Listens for `CDH_BRAND_UPDATE` postMessages
 * from a host page (the branding customizer), applies the theme to CSS vars
 * + `window.__BRAND__` (read by GameCanvas/Sidebar), and notifies React via
 * `useBrand()`. Falls back to today's exact neon palette when no host ever
 * sends a theme, so the game looks identical when played standalone.
 */
export interface BrandTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  logoSize: number;
  brandName: string;
  brandNameSize: number;
  brandNameColor: string;
  heading: string;
  headingSize: number;
  headingColor: string;
  tagline: string;
  // Custom uploaded font (woff2/woff/ttf/otf) applied to the brand name and
  // heading text. null falls back to the game's own default font.
  fontUrl: string | null;
}

// Brand name defaults bigger than the game title — it's the customer's
// identity, the title is secondary/descriptive text underneath it.
const DEFAULT_THEME: BrandTheme = {
  primaryColor: "#00f0ff",
  secondaryColor: "#ff2bd6",
  accentColor: "#a6ff3d",
  logoUrl: null,
  logoSize: 28,
  brandName: "",
  brandNameSize: 16,
  brandNameColor: "#ffffff",
  heading: "Space Shooter",
  headingSize: 11,
  headingColor: "#94a3b8",
  tagline: "",
  fontUrl: null,
};

/**
 * Loads a custom font from a data:/blob:/https: URL via the FontFace API and
 * registers it as "BrandCustomFont", then exposes it through the
 * `--brand-font` CSS var so text elements can opt in with
 * `fontFamily: "var(--brand-font, inherit)"`. Falls back to the game's own
 * font (removes the var) on load failure or when unset.
 */
let loadedFontUrl: string | null = null;
async function applyCustomFont(url: string | null): Promise<void> {
  if (url === loadedFontUrl) return;
  loadedFontUrl = url;
  if (!url) {
    document.documentElement.style.removeProperty("--brand-font");
    return;
  }
  try {
    const face = new FontFace("BrandCustomFont", `url(${JSON.stringify(url)})`);
    await face.load();
    document.fonts.add(face);
    if (loadedFontUrl === url) {
      document.documentElement.style.setProperty("--brand-font", '"BrandCustomFont"');
    }
  } catch {
    // Invalid/unsupported font file — keep the previous font rather than breaking the UI.
  }
}

declare global {
  interface Window {
    __BRAND__: BrandTheme;
  }
}

window.__BRAND__ = { ...DEFAULT_THEME };

const listeners = new Set<() => void>();

function applyTheme(theme: Partial<BrandTheme>) {
  window.__BRAND__ = { ...window.__BRAND__, ...theme };

  const root = document.documentElement;
  root.style.setProperty("--brand-primary", window.__BRAND__.primaryColor);
  root.style.setProperty("--brand-secondary", window.__BRAND__.secondaryColor);
  root.style.setProperty("--brand-accent", window.__BRAND__.accentColor);
  void applyCustomFont(window.__BRAND__.fontUrl);

  for (const listener of listeners) listener();
}

window.addEventListener("message", (event: MessageEvent) => {
  if (event.data?.type === "CDH_BRAND_UPDATE") {
    applyTheme(event.data.theme as Partial<BrandTheme>);
  }
});

/**
 * A game hub can hand off a branding chosen elsewhere via URL query params,
 * e.g. "?heading=...&tagline=...&primaryColor=%23ff2bd6&logo=..." — no
 * iframe/postMessage host required. Takes precedence over the defaults.
 */
function themeFromQueryParams(): Partial<BrandTheme> {
  const params = new URLSearchParams(window.location.search);
  const theme: Partial<BrandTheme> = {};
  if (params.has("brandName")) theme.brandName = params.get("brandName") || "";
  if (params.has("heading")) theme.heading = params.get("heading") || DEFAULT_THEME.heading;
  if (params.has("tagline")) theme.tagline = params.get("tagline") || "";
  if (params.has("logo")) theme.logoUrl = params.get("logo");
  if (params.has("font")) theme.fontUrl = params.get("font");

  const hex = /^#[0-9a-fA-F]{6}$/;
  const primary = params.get("primaryColor");
  const secondary = params.get("secondaryColor");
  const accent = params.get("accentColor");
  if (primary && hex.test(primary)) theme.primaryColor = primary;
  if (secondary && hex.test(secondary)) theme.secondaryColor = secondary;
  if (accent && hex.test(accent)) theme.accentColor = accent;

  const brandNameColor = params.get("brandNameColor");
  const headingColor = params.get("headingColor");
  if (brandNameColor && hex.test(brandNameColor)) theme.brandNameColor = brandNameColor;
  if (headingColor && hex.test(headingColor)) theme.headingColor = headingColor;

  const logoSize = Number(params.get("logoSize"));
  const brandNameSize = Number(params.get("brandNameSize"));
  const headingSize = Number(params.get("headingSize"));
  if (Number.isFinite(logoSize) && logoSize > 0) theme.logoSize = logoSize;
  if (Number.isFinite(brandNameSize) && brandNameSize > 0) theme.brandNameSize = brandNameSize;
  if (Number.isFinite(headingSize) && headingSize > 0) theme.headingSize = headingSize;

  return theme;
}

// Apply defaults as CSS vars immediately, then any hub-provided query params,
// then tell the host (if embedded in an iframe) we're ready for postMessages.
applyTheme({});
applyTheme(themeFromQueryParams());
window.parent.postMessage({ type: "CDH_BRAND_READY" }, "*");

/** Converts a `#rrggbb` hex color to an `rgba(r, g, b, alpha)` string, for style props that need transparency. */
export function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return `rgba(255, 255, 255, ${alpha})`;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function useBrand(): BrandTheme {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => window.__BRAND__,
  );
}
