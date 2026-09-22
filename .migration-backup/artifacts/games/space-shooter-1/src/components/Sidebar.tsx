import { Gamepad2, Trophy, Settings as SettingsIcon, Rocket } from "lucide-react";
import { useBrand, hexToRgba } from "@/brand-bridge";

export type View = "play" | "leaderboard" | "settings";

interface SidebarProps {
  active: View;
  onSelect: (v: View) => void;
  open: boolean;
  collapsed: boolean;
}

const ITEMS: { id: View; label: string; Icon: typeof Gamepad2 }[] = [
  { id: "play", label: "Play Game", Icon: Gamepad2 },
  { id: "leaderboard", label: "Leaderboard", Icon: Trophy },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];

/**
 * Fixed left sidebar. Supports a `collapsed` mode where it shrinks
 * to icon-only width so the game area can reclaim the space.
 */
export default function Sidebar({ active, onSelect, open, collapsed }: SidebarProps) {
  const brand = useBrand();
  return (
    <aside
      className={`sidebar glass ${open ? "open" : ""}`}
      style={{
        width: collapsed ? 54 : 180,
        margin: 10,
        marginRight: 0,
        padding: collapsed ? "12px 8px" : 12,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 0.25s ease, padding 0.25s ease",
      }}
    >
      {/* Brand — icon only when collapsed */}
      <div
        className="flex items-center gap-2 px-1"
        style={{ justifyContent: collapsed ? "center" : "flex-start" }}
      >
        <div
          className="pulse"
          style={{
            width: brand.logoSize,
            height: brand.logoSize,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`,
            display: "grid",
            placeItems: "center",
            color: "#05060d",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Rocket size={Math.round(brand.logoSize * 0.5)} strokeWidth={2.5} />
          )}
        </div>
        {!collapsed && (
          <div>
            {brand.brandName && (
              <div
                style={{
                  fontSize: brand.brandNameSize,
                  color: brand.brandNameColor,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  lineHeight: 1.15,
                  textShadow: `0 0 10px ${hexToRgba(brand.brandNameColor, 0.5)}`,
                  fontFamily: "var(--brand-font, inherit)",
                }}
              >
                {brand.brandName}
              </div>
            )}
            <div
              style={{
                fontSize: brand.headingSize,
                color: brand.headingColor,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginTop: 2,
                fontFamily: "var(--brand-font, inherit)",
              }}
            >
              {brand.heading}
            </div>
            <div style={{ fontSize: 9, color: "var(--text-mute)", letterSpacing: "0.18em", marginTop: 2 }}>
              {brand.tagline}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {!collapsed && (
          <div
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--text-mute)",
              padding: "0 8px 6px",
            }}
          >
            Menu
          </div>
        )}
        {ITEMS.map(({ id, label, Icon }) => (
          <div
            key={id}
            className={`nav-item ${active === id ? "active" : ""}`}
            onClick={() => onSelect(id)}
            data-testid={`nav-${id}`}
            title={collapsed ? label : undefined}
            style={{
              padding: collapsed ? "9px 0" : "9px 10px",
              fontSize: 13,
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
            {!collapsed && <span>{label}</span>}
          </div>
        ))}
      </nav>

      {/* Footer status dot */}
      <div style={{ marginTop: "auto" }}>
        <div
          className="glass-strong"
          style={{
            padding: collapsed ? "8px 0" : "8px 10px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--neon-lime)",
              boxShadow: "0 0 8px var(--neon-lime)",
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
              <div style={{ color: "var(--text)", fontWeight: 600 }}>System Online</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
