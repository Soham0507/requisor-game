import { motion } from "framer-motion";
import { LeaderboardEntry, getRankLabel } from "../utils/leaderboard";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  highlightName?: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({ entries, highlightName }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        No scores yet — be the first to make the board!
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-1">
      {entries.map((entry, i) => {
        const { label, color } = getRankLabel(entry.score);
        const isHighlighted = entry.name === highlightName;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
            style={{
              background: isHighlighted
                ? "rgba(34, 211, 238, 0.12)"
                : i % 2 === 0
                ? "rgba(255,255,255,0.03)"
                : "transparent",
              border: isHighlighted ? "1px solid rgba(34, 211, 238, 0.4)" : "1px solid transparent",
            }}
          >
            {/* Rank */}
            <div className="w-7 text-center flex-shrink-0">
              {i < 3 ? (
                <span className="text-base">{MEDALS[i]}</span>
              ) : (
                <span className="text-xs text-gray-500 font-mono">#{i + 1}</span>
              )}
            </div>

            {/* Name + Company */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate" style={{ fontSize: 13 }}>
                {entry.name}
                {isHighlighted && (
                  <span className="ml-1 text-xs text-cyan-400">← you</span>
                )}
              </p>
              {entry.company && (
                <p className="text-gray-500 truncate" style={{ fontSize: 11 }}>
                  {entry.company}
                </p>
              )}
            </div>

            {/* Level */}
            <div className="text-center flex-shrink-0" style={{ width: 36 }}>
              <p className="text-xs text-gray-400">LVL</p>
              <p className="font-bold" style={{ color, fontSize: 13 }}>{entry.level}</p>
            </div>

            {/* Combo */}
            <div className="text-center flex-shrink-0" style={{ width: 36 }}>
              <p className="text-xs text-gray-400">MAX</p>
              <p className="font-bold text-yellow-400" style={{ fontSize: 13 }}>{entry.maxCombo}x</p>
            </div>

            {/* Score */}
            <div className="text-right flex-shrink-0" style={{ width: 68 }}>
              <p
                className="font-black font-mono"
                style={{ color, fontSize: 15 }}
              >
                {entry.score.toString().padStart(6, "0")}
              </p>
              <p className="text-gray-600" style={{ fontSize: 9 }}>{label}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
