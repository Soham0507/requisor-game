import type { Score as ImportedScore } from "@shared/schema";

export type Score = Omit<ImportedScore, "id" | "playerEmail"> & {
  id: string | number;
};

// Imported games shared "avx-*" keys. Do not mix another game's cached
// rankings or offline submissions into Soccer's newly connected leaderboard.
export const soccerStorage = {
  getItem: (key: string) => window.localStorage.getItem(`requisor-soccer:${key}`),
  setItem: (key: string, value: string) => window.localStorage.setItem(`requisor-soccer:${key}`, value),
};

// In a portal preview, keep API requests inside the containing artifact.
// The standalone imported server continues to use its original endpoint.
const previewMarker = "/game-previews/soccer-shootout";
const previewIndex = window.location.pathname.indexOf(previewMarker);
export const soccerScoresUrl = previewIndex >= 0
  ? `${window.location.pathname.slice(0, previewIndex)}/api/games/soccer-shootout/scores`
  : "/api/scores";
