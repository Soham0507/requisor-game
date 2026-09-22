import { db, gamesTable, type InsertGame } from "@workspace/db";
import { sql } from "drizzle-orm";

const GAMES: InsertGame[] = [
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
    defaultHeading: "47-Day Shootout",
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
];

async function main() {
  for (const game of GAMES) {
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
