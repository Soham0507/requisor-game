import { useState } from "react";
import Sidebar, { type View } from "@/components/Sidebar";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import { GameProvider } from "@/state/GameContext";

/**
 * Root application — wires the global game state provider
 * around the Sidebar / Header / Dashboard composition.
 */
function App() {
  const [view, setView] = useState<View>("play");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <GameProvider>
      <div className="h-screen w-screen flex relative" style={{ position: "relative", zIndex: 1 }}>
        <Sidebar
          active={view}
          onSelect={(v) => {
            setView(v);
            setSidebarOpen(false);
          }}
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
        />

        <div className="flex-1 flex flex-col main-area" style={{ minWidth: 0 }}>
          <Header
            onMenuClick={() => setSidebarOpen((o) => !o)}
            sidebarOpen={sidebarOpen}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          />
          <main className="flex-1 overflow-auto px-6 pb-6" style={{ paddingTop: 0 }}>
            <Dashboard view={view} />
          </main>
        </div>
      </div>
    </GameProvider>
  );
}

export default App;
