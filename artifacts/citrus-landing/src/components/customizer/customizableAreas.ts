import { QUESTION_GAME_SLUGS } from "@workspace/game-content";
import type { BrandThemeMessage } from "./GamePreviewFrame";
import {
  ACCENT_COLOR_SLUGS,
  BACKGROUND_MEDIA_SLUGS,
  HIDDEN_THEME_COLOR_SLUGS,
  NAVBAR_COLOR_DEFAULTS,
  PRODUCT_IMAGE_SLUGS,
  SECONDARY_COLOR_SLUGS,
  TAGLINE_HIDDEN_SLUGS,
} from "./BrandingForm";

export interface CustomizableArea {
  id: string;
  label: string;
  description: string;
  /** Sample edit that makes the area show up in the preview. Absent = listed only. */
  demo?: (theme: BrandThemeMessage) => BrandThemeMessage;
}

// Base64, like a real upload: some games only accept that form of data URL.
const svgUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;

const SAMPLE_LOGO = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="48" fill="#f97316"/><text x="120" y="142" font-family="Arial,sans-serif" font-size="52" font-weight="800" fill="#fff" text-anchor="middle">LOGO</text></svg>`,
);
const SAMPLE_IMAGE = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><text x="640" y="380" font-family="Arial,sans-serif" font-size="96" font-weight="800" fill="#fff" text-anchor="middle">YOUR IMAGE</text></svg>`,
);

/** What a customer can change for this game, mirroring the options in the customizer form. */
export function customizableAreas(slug: string): CustomizableArea[] {
  const areas: CustomizableArea[] = [
    {
      id: "logo",
      label: "Logo",
      description: "Your logo, placed where the game shows branding.",
      demo: (t) => ({ ...t, logoUrl: SAMPLE_LOGO }),
    },
    {
      id: "heading",
      label: "Game title",
      description: "The name shown on the game, with your own size and color.",
      demo: (t) => ({ ...t, heading: "Your Game Title" }),
    },
  ];
  if (!TAGLINE_HIDDEN_SLUGS.has(slug)) {
    areas.push({
      id: "tagline",
      label: "Tagline",
      description: "An optional line under the title.",
      demo: (t) => ({ ...t, tagline: "Your tagline goes here" }),
    });
  }
  if (!HIDDEN_THEME_COLOR_SLUGS.has(slug)) {
    areas.push({
      id: "primary",
      label: "Primary color",
      description: "Main buttons, highlights and key accents.",
      demo: (t) => ({ ...t, primaryColor: "#e11d48" }),
    });
    if (SECONDARY_COLOR_SLUGS.has(slug)) {
      areas.push({
        id: "secondary",
        label: "Secondary color",
        description: "Supporting panels and buttons.",
        demo: (t) => ({ ...t, secondaryColor: "#16a34a" }),
      });
    }
    if (ACCENT_COLOR_SLUGS.has(slug)) {
      areas.push({
        id: "accent",
        label: "Accent color",
        description: "Animated background and small details.",
        demo: (t) => ({ ...t, accentColor: "#facc15" }),
      });
    }
  }
  if (NAVBAR_COLOR_DEFAULTS[slug]) {
    areas.push({
      id: "navbar",
      label: "Navbar color",
      description: "The top bar that carries your title and logos.",
      demo: (t) => ({ ...t, navbarColor: "#e11d48" }),
    });
  }
  if (BACKGROUND_MEDIA_SLUGS.has(slug)) {
    areas.push({
      id: "background",
      label: "Background image or video",
      description: "Replaces the landing-screen background.",
      demo: (t) => ({ ...t, bgUrl: SAMPLE_IMAGE }),
    });
  }
  if (PRODUCT_IMAGE_SLUGS.has(slug)) {
    areas.push({
      id: "product",
      label: "Product image",
      description: "Shown on the face-down cards.",
      demo: (t) => ({ ...t, bgUrl: SAMPLE_IMAGE }),
    });
  }
  areas.push({
    id: "font",
    label: "Font",
    description: "Upload your own brand font for the title text.",
  });
  if (QUESTION_GAME_SLUGS.includes(slug)) {
    areas.push({
      id: "questions",
      label: "Questions and answers",
      description: "Write your own questions, answers and correct choices.",
    });
  }
  return areas;
}
