import { db, gamesTable, FIVEGAMES_CATALOG, type InsertGame } from "@workspace/db";
import { sql } from "drizzle-orm";

const GAMES: InsertGame[] = [
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
    tagline: "Temple-run style endless runner with a cybersecurity theme. Dodge phishing attacks, block malware.",
    thumbnailUrl: null,
    folderPath: "artifacts/citrus-landing/game/Cybergame",
    previewBasePath: null,
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
    tagline: "Gesture-based controls, real-time scoring, and smooth gameplay mechanics.",
    thumbnailUrl: null,
    folderPath: "artifacts/citrus-landing/game/AI-versionBB2-5",
    previewBasePath: null,
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
    previewBasePath: null,
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
    previewBasePath: null,
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
    name: "Boat Booth",
    tagline: "AI photo booth kiosk — snap a webcam selfie and get transported onto the water in a photoreal video.",
    thumbnailUrl: null,
    folderPath: "artifacts/citrus-landing/game/On-The-Fly-Video/On-The-Fly-Video",
    previewBasePath: null,
    brandSupport: "full",
    defaultPrimaryColor: "#0ea5e9",
    defaultSecondaryColor: "#0369a1",
    defaultAccentColor: "#0ea5e9",
    defaultLogoUrl: null,
    defaultHeading: "Boat Booth",
    priceCents: 5900,
  },

  {
    slug: "lexus-energy-quiz",
    name: "Lexus Energy Quiz",
    tagline: "5-question multiple-choice quiz that matches a driver's energy and lifestyle preferences to a result.",
    thumbnailUrl: "/logo/lexus-quiz.jpg",
    folderPath: "artifacts/citrus-landing/game/Lexus",
    previewBasePath: "/game-previews/lexus-energy-quiz/",
    brandSupport: "full",
    defaultPrimaryColor: "#1a1a1a",
    defaultSecondaryColor: "#c8102e",
    defaultAccentColor: "#8a8d8f",
    defaultLogoUrl: null,
    defaultHeading: "Energy Quiz",
    priceCents: 5900,
  },
];

async function main() {
  const requestedSlug = process.argv[2];
  const games = requestedSlug ? GAMES.filter((game) => game.slug === requestedSlug) : GAMES;
  if (requestedSlug && games.length === 0) {
    throw new Error(`Unknown game slug: ${requestedSlug}`);
  }
  for (const game of games) {
    await db
      .insert(gamesTable)
      .values(game)
      .onConflictDoUpdate({
        target: gamesTable.slug,
        set: { ...game, slug: sql`excluded.slug` },
      });
    console.log(`Seeded game: ${game.slug}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
