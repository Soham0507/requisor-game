import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

/**
 * Global game state. The GameCanvas updates these through setters
 * so the Header (and any other consumer) renders score / health / level
 * in real-time.
 */
export type GameStatus = "idle" | "running" | "paused" | "over";

export interface LeaderboardEntry {
  name: string;
  score: number;
  level: number;
  date: string;
}

// Captured at game-over alongside (but separate from) the leaderboard
// callsign — an email so a real follow-up is possible, not just an 8-char
// arcade handle. Persisted client-side for now; wiring this to a real
// backend/database is a separate follow-up.
export interface PlayerInfoEntry {
  name: string;
  email: string;
  score: number;
  level: number;
  date: string;
}

export interface Settings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  difficulty: "easy" | "normal" | "hard";
  sensitivity: number; // 0.5 - 2.0
}

interface GameState {
  score: number;
  health: number;
  level: number;
  status: GameStatus;
  leaderboard: LeaderboardEntry[];
  settings: Settings;
  setScore: (n: number | ((prev: number) => number)) => void;
  setHealth: (n: number | ((prev: number) => number)) => void;
  setLevel: (n: number | ((prev: number) => number)) => void;
  setStatus: (s: GameStatus) => void;
  resetGame: () => void;
  submitScore: (name: string) => void;
  submitPlayerInfo: (name: string, email: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

const STORAGE_KEY = "game-dashboard:state-v1";
const PLAYER_INFO_STORAGE_KEY = "game-dashboard:player-info-v1";

const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  musicEnabled: false,
  difficulty: "normal",
  sensitivity: 1,
};

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { name: "NOVA", score: 4820, level: 7, date: "2026-04-01" },
  { name: "ZERO", score: 3650, level: 6, date: "2026-04-03" },
  { name: "ECHO", score: 2940, level: 5, date: "2026-04-05" },
  { name: "FLUX", score: 2110, level: 4, date: "2026-04-08" },
  { name: "VOID", score: 1480, level: 3, date: "2026-04-12" },
];

const GameContext = createContext<GameState | null>(null);

// Read persisted state (leaderboard + settings) from localStorage.
function loadPersisted(): { leaderboard: LeaderboardEntry[]; settings: Settings } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { leaderboard: DEFAULT_LEADERBOARD, settings: DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<{
      leaderboard: LeaderboardEntry[];
      settings: Settings;
    }>;
    return {
      leaderboard: parsed.leaderboard ?? DEFAULT_LEADERBOARD,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return { leaderboard: DEFAULT_LEADERBOARD, settings: DEFAULT_SETTINGS };
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const initial = loadPersisted();

  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initial.leaderboard);
  const [settings, setSettings] = useState<Settings>(initial.settings);

  const persist = useCallback(
    (next: { leaderboard?: LeaderboardEntry[]; settings?: Settings }) => {
      try {
        const current = loadPersisted();
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            leaderboard: next.leaderboard ?? current.leaderboard,
            settings: next.settings ?? current.settings,
          }),
        );
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const resetGame = useCallback(() => {
    setScore(0);
    setHealth(100);
    setLevel(1);
    setStatus("running");
  }, []);

  const submitScore = useCallback(
    (name: string) => {
      const entry: LeaderboardEntry = {
        name: (name || "PLAYER").slice(0, 8).toUpperCase(),
        score,
        level,
        date: new Date().toISOString().slice(0, 10),
      };
      const next = [...leaderboard, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      setLeaderboard(next);
      persist({ leaderboard: next });
    },
    [score, level, leaderboard, persist],
  );

  const submitPlayerInfo = useCallback(
    (name: string, email: string) => {
      const entry: PlayerInfoEntry = {
        name: name.trim(),
        email: email.trim(),
        score,
        level,
        date: new Date().toISOString(),
      };
      try {
        const raw = localStorage.getItem(PLAYER_INFO_STORAGE_KEY);
        const existing: PlayerInfoEntry[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(PLAYER_INFO_STORAGE_KEY, JSON.stringify([...existing, entry]));
      } catch {
        /* ignore — nothing else here depends on this succeeding */
      }

      // Also send it to the shared player_submissions table (api-server),
      // so it's a real lead an operator can see across every game, not
      // just this browser's own localStorage. `orderId` is only present
      // when this build was opened through a finalized live link (see
      // customize.tsx) — absent on a raw/dev preview, which is fine, the
      // row just isn't tied to a specific brand order.
      const orderId = new URLSearchParams(window.location.search).get("orderId");
      fetch("/api/player-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameSlug: "space-shooter-1",
          orderId,
          name: entry.name,
          email: entry.email,
          extra: { score, level },
        }),
      }).catch(() => {
        /* best-effort — the local leaderboard save above already succeeded */
      });
    },
    [score, level],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      persist({ settings: next });
    },
    [settings, persist],
  );

  const value = useMemo<GameState>(
    () => ({
      score,
      health,
      level,
      status,
      leaderboard,
      settings,
      setScore,
      setHealth,
      setLevel,
      setStatus,
      resetGame,
      submitScore,
      submitPlayerInfo,
      updateSettings,
    }),
    [score, health, level, status, leaderboard, settings, resetGame, submitScore, submitPlayerInfo, updateSettings],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameState {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within a <GameProvider>");
  return ctx;
}
