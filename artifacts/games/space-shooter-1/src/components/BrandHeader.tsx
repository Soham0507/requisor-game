import { Gamepad2, Trophy, Settings as SettingsIcon } from "lucide-react";
import { useBrand } from "@/brand-bridge";
import BrandMark from "@/components/BrandMark";

export type View = "play" | "leaderboard" | "settings";

const TABS: { id: View; label: string; Icon: typeof Gamepad2 }[] = [
  { id: "play", label: "Play", Icon: Gamepad2 },
  { id: "leaderboard", label: "Leaderboard", Icon: Trophy },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];

interface BrandHeaderProps {
  active: View;
  onSelect: (v: View) => void;
}

/**
 * The branded top bar: the customer's logo and game title lead the page, and
 * the three views are a compact tab group on the right. Replaces the old
 * dashboard sidebar so the brand, not the chrome, is the first thing seen.
 */
export default function BrandHeader({ active, onSelect }: BrandHeaderProps) {
  const brand = useBrand();
  const markSize = Math.max(56, brand.logoSize);
  const titleSize = Math.max(22, brand.headingSize);

  return (
    <header className="brand-bar" data-testid="brand-header">
      <div className="brand-lockup">
        <BrandMark size={markSize} />
        <div className="brand-copy">
          <h1
            data-testid="brand-title"
            style={{
              fontSize: titleSize,
              color: brand.headingColor,
              fontFamily: "var(--brand-font, inherit)",
            }}
          >
            {brand.heading}
          </h1>
          {brand.tagline && (
            <p data-testid="brand-tagline" style={{ fontFamily: "var(--brand-font, inherit)" }}>
              {brand.tagline}
            </p>
          )}
        </div>
      </div>

      <nav className="brand-tabs" aria-label="Game sections">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`brand-tab ${active === id ? "active" : ""}`}
            onClick={() => onSelect(id)}
            aria-current={active === id ? "page" : undefined}
            data-testid={`nav-${id}`}
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
