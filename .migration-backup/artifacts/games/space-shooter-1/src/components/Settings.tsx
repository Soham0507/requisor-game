import { Settings as SettingsIcon } from "lucide-react";
import { useGame } from "@/state/GameContext";

const DIFFICULTIES: { id: "easy" | "normal" | "hard"; label: string; desc: string }[] = [
  { id: "easy", label: "Easy", desc: "Slower asteroids, smaller waves" },
  { id: "normal", label: "Normal", desc: "Balanced challenge for most pilots" },
  { id: "hard", label: "Hard", desc: "Relentless waves, no mercy" },
];

/**
 * Settings panel: difficulty, sound, music, mouse sensitivity.
 * Changes persist via GameContext (localStorage).
 */
export default function Settings() {
  const { settings, updateSettings } = useGame();

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
            background: "linear-gradient(135deg, rgba(0,240,255,0.18), rgba(138,91,255,0.15))",
            border: "1px solid rgba(0,240,255,0.4)",
            boxShadow: "0 0 20px rgba(0,240,255,0.25)",
          }}
        >
          <SettingsIcon size={22} color="var(--neon-cyan)" />
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h2>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "4px 0 0" }}>
            Tune the experience to your liking
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, overflow: "auto" }}>
        {/* Difficulty */}
        <div className="glass-strong" style={{ padding: 18, borderRadius: 14, gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-mute)", marginBottom: 12 }}>
            Difficulty
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {DIFFICULTIES.map((d) => {
              const active = settings.difficulty === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => updateSettings({ difficulty: d.id })}
                  data-testid={`difficulty-${d.id}`}
                  style={{
                    textAlign: "left",
                    padding: 14,
                    borderRadius: 12,
                    cursor: "pointer",
                    background: active
                      ? "linear-gradient(135deg, rgba(0,240,255,0.18), rgba(138,91,255,0.12))"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? "rgba(0,240,255,0.55)" : "var(--border)"}`,
                    boxShadow: active ? "0 0 18px rgba(0,240,255,0.3)" : "none",
                    color: "var(--text)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{d.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{d.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sound */}
        <ToggleRow
          label="Sound Effects"
          description="Lasers, explosions, hit feedback"
          value={settings.soundEnabled}
          onChange={(v) => updateSettings({ soundEnabled: v })}
          testId="toggle-sound"
        />

        {/* Music */}
        <ToggleRow
          label="Background Music"
          description="Ambient synthwave loop"
          value={settings.musicEnabled}
          onChange={(v) => updateSettings({ musicEnabled: v })}
          testId="toggle-music"
        />

        {/* Sensitivity */}
        <div className="glass-strong" style={{ padding: 18, borderRadius: 14, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-mute)" }}>
                Mouse Sensitivity
              </div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
                Affects bullet aim responsiveness
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--neon-cyan)", fontVariantNumeric: "tabular-nums" }}>
              {settings.sensitivity.toFixed(1)}×
            </div>
          </div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={settings.sensitivity}
            onChange={(e) => updateSettings({ sensitivity: Number(e.target.value) })}
            className="neon-range"
            data-testid="sensitivity-range"
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-mute)" }}>
            <span>0.5×</span>
            <span>2.0×</span>
          </div>
        </div>
      </div>
    </section>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testId: string;
}

function ToggleRow({ label, description, value, onChange, testId }: ToggleRowProps) {
  return (
    <div
      className="glass-strong"
      style={{
        padding: 18,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{description}</div>
      </div>
      <div className={`switch ${value ? "on" : ""}`} onClick={() => onChange(!value)} data-testid={testId} role="switch" aria-checked={value} />
    </div>
  );
}
