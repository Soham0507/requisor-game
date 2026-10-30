import { sql } from "drizzle-orm";
import { db, gamesTable, FIVEGAMES_CATALOG, type InsertGame } from "@workspace/db";

const DEFAULT_GAMES: InsertGame[] = [
  ...FIVEGAMES_CATALOG,
  {
    slug: "space-shooter-1",
    name: "Space Shooter",
    tagline: "Fast-paced 2D space shooter with a neon HUD dashboard.",
    thumbnailUrl: null,
    folderPath: "artifacts/games/space-shooter-1",
    previewBasePath: "/game-previews/space-shooter-1/",
    brandSupport: "full",
    defaultPrimaryColor: "#00f0ff",
    defaultSecondaryColor: "#ff2bd6",
    defaultAccentColor: "#a6ff3d",
    defaultLogoUrl: null,
    defaultHeading: "Space Shooter",
    priceCents: 4900,
  },
  {
    slug: "cyber-adventure",
    name: "Cyber Adventure",
    tagline:
      "Temple-run style endless runner with a cybersecurity theme. Dodge phishing attacks, block malware.",
    thumbnailUrl: null,
    folderPath: "artifacts/citrus-landing/game/Cybergame",
    previewBasePath: "/game-previews/cyber-adventure/",
    brandSupport: "full",
    defaultPrimaryColor: "#a855f7",
    defaultSecondaryColor: "#ec4899",
    defaultAccentColor: "#a855f7",
    defaultLogoUrl: null,
    defaultHeading: "GestureSec Runner",
    priceCents: 5900,
  },
  {
    slug: "basketball-shootout",
    name: "Basketball Shootout",
    tagline:
      "Gesture-based controls, real-time scoring, and smooth gameplay mechanics.",
    thumbnailUrl: null,
    folderPath: "artifacts/citrus-landing/game/AI-versionBB2-5",
    previewBasePath: "/game-previews/basketball-shootout/",
    brandSupport: "full",
    defaultPrimaryColor: "#f97316",
    defaultSecondaryColor: "#fbbf24",
    defaultAccentColor: "#f97316",
    defaultLogoUrl: null,
    defaultHeading: "Your Tagline",
    priceCents: 4900,
  },
  {
    slug: "soccer-shootout",
    name: "Soccer Shootout",
    tagline:
      "Gesture-controlled soccer shootout: beat the clock and score goals with real-time hand tracking.",
    thumbnailUrl: null,
    folderPath: "artifacts/citrus-landing/game/Soccer",
    previewBasePath: "/game-previews/soccer-shootout/",
    brandSupport: "full",
    defaultPrimaryColor: "#E42E20",
    defaultSecondaryColor: "#FFBF40",
    defaultAccentColor: "#E42E20",
    defaultLogoUrl: null,
    defaultHeading: "Soccer Shootout",
    priceCents: 4900,
  },
  {
    slug: "gesture-space-war",
    name: "Gesture Space War",
    tagline: "Webcam gesture-controlled space combat.",
    thumbnailUrl: null,
    folderPath: "artifacts/citrus-landing/game/Gesture-Space-War",
    previewBasePath: "/game-previews/gesture-space-war/",
    brandSupport: "full",
    defaultPrimaryColor: "#22c55e",
    defaultSecondaryColor: "#38bdf8",
    defaultAccentColor: "#22c55e",
    defaultLogoUrl: null,
    defaultHeading: "Space Survivor",
    priceCents: 5900,
  },
  {
    slug: "boat-booth",
    name: "AI Photo Experience",
    tagline:
      "AI photo booth kiosk — snap a webcam selfie and get transported onto the water in a photoreal video.",
    thumbnailUrl: null,
    folderPath:
      "artifacts/citrus-landing/game/On-The-Fly-Video/On-The-Fly-Video",
    previewBasePath: "/game-previews/boat-booth/",
    brandSupport: "chrome_only",
    defaultPrimaryColor: "#0ea5e9",
    defaultSecondaryColor: "#0369a1",
    defaultAccentColor: "#0ea5e9",
    defaultLogoUrl: null,
    defaultHeading: "AI Photo Experience",
    priceCents: 5900,
  },
  {
    slug: "golf-challenge",
    name: "Golf Challenge",
    tagline:
      "Premium timed putting challenge with a live scoreboard, power control, and branded course visuals.",
    thumbnailUrl: null,
    folderPath: "coming-soon/golf-challenge",
    previewBasePath: null,
    brandSupport: "chrome_only",
    defaultPrimaryColor: "#d6b15a",
    defaultSecondaryColor: "#16251a",
    defaultAccentColor: "#f3e3a2",
    defaultLogoUrl: null,
    defaultHeading: "Golf Challenge",
    priceCents: 0,
  },
  {
    slug: "jeopardy",
    name: "Jeopardy",
    tagline:
      "A branded trivia board experience with themed categories, escalating challenges, and live leaderboard play.",
    thumbnailUrl: "/logo/jeopardy.png",
    folderPath: "artifacts/citrus-landing/game/jeoparady/frontend",
    previewBasePath: "/game-previews/jeopardy/",
    brandSupport: "full",
    defaultPrimaryColor: "#00384f",
    defaultSecondaryColor: "#f0cf3a",
    defaultAccentColor: "#4aa7bd",
    defaultLogoUrl: null,
    defaultHeading: "Jeopardy",
    priceCents: 0,
  },
];

export async function ensureDefaultGames() {
  for (const game of DEFAULT_GAMES) {
    await db
      .insert(gamesTable)
      .values(game)
      .onConflictDoUpdate({
        target: gamesTable.slug,
        set: { ...game, slug: sql`excluded.slug` },
      });
  }
}