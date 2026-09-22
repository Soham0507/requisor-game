import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaderboard } from "./Leaderboard";
import {
  getLeaderboard,
  saveToLeaderboard,
  getRankLabel,
  LeaderboardEntry,
} from "../utils/leaderboard";
import type { GameStats } from "../App";
import { useBrand } from "../brand-bridge";

interface GameOverProps {
  stats: GameStats;
  onRestart: () => void;
}

const SECURITY_TIPS = [
  "Always verify sender domains before clicking links.",
  "Use multi-factor authentication on all critical accounts.",
  "Sanitize all user inputs to prevent SQL injection.",
  "Monitor outbound traffic for unusual data transfers.",
  "Quarantine unknown files before execution — never run blindly.",
  "Rotate passwords regularly and never reuse old credentials.",
  "Enable disk encryption on all employee devices.",
];

export function GameOver({ stats, onRestart }: GameOverProps) {
  const brand = useBrand();
  const { score, level, maxCombo, attacksDefeated } = stats;
  const { label: rank, color: rankColor } = getRankLabel(score);
  const tip = SECURITY_TIPS[Math.floor(Math.random() * SECURITY_TIPS.length)];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [saved, setSaved] = useState(false);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setBoard(getLeaderboard());
  }, []);

  const canSave = name.trim().length > 0 && email.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const entry: LeaderboardEntry = {
      name: name.trim(),
      company: company.trim(),
      score,
      level,
      maxCombo,
      attacksDefeated,
      date: new Date().toLocaleDateString(),
    };
    const updated = saveToLeaderboard(entry);
    setBoard(updated);
    setSaved(true);

    // Also send it to the shared player_submissions table (api-server), so
    // it's a real lead an operator can see across every game, not just
    // this browser's own localStorage leaderboard. `orderId` is only
    // present when this build was opened through a finalized live link
    // (see citrus-landing's customize.tsx) — absent on a raw/dev preview,
    // which is fine, the row just isn't tied to a specific brand order.
    const orderId = new URLSearchParams(window.location.search).get("orderId");
    fetch("/api/player-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameSlug: "cyber-adventure",
        orderId,
        name: entry.name,
        email: email.trim(),
        extra: { company: entry.company, score, level, maxCombo, attacksDefeated },
      }),
    }).catch(() => {
      /* best-effort — the local leaderboard save above already succeeded */
    });
  };

  return (
    <div
      className="min-h-screen flex items-start justify-center py-8 overflow-y-auto"
      style={{
        background: "linear-gradient(180deg, #030712 0%, #0f172a 100%)",
      }}
    >
      {/* Brand badge */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 pointer-events-none">
        {brand.logoUrl && (
          <img
            src={brand.logoUrl}
            alt={brand.brandName}
            className="object-contain"
            style={{ width: brand.logoSize, height: brand.logoSize }}
          />
        )}
        <span
          className="font-semibold tracking-wide"
          style={{ fontSize: brand.brandNameSize * 0.2, color: brand.brandNameColor, fontFamily: "var(--brand-font, inherit)" }}
        >
          {brand.brandName}
        </span>
      </div>

      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(239, 68, 68, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full mx-4"
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05))",
              border: "3px solid rgba(239, 68, 68, 0.7)",
              boxShadow: "0 0 40px rgba(239, 68, 68, 0.4)",
            }}
          >
            💀
          </motion.div>
          <p
            className="text-red-400 text-xs uppercase tracking-[0.3em] font-semibold mb-1"
            style={{
              fontFamily: "var(--app-font-title)",
            }}
          >
            Security Breach
          </p>
          <h1
            className="text-4xl font-black text-white"
            style={{
              textShadow: "0 0 30px rgba(239, 68, 68, 0.6)",
              fontFamily: "var(--app-font-title)",
            }}
          >
            GAME OVER
          </h1>
        </div>

        {/* Score card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="w-full p-5 rounded-2xl"
          style={{
            background: "rgba(17, 24, 39, 0.85)",
            border: "1px solid rgba(75, 85, 99, 0.4)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-widest">
                Final Score
              </p>
              <motion.p
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25, type: "spring" }}
                className="text-4xl font-black font-mono"
                style={{
                  color: "#22d3ee",
                  fontFamily: "var(--app-font-title)",
                }}
              >
                {score.toString().padStart(6, "0")}
              </motion.p>
            </div>
            <div
              className="px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest text-right"
              style={{
                background: `${rankColor}20`,
                border: `2px solid ${rankColor}`,
                color: rankColor,
                boxShadow: `0 0 12px ${rankColor}40`,
                fontFamily: "var(--app-font-title)",
              }}
            >
              {rank}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-700/60">
            {[
              { label: "Attacks Defeated", value: attacksDefeated },
              { label: "Level Reached", value: level },
              { label: "Max Combo", value: `${maxCombo}x` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p
                  className="text-lg font-bold text-white"
                  style={{
                    fontFamily: "var(--app-font-title)",
                  }}
                >
                  {value}
                </p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Name entry or saved state */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="w-full p-5 rounded-2xl"
          style={{
            background: "rgba(17, 24, 39, 0.85)",
            border: "1px solid rgba(34, 211, 238, 0.2)",
            backdropFilter: "blur(10px)",
          }}
        >
          <p className="text-cyan-400 text-xs uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
            🏆 Save to Leaderboard
          </p>

          <AnimatePresence mode="wait">
            {!saved ? (
              <motion.div
                key="form"
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-3"
              >
                <input
                  type="text"
                  placeholder="Your name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(75, 85, 99, 0.5)",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && canSave && handleSave()}
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={80}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(75, 85, 99, 0.5)",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && canSave && handleSave()}
                />
                <input
                  type="text"
                  placeholder="Company (optional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={40}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(75, 85, 99, 0.5)",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    disabled={!canSave}
                    className="flex-1 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all"
                    style={{
                      background: canSave
                        ? "linear-gradient(135deg, #0e4f94, #1d6fdb)"
                        : "rgba(75,85,99,0.3)",
                      border: canSave
                        ? "1px solid #3b82f6"
                        : "1px solid rgba(75,85,99,0.4)",
                      color: canSave ? "white" : "#6b7280",
                      cursor: canSave ? "pointer" : "not-allowed",
                    }}
                  >
                    Save Score
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setSaved(true);
                    }}
                    className="px-4 py-2 rounded-lg text-sm text-gray-400 uppercase tracking-wider"
                    style={{ border: "1px solid rgba(75,85,99,0.3)" }}
                  >
                    Skip
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="saved"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-2"
              >
                {name.trim() ? (
                  <p className="text-green-400 font-semibold text-sm">
                    ✓ Score saved for {name.trim()}!
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm">Score not saved.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full p-5 rounded-2xl"
          style={{
            background: "rgba(17, 24, 39, 0.85)",
            border: "1px solid rgba(75, 85, 99, 0.3)",
            backdropFilter: "blur(10px)",
          }}
        >
          <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3">
            Hall of Fame — Top {Math.min(board.length, 10)}
          </p>
          <Leaderboard
            entries={board}
            highlightName={saved && name.trim() ? name.trim() : undefined}
          />
        </motion.div>

        {/* Security tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full p-4 rounded-xl text-sm text-center"
          style={{
            background: "rgba(6, 78, 199, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            color: "#93c5fd",
          }}
        >
          <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">
            Security Tip
          </p>
          <p className="leading-relaxed">{tip}</p>
        </motion.div>

        {/* Restart */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRestart}
          className="px-10 py-4 rounded-2xl text-lg font-bold uppercase tracking-widest mb-4"
          style={{
            background: "linear-gradient(135deg, #1e40af, #2563eb)",
            border: "2px solid #3b82f6",
            color: "white",
            boxShadow: "0 0 30px rgba(59, 130, 246, 0.4)",
            fontFamily: "var(--app-font-title)",
          }}
        >
          🔄 Retry Mission
        </motion.button>
      </motion.div>
    </div>
  );
}
