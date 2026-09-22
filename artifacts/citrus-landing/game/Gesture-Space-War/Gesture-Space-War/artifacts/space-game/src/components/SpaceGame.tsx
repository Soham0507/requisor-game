import { useEffect, useRef, useCallback, useState } from "react";
import { initGame, startGame, tick, getLeaderboard, saveScore, savePlayerInfo } from "../game/engine";
import type { LeaderEntry } from "../game/engine";
import { render, drawLandmarks, renderBossWarning } from "../game/renderer";
import { useHandGesture } from "../hooks/useHandGesture";
import { useBrand, hexToRgba } from "../brand-bridge";
import {
  sfxLaser, sfxExplosion, sfxLifeLost, sfxPowerUp,
  sfxWormhole, sfxBossWarning, sfxBossDefeated, sfxMeteorWarning,
  startMusic, stopMusic, setBossIntensity,
} from "../audio/sounds";
import type { GameState } from "../game/types";

const CIRC = 2 * Math.PI * 22;
const LEVEL_LABEL = ["","LV 1  EASY","LV 2  NORMAL","LV 3  HARD","LV 4  INTENSE","LV 5  BRUTAL","LV 6  INSANE"];
const LEVEL_COLOR = ["","#88ff88","#55bbff","#ffee44","#ff9933","#ff4444","#ff00ff"];
const CHAP_LABEL  = ["","CHAPTER 1 — ASTEROIDS","CHAPTER 2 — ALIEN INVASION"];

// ── Power-up ring ─────────────────────────────────────────────────────────
interface PowerRingProps {
  color: string; glow: string; icon: string; label: string;
  cardRef: React.RefObject<HTMLDivElement | null>;
  ringRef: React.RefObject<SVGCircleElement | null>;
  lblRef:  React.RefObject<HTMLSpanElement | null>;
}
function PowerRing({ color, glow, icon, label, cardRef, ringRef, lblRef }: PowerRingProps) {
  return (
    <div ref={cardRef} style={{ display: "none" }} className="flex-col items-center gap-1">
      <div className="relative">
        <svg width="54" height="54" viewBox="0 0 54 54" style={{ filter: `drop-shadow(0 0 8px ${glow})` }}>
          <circle cx="27" cy="27" r="22" fill="none" stroke="#ffffff18" strokeWidth="3"/>
          <circle ref={ringRef} cx="27" cy="27" r="22" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={CIRC} strokeDashoffset="0"
            strokeLinecap="round" transform="rotate(-90 27 27)"/>
          <text x="27" y="34" textAnchor="middle" fontSize="20" dominantBaseline="middle"
            style={{ userSelect: "none" }}>{icon}</text>
        </svg>
      </div>
      <span ref={lblRef} className="font-mono text-xs font-bold" style={{ color }}/>
      <span className="font-mono text-[9px] tracking-widest opacity-60 uppercase">{label}</span>
    </div>
  );
}

// ── Leaderboard row ───────────────────────────────────────────────────────
function LeaderRow({ entry, rank }: { entry: LeaderEntry; rank: number }) {
  const colors = ["#ffd700","#c0c0c0","#cd7f32"];
  const color = colors[rank] ?? "#6688aa";
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="font-mono text-[10px] w-4 text-right" style={{ color }}>{rank + 1}.</span>
      <span className="font-mono text-sm font-black tracking-widest" style={{ color }}>{entry.name}</span>
      <span className="font-mono text-sm font-bold text-white ml-auto">{entry.score.toLocaleString()}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function SpaceGame() {
  const brand = useBrand();
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);
  const landmarkRef   = useRef<HTMLCanvasElement>(null);
  const stateRef      = useRef<GameState | null>(null);
  const rafRef        = useRef<number>(0);
  const phaseRef      = useRef<string>("title");

  // DOM refs for frame-accurate HUD
  const scoreValRef   = useRef<HTMLSpanElement>(null);
  const bestValRef    = useRef<HTMLSpanElement>(null);
  const levelBadgeRef = useRef<HTMLDivElement>(null);
  const chapBadgeRef  = useRef<HTMLDivElement>(null);
  const gestureIconRef= useRef<HTMLSpanElement>(null);
  const gestureLblRef = useRef<HTMLSpanElement>(null);
  const gestureDotRef = useRef<HTMLDivElement>(null);
  const livesRef      = useRef<HTMLDivElement>(null);

  // power-up ring refs
  const shieldCardRef = useRef<HTMLDivElement>(null);
  const shieldRingRef = useRef<SVGCircleElement>(null);
  const shieldLblRef  = useRef<HTMLSpanElement>(null);
  const msCardRef     = useRef<HTMLDivElement>(null);
  const msRingRef     = useRef<SVGCircleElement>(null);
  const msLblRef      = useRef<HTMLSpanElement>(null);
  const rfCardRef     = useRef<HTMLDivElement>(null);
  const rfRingRef     = useRef<SVGCircleElement>(null);
  const rfLblRef      = useRef<HTMLSpanElement>(null);
  const tsCardRef     = useRef<HTMLDivElement>(null);
  const tsRingRef     = useRef<SVGCircleElement>(null);
  const tsLblRef      = useRef<HTMLSpanElement>(null);

  const [phase, setPhase]             = useState<string>("title");
  const [showVideo, setShowVideo]     = useState(true);
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [playerName, setPlayerName]   = useState("");
  const [fullName, setFullName]       = useState("");
  const [playerEmail, setPlayerEmail] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [scoreSaved, setScoreSaved]   = useState(false);

  const { handData, isLoading, error, start, stop } = useHandGesture(videoRef);
  const handDataRef = useRef(handData);
  useEffect(() => { handDataRef.current = handData; }, [handData]);

  // load leaderboard on mount
  useEffect(() => { setLeaderboard(getLeaderboard()); }, []);

  const playSfx = useCallback((sfx: string[]) => {
    for (const s of sfx) {
      switch (s) {
        case "laser":          sfxLaser(); break;
        case "explosion_sm":   sfxExplosion("sm"); break;
        case "explosion_lg":   sfxExplosion("lg"); break;
        case "lifeLost":       sfxLifeLost(); break;
        case "powerup":        sfxPowerUp(); break;
        case "wormhole":       sfxWormhole(); break;
        case "bossWarning":    sfxBossWarning(); break;
        case "bossDefeated":   sfxBossDefeated(); break;
        case "meteorWarning":  sfxMeteorWarning(); break;
      }
    }
  }, []);

  const updateHUD = useCallback((s: GameState, hd: typeof handData) => {
    if (scoreValRef.current) scoreValRef.current.textContent = String(s.score);
    if (bestValRef.current)  bestValRef.current.textContent  = String(s.highScore);

    const lv = Math.min(s.diffLevel, 6);
    if (levelBadgeRef.current) {
      levelBadgeRef.current.textContent = LEVEL_LABEL[lv];
      levelBadgeRef.current.style.color = LEVEL_COLOR[lv];
      levelBadgeRef.current.style.borderColor = LEVEL_COLOR[lv] + "55";
      levelBadgeRef.current.style.boxShadow = `0 0 10px ${LEVEL_COLOR[lv]}44`;
    }
    if (chapBadgeRef.current) chapBadgeRef.current.textContent = CHAP_LABEL[Math.min(s.chapter, 2)] ?? "";

    if (livesRef.current) {
      livesRef.current.textContent = "❤️".repeat(Math.max(0, s.lives));
    }

    if (gestureDotRef.current) {
      const c = !hd.isDetected ? "#555" : hd.isFist ? "#ff4444" : "#44ff88";
      gestureDotRef.current.style.background = c;
      gestureDotRef.current.style.boxShadow = hd.isDetected ? `0 0 8px ${c}` : "none";
    }
    if (gestureIconRef.current) gestureIconRef.current.textContent = !hd.isDetected ? "✋" : hd.isFist ? "✊" : "🖐";
    if (gestureLblRef.current)  gestureLblRef.current.textContent  = !hd.isDetected ? "NO HAND" : hd.isFist ? "FIRING" : "STEERING";

    setBossIntensity(!!s.boss);

    const ring = (
      cardRef: React.RefObject<HTMLDivElement | null>,
      rRef: React.RefObject<SVGCircleElement | null>,
      lRef: React.RefObject<HTMLSpanElement | null>,
      active: boolean, timer: number, maxTimer: number
    ) => {
      if (!cardRef.current) return;
      cardRef.current.style.display = active ? "flex" : "none";
      if (active) {
        if (rRef.current) rRef.current.style.strokeDashoffset = String(CIRC * (1 - timer / maxTimer));
        if (lRef.current) lRef.current.textContent = `${Math.ceil(timer / 60)}s`;
      }
    };
    ring(shieldCardRef, shieldRingRef, shieldLblRef, s.ship.shieldActive, s.ship.shieldTimer, 600);
    ring(msCardRef,     msRingRef,     msLblRef,     s.ship.multishotActive, s.ship.multishotTimer, 600);
    ring(rfCardRef,     rfRingRef,     rfLblRef,     s.ship.rapidfireActive, s.ship.rapidfireTimer, 600);
    ring(tsCardRef,     tsRingRef,     tsLblRef,     s.ship.timeSlowActive, s.ship.timeSlowTimer, 300);
  }, []);

  const updateLandmarks = useCallback((hd: typeof handData) => {
    const lc = landmarkRef.current;
    if (!lc) return;
    const ctx2 = lc.getContext("2d");
    if (!ctx2) return;
    if (hd.landmarks && hd.isDetected) drawLandmarks(ctx2, hd.landmarks, hd.isFist, lc.width, lc.height);
    else ctx2.clearRect(0, 0, lc.width, lc.height);
  }, []);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = window.innerWidth, H = window.innerHeight;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

    const hd = handDataRef.current;
    const tx = hd.isDetected ? hd.x * W : (stateRef.current?.ship.x ?? W / 2);
    const ty = hd.isDetected ? hd.y * H : (stateRef.current?.ship.y ?? H - 100);

    if (stateRef.current) {
      const result = tick(stateRef.current, W, H, tx, ty, hd.isDetected && hd.isFist);
      stateRef.current = result;

      // ── apply screen shake ──
      const sk = result.shake;
      if (sk.timer > 0) {
        ctx.save();
        ctx.translate(sk.x, sk.y);
      }

      if (result.phase === "bossWarning") {
        renderBossWarning(ctx, W, H, result.bossWarningTimer);
      } else {
        render(ctx, result, W, H);
      }

      if (sk.timer > 0) ctx.restore();

      playSfx(result.sfx);
      updateHUD(result, hd);

      const newPhase = result.phase;
      if (newPhase !== phaseRef.current) {
        phaseRef.current = newPhase;
        setPhase(newPhase);
        if (newPhase === "playing") { startMusic(); setShowNameEntry(false); setScoreSaved(false); }
        if (newPhase === "gameover") { stopMusic(); setShowNameEntry(true); setPlayerName(""); setLeaderboard(getLeaderboard()); }
      }
    }
    updateLandmarks(hd);
    rafRef.current = requestAnimationFrame(loop);
  }, [updateHUD, updateLandmarks, playSfx]);

  useEffect(() => {
    const W = window.innerWidth, H = window.innerHeight;
    stateRef.current = initGame(W, H);
    rafRef.current = requestAnimationFrame(loop);
    const onResize = () => {
      if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; }
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", onResize); stop(); stopMusic(); };
  }, [loop, stop]);

  const handleClick = useCallback(() => {
    if (!stateRef.current) return;
    const cur = stateRef.current.phase;
    if (cur === "title" || (cur === "gameover" && scoreSaved)) {
      stateRef.current = startGame(stateRef.current, window.innerWidth, window.innerHeight);
      phaseRef.current = "playing";
      setPhase("playing");
      setShowNameEntry(false);
      setScoreSaved(false);
      startMusic();
      if (!handDataRef.current.isDetected && !isLoading) start();
    }
  }, [isLoading, start, scoreSaved]);

  const canSaveScore = playerName.length > 0 && fullName.trim().length > 0 && playerEmail.trim().length > 0;
  const handleSaveScore = useCallback(() => {
    if (!canSaveScore) return;
    const finalName = playerName.trim().toUpperCase().padEnd(3, "·").slice(0, 3);
    const currentScore = stateRef.current?.score ?? 0;
    const updated = saveScore(finalName, currentScore);
    savePlayerInfo(fullName, playerEmail, currentScore);
    setLeaderboard(updated);
    setShowNameEntry(false);
    setScoreSaved(true);
  }, [canSaveScore, playerName, fullName, playerEmail]);

  const enableGesture = useCallback((e: React.MouseEvent) => { e.stopPropagation(); start(); }, [start]);

  const isGameOver = phase === "gameover";
  const isTitle    = phase === "title";

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black cursor-pointer select-none" onClick={handleClick}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"/>

      {/* ── Live HUD ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>

        {/* score – top left */}
        <div className="absolute top-4 left-4 rounded-xl px-4 py-2.5"
          style={{ background: "rgba(0,8,25,0.75)", backdropFilter: "blur(10px)" }}>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] tracking-widest text-blue-400 opacity-60">SCORE</span>
            <span ref={scoreValRef} className="font-mono text-2xl font-black text-white" style={{ textShadow: "0 0 14px #55aaff" }}>0</span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-mono text-[9px] tracking-widest text-blue-400 opacity-40">BEST</span>
            <span ref={bestValRef} className="font-mono text-sm font-bold text-blue-300 opacity-60">0</span>
          </div>
        </div>

        {/* lives */}
        <div ref={livesRef} className="absolute top-24 left-4 font-mono text-base tracking-wide"
          style={{ textShadow: "0 0 8px #ff4444" }}>
          ❤️❤️❤️
        </div>

        {/* level + chapter – top center */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
          <div ref={levelBadgeRef} className="font-mono text-[11px] font-black tracking-[0.18em] px-4 py-1.5 rounded-full"
            style={{ color: "#88ff88", background: "rgba(0,8,20,0.75)", backdropFilter: "blur(8px)" }}>
            LV 1  EASY
          </div>
          <div ref={chapBadgeRef} className="font-mono text-[9px] tracking-widest text-blue-400 opacity-50"/>
        </div>

        {/* gesture – top right */}
        <div className="absolute top-4 right-4 rounded-xl px-3 py-2.5 flex items-center gap-2.5"
          style={{ background: "rgba(0,8,25,0.75)", backdropFilter: "blur(10px)" }}>
          <div ref={gestureDotRef} className="w-2 h-2 rounded-full" style={{ background: "#555", transition: "background 0.15s" }}/>
          <span ref={gestureIconRef} className="text-base leading-none">✋</span>
          <span ref={gestureLblRef} className="font-mono text-[10px] tracking-widest text-gray-400">NO HAND</span>
        </div>

        {/* controls legend */}
        <div className="absolute top-20 right-4 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(0,5,18,0.65)", backdropFilter: "blur(8px)" }}>
          <div className="font-mono text-[8px] tracking-widest text-blue-500 opacity-50 mb-2">CONTROLS</div>
          {[["🖐","Steer"],["✊","Fire"]].map(([ic, t]) => (
            <div key={t} className="flex items-center gap-2 mb-1">
              <span className="text-xs w-4">{ic}</span>
              <span className="font-mono text-[9px] text-gray-400">{t}</span>
            </div>
          ))}
          <div className="border-t border-white/10 my-1.5"/>
          {[["☄","+1"],["👾","+30"],["🔴","+5"],["🔵","+15"],["🔴","Kamikaze"],
            ["🟣","Sniper"],["🟢","Swarm"],["⚡","Boss+200"]].map(([ic, t]) => (
            <div key={t} className="flex items-center gap-2 mb-0.5">
              <span className="text-xs w-4">{ic}</span>
              <span className="font-mono text-[9px] text-gray-400">{t}</span>
            </div>
          ))}
        </div>

        {/* active power-ups – bottom center */}
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-end gap-4">
          <PowerRing color="#44ffaa" glow="#00ffcc" icon="🛡" label="SHIELD"
            cardRef={shieldCardRef} ringRef={shieldRingRef} lblRef={shieldLblRef}/>
          <PowerRing color="#ffe944" glow="#ffcc00" icon="⚡" label="MULTI-SHOT"
            cardRef={msCardRef} ringRef={msRingRef} lblRef={msLblRef}/>
          <PowerRing color="#ff8844" glow="#ff4400" icon="🔥" label="RAPID-FIRE"
            cardRef={rfCardRef} ringRef={rfRingRef} lblRef={rfLblRef}/>
          <PowerRing color="#88ccff" glow="#4488ff" icon="⏳" label="TIME SLOW"
            cardRef={tsCardRef} ringRef={tsRingRef} lblRef={tsLblRef}/>
        </div>
      </div>

      {/* ── webcam preview ──────────────────────────────────────── */}
      <div className="absolute pointer-events-auto"
        style={{
          bottom: 16, right: 16, zIndex: 3,
          display: showVideo ? "block" : "none",
          borderRadius: 12, overflow: "hidden",
          boxShadow: handData.isDetected
            ? `0 0 20px ${handData.isFist ? "#ff444455" : "#44ff8855"}`
            : "0 0 8px rgba(0,0,0,0.5)",
          transition: "box-shadow 0.2s",
        }}
        onClick={e => e.stopPropagation()}
      >
        <video ref={videoRef} width={180} height={135}
          style={{ display: "block", transform: "scaleX(-1)", objectFit: "cover" }}
          playsInline muted/>
        <canvas ref={landmarkRef} width={180} height={135}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}/>
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{
            background: handData.isDetected ? (handData.isFist ? "#ff4444" : "#44ff88") : "#555",
            transition: "background 0.15s"
          }}/>
          <span className="font-mono text-[9px] text-gray-300">
            {handData.isDetected ? (handData.isFist ? "FIST ✊" : "OPEN 🖐") : "SEARCHING…"}
          </span>
        </div>
      </div>

      <button className="absolute pointer-events-auto rounded-lg px-2 py-1 font-mono text-[10px] transition-all"
        style={{
          bottom: 16, right: showVideo ? 204 : 16, zIndex: 4,
          background: "rgba(0,8,25,0.75)", color: "#55aaff",
        }}
        onClick={e => { e.stopPropagation(); setShowVideo(v => !v); }}
      >
        {showVideo ? "📷 hide" : "📷 show"}
      </button>

      {/* ── Brand badge ──────────────────────────────────────────── */}
      <div
        className="absolute pointer-events-auto flex items-center gap-2 rounded-2xl px-3 py-1.5"
        style={{
          bottom: 16, left: 16, zIndex: 5,
          background: "rgba(0,18,40,0.82)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 0 18px rgba(0,200,170,0.18)",
        }}
      >
        {brand.logoUrl && (
          <img src={brand.logoUrl} alt={brand.brandName} width={34} height={34}
            style={{ objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(0,210,180,0.6))" }}/>
        )}
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-[9px] tracking-widest text-teal-400 opacity-60">BUILT WITH</span>
          <span className="font-mono text-[12px] font-black tracking-wider"
            style={{ color: "#00d4b4", textShadow: "0 0 10px #00d4b488", fontFamily: "var(--brand-font, inherit)" }}>
            {brand.brandName}
          </span>
        </div>
      </div>

      {/* ── Title overlay ────────────────────────────────────────── */}
      {isTitle && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
          <div className="rounded-2xl px-8 py-7 flex flex-col items-center gap-4 w-full max-w-lg mx-4"
            style={{
              background: "rgba(0,4,18,0.90)",
              backdropFilter: "blur(18px)", boxShadow: "0 0 70px rgba(40,130,255,0.2)",
            }}>
            <div className="text-center">
              <div
                className="font-mono font-black tracking-[0.08em] text-white"
                style={{
                  fontSize: brand.brandNameSize,
                  lineHeight: 1.1,
                  color: brand.brandNameColor,
                  textShadow: `0 0 30px ${hexToRgba(brand.brandNameColor, 0.6)}, 0 0 70px ${hexToRgba(brand.brandNameColor, 0.3)}`,
                  fontFamily: "var(--brand-font, inherit)",
                }}
              >
                {brand.brandName}
              </div>
              <div
                className="font-mono tracking-[0.15em] uppercase mt-2"
                style={{ fontSize: brand.headingSize, color: brand.headingColor, fontFamily: "var(--brand-font, inherit)" }}
              >
                {brand.heading}
              </div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-blue-400 opacity-60 mt-2">{brand.tagline}</div>
            </div>
            <div className="w-full border-t border-white/10"/>
            <div className="flex gap-8 w-full">
              {/* instructions */}
              <div className="flex flex-col gap-1.5 flex-1">
                {[["🖐","Steer"],["✊","Fire"],["❤️","3 lives"],["⚡","Bosses at milestones"],["⏳","Time-slow power-up"],["☄","Meteor showers"]].map(([ic, t]) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-sm w-5 text-center">{ic}</span>
                    <span className="font-mono text-[10px] text-gray-300">{t}</span>
                  </div>
                ))}
              </div>
              {/* leaderboard */}
              {leaderboard.length > 0 && (
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[9px] tracking-widest text-yellow-500 opacity-70 mb-1.5">LEADERBOARD</div>
                  {leaderboard.slice(0, 5).map((e, i) => <LeaderRow key={i} entry={e} rank={i}/>)}
                </div>
              )}
            </div>
            <div className="w-full border-t border-white/10"/>
            <div className="flex flex-col items-center gap-2.5 w-full pointer-events-auto">
              {!handData.isDetected && !isLoading && (
                <button onClick={enableGesture}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-mono text-sm font-bold"
                  style={{ background: "rgba(50,110,255,0.18)", color: "#88aaff" }}>
                  📷 Enable Hand Gestures
                </button>
              )}
              {isLoading && <div className="font-mono text-xs text-blue-400 animate-pulse">⏳ Starting camera…</div>}
              {handData.isDetected && <div className="font-mono text-xs text-green-400">✅ Hand tracking active</div>}
              {error && <div className="font-mono text-[10px] text-red-400 text-center">{error}</div>}
              <button onClick={handleClick}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-mono text-sm font-black tracking-[0.15em] hover:opacity-80"
                style={{ background: "rgba(60,160,255,0.14)", color: "#88ddff" }}>
                ▶  START GAME
              </button>
            </div>

            {/* Requisor AI branding strip */}
            <div className="w-full border-t border-white/10"/>
            <div
              className="w-full flex items-center justify-center gap-3 rounded-xl py-2.5 pointer-events-auto"
              style={{
                background: "rgba(0,210,180,0.06)",
              }}
            >
              {brand.logoUrl && (
                <img src={brand.logoUrl} alt={brand.brandName} width={36} height={36}
                  style={{ objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(0,210,180,0.7))" }}/>
              )}
              <div className="flex flex-col leading-tight">
                <span className="font-mono text-[8px] tracking-[0.25em] opacity-50 text-teal-300">BUILT WITH</span>
                <span className="font-mono text-[15px] font-black tracking-wide"
                  style={{ color: "#00d4b4", textShadow: "0 0 14px #00d4b466", fontFamily: "var(--brand-font, inherit)" }}>
                  {brand.brandName}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Game Over overlay ────────────────────────────────────── */}
      {isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
          <div className="rounded-2xl px-8 py-7 flex flex-col items-center gap-4 w-full max-w-lg mx-4"
            style={{
              background: "rgba(0,4,18,0.90)",
              backdropFilter: "blur(18px)", boxShadow: "0 0 70px rgba(255,40,40,0.2)",
            }}>
            <div className="font-mono font-black text-5xl tracking-widest text-red-400 text-center"
              style={{ textShadow: "0 0 30px #ff4444" }}>
              GAME<br/>OVER
            </div>
            <div className="w-full border-t border-white/10"/>

            {/* scores */}
            <div className="flex gap-10 justify-center">
              {([
                ["SCORE", stateRef.current?.score ?? 0, "#ffffff"],
                ["BEST",  stateRef.current?.highScore ?? 0, "#55aaff"],
              ] as const).map(([lbl, val, col]) => (
                <div key={lbl} className="flex flex-col items-center gap-1">
                  <span className="font-mono text-[9px] tracking-widest opacity-50" style={{ color: col }}>{lbl}</span>
                  <span className="font-mono text-4xl font-black" style={{ color: col, textShadow: `0 0 15px ${col}55` }}>{val}</span>
                </div>
              ))}
            </div>

            {/* player info + leaderboard initials */}
            {showNameEntry && !scoreSaved && (
              <div className="w-full flex flex-col items-center gap-2 pointer-events-auto"
                onClick={e => e.stopPropagation()}>
                <div className="font-mono text-[10px] tracking-widest text-blue-400 opacity-60">YOUR INFO</div>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && canSaveScore) handleSaveScore(); }}
                  className="font-mono text-sm text-center w-full max-w-[280px] rounded-lg px-3 py-2 outline-none"
                  style={{ background: "rgba(10,30,80,0.8)", color: "#88ddff", caretColor: "#88ddff" }}
                  placeholder="Full name"
                />
                <input
                  type="email"
                  value={playerEmail}
                  onChange={e => setPlayerEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && canSaveScore) handleSaveScore(); }}
                  className="font-mono text-sm text-center w-full max-w-[280px] rounded-lg px-3 py-2 outline-none"
                  style={{ background: "rgba(10,30,80,0.8)", color: "#88ddff", caretColor: "#88ddff" }}
                  placeholder="Email"
                />
                <div className="font-mono text-[10px] tracking-widest text-blue-400 opacity-60 mt-1">LEADERBOARD INITIALS</div>
                <div className="flex items-center gap-3">
                  <input
                    autoFocus
                    type="text"
                    maxLength={3}
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                    onKeyDown={e => { if (e.key === "Enter" && canSaveScore) handleSaveScore(); }}
                    className="font-mono text-2xl font-black text-center w-24 rounded-lg px-2 py-1.5 tracking-widest outline-none"
                    style={{
                      background: "rgba(10,30,80,0.8)",
                      color: "#88ddff", caretColor: "#88ddff",
                    }}
                    placeholder="AAA"
                  />
                  <button
                    onClick={e => { e.stopPropagation(); if (canSaveScore) handleSaveScore(); }}
                    disabled={!canSaveScore}
                    className="font-mono text-xs font-bold rounded-lg px-3 py-2 transition-opacity hover:opacity-80"
                    style={{
                      background: canSaveScore ? "rgba(50,120,255,0.28)" : "rgba(50,50,80,0.3)",
                      color: "#88aaff",
                      opacity: canSaveScore ? 1 : 0.4,
                      cursor: canSaveScore ? "pointer" : "not-allowed",
                    }}>
                    SAVE
                  </button>
                </div>
              </div>
            )}

            {/* leaderboard after save */}
            {(scoreSaved || !showNameEntry) && leaderboard.length > 0 && (
              <div className="w-full pointer-events-auto" onClick={e => e.stopPropagation()}>
                <div className="font-mono text-[9px] tracking-widest text-yellow-500 opacity-70 mb-1.5 text-center">LEADERBOARD</div>
                {leaderboard.slice(0, 5).map((e, i) => <LeaderRow key={i} entry={e} rank={i}/>)}
              </div>
            )}

            <div className="w-full border-t border-white/10"/>
            <div className="flex flex-col items-center gap-2 w-full pointer-events-auto">
              {!handData.isDetected && !isLoading && (
                <button onClick={enableGesture}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2 font-mono text-sm font-bold"
                  style={{ background: "rgba(50,110,255,0.15)", color: "#88aaff" }}>
                  📷 Enable Hand Gestures
                </button>
              )}
              {handData.isDetected && <div className="font-mono text-xs text-green-400">✅ Hand tracking active</div>}
              {showNameEntry && !scoreSaved ? (
                <div className="font-mono text-[10px] text-gray-500">Save your name first, then play again</div>
              ) : (
                <button onClick={handleClick}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-mono text-sm font-black tracking-[0.15em] hover:opacity-80"
                  style={{ background: "rgba(255,50,50,0.16)", color: "#ff9999" }}>
                  ▶  PLAY AGAIN
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
