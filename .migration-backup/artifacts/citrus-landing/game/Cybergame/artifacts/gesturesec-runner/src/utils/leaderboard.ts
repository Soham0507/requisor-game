export interface LeaderboardEntry {
  name: string;
  company: string;
  score: number;
  level: number;
  maxCombo: number;
  attacksDefeated: number;
  date: string;
}

const STORAGE_KEY = "gesturesec_leaderboard";
const MAX_ENTRIES = 100;

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

export function saveToLeaderboard(entry: LeaderboardEntry): LeaderboardEntry[] {
  const existing = getLeaderboard();
  const updated = [...existing, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function getRankLabel(score: number): { label: string; color: string } {
  if (score >= 500) return { label: "LEGENDARY", color: "#f59e0b" };
  if (score >= 300) return { label: "ELITE", color: "#a855f7" };
  if (score >= 150) return { label: "ADVANCED", color: "#3b82f6" };
  if (score >= 75)  return { label: "ANALYST", color: "#22d3ee" };
  return { label: "ROOKIE", color: "#9ca3af" };
}
