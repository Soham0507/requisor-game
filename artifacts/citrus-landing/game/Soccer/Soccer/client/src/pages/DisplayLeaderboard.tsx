import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import type { Score } from "@shared/schema";
import { useBrand } from "../brand-bridge";

const PALETTE = {
  yellow: "#FFBF40",
  yellowSoft: "#FFD473",
  black: "#1C1C1C",
  red: "#E42E20",
  orange: "#FF6021",
  blue1: "#3A6CD0",
  blue2: "#6286C9",
  blue3: "#99B3E1",
  grey: "#A1A1A1",
};

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
        const cached = safeParse("soccer-leaderboard");
        if (cached.length > 0) return cached;
        return safeParse("soccer-offline-scores");
      }
      try {
        const res = await fetch("/api/scores?limit=100");
        if (!res.ok) throw new Error("Failed to fetch scores");
        const data = await res.json();
        localStorage.setItem("soccer-leaderboard", JSON.stringify(data));
        return data;
      } catch {
        const cached = safeParse("soccer-leaderboard");
        if (cached.length > 0) return cached;
        return safeParse("soccer-offline-scores");
      }
    },
    refetchInterval: 5000,
    retry: false,
  });
}

const medalStyles = [
  { badge: PALETTE.red, text: PALETTE.black, bg: "rgba(255,255,255,0.95)" },
  { badge: PALETTE.black, text: PALETTE.black, bg: "rgba(255,255,255,0.85)" },
  { badge: PALETTE.orange, text: PALETTE.black, bg: "rgba(255,255,255,0.78)" },
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
      className="w-screen h-screen flex items-center justify-center overflow-hidden bg-grid-yellow"
      style={{ backgroundColor: PALETTE.yellow }}
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
          backgroundColor: PALETTE.yellow,
          backgroundImage:
            "linear-gradient(rgba(28,28,28,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(28,28,28,0.07) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        data-testid="display-leaderboard"
      >
        <header
          className="relative z-10 flex flex-col items-center pt-12 pb-8"
          style={{ borderBottom: `4px solid ${PALETTE.black}` }}
        >
          {brand.logoUrl && (
            <img
              src={brand.logoUrl}
              alt=""
              className="mb-7 object-contain"
              style={{ height: Math.round(brand.logoSize * 1.5) }}
            />
          )}
          <div
            className="text-base tracking-[0.4em]"
            style={{ color: PALETTE.red, fontWeight: 800 }}
          >
            [ LIVE LEADERBOARD ]
          </div>
          <h1
            className="mt-3 text-7xl tracking-tight"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 900,
              color: PALETTE.black,
              letterSpacing: "0.02em",
            }}
          >
            {brand.heading.toUpperCase()}
          </h1>
          <div
            className="mt-3 text-xl tracking-[0.35em] uppercase"
            style={{ color: PALETTE.black, fontWeight: 600 }}
          >
            Live Leaderboard Challenge
          </div>
        </header>

        <div className="relative z-10 flex-1 flex flex-col px-12 py-8 overflow-hidden">
          {visibleScores.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center"
              style={{ color: PALETTE.black }}
            >
              <Trophy className="mb-4 opacity-60" size={88} color={PALETTE.red} />
              <p className="text-3xl font-semibold">
                No scores yet. Be the first to play!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 flex-1">
              <AnimatePresence mode="popLayout">
                {visibleScores.map((player, i) => {
                  const isTop3 = i < 3;
                  const medal = isTop3 ? medalStyles[i] : null;
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
                      transition={{
                        delay: i * 0.04,
                        type: "spring",
                        stiffness: 200,
                        damping: 25,
                      }}
                      className="flex items-center rounded-2xl"
                      style={{
                        backgroundColor: isTop3
                          ? medal!.bg
                          : "rgba(255,255,255,0.55)",
                        border: `3px solid ${PALETTE.black}`,
                        padding: i === 0 ? "20px 24px" : isTop3 ? "16px 22px" : "12px 20px",
                      }}
                      data-testid={`display-rank-${i + 1}`}
                    >
                      <div
                        className="flex items-center justify-center font-bold mr-5 shrink-0 rounded-full"
                        style={{
                          width: i === 0 ? 64 : isTop3 ? 56 : 48,
                          height: i === 0 ? 64 : isTop3 ? 56 : 48,
                          backgroundColor: isTop3 ? medal!.badge : PALETTE.black,
                          color: isTop3 ? "#fff" : PALETTE.yellow,
                          fontSize: i === 0 ? 26 : isTop3 ? 22 : 18,
                        }}
                      >
                        {medalEmoji ? (
                          <span style={{ fontSize: i === 0 ? 30 : 26 }}>
                            {medalEmoji}
                          </span>
                        ) : (
                          i + 1
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div
                          className="font-semibold truncate"
                          style={{
                            color: PALETTE.black,
                            fontSize: i === 0 ? 30 : isTop3 ? 24 : 20,
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                          }}
                        >
                          {player.playerName}
                        </div>
                      </div>

                      <div
                        className="ml-4 shrink-0"
                        style={{
                          color: PALETTE.red,
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 900,
                          fontSize: i === 0 ? 56 : isTop3 ? 44 : 36,
                          letterSpacing: "0.02em",
                        }}
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

      </div>
    </div>
  );
}
