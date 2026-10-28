import type { InsertGame } from "./schema";

const SOURCE = "artifacts/citrus-landing/game/fivegames";

/** Shared by automatic catalog bootstrap and the explicit seed command. */
export const FIVEGAMES_CATALOG: InsertGame[] = [
  ["a8-match", "Match", "Five personality questions match each player with a product and reveal a personalized result."],
  ["a8-trivia-rush", "Trivia Rush", "A 60-second trivia challenge with rapid-fire questions, streak bonuses, and a leaderboard."],
  ["a8-the-number", "The Number", "Guess brand facts and product statistics using an interactive number dial."],
  ["a8-spin-to-win", "Spin to Win", "Answer three questions, grow your prize chances, and spin the reward wheel."],
  ["a8-recall", "Memory", "Flip cards and match six pairs against the clock, with your brand on every card."],
].map(([slug, name, tagline]) => ({
  slug,
  name,
  tagline,
  thumbnailUrl: `/logo/${slug}.svg`,
  folderPath: SOURCE,
  previewBasePath: `/game-previews/${slug}/`,
  brandSupport: "full",
  defaultPrimaryColor: "#0A84FF",
  defaultSecondaryColor: "#0056B3",
  defaultAccentColor: "#FFB340",
  defaultLogoUrl: null,
  defaultHeading: name,
  priceCents: 0,
}));