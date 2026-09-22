import { Trophy, Medal } from "lucide-react";
import { useGame } from "@/state/GameContext";

const RANK_COLORS = ["#FFD24A", "#C7CDE0", "#E08A53"];

/**
 * High-score table backed by GameContext (persisted to localStorage).
 */
export default function Leaderboard() {
  const { leaderboard } = useGame();

  return (
    <section className="glass" style={{ padding: 28, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, rgba(255,210,74,0.2), rgba(255,43,214,0.15))",
            border: "1px solid rgba(255,210,74,0.4)",
            boxShadow: "0 0 20px rgba(255,210,74,0.25)",
          }}
        >
          <Trophy size={22} color="#FFD24A" />
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Leaderboard</h2>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "4px 0 0" }}>
            Top pilots in the Astro Sector
          </p>
        </div>
      </div>

      <div style={{ overflow: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              {["Rank", "Pilot", "Score", "Level", "Date"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: "var(--text-mute)",
                    fontWeight: 600,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--text-mute)" }}>
                  No scores yet — be the first to make the board.
                </td>
              </tr>
            )}
            {leaderboard.map((entry, i) => (
              <tr
                key={`${entry.name}-${i}`}
                style={{
                  background: i < 3 ? "rgba(255,255,255,0.02)" : "transparent",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.05)")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = i < 3 ? "rgba(255,255,255,0.02)" : "transparent")
                }
              >
                <td style={{ padding: "14px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {i < 3 ? (
                      <Medal size={18} color={RANK_COLORS[i]} style={{ filter: `drop-shadow(0 0 6px ${RANK_COLORS[i]})` }} />
                    ) : (
                      <span style={{ width: 18, textAlign: "center", color: "var(--text-mute)" }}>{i + 1}</span>
                    )}
                    <span style={{ fontWeight: 700, color: i < 3 ? RANK_COLORS[i] : "var(--text)" }}>#{i + 1}</span>
                  </div>
                </td>
                <td style={{ padding: "14px", borderBottom: "1px solid var(--border)", fontWeight: 600, letterSpacing: "0.1em" }}>
                  {entry.name}
                </td>
                <td
                  style={{
                    padding: "14px",
                    borderBottom: "1px solid var(--border)",
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--neon-cyan)",
                    fontWeight: 700,
                  }}
                >
                  {entry.score.toLocaleString()}
                </td>
                <td
                  style={{
                    padding: "14px",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--neon-violet)",
                    fontWeight: 600,
                  }}
                >
                  {entry.level}
                </td>
                <td style={{ padding: "14px", borderBottom: "1px solid var(--border)", color: "var(--text-dim)", fontSize: 13 }}>
                  {entry.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
