import { useEffect, useState } from "react";
import { Heart, Zap, Star, PanelLeftClose, PanelLeftOpen, Play, Pause, RotateCcw } from "lucide-react";
import { useGame } from "@/state/GameContext";

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

// Mirrors the `@media (max-width: 900px)` breakpoint in index.css that turns
// `.sidebar` into an off-canvas drawer (hidden unless `.open`) — below this
// width the header's sidebar button must open/close that drawer instead of
// toggling the desktop icon-only collapse, or the sidebar becomes permanently
// unreachable (it renders translateX(-100%) off-screen with nothing to
// bring it back).
const MOBILE_BREAKPOINT = "(max-width: 900px)";

/**
 * Top header — shows live game stats, a sidebar collapse/open toggle, and
 * Pause/Restart controls while a mission is active (the old controls bar
 * above the canvas was removed — its Start/Play Again live in a centered
 * overlay on the canvas instead, see GameCanvas.tsx).
 */
export default function Header({ onMenuClick, sidebarOpen, sidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const { score, health, level, status, setStatus, resetGame } = useGame();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // "Active" (highlighted) state — the button lights up when the sidebar is
  // in its non-default form: shrunk to an icon rail on desktop, or pulled
  // open as a drawer on mobile.
  const sidebarButtonActive = isMobile ? sidebarOpen : sidebarCollapsed;
  // "Hidden" state used only to pick which icon to show — desktop: shrunk to
  // icon rail. Mobile: drawer fully off-canvas. Kept separate from the
  // "active" flag above since the two states point opposite ways on mobile
  // (the button is "active" exactly when the sidebar is NOT hidden).
  const sidebarHidden = isMobile ? !sidebarOpen : sidebarCollapsed;
  const handleSidebarButtonClick = isMobile ? onMenuClick : onToggleSidebar;
  const sidebarButtonLabel = isMobile
    ? (sidebarOpen ? "Close menu" : "Open menu")
    : (sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar");

  const healthColor =
    health > 60 ? "var(--neon-lime)" : health > 30 ? "var(--neon-amber)" : "var(--danger)";

  return (
    <header
      className="glass"
      style={{
        margin: 10,
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Sidebar toggle — collapses the sidebar on desktop, opens/closes the off-canvas drawer on mobile */}
        <button
          onClick={handleSidebarButtonClick}
          aria-label={sidebarButtonLabel}
          title={sidebarButtonLabel}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            background: sidebarButtonActive
              ? "linear-gradient(135deg, rgba(0,240,255,0.2), rgba(138,91,255,0.15))"
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${sidebarButtonActive ? "rgba(0,240,255,0.45)" : "var(--border)"}`,
            borderRadius: 8,
            color: sidebarButtonActive ? "var(--neon-cyan)" : "var(--text-dim)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: sidebarButtonActive ? "0 0 12px rgba(0,240,255,0.3)" : "none",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,240,255,0.45)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--neon-cyan)";
          }}
          onMouseLeave={(e) => {
            if (!sidebarButtonActive) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)";
            }
          }}
          data-testid="sidebar-toggle"
        >
          {sidebarHidden
            ? <PanelLeftOpen size={15} />
            : <PanelLeftClose size={15} />}
        </button>

        <div>
          <div style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Mission Status
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 1 }}>
            {status === "running" && <span style={{ color: "var(--neon-lime)" }}>● ENGAGED</span>}
            {status === "paused"  && <span style={{ color: "var(--neon-amber)" }}>❚❚ PAUSED</span>}
            {status === "idle"    && <span style={{ color: "var(--text-dim)" }}>○ STANDBY</span>}
            {status === "over"    && <span style={{ color: "var(--danger)" }}>✕ DESTROYED</span>}
          </div>
        </div>
      </div>

      <div className="header-stats" style={{ display: "flex", gap: 8 }}>
        <div className="stat-pill cyan" style={{ padding: "6px 12px", minWidth: 0 }} data-testid="header-score">
          <Star size={14} color="var(--neon-cyan)" />
          <div>
            <div className="label">Score</div>
            <div className="value" style={{ fontSize: 16 }}>{score.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-pill violet" style={{ padding: "6px 12px", minWidth: 0 }} data-testid="header-level">
          <Zap size={14} color="var(--neon-violet)" />
          <div>
            <div className="label">Level</div>
            <div className="value" style={{ fontSize: 16 }}>{level}</div>
          </div>
        </div>

        <div className="stat-pill" style={{ padding: "6px 12px", minWidth: 0 }} data-testid="header-health">
          <Heart size={14} color={healthColor} />
          <div style={{ minWidth: 80 }}>
            <div className="label">Health</div>
            <div className="value" style={{ fontSize: 16, color: healthColor, textShadow: `0 0 12px ${healthColor}` }}>
              {Math.max(0, Math.round(health))}
            </div>
            <div className="bar-track" style={{ marginTop: 4 }}>
              <div
                className="bar-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, health))}%`,
                  background: healthColor,
                  boxShadow: `0 0 8px ${healthColor}`,
                }}
              />
            </div>
          </div>
        </div>

        {(status === "running" || status === "paused") && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setStatus(status === "paused" ? "running" : "paused")}
              aria-label={status === "paused" ? "Resume" : "Pause"}
              title={status === "paused" ? "Resume" : "Pause"}
              className={`neon-btn ${status === "paused" ? "lime" : ""}`}
              style={{ padding: "8px 10px" }}
              data-testid="btn-pause"
            >
              {status === "paused" ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              onClick={resetGame}
              aria-label="Restart"
              title="Restart"
              className="neon-btn danger"
              style={{ padding: "8px 10px" }}
              data-testid="btn-restart"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
