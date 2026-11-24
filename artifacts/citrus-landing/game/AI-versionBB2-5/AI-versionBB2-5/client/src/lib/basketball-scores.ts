import { useQuery } from "@tanstack/react-query";
import type { Score as ImportedScore, InsertScore } from "@shared/schema";

export type Score = Omit<ImportedScore, "id" | "playerEmail"> & { id: string | number };
export type ScoreInput = InsertScore & { submissionId: string };

const marker = "/game-previews/basketball-shootout";
const previewIndex = window.location.pathname.indexOf(marker);
export const basketballScoresUrl = previewIndex >= 0
  ? `${window.location.pathname.slice(0, previewIndex)}/api/games/basketball-shootout/scores`
  : "/api/scores";

// A live link (order) is its own session: rounds are saved to, and rankings read
// from, that order only, so two events on the same game never share a board.
const rawOrderId = new URLSearchParams(window.location.search).get("orderId");
export const basketballOrderId =
  rawOrderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawOrderId) ? rawOrderId : null;
const orderQuery = basketballOrderId ? `&orderId=${basketballOrderId}` : "";

// No persistent ranking or contact cache. Never read imported games' shared
// avx-* storage, nor present an unconfirmed local score as a saved result.
export function useBasketballLeaderboard(limit: number) {
  return useQuery<Score[]>({
    queryKey: [basketballScoresUrl, { limit, orderId: basketballOrderId }],
    queryFn: async () => {
      const response = await fetch(`${basketballScoresUrl}?limit=${limit}${orderQuery}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Rankings are unavailable. Please retry.");
      return response.json();
    },
    refetchInterval: 5000,
    retry: false,
  });
}

export async function submitBasketballScore(input: ScoreInput): Promise<Score> {
  let response: Response;
  try {
    response = await fetch(basketballScoresUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, orderId: basketballOrderId ?? undefined }),
    });
  } catch {
    throw new Error("Save not confirmed. Check your connection and retry before leaving this screen.");
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "Please check your player details and email address.",
      409: "This round was already saved with different details. Restore the original details to retry.",
      429: "Too many submissions. Please retry in a minute.",
    };
    throw new Error(messages[response.status] ?? "Your score could not be saved. Please retry.");
  }
  return response.json();
}
