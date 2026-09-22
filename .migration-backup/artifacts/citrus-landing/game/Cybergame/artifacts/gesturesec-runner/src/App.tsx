import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { StartScreen } from "./components/StartScreen";
import { GameScreen } from "./components/GameScreen";
import { GameOver } from "./components/GameOver";

export interface GameStats {
  score: number;
  level: number;
  maxCombo: number;
  attacksDefeated: number;
}

type GamePhase = "start" | "playing" | "gameover";

function App() {
  const [phase, setPhase] = useState<GamePhase>("start");
  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    maxCombo: 1,
    attacksDefeated: 0,
  });

  const handleStart = () => setPhase("playing");

  const handleGameOver = (stats: GameStats) => {
    setGameStats(stats);
    setPhase("gameover");
  };

  const handleRestart = () => setPhase("playing");

  return (
    <AnimatePresence mode="wait">
      {phase === "start" && (
        <div key="start">
          <StartScreen onStart={handleStart} />
        </div>
      )}
      {phase === "playing" && (
        <div key="game">
          <GameScreen onGameOver={handleGameOver} />
        </div>
      )}
      {phase === "gameover" && (
        <div key="gameover">
          <GameOver stats={gameStats} onRestart={handleRestart} />
        </div>
      )}
    </AnimatePresence>
  );
}

export default App;
