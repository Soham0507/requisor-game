import { useEffect, useRef, useState, useCallback } from "react";
import { Play, RotateCcw, Zap, Shield, Crosshair } from "lucide-react";
import { useGame } from "@/state/GameContext";
import { hexToRgba } from "@/brand-bridge";

/** Reads the live brand theme so canvas draw calls re-skin instantly — see `brand-bridge.ts`. */
const brand = () => window.__BRAND__;

/**
 * 2D space shooter with:
 * - Power-ups (shield, rapid-fire, spread-shot) that drop from destroyed asteroids
 * - Combo multiplier: kill asteroids quickly to chain a streak and earn bonus points
 */

interface Vec { x: number; y: number; }

interface Bullet extends Vec {
  vx: number; vy: number; life: number;
  spread?: boolean; // spread-shot bullets are slightly dimmer
}

interface Asteroid extends Vec {
  vx: number; vy: number; r: number; hp: number;
  rot: number; rotSpeed: number; shape: number[];
}

type PowerUpKind = "shield" | "rapid" | "spread";

interface PowerUp extends Vec {
  vx: number; vy: number;
  kind: PowerUpKind;
  life: number; // ms until despawn
  rot: number;
}

interface Particle extends Vec {
  vx: number; vy: number;
  life: number; maxLife: number; color: string;
}

interface Star extends Vec { z: number; }

// Combo: each kill within COMBO_WINDOW_MS extends the streak
const COMBO_WINDOW_MS = 1800;
const PLAYER_R = 14;
const BULLET_SPEED = 9;
const BULLET_LIFE = 60;
const BASE_FIRE_COOLDOWN_MS = 140;
const RAPID_FIRE_COOLDOWN_MS = 55;
const RAPID_DURATION_MS = 6000;
const SPREAD_DURATION_MS = 6000;
const SHIELD_DURATION_MS = 7000;
const POWERUP_DROP_CHANCE = 0.22; // 22% per asteroid kill

const DIFFICULTY = {
  easy:   { spawnMs: 1400, speed: 0.7,  dmg: 12 },
  normal: { spawnMs: 950,  speed: 1,    dmg: 18 },
  hard:   { spawnMs: 600,  speed: 1.4,  dmg: 26 },
};

const POWERUP_META: Record<PowerUpKind, { color: string; label: string }> = {
  shield: { color: "#00f0ff", label: "SHIELD" },
  rapid:  { color: "#ffb547", label: "RAPID FIRE" },
  spread: { color: "#a6ff3d", label: "SPREAD SHOT" },
};

export default function GameCanvas() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const shipImgRef    = useRef<HTMLImageElement | null>(null);

  const { status, setStatus, setScore, setHealth, setLevel,
          score, level, health, settings, submitScore, submitPlayerInfo, resetGame } = useGame();

  const stateRef = useRef({ status, score, level, health, settings });
  stateRef.current = { status, score, level, health, settings };

  const [submittedName, setSubmittedName] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  // ── React-visible HUD state (combo + active power-ups) ──
  const [combo, setCombo]           = useState(0);
  const [comboFlash, setComboFlash] = useState(false);
  const [activePowerUps, setActivePowerUps] = useState<
    Partial<Record<PowerUpKind, number>>   // remaining ms per type
  >({});

  // ── Game-world refs (never trigger re-renders) ──
  const mouseRef       = useRef<Vec>({ x: 0, y: 0 });
  const playerRef      = useRef<Vec>({ x: 0, y: 0 });
  const bulletsRef     = useRef<Bullet[]>([]);
  const asteroidsRef   = useRef<Asteroid[]>([]);
  const powerUpsRef    = useRef<PowerUp[]>([]);
  const particlesRef   = useRef<Particle[]>([]);
  const starsRef       = useRef<Star[]>([]);
  const lastSpawnRef   = useRef<number>(0);
  const lastShotRef    = useRef<number>(0);
  const isFiringRef    = useRef<boolean>(false);
  const sizeRef        = useRef<{ w: number; h: number }>({ w: 800, h: 600 });
  const rafRef         = useRef<number>(0);
  const lastFrameRef   = useRef<number>(performance.now());

  // Power-up timers (ms remaining) — read in game loop, also mirrored to React state
  const puTimerRef = useRef<Partial<Record<PowerUpKind, number>>>({});

  // Combo state — read/written in game loop, mirrored to React for HUD
  const comboRef        = useRef(0);
  const comboTimerRef   = useRef(0); // ms until streak resets
  const comboFlashRef   = useRef(false);

  // ── HUD sync (cheap: runs once per frame, only calls setState if changed) ──
  const lastComboRef    = useRef(-1);
  const lastPuRef       = useRef("");

  /* ================================================================
     Setup + event listeners (run once)
     ================================================================ */
  useEffect(() => {
    const canvas    = canvasRef.current!;
    const container = containerRef.current!;
    const ctx       = canvas.getContext("2d")!;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      const w = Math.max(320, rect.width);
      const h = Math.max(240, rect.height);
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current  = { w, h };
      playerRef.current = { x: w / 2, y: h / 2 };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    starsRef.current = Array.from({ length: 110 }, () => makeStar(sizeRef.current));

    // Load player ship image
    const img = new Image();
    img.src = "/player-ship.png";
    img.onload = () => { shipImgRef.current = img; };


    const onMove  = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t) return;
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const onDown = () => { isFiringRef.current = true;  tryShoot(); };
    const onUp   = () => { isFiringRef.current = false; };
    const onKey  = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        const s = stateRef.current.status;
        if (s === "running") setStatus("paused");
        else if (s === "paused") setStatus("running");
      }
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", (e) => { onTouch(e); onDown(); });
    canvas.addEventListener("touchmove", onTouch);
    window.addEventListener("touchend", onUp);
    window.addEventListener("keydown", onKey);

    const loop = (now: number) => {
      const dt = Math.min(50, now - lastFrameRef.current);
      lastFrameRef.current = now;
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);
      drawBackground(ctx, w, h, dt);
      const s = stateRef.current.status;
      if (s !== "idle") {
        if (s === "running") updateWorld(dt, now);
        drawWorld(ctx, w, h);
        if (s === "paused") drawPaused(ctx, w, h);
      }
      // Sync HUD state cheaply
      if (comboRef.current !== lastComboRef.current) {
        lastComboRef.current = comboRef.current;
        setCombo(comboRef.current);
        setComboFlash(comboFlashRef.current);
        comboFlashRef.current = false;
      }
      const puKey = JSON.stringify(puTimerRef.current);
      if (puKey !== lastPuRef.current) {
        lastPuRef.current = puKey;
        setActivePowerUps({ ...puTimerRef.current });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================================================================
     Reset world on game start
     ================================================================ */
  useEffect(() => {
    if (status === "running") {
      bulletsRef.current   = [];
      asteroidsRef.current = [];
      powerUpsRef.current  = [];
      particlesRef.current = [];
      puTimerRef.current   = {};
      comboRef.current     = 0;
      comboTimerRef.current = 0;
      lastSpawnRef.current = performance.now();
      setScoreSubmitted(false);
      setCombo(0);
      setActivePowerUps({});
    }
  }, [status]);

  /* ================================================================
     Shooting
     ================================================================ */
  const tryShoot = useCallback(() => {
    if (stateRef.current.status !== "running") return;
    const now = performance.now();
    const cooldown = puTimerRef.current.rapid ? RAPID_FIRE_COOLDOWN_MS : BASE_FIRE_COOLDOWN_MS;
    if (now - lastShotRef.current < cooldown) return;
    lastShotRef.current = now;

    const p   = playerRef.current;
    const sens = stateRef.current.settings.sensitivity;
    const dx  = (mouseRef.current.x - p.x) * sens;
    const dy  = (mouseRef.current.y - p.y) * sens;
    const len = Math.hypot(dx, dy) || 1;
    const ux  = dx / len;
    const uy  = dy / len;

    const hasSpread = !!puTimerRef.current.spread;

    // Centre bullet
    bulletsRef.current.push({ x: p.x, y: p.y, vx: ux * BULLET_SPEED, vy: uy * BULLET_SPEED, life: BULLET_LIFE });

    if (hasSpread) {
      // Two flanking bullets at ±18°
      for (const ang of [-0.31, 0.31]) {
        const cos = Math.cos(ang), sin = Math.sin(ang);
        bulletsRef.current.push({
          x: p.x, y: p.y,
          vx: (ux * cos - uy * sin) * BULLET_SPEED,
          vy: (ux * sin + uy * cos) * BULLET_SPEED,
          life: BULLET_LIFE,
          spread: true,
        });
      }
    }
  }, []);

  /* ================================================================
     Main update
     ================================================================ */
  const updateWorld = (dt: number, now: number) => {
    const { w, h } = sizeRef.current;
    const p   = playerRef.current;
    const cur = stateRef.current;
    const diff = DIFFICULTY[cur.settings.difficulty];

    if (isFiringRef.current) tryShoot();

    // Tick power-up timers
    for (const kind of (Object.keys(puTimerRef.current) as PowerUpKind[])) {
      puTimerRef.current[kind]! -= dt;
      if (puTimerRef.current[kind]! <= 0) delete puTimerRef.current[kind];
    }

    // Tick combo timer
    if (comboTimerRef.current > 0) {
      comboTimerRef.current -= dt;
      if (comboTimerRef.current <= 0) comboRef.current = 0;
    }

    // Spawn asteroids
    const levelMult   = 1 + (cur.level - 1) * 0.18;
    const spawnInterval = Math.max(220, diff.spawnMs / levelMult);
    if (now - lastSpawnRef.current > spawnInterval) {
      lastSpawnRef.current = now;
      asteroidsRef.current.push(makeAsteroid(w, h, p, diff.speed * levelMult));
    }

    // Update bullets
    bulletsRef.current = bulletsRef.current.filter((b) => {
      b.x += b.vx; b.y += b.vy; b.life--;
      return b.life > 0 && b.x > -10 && b.x < w + 10 && b.y > -10 && b.y < h + 10;
    });

    // Update asteroids
    const remainingAsteroids: Asteroid[] = [];
    let scoreGain = 0;
    let dmgTaken  = 0;

    for (const a of asteroidsRef.current) {
      a.x += a.vx; a.y += a.vy; a.rot += a.rotSpeed;
      if (a.x < -100 || a.x > w + 100 || a.y < -100 || a.y > h + 100) continue;

      // Player collision — shield absorbs it
      if (Math.hypot(a.x - p.x, a.y - p.y) < a.r + PLAYER_R) {
        if (puTimerRef.current.shield) {
          // Shield absorbs — consume shield and explode asteroid
          delete puTimerRef.current.shield;
          spawnExplosion(a.x, a.y, "#00f0ff", 30);
          spawnExplosion(p.x, p.y, "#00f0ff", 20);
        } else {
          dmgTaken += diff.dmg;
          spawnExplosion(a.x, a.y, "#ff4d6d", 18);
        }
        continue;
      }

      // Bullet collision
      let killed = false;
      for (let i = 0; i < bulletsRef.current.length; i++) {
        const b = bulletsRef.current[i];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
          a.hp -= 1;
          bulletsRef.current.splice(i, 1);
          spawnHit(a.x, a.y);
          if (a.hp <= 0) {
            // Combo logic
            comboRef.current += 1;
            comboTimerRef.current = COMBO_WINDOW_MS;
            comboFlashRef.current = true;
            const mult  = 1 + Math.floor(comboRef.current / 3) * 0.5; // bonus every 3 kills
            scoreGain  += Math.round((20 + a.r * 1.6) * mult);

            spawnExplosion(a.x, a.y, "#00f0ff", 14);

            // Drop power-up?
            if (Math.random() < POWERUP_DROP_CHANCE) {
              const kinds: PowerUpKind[] = ["shield", "rapid", "spread"];
              const kind = kinds[Math.floor(Math.random() * kinds.length)];
              powerUpsRef.current.push(makePowerUp(a.x, a.y, kind));
            }
            killed = true;
          }
          break;
        }
      }
      if (!killed) remainingAsteroids.push(a);
    }
    asteroidsRef.current = remainingAsteroids;

    // Update power-up pickups
    const remainingPU: PowerUp[] = [];
    for (const pu of powerUpsRef.current) {
      pu.x += pu.vx; pu.y += pu.vy; pu.rot += 0.04; pu.life -= dt;
      if (pu.life <= 0 || pu.x < -30 || pu.x > w + 30 || pu.y < -30 || pu.y > h + 30) continue;
      // Player picks it up
      if (Math.hypot(pu.x - p.x, pu.y - p.y) < PLAYER_R + 14) {
        const dur = pu.kind === "shield" ? SHIELD_DURATION_MS
                  : pu.kind === "rapid"  ? RAPID_DURATION_MS
                  :                        SPREAD_DURATION_MS;
        puTimerRef.current[pu.kind] = dur;
        spawnExplosion(pu.x, pu.y, POWERUP_META[pu.kind].color, 20);
        continue;
      }
      remainingPU.push(pu);
    }
    powerUpsRef.current = remainingPU;

    // Update particles
    particlesRef.current = particlesRef.current.filter((part) => {
      part.x += part.vx; part.y += part.vy;
      part.vx *= 0.96;   part.vy *= 0.96;
      part.life -= dt;
      return part.life > 0;
    });

    // Apply score / health / level — never call one setter inside another's updater
    if (scoreGain > 0) {
      const newScore  = cur.score + scoreGain;
      const nextLevel = 1 + Math.floor(newScore / 500);
      setScore(newScore);
      if (nextLevel !== cur.level) setLevel(nextLevel);
    }
    if (dmgTaken > 0) {
      const newHealth = Math.max(0, cur.health - dmgTaken);
      setHealth(newHealth);
      if (newHealth <= 0) {
        setStatus("over");
        spawnExplosion(p.x, p.y, "#ff4d6d", 60);
      }
    }
  };

  /* ================================================================
     Particle helpers
     ================================================================ */
  const spawnExplosion = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 4;
      particlesRef.current.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 600+Math.random()*400, maxLife: 1000, color });
    }
  };
  const spawnHit = (x: number, y: number) => {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      particlesRef.current.push({ x, y, vx: Math.cos(a)*2, vy: Math.sin(a)*2, life: 280, maxLife: 280, color: "#a6ff3d" });
    }
  };

  /* ================================================================
     Drawing
     ================================================================ */
  const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => {
    const speedScale = stateRef.current.status === "running" ? 1 : 0.15;
    for (const s of starsRef.current) {
      s.y += s.z * 0.02 * dt * speedScale;
      if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
      const size = s.z * 1.2;
      ctx.fillStyle = `rgba(255,255,255,${0.25 + s.z * 0.6})`;
      ctx.fillRect(s.x, s.y, size, size);
    }
  };

  const drawWorld = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const p = playerRef.current;

    // Bullets
    for (const b of bulletsRef.current) {
      ctx.save();
      ctx.shadowColor = b.spread ? "#a6ff3d" : "#00f0ff";
      ctx.shadowBlur  = 18;
      ctx.fillStyle   = b.spread ? "#d4ffaa" : "#a6f8ff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.spread ? 2.5 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Power-up drops
    for (const pu of powerUpsRef.current) {
      const meta = POWERUP_META[pu.kind];
      const alpha = Math.min(1, pu.life / 800);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pu.x, pu.y);
      ctx.rotate(pu.rot);
      ctx.shadowColor = meta.color;
      ctx.shadowBlur  = 18;
      ctx.strokeStyle = meta.color;
      ctx.lineWidth   = 2;
      // Draw a spinning diamond
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fillStyle = `${meta.color}33`;
      ctx.fill();
      ctx.stroke();
      // Inner dot
      ctx.shadowBlur = 6;
      ctx.fillStyle = meta.color;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Label above
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = meta.color;
      ctx.font = "bold 9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(meta.label, pu.x, pu.y - 16);
      ctx.restore();
    }

    // Asteroids
    for (const a of asteroidsRef.current) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.shadowColor = "rgba(255,43,214,0.45)";
      ctx.shadowBlur  = 14;
      ctx.fillStyle   = "#2a1f4a";
      ctx.strokeStyle = "#ff2bd6";
      ctx.lineWidth   = 1.8;
      ctx.beginPath();
      const sides = a.shape.length;
      for (let i = 0; i < sides; i++) {
        const ang = (i / sides) * Math.PI * 2;
        const r   = a.r + a.shape[i];
        const x   = Math.cos(ang) * r;
        const y   = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    for (const part of particlesRef.current) {
      const alpha = Math.max(0, part.life / part.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = part.color;
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = part.color;
      ctx.fillRect(part.x - 1.5, part.y - 1.5, 3, 3);
      ctx.restore();
    }

    // Shield ring around player
    if (puTimerRef.current.shield && stateRef.current.status !== "over") {
      const t = Date.now() / 600;
      ctx.save();
      ctx.strokeStyle = `rgba(0,240,255,${0.5 + 0.35 * Math.sin(t)})`;
      ctx.lineWidth   = 2.5;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur  = 20;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_R + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Player ship
    if (stateRef.current.status !== "over") {
      const angle = Math.atan2(mouseRef.current.y - p.y, mouseRef.current.x - p.x);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      // Thruster flame (drawn behind ship)
      const flicker = 0.4 + Math.random() * 0.4;
      ctx.fillStyle = `rgba(255,120,0,${flicker})`;
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur  = 18;
      ctx.beginPath();
      ctx.moveTo(-PLAYER_R * 0.6,  PLAYER_R * 0.28);
      ctx.lineTo(-PLAYER_R * 1.9 - Math.random() * 8, 0);
      ctx.lineTo(-PLAYER_R * 0.6, -PLAYER_R * 0.28);
      ctx.closePath();
      ctx.fill();
      // Second inner flame (brighter core)
      ctx.fillStyle = `rgba(255,210,80,${flicker * 0.9})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(-PLAYER_R * 0.55,  PLAYER_R * 0.13);
      ctx.lineTo(-PLAYER_R * 1.3 - Math.random() * 5, 0);
      ctx.lineTo(-PLAYER_R * 0.55, -PLAYER_R * 0.13);
      ctx.closePath();
      ctx.fill();

      // Glow halo tinted by active power-up
      const glowColor = puTimerRef.current.rapid  ? "#ffb547"
                      : puTimerRef.current.spread ? "#a6ff3d"
                      : puTimerRef.current.shield ? "#00f0ff"
                      : "rgba(255,120,0,0.55)";
      ctx.shadowColor = glowColor;
      ctx.shadowBlur  = 28;

      // Draw ship image (nose points up in source → rotate –90° so nose points right)
      if (shipImgRef.current) {
        const iw = 44, ih = 56; // render size on canvas
        ctx.rotate(-Math.PI / 2); // image nose is up; game forward is right
        ctx.drawImage(shipImgRef.current, -iw / 2, -ih / 2, iw, ih);
      } else {
        // Fallback vector ship while image loads
        ctx.fillStyle   = "#0d2238";
        ctx.strokeStyle = glowColor;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(PLAYER_R, 0);
        ctx.lineTo(-PLAYER_R * 0.8,  PLAYER_R * 0.7);
        ctx.lineTo(-PLAYER_R * 0.5, 0);
        ctx.lineTo(-PLAYER_R * 0.8, -PLAYER_R * 0.7);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();

      // Crosshair
      ctx.save();
      ctx.strokeStyle = hexToRgba(brand().primaryColor, 0.5);
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(mouseRef.current.x, mouseRef.current.y, 8, 0, Math.PI * 2);
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      ctx.moveTo(mx - 14, my); ctx.lineTo(mx - 4, my);
      ctx.moveTo(mx +  4, my); ctx.lineTo(mx + 14, my);
      ctx.moveTo(mx, my - 14); ctx.lineTo(mx, my - 4);
      ctx.moveTo(mx, my +  4); ctx.lineTo(mx, my + 14);
      ctx.stroke();
      ctx.restore();
    }

    // Combo pop text on canvas (large kills streak flash)
    if (comboRef.current >= 3) {
      const mult = 1 + Math.floor(comboRef.current / 3) * 0.5;
      ctx.save();
      ctx.fillStyle   = `rgba(255,181,71,${Math.min(1, comboTimerRef.current / 400)})`;
      ctx.font        = `bold ${Math.min(18, 10 + comboRef.current)}px Inter, sans-serif`;
      ctx.textAlign   = "left";
      ctx.shadowColor = "#ffb547";
      ctx.shadowBlur  = 14;
      ctx.fillText(`×${mult.toFixed(1)} COMBO`, 14, h - 14);
      ctx.restore();
    }
  };

  // Idle messaging + Start button now render as an HTML overlay (see JSX
  // below) instead of canvas text, so it can be a real centered button.

  const drawPaused = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.fillStyle = "rgba(5,6,13,0.55)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffb547";
    ctx.font      = "700 28px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ffb547";
    ctx.shadowBlur  = 18;
    ctx.fillText("PAUSED", w / 2, h / 2);
    ctx.restore();
  };

  /* ================================================================
     UI handlers
     ================================================================ */
  const handleStart        = () => resetGame();
  const canSubmit           = submittedName.trim().length > 0 && submittedEmail.trim().length > 0;
  const handleSubmit       = () => {
    if (scoreSubmitted || !canSubmit) return;
    submitScore(submittedName);
    submitPlayerInfo(submittedName, submittedEmail);
    setScoreSubmitted(true);
  };

  // Combo multiplier label
  const comboMult = combo >= 3 ? 1 + Math.floor(combo / 3) * 0.5 : 1;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── Canvas ── */}
      <div ref={containerRef} className="canvas-frame" style={{ flex: 1, minHeight: 320, position: "relative" }}>
        <canvas ref={canvasRef} data-testid="game-canvas" />

        {status === "idle" && (
          <div className="overlay fade-in">
            <div style={{ fontSize: 12, letterSpacing: "0.3em", color: "var(--text-mute)", textTransform: "uppercase" }}>Sector Astro-{String(level).padStart(2, "0")}</div>
            <div className="brand-glow" style={{ fontSize: 32 }}>Launch Mission</div>
            <div style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.6 }}>
              Aim with mouse · Click to fire · Space to pause
              <br />
              Pick up power-ups dropped by asteroids!
            </div>
            <button className="neon-btn lime" onClick={handleStart} style={{ marginTop: 4 }} data-testid="btn-start">
              <Play size={13} /> Start
            </button>
          </div>
        )}

        {/* ── Active power-up + combo HUD row — overlaid on the game screen ── */}
        {status === "running" && (
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 8, pointerEvents: "none" }}>
            {/* Combo badge */}
            {combo >= 2 && (
              <div
                key={combo}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 8,
                  background: "linear-gradient(90deg, rgba(255,181,71,0.18), rgba(255,181,71,0.06))",
                  border: "1px solid rgba(255,181,71,0.55)",
                  boxShadow: comboFlash ? "0 0 24px rgba(255,181,71,0.7)" : "0 0 12px rgba(255,181,71,0.3)",
                  transition: "box-shadow 0.2s ease",
                  animation: comboFlash ? "flash 0.25s ease-out" : undefined,
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <Zap size={13} color="#ffb547" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#ffb547", letterSpacing: "0.08em" }}>
                  {combo}× STREAK &nbsp;·&nbsp; ×{comboMult.toFixed(1)}
                </span>
              </div>
            )}

            {/* Active power-up badges */}
            {(Object.entries(activePowerUps) as [PowerUpKind, number][]).map(([kind, remaining]) => {
              const meta = POWERUP_META[kind];
              const pct  = Math.max(0, remaining / (kind === "shield" ? SHIELD_DURATION_MS : kind === "rapid" ? RAPID_DURATION_MS : SPREAD_DURATION_MS));
              return (
                <div
                  key={kind}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 8,
                    background: `linear-gradient(90deg, ${meta.color}22, ${meta.color}08)`,
                    border: `1px solid ${meta.color}88`,
                    boxShadow: `0 0 12px ${meta.color}44`,
                    position: "relative", overflow: "hidden",
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                  }}
                >
                  {/* Countdown fill */}
                  <div style={{ position: "absolute", inset: 0, background: `${meta.color}18`, width: `${pct * 100}%`, transition: "width 0.1s linear", borderRadius: 8 }} />
                  {kind === "shield" && <Shield size={13} color={meta.color} />}
                  {kind === "rapid"  && <Zap    size={13} color={meta.color} />}
                  {kind === "spread" && <Crosshair size={13} color={meta.color} />}
                  <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, letterSpacing: "0.06em", position: "relative" }}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {status === "over" && (
          <div className="overlay fade-in">
            <div style={{ fontSize: 12, letterSpacing: "0.3em", color: "var(--danger)", textTransform: "uppercase" }}>Mission Failed</div>
            <div className="brand-glow" style={{ fontSize: 44 }}>GAME OVER</div>
            <div style={{ display: "flex", gap: 24, color: "var(--text-dim)", fontSize: 14 }}>
              <div>Final Score: <span style={{ color: "var(--neon-cyan)", fontWeight: 700 }}>{score.toLocaleString()}</span></div>
              <div>Level: <span style={{ color: "var(--neon-violet)", fontWeight: 700 }}>{level}</span></div>
            </div>
            {!scoreSubmitted ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, width: 260 }}>
                <input
                  type="text" placeholder="Callsign (for the leaderboard)"
                  value={submittedName}
                  onChange={(e) => setSubmittedName(e.target.value.toUpperCase())}
                  maxLength={8}
                  data-testid="input-name"
                  style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                    color: "var(--text)", padding: "10px 14px", borderRadius: 10, outline: "none",
                    letterSpacing: "0.15em", fontWeight: 600, textAlign: "center",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
                />
                <input
                  type="email" placeholder="Email"
                  value={submittedEmail}
                  onChange={(e) => setSubmittedEmail(e.target.value)}
                  data-testid="input-email"
                  style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                    color: "var(--text)", padding: "10px 14px", borderRadius: 10, outline: "none",
                    fontWeight: 500, textAlign: "center",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
                />
                <button
                  className="neon-btn magenta"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  data-testid="btn-submit-score"
                  style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
                >
                  Save Score
                </button>
              </div>
            ) : (
              <div style={{ color: "var(--neon-lime)", fontWeight: 600 }}>Score saved to leaderboard.</div>
            )}
            <button className="neon-btn lime" onClick={handleStart} style={{ marginTop: 4 }} data-testid="btn-gameover-restart">
              <RotateCcw size={13} /> Restart Mission
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Helpers
   ================================================================ */
function makeStar(size: { w: number; h: number }): Star {
  return { x: Math.random() * size.w, y: Math.random() * size.h, z: Math.random() * 1.6 + 0.2 };
}

function makeAsteroid(w: number, h: number, target: Vec, speedScale: number): Asteroid {
  const edge = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if      (edge === 0) { x = Math.random() * w; y = -30; }
  else if (edge === 1) { x = w + 30; y = Math.random() * h; }
  else if (edge === 2) { x = Math.random() * w; y = h + 30; }
  else                 { x = -30; y = Math.random() * h; }
  const r  = 16 + Math.random() * 22;
  const hp = r > 30 ? 3 : r > 22 ? 2 : 1;
  const dx = target.x - x + (Math.random() - 0.5) * 60;
  const dy = target.y - y + (Math.random() - 0.5) * 60;
  const len = Math.hypot(dx, dy) || 1;
  const baseSpeed = (0.8 + Math.random() * 0.7) * speedScale;
  const sides = 8 + Math.floor(Math.random() * 4);
  return {
    x, y,
    vx: (dx / len) * baseSpeed,
    vy: (dy / len) * baseSpeed,
    r, hp,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.04,
    shape: Array.from({ length: sides }, () => (Math.random() - 0.5) * r * 0.45),
  };
}

function makePowerUp(x: number, y: number, kind: PowerUpKind): PowerUp {
  const ang = Math.random() * Math.PI * 2;
  return {
    x, y,
    vx: Math.cos(ang) * (0.4 + Math.random() * 0.6),
    vy: Math.sin(ang) * (0.4 + Math.random() * 0.6),
    kind,
    life: 6000, // 6 s before despawn
    rot: 0,
  };
}
