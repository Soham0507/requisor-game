import type { Score as ImportedScore } from "@shared/schema";

export type Score = Omit<ImportedScore, "id" | "playerEmail"> & {
  id: string | number;
};

// Imported games shared "avx-*" keys. Do not mix another game's cached
// rankings or offline submissions into Soccer's newly connected leaderboard.
// A live link (order) is its own session: it only ever sees and queues its own
// rounds, so two events running the same game never share a leaderboard.
const rawOrderId = new URLSearchParams(window.location.search).get("orderId");
export const soccerOrderId =
  rawOrderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawOrderId) ? rawOrderId : null;
export const soccerOrderQuery = soccerOrderId ? `&orderId=${soccerOrderId}` : "";
const storagePrefix = `requisor-soccer:${soccerOrderId ?? "preview"}:`;

export const soccerStorage = {
  getItem: (key: string) => window.localStorage.getItem(`${storagePrefix}${key}`),
  setItem: (key: string, value: string) => window.localStorage.setItem(`${storagePrefix}${key}`, value),
};

// In a portal preview, keep API requests inside the containing artifact.
// The standalone imported server continues to use its original endpoint.
const previewMarker = "/game-previews/soccer-shootout";
const previewIndex = window.location.pathname.indexOf(previewMarker);
export const soccerScoresUrl = previewIndex >= 0
  ? `${window.location.pathname.slice(0, previewIndex)}/api/games/soccer-shootout/scores`
  : "/api/scores";
