import { useSyncExternalStore } from "react";

/**
 * Reference implementation of the branding contract documented in
 * `game/BRANDING_CONTRACT.md`. Listens for `CDH_BRAND_UPDATE` postMessages
 * from a host page (the branding customizer), applies the theme to
 * `window.__BRAND__`, and notifies React via `useBrand()`. Falls back to a
 * generic "Brand Name" placeholder and no logo when no host ever sends a
 * theme, so the game never leaks the original AppViewX demo branding.
 */
export interface BrandTheme {
  primaryColor: string;
  logoUrl: string | null;
  logoSize: number;
  brandName: string;
  brandNameSize: number;
  brandNameColor: string;
  heading: string;
  headingSize: number;
  headingColor: string;
  // Landing screen background — currently the one field unique to this
  // game's brand-bridge, since no other game exposes this yet. null falls
  // back to the built-in /newbb/home.mp4 clip.
  bgUrl: string | null;
  // Custom uploaded font (woff2/woff/ttf/otf) applied to the brand name and
  // heading text. null falls back to the game's own default font.
  fontUrl: string | null;
}

const DEFAULT_THEME: BrandTheme = {
  primaryColor: "#FF3627",
  logoUrl: null,
  logoSize: 28,
  brandName: "Brand Name",
  brandNameSize: 16,
  brandNameColor: "#ffffff",
  heading: "47-Day Shootout",
  headingSize: 11,
  headingColor: "#94a3b8",
  bgUrl: null,
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
  const next = { ...window.__BRAND__, ...theme };
  if (!next.brandName) next.brandName = DEFAULT_THEME.brandName;
  if (!next.heading) next.heading = DEFAULT_THEME.heading;
  window.__BRAND__ = next;
  void applyCustomFont(next.fontUrl);
  listeners.forEach((listener) => listener());
}

window.addEventListener("message", (event: MessageEvent) => {
  if (event.data?.type === "CDH_BRAND_UPDATE") {
    applyTheme(event.data.theme as Partial<BrandTheme>);
  }
});

/**
 * A game hub can hand off a branding chosen elsewhere via URL query params,
 * e.g. "?brandName=...&logo=...&bg=...&primaryColor=%23ff2bd6" — no
 * iframe/postMessage host required. Takes precedence over the defaults.
 */
function themeFromQueryParams(): Partial<BrandTheme> {
  const params = new URLSearchParams(window.location.search);
  const theme: Partial<BrandTheme> = {};
  if (params.has("brandName")) theme.brandName = params.get("brandName") || DEFAULT_THEME.brandName;
  if (params.has("heading")) theme.heading = params.get("heading") || DEFAULT_THEME.heading;
  if (params.has("logo")) theme.logoUrl = params.get("logo");
  if (params.has("bg")) theme.bgUrl = params.get("bg");
  if (params.has("font")) theme.fontUrl = params.get("font");

  const hex = /^#[0-9a-fA-F]{6}$/;
  const primary = params.get("primaryColor");
  if (primary && hex.test(primary)) theme.primaryColor = primary;

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

// Apply defaults immediately, then any hub-provided query params, then tell
// the host (if embedded in an iframe) we're ready for postMessages.
applyTheme(themeFromQueryParams());
window.parent.postMessage({ type: "CDH_BRAND_READY" }, "*");

export function useBrand(): BrandTheme {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => window.__BRAND__,
  );
}
