import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RunningCharacter } from "./RunningCharacter";
import { AttackCard } from "./AttackCard";
import { OptionsPanel } from "./OptionsPanel";
import { CameraFeed } from "./CameraFeed";
import { ThreatSprite } from "./ThreatSprite";
import { ParticleBurst } from "./ParticleBurst";
import { useGestureDetection } from "../hooks/useGestureDetection";
import { getShuffledAttack, ShuffledAttack } from "../data/attacks";
import {
  announceAttack,
  announceCorrect,
  announceWrong,
  announceTimeout,
  announceBonusRound,
  announceLevelUp,
} from "../utils/voice";
import type { GameStats } from "../App";
import { useBrand } from "../brand-bridge";

const NORMAL_TIMER = 20;
const BONUS_TIMER = 13;
const BONUS_ROUND_ATTACKS = 3; // attacks in each bonus round
const BONUS_ROUND_EVERY = 5; // trigger after every N correct answers

function getCombo(streak: number): number {
  if (streak >= 8) return 4;
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return 1;
}

interface GameScreenProps {
  onGameOver: (stats: GameStats) => void;
}

// Background scrolling track
function BackgroundTrack({ speed }: { speed: number }) {
  const segments = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="relative w-full overflow-hidden" style={{ height: 60 }}>
      <div className="absolute bottom-4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40" />
      <motion.div
        className="absolute inset-0 flex items-end gap-16"
        animate={{ x: [0, -64] }}
        transition={{ duration: 1 / speed, repeat: Infinity, ease: "linear" }}
      >
        {segments.map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-px h-8 opacity-20"
            style={{
              background: "linear-gradient(to top, #22d3ee, transparent)",
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}

function TimerDisplay({
  timeLeft,
  total,
}: {
  timeLeft: number;
  total: number;
}) {
  const pct = timeLeft / total;
  const isUrgent = timeLeft <= 3;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
      transition={isUrgent ? { duration: 0.4, repeat: Infinity } : {}}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: 64, height: 64 }}
      >
        <svg width="64" height="64" className="absolute inset-0 -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="rgba(75,85,99,0.4)"
            strokeWidth="4"
          />
          <motion.circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={
              isUrgent ? "#ef4444" : timeLeft <= 5 ? "#f59e0b" : "#22d3ee"
            }
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transition={{ duration: 0.2 }}
            style={{
              filter: isUrgent ? "drop-shadow(0 0 6px #ef4444)" : undefined,
            }}
          />
        </svg>
        <span
          className="relative z-10 text-xl font-black font-mono"
          style={{
            color: isUrgent ? "#ef4444" : timeLeft <= 5 ? "#f59e0b" : "#22d3ee",
          }}
        >
          {timeLeft}
        </span>
      </div>
      <span
        className="text-xs uppercase tracking-widest font-semibold"
        style={{ color: isUrgent ? "#ef4444" : "#6b7280" }}
      >
        {isUrgent ? "HURRY!" : "Time Left"}
      </span>
    </motion.div>
  );
}

function playSound(type: "correct" | "wrong" | "timeout") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "correct") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(
        type === "timeout" ? 250 : 300,
        ctx.currentTime,
      );
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {}
}

export function GameScreen({ onGameOver }: GameScreenProps) {
  const brand = useBrand();
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"running" | "attacking">("running");
  const [shuffledAttack, setShuffledAttack] = useState<ShuffledAttack | null>(
    null,
  );
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lockedOption, setLockedOption] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | "timeout" | null>(
    null,
  );
  const [showThreat, setShowThreat] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [timeLeft, setTimeLeft] = useState(NORMAL_TIMER);

  // Progression state
  const [streak, setStreak] = useState(0);
  const [maxCombo, setMaxCombo] = useState(1);
  const [attacksDefeated, setAttacksDefeated] = useState(0);
  const [bonusAttacksLeft, setBonusAttacksLeft] = useState(0);

  // UI feedback
  const [particleTrigger, setParticleTrigger] = useState(0);
  const [particleType, setParticleType] = useState<"correct" | "wrong" | null>(
    null,
  );
  const [showComboPopup, setShowComboPopup] = useState<number | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showBonusBanner, setShowBonusBanner] = useState(false);

  // Refs to avoid stale closures
  const scoreRef = useRef(score);
  const streakRef = useRef(streak);
  const maxComboRef = useRef(maxCombo);
  const attacksDefeatedRef = useRef(attacksDefeated);
  const bonusAttacksLeftRef = useRef(bonusAttacksLeft);
  const speedRef = useRef(speed);
  const phaseRef = useRef(phase);
  const lockedRef = useRef(lockedOption);
  const timeLeftRef = useRef(timeLeft);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    streakRef.current = streak;
  }, [streak]);
  useEffect(() => {
    maxComboRef.current = maxCombo;
  }, [maxCombo]);
  useEffect(() => {
    attacksDefeatedRef.current = attacksDefeated;
  }, [attacksDefeated]);
  useEffect(() => {
    bonusAttacksLeftRef.current = bonusAttacksLeft;
  }, [bonusAttacksLeft]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    lockedRef.current = lockedOption;
  }, [lockedOption]);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const isBonusRound = bonusAttacksLeft > 0;
  const currentCombo = getCombo(streak);
  const level = Math.floor(attacksDefeated / 10) + 1;
  const timerTotal = isBonusRound ? BONUS_TIMER : NORMAL_TIMER;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleGestureConfirm = useCallback((fingers: number) => {
    if (phaseRef.current !== "attacking" || lockedRef.current !== null) return;
    if (fingers >= 1 && fingers <= 4) setLockedOption(fingers);
  }, []);

  const {
    detectedFingers,
    isConfirming,
    confirmProgress,
    confirmedFingers,
    reset: resetGesture,
  } = useGestureDetection(videoRef, canvasRef, {
    onConfirm: handleGestureConfirm,
    confirmDelay: 1000,
    enabled: cameraEnabled && phase === "attacking",
  });

  // Gradually increase difficulty
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeed((s) => Math.min(s + 0.15, 3.5));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer during attack phase
  useEffect(() => {
    if (phase !== "attacking" || lockedOption !== null) return;
    const total = isBonusRound ? BONUS_TIMER : NORMAL_TIMER;
    setTimeLeft(total);

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, shuffledAttack, lockedOption]); // eslint-disable-line

  // Timeout → game over
  useEffect(() => {
    if (phase !== "attacking" || timeLeft !== 0 || lockedOption !== null)
      return;
    setResult("timeout");
    playSound("timeout");
    announceTimeout();
    setParticleType("wrong");
    setParticleTrigger((n) => n + 1);
    const stats: GameStats = {
      score: scoreRef.current,
      level,
      maxCombo: maxComboRef.current,
      attacksDefeated: attacksDefeatedRef.current,
    };
    setTimeout(() => onGameOver(stats), 1800);
  }, [timeLeft, phase, lockedOption]); // eslint-disable-line

  // Spawn attacks during running phase
  useEffect(() => {
    if (phase !== "running") return;
    const delay = Math.max(2000, 5500 - scoreRef.current * 60);
    const timer = setTimeout(() => {
      // Pre-generate attack so ThreatSprite knows which enemy to show
      const nextAtk = getShuffledAttack();
      setShuffledAttack(nextAtk);
      setShowThreat(true);
      setTimeout(() => {
        setShowThreat(false);
        setSelectedOption(null);
        setLockedOption(null);
        setResult(null);
        resetGesture();
        setPhase("attacking");
        announceAttack(nextAtk.attack.name);
      }, 900);
    }, delay);
    return () => clearTimeout(timer);
  }, [phase, resetGesture]);

  // Evaluate locked answer
  useEffect(() => {
    if (lockedOption === null || shuffledAttack === null) return;

    const isCorrect = lockedOption === shuffledAttack.correctOption;
    const outcome: "correct" | "wrong" = isCorrect ? "correct" : "wrong";
    setResult(outcome);
    playSound(outcome);

    setParticleType(outcome);
    setParticleTrigger((n) => n + 1);

    if (isCorrect) {
      const newStreak = streakRef.current + 1;
      const combo = getCombo(newStreak);
      const newMaxCombo = Math.max(maxComboRef.current, combo);
      const newAttacksDefeated = attacksDefeatedRef.current + 1;

      const baseScore =
        10 +
        Math.floor(speedRef.current * 5) +
        Math.ceil(timeLeftRef.current * 2);
      const bonusMultiplier = bonusAttacksLeftRef.current > 0 ? 2 : 1;
      const finalScore = baseScore * combo * bonusMultiplier;

      // Level up check
      const prevLevel = Math.floor(attacksDefeatedRef.current / 10) + 1;
      const newLevel = Math.floor(newAttacksDefeated / 10) + 1;

      setStreak(newStreak);
      setMaxCombo(newMaxCombo);
      setAttacksDefeated(newAttacksDefeated);

      // Show combo popup
      if (combo >= 2) {
        setShowComboPopup(combo);
        setTimeout(() => setShowComboPopup(null), 1200);
      }

      // Voice announce
      announceCorrect(newStreak);

      // Level up
      if (newLevel > prevLevel) {
        announceLevelUp(newLevel);
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 2000);
      }

      // Bonus round logic — decrement if active, or trigger new one
      let nextBonusLeft = bonusAttacksLeftRef.current;
      if (nextBonusLeft > 0) {
        nextBonusLeft -= 1;
        setBonusAttacksLeft(nextBonusLeft);
      }
      // Every BONUS_ROUND_EVERY correct answers, trigger a new bonus round (if not already in one)
      if (newAttacksDefeated % BONUS_ROUND_EVERY === 0 && nextBonusLeft === 0) {
        setTimeout(() => {
          setBonusAttacksLeft(BONUS_ROUND_ATTACKS);
          setShowBonusBanner(true);
          announceBonusRound();
          setTimeout(() => setShowBonusBanner(false), 2500);
        }, 1500);
      }

      setTimeout(() => {
        setScore((s) => s + finalScore);
        setPhase("running");
        setShuffledAttack(null);
        setLockedOption(null);
        setResult(null);
        resetGesture();
      }, 1400);
    } else {
      announceWrong();
      const stats: GameStats = {
        score: scoreRef.current,
        level: Math.floor(attacksDefeatedRef.current / 10) + 1,
        maxCombo: maxComboRef.current,
        attacksDefeated: attacksDefeatedRef.current,
      };
      setTimeout(() => onGameOver(stats), 1800);
    }
  }, [lockedOption, shuffledAttack]); // eslint-disable-line

  const handleOptionClick = (n: number) => {
    if (lockedOption !== null || phase !== "attacking") return;
    setSelectedOption(n);
    setLockedOption(n);
  };

  const isUrgent =
    phase === "attacking" && timeLeft <= 3 && lockedOption === null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: isBonusRound
          ? "linear-gradient(180deg, #0a0800 0%, #1a1200 50%, #0f0c00 100%)"
          : "linear-gradient(180deg, #030712 0%, #0f172a 50%, #0c1825 100%)",
      }}
    >
      {/* Brand badge */}
      <div className="fixed top-8 left-4 z-50 flex items-center gap-2 px-3 py-1.5 pointer-events-none">
        {brand.logoUrl && (
          <img
            src={brand.logoUrl}
            alt={brand.brandName}
            className="object-contain"
            style={{ width: brand.logoSize, height: brand.logoSize }}
          />
        )}
        <span
          className="font-semibold tracking-wide"
          style={{ fontSize: brand.brandNameSize * 0.2, color: brand.brandNameColor, fontFamily: "var(--brand-font, inherit)" }}
        >
          {brand.brandName}
        </span>
      </div>

      {/* Bonus round stripe at top */}
      <AnimatePresence>
        {isBonusRound && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 4, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full flex-shrink-0"
            style={{
              background: "linear-gradient(90deg, #f59e0b, #fcd34d, #f59e0b)",
              backgroundSize: "200% 100%",
            }}
          />
        )}
      </AnimatePresence>

      {/* Header HUD */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{
          borderColor: isBonusRound
            ? "rgba(245, 158, 11, 0.3)"
            : "rgba(34, 211, 238, 0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="px-3 py-1 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider"
            style={{
              background: isBonusRound
                ? "rgba(245, 158, 11, 0.15)"
                : "rgba(6, 78, 199, 0.2)",
              border: isBonusRound
                ? "1px solid rgba(245, 158, 11, 0.5)"
                : "1px solid rgba(59, 130, 246, 0.4)",
              color: isBonusRound ? "#fcd34d" : "#93c5fd",
            }}
          >
            {isBonusRound
              ? `⭐ BONUS ROUND ×2 (${bonusAttacksLeft} left)`
              : "🛡 GestureSec Runner"}
          </div>
          <div
            className="h-2 w-2 rounded-full animate-pulse"
            style={{ background: "#22c55e", boxShadow: "0 0 8px #22c55e" }}
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Level */}
          <div className="text-xs font-mono uppercase tracking-wider">
            LVL <span className="text-purple-400 font-bold">{level}</span>
          </div>

          {/* Combo */}
          <AnimatePresence>
            {currentCombo >= 2 && (
              <motion.div
                key={currentCombo}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{
                  background: "rgba(234, 179, 8, 0.15)",
                  border: "1px solid rgba(234, 179, 8, 0.5)",
                  color: "#fbbf24",
                }}
              >
                {currentCombo}× COMBO
              </motion.div>
            )}
          </AnimatePresence>

          {/* Speed */}
          <div className="text-xs font-mono text-gray-500 uppercase tracking-wider">
            SPD <span className="text-orange-400">{speed.toFixed(1)}x</span>
          </div>

          {/* Score */}
          <motion.div
            key={score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              Score
            </span>
            <span
              className="text-2xl font-bold font-mono"
              style={{ color: isBonusRound ? "#fcd34d" : "#22d3ee" }}
            >
              {score.toString().padStart(6, "0")}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Main game area */}
      <div className="flex flex-1 gap-0">
        {/* Game canvas */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative overflow-hidden">
          {/* Cyber grid */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: isBonusRound
                ? "linear-gradient(rgba(245, 158, 11, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.5) 1px, transparent 1px)"
                : "linear-gradient(rgba(34, 211, 238, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.5) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Urgent vignette */}
          <AnimatePresence>
            {isUrgent && (
              <motion.div
                key="urgent"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0.1, 0.3] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at center, transparent 40%, rgba(239,68,68,0.25) 100%)",
                }}
              />
            )}
          </AnimatePresence>

          {/* Bonus banner popup */}
          <AnimatePresence>
            {showBonusBanner && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: -30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 z-50 px-8 py-3 rounded-2xl font-black text-2xl uppercase tracking-widest"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(251, 191, 36, 0.9))",
                  border: "3px solid #fcd34d",
                  color: "#000",
                  boxShadow: "0 0 40px rgba(245, 158, 11, 0.8)",
                }}
              >
                ⭐ BONUS ROUND! ×2 POINTS!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Combo popup */}
          <AnimatePresence>
            {showComboPopup && (
              <motion.div
                initial={{ scale: 0.4, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.2, opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 z-40 text-3xl font-black"
                style={{
                  color: "#fbbf24",
                  textShadow: "0 0 20px rgba(251, 191, 36, 0.8)",
                }}
              >
                {showComboPopup}× COMBO!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Level up popup */}
          <AnimatePresence>
            {showLevelUp && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.1, opacity: 0, y: -20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="absolute top-32 left-1/2 -translate-x-1/2 z-40 px-6 py-2 rounded-xl font-black text-xl uppercase tracking-wider"
                style={{
                  background: "rgba(168, 85, 247, 0.2)",
                  border: "2px solid rgba(168, 85, 247, 0.6)",
                  color: "#c084fc",
                  boxShadow: "0 0 24px rgba(168, 85, 247, 0.5)",
                }}
              >
                ⬆️ LEVEL {level}!
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 w-full max-w-lg">
            {/* Incoming threat sprite */}
            <div className="relative h-20 mb-2">
              <AnimatePresence>
                {showThreat && shuffledAttack && (
                  <ThreatSprite
                    key={`threat-${shuffledAttack.attack.id}`}
                    attackId={shuffledAttack.attack.id}
                    speed={speed}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Character + track */}
            <div className="flex flex-col items-center">
              <RunningCharacter isRunning={phase === "running"} speed={speed} />
              <BackgroundTrack
                speed={phase === "running" ? speed : speed * 0.3}
              />
            </div>

            {/* Phase content */}
            <AnimatePresence mode="wait">
              {phase === "running" && (
                <motion.div
                  key="running-status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center mt-4"
                >
                  <p className="text-gray-500 text-sm font-mono">
                    RUNNING... SCANNING FOR THREATS
                  </p>
                  {attacksDefeated > 0 && (
                    <p className="text-gray-600 text-xs font-mono mt-1">
                      Attacks Defeated:{" "}
                      <span className="text-cyan-600">{attacksDefeated}</span>
                      {currentCombo >= 2 && (
                        <span className="ml-2 text-yellow-600">
                          ● {currentCombo}× combo streak
                        </span>
                      )}
                    </p>
                  )}
                </motion.div>
              )}

              {phase === "attacking" && shuffledAttack && (
                <motion.div
                  key="attack-ui"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center gap-5 mt-4 relative"
                >
                  {/* Particle burst */}
                  <ParticleBurst
                    type={particleType}
                    trigger={particleTrigger}
                  />

                  {/* Bonus multiplier badge */}
                  {isBonusRound && (
                    <motion.div
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                      className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                      style={{
                        background: "rgba(245, 158, 11, 0.2)",
                        border: "1px solid rgba(245, 158, 11, 0.5)",
                        color: "#fcd34d",
                      }}
                    >
                      ⭐ BONUS ×2 — {bonusAttacksLeft} attack
                      {bonusAttacksLeft !== 1 ? "s" : ""} left
                    </motion.div>
                  )}

                  {/* Timer + Attack card */}
                  <div className="flex items-start gap-4 w-full justify-center">
                    <TimerDisplay timeLeft={timeLeft} total={timerTotal} />
                    <AttackCard attack={shuffledAttack.attack} isVisible />
                  </div>

                  <OptionsPanel
                    options={shuffledAttack.options}
                    correctOption={shuffledAttack.correctOption}
                    selectedOption={selectedOption}
                    lockedOption={lockedOption}
                    onSelect={handleOptionClick}
                    result={result === "timeout" ? "wrong" : result}
                  />

                  {/* Result overlay */}
                  <AnimatePresence>
                    {result && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ zIndex: 30 }}
                      >
                        <div
                          className="text-5xl font-black"
                          style={{
                            color: result === "correct" ? "#22c55e" : "#ef4444",
                            textShadow:
                              result === "correct"
                                ? "0 0 40px rgba(34, 197, 94, 0.8)"
                                : "0 0 40px rgba(239, 68, 68, 0.8)",
                          }}
                        >
                          {result === "correct"
                            ? isBonusRound
                              ? "⭐ BONUS DEFENDED!"
                              : "DEFENDED!"
                            : result === "timeout"
                              ? "TIME'S UP!"
                              : "BREACHED!"}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Camera sidebar */}
        <div
          className="flex flex-col items-center justify-start gap-4 p-5 border-l"
          style={{
            width: 260,
            borderColor: isBonusRound
              ? "rgba(245, 158, 11, 0.15)"
              : "rgba(34, 211, 238, 0.1)",
            background: "rgba(3, 7, 18, 0.5)",
          }}
        >
          <div className="w-full">
            <p className="text-cyan-400 text-xs uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "#22d3ee", display: "inline-block" }}
              />
              Gesture Control
            </p>
            <CameraFeed
              detectedFingers={phase === "attacking" ? detectedFingers : null}
              isConfirming={phase === "attacking" ? isConfirming : false}
              confirmProgress={phase === "attacking" ? confirmProgress : 0}
              confirmedFingers={phase === "attacking" ? confirmedFingers : null}
              videoRef={videoRef}
              canvasRef={canvasRef}
              cameraEnabled={cameraEnabled}
            />
          </div>

          <button
            onClick={() => setCameraEnabled((e) => !e)}
            className="w-full py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            style={{
              background: cameraEnabled
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(34, 197, 94, 0.15)",
              border: cameraEnabled
                ? "1px solid rgba(239, 68, 68, 0.4)"
                : "1px solid rgba(34, 197, 94, 0.4)",
              color: cameraEnabled ? "#fca5a5" : "#86efac",
            }}
          >
            {cameraEnabled ? "Disable Camera" : "Enable Camera"}
          </button>

          {/* Stats panel */}
          <div className="w-full flex flex-col gap-2">
            {[
              { label: "Level", value: level, color: "#c084fc" },
              { label: "Defeated", value: attacksDefeated, color: "#22d3ee" },
              { label: "Streak", value: streak, color: "#fbbf24" },
              { label: "Max Combo", value: `${maxCombo}×`, color: "#f97316" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex justify-between items-center text-xs"
              >
                <span className="text-gray-500 uppercase tracking-wider">
                  {label}
                </span>
                <span className="font-bold font-mono" style={{ color }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div
            className="w-full p-3 rounded-lg text-xs leading-relaxed"
            style={{
              background: "rgba(17, 24, 39, 0.6)",
              border: "1px solid rgba(75, 85, 99, 0.3)",
              color: "#9ca3af",
            }}
          >
            <p className="font-semibold text-gray-300 mb-2">How to play</p>
            <p className="mb-1">1. Read the attack indicator</p>
            <p className="mb-1">2. Show 1–4 fingers or click</p>
            <p className="mb-1">3. Hold 1 sec to lock answer</p>
            <p className="mb-1">4. 10sec to answer +3 sec bonus</p>
            <p className="mb-1">5. Every 5 wins = Bonus Round!</p>
            <p>6. Wrong/timeout = Game Over</p>
          </div>

          {/* Difficulty bar */}
          <div className="w-full">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Difficulty</span>
              <span className="text-orange-400">
                {Math.round(((speed - 1) / 2.5) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-800">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(((speed - 1) / 2.5) * 100, 100)}%`,
                  background:
                    "linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)",
                }}
                animate={{
                  width: `${Math.min(((speed - 1) / 2.5) * 100, 100)}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
