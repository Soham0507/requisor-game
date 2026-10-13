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

// ── Brand mark: the customer's logo, shown whole on a soft tile ───────────
function BrandMark({ size }: { size: number }) {
  const brand = useBrand();
  if (!brand.logoUrl) {
    return (
      <div className="shrink-0 grid place-items-center rounded-2xl"
        style={{
          width: size, height: size, fontSize: Math.round(size * 0.5),
          background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`,
          color: "#05060d",
        }}
        aria-hidden="true">
        🚀
      </div>
    );
  }
  return (
    <div className="shrink-0 grid place-items-center" style={{ height: size, maxWidth: size * 3.2 }}>
      {/* no box or border: the logo sits directly on the page.
          explicit pixel size: a percentage height does not constrain large raster logos here */}
      <img src={brand.logoUrl} alt=""
        style={{ height: size, width: "auto", maxWidth: size * 3.2, objectFit: "contain", display: "block" }}/>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function SpaceGame() {
  const brand = useBrand();
  // Height of the branded top bar; the game canvas fills the area below it.
  const barH = Math.min(120, Math.max(76, brand.logoSize + 28));
  const barHRef = useRef(barH);
  barHRef.current = barH;
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

    const W = window.innerWidth, H = Math.max(200, window.innerHeight - barHRef.current);
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
    const W = window.innerWidth, H = Math.max(200, window.innerHeight - barHRef.current);
    stateRef.current = initGame(W, H);
    rafRef.current = requestAnimationFrame(loop);
    const onResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = Math.max(200, window.innerHeight - barHRef.current);
      }
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", onResize); stop(); stopMusic(); };
  }, [loop, stop]);

  const handleClick = useCallback(() => {
    if (!stateRef.current) return;
    const cur = stateRef.current.phase;
    if (cur === "title" || (cur === "gameover" && scoreSaved)) {
      stateRef.current = startGame(stateRef.current, window.innerWidth, Math.max(200, window.innerHeight - barHRef.current));
      phaseRef.current = "playing";
      setPhase("playing");
      setShowNameEntry(false);
      setScoreSaved(false);
      startMusic();
      if (!handDataRef.current.isDetected && !isLoading) start();
    }
  }, [isLoading, start, scoreSaved]);

  // Always-available restart from the game-over card (saving is optional).
  const restartGame = useCallback(() => {
    if (!stateRef.current) return;
    stateRef.current = startGame(stateRef.current, window.innerWidth, Math.max(200, window.innerHeight - barHRef.current));
    phaseRef.current = "playing";
    setPhase("playing");
    setShowNameEntry(false);
    setScoreSaved(false);
    startMusic();
    if (!handDataRef.current.isDetected && !isLoading) start();
  }, [isLoading, start]);

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

  const accent    = brand.primaryColor;
  const accent2   = brand.secondaryColor;
  const brandGrad = `linear-gradient(135deg, ${accent}, ${accent2})`;
  const titleSize = Math.max(20, brand.headingSize);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black cursor-pointer select-none" onClick={handleClick}>
      <canvas
        ref={canvasRef}
        className="absolute left-0 w-full"
        style={{ top: barH, height: `calc(100% - ${barH}px)` }}
      />

      {/* ── Brand bar: logo + game title lead the screen ─────────────── */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between gap-4 px-4 pointer-events-none"
        style={{
          height: barH, zIndex: 3,
          background: `linear-gradient(100deg, ${hexToRgba(accent, 0.22)}, rgba(0,8,25,0.88) 60%)`,
          backdropFilter: "blur(12px)",
          borderBottom: "3px solid transparent",
          borderImage: `${brandGrad} 1`,
        }}
        data-testid="brand-bar"
      >
        <div className="flex items-center gap-4 min-w-0">
          <BrandMark size={Math.max(48, barH - 28)} />
          <div className="min-w-0">
            <div
              className="font-black leading-tight truncate"
              style={{
                fontSize: titleSize, color: brand.headingColor,
                fontFamily: "var(--brand-font, 'Inter', system-ui, sans-serif)",
              }}
              data-testid="brand-title"
            >
              {brand.heading}
            </div>
            {brand.tagline && (
              <div className="text-sm opacity-70 truncate hidden sm:block" style={{ color: "#bcd0ee", fontFamily: "var(--brand-font, 'Inter', system-ui, sans-serif)" }}>
                {brand.tagline}
              </div>
            )}
          </div>
        </div>

        {/* live stats */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="rounded-xl px-3 py-1.5 text-right" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="font-mono text-[9px] tracking-widest opacity-60" style={{ color: "#bcd0ee" }}>SCORE</div>
            <span ref={scoreValRef} className="font-mono text-xl font-black" style={{ color: accent }}>0</span>
          </div>
          <div className="rounded-xl px-3 py-1.5 text-right hidden sm:block" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="font-mono text-[9px] tracking-widest opacity-60" style={{ color: "#bcd0ee" }}>BEST</div>
            <span ref={bestValRef} className="font-mono text-xl font-black" style={{ color: accent2 }}>0</span>
          </div>
          <div className="rounded-xl px-3 py-1.5 hidden md:flex flex-col items-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div ref={levelBadgeRef} className="font-mono text-[11px] font-black tracking-[0.12em]" style={{ color: "#88ff88" }}>LV 1  EASY</div>
            <div ref={chapBadgeRef} className="font-mono text-[8px] tracking-widest opacity-50" style={{ color: "#bcd0ee" }}/>
          </div>
          <div ref={livesRef} className="font-mono text-base tracking-wide px-1" style={{ textShadow: "0 0 8px #ff4444" }}>
            ❤️❤️❤️
          </div>
          <div className="rounded-xl px-3 py-2 hidden lg:flex items-center gap-2" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div ref={gestureDotRef} className="w-2 h-2 rounded-full" style={{ background: "#555", transition: "background 0.15s" }}/>
            <span ref={gestureIconRef} className="text-base leading-none">✋</span>
            <span ref={gestureLblRef} className="font-mono text-[10px] tracking-widest text-gray-300">NO HAND</span>
          </div>
        </div>
      </div>

      {/* ── In-game overlays (below the brand bar) ───────────────────── */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ top: barH, zIndex: 2 }}>
        {/* playfield watermark: the customer's logo, large and faint, behind the action */}
        {brand.logoUrl && (
          <div className="absolute inset-0 grid place-items-center" style={{ zIndex: 0 }} aria-hidden="true" data-testid="logo-watermark">
            <img src={brand.logoUrl} alt=""
              style={{ maxWidth: "34%", maxHeight: "34%", objectFit: "contain", opacity: 0.07, filter: "grayscale(0.2)" }}/>
          </div>
        )}

        {/* bottom-left: logo badge + compact controls guide */}
        <div className="absolute bottom-4 left-4 flex items-end gap-3">
          {brand.logoUrl && (
            <div className="grid place-items-center" data-testid="logo-corner"
              style={{ height: Math.max(56, brand.logoSize + 8), maxWidth: Math.max(56, brand.logoSize + 8) * 3 }}>
              <img src={brand.logoUrl} alt=""
                style={{
                  height: Math.max(56, brand.logoSize + 8), width: "auto",
                  maxWidth: Math.max(56, brand.logoSize + 8) * 3, objectFit: "contain", display: "block",
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
                }}/>
            </div>
          )}
          <div className="rounded-xl px-3 py-2 hidden md:block"
            style={{ background: "rgba(0,8,25,0.7)", backdropFilter: "blur(8px)" }}>
            <div className="flex items-center gap-4">
              {[["🖐", "Steer"], ["✊", "Fire"]].map(([ic, t]) => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className="text-sm">{ic}</span>
                  <span className="font-mono text-[10px] text-gray-300">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* active power-ups – bottom center */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-4">
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
          background: "rgba(0,8,25,0.75)", color: "#bcd0ee",
        }}
        onClick={e => { e.stopPropagation(); setShowVideo(v => !v); }}
      >
        {showVideo ? "📷 hide" : "📷 show"}
      </button>

      {/* ── Title screen: the brand, large ───────────────────────── */}
      {isTitle && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10, top: barH }}>
          <div className="rounded-3xl px-8 py-8 flex flex-col items-center gap-5 w-full max-w-xl mx-4"
            style={{
              background: "rgba(0,4,18,0.88)",
              backdropFilter: "blur(18px)",
              boxShadow: `0 0 80px ${hexToRgba(accent, 0.25)}`,
              border: `1px solid ${hexToRgba(accent, 0.35)}`,
            }}>
            <BrandMark size={Math.min(140, Math.max(88, brand.logoSize * 2))} />
            <div className="text-center">
              <div
                className="font-black leading-tight"
                style={{
                  fontSize: Math.min(56, Math.max(30, Math.round(brand.headingSize * 1.6))),
                  color: brand.headingColor,
                  fontFamily: "var(--brand-font, 'Inter', system-ui, sans-serif)",
                  textShadow: `0 0 30px ${hexToRgba(brand.headingColor, 0.35)}`,
                }}
              >
                {brand.heading}
              </div>
              {brand.tagline && (
                <div className="text-base opacity-70 mt-2" style={{ color: "#bcd0ee", fontFamily: "var(--brand-font, 'Inter', system-ui, sans-serif)" }}>
                  {brand.tagline}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2.5 w-full pointer-events-auto">
              <button onClick={handleClick}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-black text-base tracking-[0.12em] uppercase hover:opacity-90 transition-opacity"
                style={{ background: brandGrad, color: "#05060d", boxShadow: `0 10px 30px ${hexToRgba(accent, 0.4)}` }}
                data-testid="btn-start">
                ▶  Start game
              </button>
              {!handData.isDetected && !isLoading && (
                <button onClick={enableGesture}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-mono text-sm font-bold"
                  style={{ background: "rgba(255,255,255,0.07)", color: "#dbe7ff" }}>
                  📷 Enable hand gestures
                </button>
              )}
              {isLoading && <div className="font-mono text-xs opacity-70 animate-pulse" style={{ color: "#bcd0ee" }}>Starting camera…</div>}
              {handData.isDetected && <div className="font-mono text-xs text-green-400">✓ Hand tracking active</div>}
              {error && <div className="font-mono text-[10px] text-red-400 text-center">{error}</div>}
            </div>

            <div className="font-mono text-[11px] tracking-wide opacity-60 text-center" style={{ color: "#bcd0ee" }}>
              Open hand to steer &nbsp;·&nbsp; Fist to fire &nbsp;·&nbsp; 3 lives
            </div>

            {leaderboard.length > 0 && (
              <div className="w-full pt-3 border-t border-white/10">
                <div className="font-mono text-[10px] tracking-widest opacity-70 mb-1.5 text-center" style={{ color: accent2 }}>LEADERBOARD</div>
                <div className="max-w-xs mx-auto">
                  {leaderboard.slice(0, 3).map((e, i) => <LeaderRow key={i} entry={e} rank={i}/>)}
                </div>
              </div>
            )}
            {brand.logoUrl && (
              <div className="w-full pt-3 border-t border-white/10 flex items-center justify-center" data-testid="logo-title-footer">
                <img src={brand.logoUrl} alt="" style={{ height: 36, width: "auto", maxWidth: "60%", objectFit: "contain", opacity: 0.85 }}/>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Game over: score with the brand ─────────────────────── */}
      {isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10, top: barH }}>
          <div className="rounded-3xl px-8 py-7 flex flex-col items-center gap-4 w-full max-w-lg mx-4"
            style={{
              background: "rgba(0,4,18,0.9)",
              backdropFilter: "blur(18px)",
              boxShadow: `0 0 80px ${hexToRgba(accent, 0.25)}`,
              border: `1px solid ${hexToRgba(accent, 0.35)}`,
            }}>
            <BrandMark size={Math.min(88, Math.max(56, brand.logoSize * 1.3))} />
            <div className="font-mono text-xs tracking-[0.3em] opacity-60" style={{ color: "#bcd0ee" }}>GAME OVER</div>

            <div className="flex gap-10 justify-center">
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-[10px] tracking-widest opacity-60" style={{ color: "#bcd0ee" }}>SCORE</span>
                <span className="font-mono text-5xl font-black" style={{ color: accent }}>{stateRef.current?.score ?? 0}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-[10px] tracking-widest opacity-60" style={{ color: "#bcd0ee" }}>BEST</span>
                <span className="font-mono text-5xl font-black" style={{ color: accent2 }}>{stateRef.current?.highScore ?? 0}</span>
              </div>
            </div>

            {showNameEntry && !scoreSaved && (
              <div className="w-full flex flex-col items-center gap-2 pointer-events-auto"
                onClick={e => e.stopPropagation()}>
                <div className="font-mono text-[10px] tracking-widest opacity-60" style={{ color: "#bcd0ee" }}>SAVE YOUR SCORE</div>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && canSaveScore) handleSaveScore(); }}
                  className="font-mono text-sm text-center w-full max-w-[300px] rounded-lg px-3 py-2 outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#e8f0ff", caretColor: accent }}
                  placeholder="Full name"
                />
                <input
                  type="email"
                  value={playerEmail}
                  onChange={e => setPlayerEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && canSaveScore) handleSaveScore(); }}
                  className="font-mono text-sm text-center w-full max-w-[300px] rounded-lg px-3 py-2 outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#e8f0ff", caretColor: accent }}
                  placeholder="Email"
                />
                <div className="flex items-center gap-3">
                  <input
                    autoFocus
                    type="text"
                    maxLength={3}
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                    onKeyDown={e => { if (e.key === "Enter" && canSaveScore) handleSaveScore(); }}
                    className="font-mono text-2xl font-black text-center w-24 rounded-lg px-2 py-1.5 tracking-widest outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", color: "#e8f0ff", caretColor: accent }}
                    placeholder="AAA"
                  />
                  <button
                    onClick={e => { e.stopPropagation(); if (canSaveScore) handleSaveScore(); }}
                    disabled={!canSaveScore}
                    className="font-mono text-sm font-black rounded-lg px-5 py-3 transition-opacity hover:opacity-90"
                    style={{
                      background: canSaveScore ? brandGrad : "rgba(255,255,255,0.08)",
                      color: canSaveScore ? "#05060d" : "#8a97b3",
                      cursor: canSaveScore ? "pointer" : "not-allowed",
                    }}>
                    Save
                  </button>
                </div>
                <div className="font-mono text-[10px] opacity-50" style={{ color: "#bcd0ee" }}>Initials appear on the leaderboard</div>
              </div>
            )}

            {(scoreSaved || !showNameEntry) && leaderboard.length > 0 && (
              <div className="w-full pointer-events-auto" onClick={e => e.stopPropagation()}>
                <div className="font-mono text-[10px] tracking-widest opacity-70 mb-1.5 text-center" style={{ color: accent2 }}>LEADERBOARD</div>
                <div className="max-w-xs mx-auto">
                  {leaderboard.slice(0, 5).map((e, i) => <LeaderRow key={i} entry={e} rank={i}/>)}
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-2 w-full pointer-events-auto pt-2">
              <button onClick={e => { e.stopPropagation(); restartGame(); }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-black text-sm tracking-[0.12em] uppercase hover:opacity-90"
                style={{ background: brandGrad, color: "#05060d" }}
                data-testid="btn-restart">
                ↻  Restart game
              </button>
              {!handData.isDetected && !isLoading && (
                <button onClick={enableGesture}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2 font-mono text-xs font-bold"
                  style={{ background: "rgba(255,255,255,0.07)", color: "#dbe7ff" }}>
                  📷 Enable hand gestures
                </button>
              )}
            </div>
            {brand.logoUrl && (
              <div className="w-full pt-3 border-t border-white/10 flex items-center justify-center" data-testid="logo-gameover-footer">
                <img src={brand.logoUrl} alt="" style={{ height: 32, width: "auto", maxWidth: "60%", objectFit: "contain", opacity: 0.85 }}/>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
