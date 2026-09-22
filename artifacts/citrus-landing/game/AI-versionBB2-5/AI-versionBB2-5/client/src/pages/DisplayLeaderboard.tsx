import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Image as ImageIcon } from "lucide-react";
import type { Score } from "@shared/schema";
import { useBrand } from "../brand-bridge";

function safeParse(key: string): Score[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function useLeaderboardData() {
  return useQuery<Score[]>({
    queryKey: ["/api/scores", { limit: 100, display: true }],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = safeParse("avx-leaderboard");
        if (cached.length > 0) return cached;
        return safeParse("avx-offline-scores");
      }
      try {
        const res = await fetch("/api/scores?limit=100");
        if (!res.ok) throw new Error("Failed to fetch scores");
        const data = await res.json();
        localStorage.setItem("avx-leaderboard", JSON.stringify(data));
        return data;
      } catch {
        const cached = safeParse("avx-leaderboard");
        if (cached.length > 0) return cached;
        return safeParse("avx-offline-scores");
      }
    },
    refetchInterval: 5000,
    retry: false,
  });
}

const medalColors = [
  {
    bg: "from-yellow-500/30 to-yellow-900/15",
    border: "border-yellow-500/50",
    badge: "bg-yellow-500 text-black",
    text: "text-yellow-300",
    glow: "shadow-yellow-500/20",
  },
  {
    bg: "from-slate-300/20 to-slate-500/10",
    border: "border-slate-400/40",
    badge: "bg-slate-300 text-black",
    text: "text-slate-200",
    glow: "shadow-slate-400/15",
  },
  {
    bg: "from-amber-700/25 to-amber-900/10",
    border: "border-amber-600/40",
    badge: "bg-amber-600 text-black",
    text: "text-amber-400",
    glow: "shadow-amber-500/15",
  },
];

export default function DisplayLeaderboard() {
  const brand = useBrand();
  const { data: leaderboard = [] } = useLeaderboardData();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateScale = () => {
      const scaleX = window.innerWidth / 1280;
      const scaleY = window.innerHeight / 1600;
      const scale = Math.min(scaleX, scaleY);
      el.style.setProperty("--display-scale", String(scale));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const maxVisible = 15;
  const visibleScores = leaderboard.slice(0, maxVisible);

  return (
    <div
      className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden"
      data-testid="display-leaderboard-wrapper"
    >
      <div
        ref={containerRef}
        className="flex flex-col overflow-hidden relative"
        style={{
          width: "1280px",
          height: "1600px",
          transform: "scale(var(--display-scale, 1))",
          transformOrigin: "center center",
          fontFamily: "'Inter', sans-serif",
        }}
        data-testid="display-leaderboard"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(75,0,255,0.2)] via-black to-black pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(75,0,255,0.15),transparent_60%)] pointer-events-none" />

        <header className="relative z-10 flex flex-col items-center pt-10 pb-6 border-b border-[rgba(75,0,255,0.2)]">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.brandName} className="h-14 mb-6 object-contain" />
          ) : (
            <div
              className="h-14 w-14 mb-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.primaryColor}66)` }}
            >
              <ImageIcon className="text-white/80" size={26} />
            </div>
          )}
          <div
            className="text-white/70 text-sm tracking-widest uppercase font-medium mb-2"
            style={{ fontFamily: "var(--brand-font, inherit)" }}
          >
            {brand.brandName}
          </div>
          <div className="flex items-center gap-5">
            <Trophy className="text-yellow-400" size={44} />
            <h1
              className="text-5xl font-bold text-white tracking-tight"
              style={{ fontFamily: "'Söhne', 'Inter', sans-serif" }}
            >
              LEADERBOARD
            </h1>
            <Trophy className="text-yellow-400" size={44} />
          </div>
          <div className="mt-3 text-[rgba(75,0,255,0.6)] text-lg tracking-widest uppercase font-medium">
            47-Second Shot Clock Challenge
          </div>
        </header>

        <div className="relative z-10 flex-1 flex flex-col px-10 py-6 overflow-hidden">
          {visibleScores.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <Trophy className="mb-4 opacity-40" size={80} />
              <p className="text-2xl">No scores yet. Be the first to play!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 flex-1">
              <AnimatePresence mode="popLayout">
                {visibleScores.map((player, i) => {
                  const isTop3 = i < 3;
                  const medal = isTop3 ? medalColors[i] : null;
                  const medalEmoji =
                    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                  const stableKey = player.id ?? `score-${player.score}-${i}`;

                  return (
                    <motion.div
                      key={stableKey}
                      layout
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ delay: i * 0.04, type: "spring", stiffness: 200, damping: 25 }}
                      className={`flex items-center rounded-2xl border ${
                        isTop3
                          ? `bg-gradient-to-r ${medal!.bg} ${medal!.border} shadow-lg ${medal!.glow} ${i === 0 ? "py-5 px-6" : "py-4 px-5"}`
                          : "bg-white/[0.04] border-white/[0.06] py-3 px-5"
                      }`}
                      data-testid={`display-rank-${i + 1}`}
                    >
                      <div
                        className={`flex items-center justify-center font-bold mr-5 shrink-0 ${
                          isTop3
                            ? `${i === 0 ? "w-16 h-16 text-2xl" : "w-14 h-14 text-xl"} rounded-full ${medal!.badge}`
                            : "w-12 h-12 rounded-full bg-white/10 text-slate-400 text-lg"
                        }`}
                      >
                        {medalEmoji ? (
                          <span className={i === 0 ? "text-3xl" : "text-2xl"}>{medalEmoji}</span>
                        ) : (
                          i + 1
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-semibold truncate ${
                            isTop3
                              ? `${medal!.text} ${i === 0 ? "text-3xl" : "text-2xl"}`
                              : "text-slate-300 text-xl"
                          }`}
                        >
                          {player.playerName}
                        </div>
                      </div>

                      <div
                        className={`font-bold ml-4 shrink-0 ${
                          isTop3
                            ? `text-white ${i === 0 ? "text-5xl" : "text-4xl"}`
                            : "text-slate-300 text-3xl"
                        }`}
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {player.score}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <footer className="relative z-10 text-center py-4 border-t border-[rgba(75,0,255,0.1)]">
          <p className="text-[rgba(75,0,255,0.3)] text-sm tracking-wider uppercase">
            Scores update automatically
          </p>
        </footer>
      </div>
    </div>
  );
}
