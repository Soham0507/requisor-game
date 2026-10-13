import { useState } from "react";
import BrandHeader, { type View } from "@/components/BrandHeader";
import HudBar from "@/components/HudBar";
import Dashboard from "@/components/Dashboard";
import { GameProvider } from "@/state/GameContext";

/**
 * Root application. Branding leads: the customer's logo and game title sit in
 * a full-width header, a slim stats strip sits under it while playing, and the
 * game (or leaderboard / settings) takes the rest of the screen.
 */
function App() {
  const [view, setView] = useState<View>("play");

  return (
    <GameProvider>
      <div className="app-shell">
        <BrandHeader active={view} onSelect={setView} />
        {view === "play" && <HudBar />}
        <main className="app-main">
          <Dashboard view={view} />
        </main>
      </div>
    </GameProvider>
  );
}

export default App;
