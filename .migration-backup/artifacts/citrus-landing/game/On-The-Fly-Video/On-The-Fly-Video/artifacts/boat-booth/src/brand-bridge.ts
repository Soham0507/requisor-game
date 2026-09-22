import { useSyncExternalStore } from "react";

/**
 * Reference implementation of the branding contract documented in
 * `game/BRANDING_CONTRACT.md`. Listens for `CDH_BRAND_UPDATE` postMessages
 * from a host page (the branding customizer), applies the theme to
 * `window.__BRAND__` and to `--primary`/`--secondary`/`--accent` CSS custom
 * properties (this app's colors are Tailwind utilities like `bg-primary`
 * driven by those vars, in `H S% L%` triplet form — see `index.css`), and
 * notifies React via `useBrand()`. Falls back to a generic "Brand Name"
 * placeholder when no host ever sends a theme.
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

const DEFAULT_THEME: BrandTheme = {
  primaryColor: "#0ea5e9",
  secondaryColor: "#0369a1",
  accentColor: "#0ea5e9",
  logoUrl: null,
  logoSize: 36,
  brandName: "Brand Name",
  brandNameSize: 16,
  brandNameColor: "#ffffff",
  heading: "See Yourself On The Water",
  headingSize: 56,
  headingColor: "#ffffff",
  tagline:
    "Step up, strike a pose, and let us transport you to your perfect boat day. Get a free custom photo and video instantly.",
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

/** Converts a `#rrggbb` hex color to an `"H S% L%"` triplet for shadcn-style CSS vars. */
function hexToHslTriplet(hex: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const int = parseInt(match[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(theme: Partial<BrandTheme>) {
  const next = { ...window.__BRAND__, ...theme };
  if (!next.brandName) next.brandName = DEFAULT_THEME.brandName;
  if (!next.heading) next.heading = DEFAULT_THEME.heading;
  window.__BRAND__ = next;

  const root = document.documentElement;
  const primary = hexToHslTriplet(next.primaryColor);
  const secondary = hexToHslTriplet(next.secondaryColor);
  const accent = hexToHslTriplet(next.accentColor);
  if (primary) root.style.setProperty("--primary", primary);
  if (secondary) root.style.setProperty("--secondary", secondary);
  if (accent) root.style.setProperty("--accent", accent);
  void applyCustomFont(next.fontUrl);

  for (const listener of listeners) listener();
}

window.addEventListener("message", (event: MessageEvent) => {
  if (event.data?.type === "CDH_BRAND_UPDATE") {
    applyTheme(event.data.theme as Partial<BrandTheme>);
  }
});

/**
 * A game hub can hand off a branding chosen elsewhere via URL query params,
 * e.g. "?brandName=...&heading=...&primaryColor=%23ff2bd6" — no
 * iframe/postMessage host required. Takes precedence over the defaults.
 */
function themeFromQueryParams(): Partial<BrandTheme> {
  const params = new URLSearchParams(window.location.search);
  const theme: Partial<BrandTheme> = {};
  if (params.has("brandName")) theme.brandName = params.get("brandName") || DEFAULT_THEME.brandName;
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

export function useBrand(): BrandTheme {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => window.__BRAND__,
  );
}
