import { Heart, Zap, Star, Play, Pause, RotateCcw } from "lucide-react";
import { useGame } from "@/state/GameContext";

/**
 * Slim live-stats strip shown under the brand header while playing: score,
 * level and health, plus pause/restart during a run. Uses the brand's primary
 * and secondary colors so the whole screen reads as the customer's.
 */
export default function HudBar() {
  const { score, health, level, status, setStatus, resetGame } = useGame();

  const healthColor =
    health > 60 ? "var(--neon-lime)" : health > 30 ? "var(--neon-amber)" : "var(--danger)";
  const statusLabel =
    status === "running" ? "In play" : status === "paused" ? "Paused" : status === "over" ? "Game over" : "Ready";

  return (
    <div className="hud-bar" data-testid="hud-bar">
      <div className="hud-status" data-status={status}>
        <span className="dot" />
        {statusLabel}
      </div>

      <div className="hud-stats">
        <div className="hud-chip" data-testid="header-score">
          <Star size={15} style={{ color: "var(--brand-primary, var(--neon-cyan))" }} />
          <span className="label">Score</span>
          <span className="value primary">{score.toLocaleString()}</span>
        </div>

        <div className="hud-chip" data-testid="header-level">
          <Zap size={15} style={{ color: "var(--brand-secondary, var(--neon-violet))" }} />
          <span className="label">Level</span>
          <span className="value secondary">{level}</span>
        </div>

        <div className="hud-chip health" data-testid="header-health">
          <Heart size={15} style={{ color: healthColor }} />
          <span className="label">Health</span>
          <span className="value" style={{ color: healthColor }}>{Math.max(0, Math.round(health))}</span>
          <span className="bar-track hud-health-track">
            <span
              className="bar-fill"
              style={{
                display: "block",
                width: `${Math.max(0, Math.min(100, health))}%`,
                background: healthColor,
              }}
            />
          </span>
        </div>
      </div>

      {(status === "running" || status === "paused") && (
        <div className="hud-actions">
          <button
            type="button"
            onClick={() => setStatus(status === "paused" ? "running" : "paused")}
            aria-label={status === "paused" ? "Resume" : "Pause"}
            title={status === "paused" ? "Resume" : "Pause"}
            className="hud-btn"
            data-testid="btn-pause"
          >
            {status === "paused" ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button
            type="button"
            onClick={resetGame}
            aria-label="Restart"
            title="Restart"
            className="hud-btn"
            data-testid="btn-restart"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
