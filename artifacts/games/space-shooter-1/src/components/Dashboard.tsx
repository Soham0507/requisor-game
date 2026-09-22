import GameCanvas from "@/components/GameCanvas";
import Leaderboard from "@/components/Leaderboard";
import Settings from "@/components/Settings";
import type { View } from "@/components/Sidebar";

interface DashboardProps {
  view: View;
}

/**
 * Switches the main content area based on the selected sidebar item.
 * Each view animates in for a smoother feel.
 */
export default function Dashboard({ view }: DashboardProps) {
  return (
    <div className="fade-in" key={view} style={{ height: "100%" }}>
      {view === "play" && <GameCanvas />}
      {view === "leaderboard" && <Leaderboard />}
      {view === "settings" && <Settings />}
    </div>
  );
}
