import type {
  GameState, GamePhase, Ship, Bullet, Asteroid, Alien,
  KamikazeEnemy, SniperEnemy, SwarmGroup, SwarmMember,
  Boss, LaserWall, PlasmaOrb, PowerUp, Star, Particle,
  PowerUpKind, Shake
} from "./types";

const LS_HI     = "space-survivor-hi";
const LS_SCORES = "space-survivor-scores";
const SHIP_W = 40; const SHIP_H = 44;
const STAR_COUNT = 130;
const GOD_DURATION       = 180;
const LIFE_GOD_DURATION  = 360;
const POWERUP_DURATION   = 600;
const TIMESLOW_DURATION  = 300;
const POWERUP_R          = 18;
const BOSS_SCORES        = [200, 500, 950];
const METEOR_SCORES      = [150, 380, 650, 950]; // triggers (not during boss)
const METEOR_WARN        = 120; // frames of warning
const METEOR_DURATION    = 720; // frames of shower
const COMBO_RESET_FRAMES = 200; // frames without kill → reset combo

function rnd(a: number, b: number) { return Math.random() * (b - a) + a; }
function rndInt(a: number, b: number) { return Math.floor(rnd(a, b + 1)); }
function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}
function circleRect(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number) {
  const nx = Math.max(rx, Math.min(cx, rx + rw)), ny = Math.max(ry, Math.min(cy, ry + rh));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < cr * cr;
}
function pointRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}
function getDiffLevel(score: number) {
  if (score < 30) return 1; if (score < 80) return 2; if (score < 160) return 3;
  if (score < 280) return 4; if (score < 450) return 5; return 6;
}
function getDiff(score: number) {
  const lvl = getDiffLevel(score);
  return {
    lvl,
    roidSpeed: 0.8 + lvl * 0.55, roidSpawnRate: Math.max(20, 90 - lvl * 12),
    roidMaxCount: 6 + lvl * 3,
    laserSpeed: 1.2 + lvl * 0.5, laserSpawnRate: Math.max(220, 700 - lvl * 70),
    orbSpeed: 1.8 + lvl * 0.55, orbCount: Math.min(lvl + 1, 7),
    alienFireRate: Math.max(35, 100 - lvl * 10), alienCount: Math.min(Math.floor(lvl * 1.5), 8),
    alienSpeed: 0.012 + lvl * 0.004, bulletSpeed: 12 + lvl * 0.8,
    doubleLaser: lvl >= 4, powerUpRate: Math.max(280, 600 - lvl * 30),
    kamikazeRate: Math.max(180, 500 - lvl * 40),
    sniperRate: Math.max(300, 800 - lvl * 60),
    swarmRate: Math.max(500, 1200 - lvl * 80),
  };
}
function comboMult(kills: number) {
  if (kills < 3)  return 1;
  if (kills < 6)  return 2;
  if (kills < 10) return 3;
  if (kills < 15) return 4;
  return 5;
}
function makeVerts(r: number, n: number) {
  const v: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    v.push(Math.cos(a) * r * rnd(0.7, 1.3), Math.sin(a) * r * rnd(0.7, 1.3));
  }
  return v;
}
function emitPs(
  particles: Particle[], nextId: number,
  x: number, y: number, count: number,
  color: string | (() => string), speed = 3, life = 30
): { particles: Particle[]; nextId: number } {
  const ps: Particle[] = Array.from({ length: count }, (_, i) => ({
    id: nextId + i, x, y, dx: rnd(-speed, speed), dy: rnd(-speed, speed),
    life, maxLife: life, color: typeof color === "function" ? color() : color, size: rnd(1.5, 4.5),
  }));
  return { particles: [...particles, ...ps], nextId: nextId + count };
}
function makeShake(intensity: number, timer: number): Shake {
  return { x: 0, y: 0, timer, intensity };
}
function mergeShake(existing: Shake, intensity: number, timer: number): Shake {
  // keep the stronger shake
  if (intensity > existing.intensity) return { x: 0, y: 0, timer, intensity };
  return existing;
}

// ── Leaderboard helpers ───────────────────────────────────────────────────
export interface LeaderEntry { name: string; score: number; }
export function getLeaderboard(): LeaderEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_SCORES) || "[]") as LeaderEntry[];
  } catch { return []; }
}
export function saveScore(name: string, score: number): LeaderEntry[] {
  const board = getLeaderboard();
  board.push({ name: name.toUpperCase().slice(0, 3).padEnd(3, "·"), score });
  board.sort((a, b) => b.score - a.score);
  const top = board.slice(0, 10);
  localStorage.setItem(LS_SCORES, JSON.stringify(top));
  return top;
}

// Captured at game-over alongside (but separate from) the 3-letter
// leaderboard initials above — a real name + email so a follow-up is
// possible. Persisted client-side for now; wiring this to a real
// backend/database is a separate follow-up.
const LS_PLAYER_INFO = "space-survivor-player-info";
export interface PlayerInfoEntry { name: string; email: string; score: number; date: string }
export function savePlayerInfo(name: string, email: string, score: number): void {
  const entry: PlayerInfoEntry = { name: name.trim(), email: email.trim(), score, date: new Date().toISOString() };
  try {
    const raw = localStorage.getItem(LS_PLAYER_INFO);
    const existing: PlayerInfoEntry[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(LS_PLAYER_INFO, JSON.stringify([...existing, entry]));
  } catch {
    /* ignore — nothing else here depends on this succeeding */
  }

  // Also send it to the shared player_submissions table (api-server), so
  // it's a real lead an operator can see across every game, not just this
  // browser's own localStorage. `orderId` is only present when this build
  // was opened through a finalized live link (see citrus-landing's
  // customize.tsx) — absent on a raw/dev preview, which is fine, the row
  // just isn't tied to a specific brand order.
  const orderId = new URLSearchParams(window.location.search).get("orderId");
  fetch("/api/player-submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gameSlug: "gesture-space-war",
      orderId,
      name: entry.name,
      email: entry.email,
      extra: { score },
    }),
  }).catch(() => {
    /* best-effort — the local leaderboard save above already succeeded */
  });
}

// ── Factories ─────────────────────────────────────────────────────────────
function makeAsteroid(W: number, H: number, id: number, speed: number, forceTop = false): Asteroid {
  const r = rnd(12, 30);
  return {
    id, r, x: rnd(r, W - r), y: forceTop ? rnd(-250, -r) : rnd(-500, -r),
    speed, rot: rnd(0, Math.PI * 2), rotSpeed: rnd(-0.04, 0.04) || 0.01,
    verts: makeVerts(r, rndInt(7, 12)), melt: false, meltScale: 1,
  };
}
function makeAlien(W: number, id: number, speed: number): Alien {
  const w = 34, h = 24;
  return {
    id, x: rnd(w, W - w), y: -60, w, h, life: 3, maxLife: 3,
    targetX: rnd(w, W - w), targetY: rnd(55, 220),
    fireTimer: rndInt(30, 80), shiftTimer: rndInt(1500, 3000),
    hit: false, hitTimer: 0,
  };
}
function makeKamikaze(W: number, id: number, shipX: number, shipY: number): KamikazeEnemy {
  const x = rnd(20, W - 20), y = -25;
  const dx = shipX - x, dy = shipY - y;
  const d = Math.sqrt(dx ** 2 + dy ** 2) || 1;
  const speed = rnd(6, 10);
  return { id, x, y, r: 10, dx: (dx / d) * speed, dy: (dy / d) * speed, trail: [] };
}
function makeSniper(W: number, id: number): SniperEnemy {
  const fromLeft = Math.random() < 0.5;
  return {
    id, x: fromLeft ? -40 : W + 40, y: rnd(80, 200),
    w: 28, h: 38, chargeTimer: 0, chargeMax: 100,
    fired: false, exitTimer: 0, hp: 2, hit: false, hitTimer: 0,
  };
}
function makeSwarm(W: number, id: number): SwarmGroup {
  const cx = rnd(80, W - 80);
  const offsets: [number, number][] = [[0, 0], [-45, 25], [45, 25], [-80, 50], [80, 50]];
  const members: SwarmMember[] = offsets.map(([ox, oy]) => ({
    x: cx + ox, y: -60 + oy, r: 8, alive: true,
  }));
  return { id, cx, cy: -60, phase: rnd(0, Math.PI * 2), members, fireTimer: rndInt(80, 160), speed: rnd(0.8, 1.6) };
}
function makeBoss(W: number, id: number, scoreThreshold: number): Boss {
  return {
    id, x: W / 2, y: -120, w: 200, h: 90,
    hp: 25 + Math.floor(scoreThreshold / 100) * 5,
    maxHp: 25 + Math.floor(scoreThreshold / 100) * 5,
    bossPhase: 1, entryDone: false,
    radialTimer: 180, aimTimer: 80, kamikazeTimer: 240,
    moveDx: 1.2, moveTimer: 0,
    hit: false, hitTimer: 0, dying: false, dyingTimer: 0,
    scoreThreshold,
  };
}
function makeLaserWall(W: number, id: number, speed: number, doDouble: boolean): LaserWall {
  const gapW = rnd(100, 190), gapX = rnd(50, W - 50 - gapW);
  return { id, y: -20, speed, gapX, gapW, warning: true, warningTimer: 80, double: doDouble, secondY: doDouble ? -(rnd(180, 280)) : 0 };
}
function makePlasmaOrb(W: number, H: number, id: number, speed: number): PlasmaOrb {
  const r = rnd(10, 18), side = rndInt(0, 3);
  let x = 0, y = 0, dx = 0, dy = 0;
  if (side === 0) { x = rnd(r, W - r); y = -r; dx = rnd(-2, 2); dy = speed; }
  else if (side === 1) { x = W + r; y = rnd(r, H - r); dx = -speed; dy = rnd(-1.5, 1.5); }
  else if (side === 2) { x = rnd(r, W - r); y = H + r; dx = rnd(-2, 2); dy = -speed; }
  else { x = -r; y = rnd(r, H - r); dx = speed; dy = rnd(-1.5, 1.5); }
  return { id, x, y, r, dx, dy, hue: rndInt(170, 290) };
}
function makePowerUp(W: number, id: number, score: number): PowerUp {
  const base: PowerUpKind[] = ["multishot", "shield", "rapidfire"];
  const extra: PowerUpKind[] = score >= 80 ? ["wormhole"] : [];
  const extraSlow: PowerUpKind[] = score >= 120 ? ["timeslow"] : [];
  const kinds: PowerUpKind[] = [...base, ...extra, ...extraSlow];
  const kind = kinds[rndInt(0, kinds.length - 1)];
  return { id, kind, x: rnd(POWERUP_R + 20, W - POWERUP_R - 20), y: -POWERUP_R, r: POWERUP_R, speed: rnd(1.2, 2.2), rot: 0, pulse: 0 };
}

function makeShip(W: number, H: number, god = false): Ship {
  return {
    x: W / 2, y: H - 100, w: SHIP_W, h: SHIP_H,
    godMode: god, godTimer: god ? GOD_DURATION : 0, flash: false, flashTimer: 0,
    shieldActive: false, shieldTimer: 0,
    multishotActive: false, multishotTimer: 0,
    rapidfireActive: false, rapidfireTimer: 0,
    timeSlowActive: false, timeSlowTimer: 0,
    teleportFlash: 0,
  };
}

// ── Init ──────────────────────────────────────────────────────────────────
export function initGame(W: number, H: number): GameState {
  const hi = parseInt(localStorage.getItem(LS_HI) || "0") || 0;
  const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
    x: rnd(0, W), y: rnd(0, H), size: rnd(0.4, 2.5), alpha: rnd(0.3, 1), speed: rnd(0.4, 2.5),
  }));
  return {
    phase: "title", score: 0, highScore: hi, chapter: 0, diffLevel: 1, lives: 3,
    ship: makeShip(W, H, true),
    bullets: [], asteroids: [], aliens: [], kamikazes: [], snipers: [], swarms: [],
    boss: null, bossWarningTimer: 0, nextBossScore: BOSS_SCORES[0],
    laserWalls: [], plasmaOrbs: [], powerUps: [], stars, particles: [],
    shake: { x: 0, y: 0, timer: 0, intensity: 0 },
    combo: 0, comboTimer: 0, comboMult: 1, comboDisplayTimer: 0,
    meteorShower: false, meteorShowerTimer: 0, meteorShowerWarnTimer: 0,
    meteorShowerCooldown: METEOR_SCORES[0],
    fireActive: false, fireTimer: 0, chapterTimer: 0,
    obstacleSpawnTimer: 500, roidSpawnTimer: 60, alienSpawnTimer: 0,
    kamikazeTimer: 300, sniperTimer: 500, swarmTimer: 700,
    powerUpSpawnTimer: 400, nextId: 1, frame: 0, sfx: [],
  };
}

export function startGame(state: GameState, W: number, H: number): GameState {
  const hi = Math.max(state.highScore, parseInt(localStorage.getItem(LS_HI) || "0") || 0);
  const diff = getDiff(0);
  return {
    ...state, phase: "playing", score: 0, highScore: hi, chapter: 1, diffLevel: 1, lives: 3,
    ship: makeShip(W, H, true),
    bullets: [], aliens: [], kamikazes: [], snipers: [], swarms: [],
    boss: null, bossWarningTimer: 0, nextBossScore: BOSS_SCORES[0],
    laserWalls: [], plasmaOrbs: [], powerUps: [], particles: [],
    asteroids: Array.from({ length: 8 }, (_, i) => makeAsteroid(W, H, state.nextId + i, diff.roidSpeed)),
    shake: { x: 0, y: 0, timer: 0, intensity: 0 },
    combo: 0, comboTimer: 0, comboMult: 1, comboDisplayTimer: 0,
    meteorShower: false, meteorShowerTimer: 0, meteorShowerWarnTimer: 0,
    meteorShowerCooldown: METEOR_SCORES[0],
    fireActive: false, fireTimer: 0, chapterTimer: 0,
    obstacleSpawnTimer: diff.laserSpawnRate, roidSpawnTimer: diff.roidSpawnRate,
    alienSpawnTimer: 0, kamikazeTimer: diff.kamikazeRate,
    sniperTimer: diff.sniperRate, swarmTimer: diff.swarmRate,
    powerUpSpawnTimer: diff.powerUpRate,
    nextId: state.nextId + 30, frame: 0, sfx: [],
  };
}

// ── Tick ──────────────────────────────────────────────────────────────────
export function tick(
  state: GameState, W: number, H: number,
  targetX: number, targetY: number, fireGesture: boolean
): GameState {
  if (state.phase !== "playing" && state.phase !== "bossWarning") return state;

  const diff = getDiff(state.score);
  let s = { ...state };
  let nextId = s.nextId;
  const frame = s.frame + 1;
  const sfx: string[] = [];

  // ── boss warning phase ────────────────────────────────────────────────
  if (s.phase === "bossWarning") {
    const wt = s.bossWarningTimer - 1;
    if (wt <= 0) {
      const boss = makeBoss(W, nextId++, s.nextBossScore);
      const nextBossIdx = BOSS_SCORES.indexOf(s.nextBossScore) + 1;
      const nextBossScore = nextBossIdx < BOSS_SCORES.length ? BOSS_SCORES[nextBossIdx] : 999999;
      sfx.push("bossWarning");
      return { ...s, phase: "playing", boss, bossWarningTimer: 0, nextBossScore, nextId, sfx };
    }
    const stars = s.stars.map(st => ({ ...st, y: (st.y + st.speed) % H }));
    return { ...s, bossWarningTimer: wt, stars, sfx };
  }

  // ── time-slow factor ──────────────────────────────────────────────────
  const slowF = s.ship.timeSlowActive ? 0.28 : 1.0;

  // ── shake update ──────────────────────────────────────────────────────
  let shake = { ...s.shake };
  if (shake.timer > 0) {
    shake.timer--;
    shake.x = (Math.random() - 0.5) * shake.intensity * 2;
    shake.y = (Math.random() - 0.5) * shake.intensity * 2;
    shake.intensity *= 0.82;
  } else {
    shake.x = 0; shake.y = 0; shake.intensity = 0;
  }

  // ── combo update ──────────────────────────────────────────────────────
  let { combo, comboTimer, comboMult: cMult, comboDisplayTimer } = s;
  if (combo > 0) {
    comboTimer++;
    if (comboTimer >= COMBO_RESET_FRAMES) { combo = 0; comboTimer = 0; cMult = 1; }
  }
  if (comboDisplayTimer > 0) comboDisplayTimer--;

  const registerKill = (baseScore: number) => {
    combo++; comboTimer = 0;
    cMult = comboMult(combo);
    if (cMult > 1) comboDisplayTimer = 80;
    return baseScore * cMult;
  };

  // ── stars ─────────────────────────────────────────────────────────────
  const starSpeed = s.meteorShower ? 1.5 : 1;
  const stars = s.stars.map(st => ({ ...st, y: (st.y + st.speed * (1 + diff.lvl * 0.18) * starSpeed) % H }));

  // ── ship ──────────────────────────────────────────────────────────────
  const shipX = Math.max(s.ship.w / 2, Math.min(W - s.ship.w / 2, targetX));
  const shipY = Math.max(s.ship.h / 2, Math.min(H - s.ship.h / 2, targetY));
  let { godMode, godTimer, flash, flashTimer,
        shieldActive, shieldTimer, multishotActive, multishotTimer,
        rapidfireActive, rapidfireTimer, timeSlowActive, timeSlowTimer,
        teleportFlash } = s.ship;
  if (godMode) {
    godTimer--; flashTimer++;
    if (flashTimer > 6) { flash = !flash; flashTimer = 0; }
    if (godTimer <= 0) { godMode = false; flash = false; }
  }
  if (shieldActive)    { shieldTimer--;    if (shieldTimer <= 0)    shieldActive = false; }
  if (multishotActive) { multishotTimer--; if (multishotTimer <= 0) multishotActive = false; }
  if (rapidfireActive) { rapidfireTimer--; if (rapidfireTimer <= 0) rapidfireActive = false; }
  if (timeSlowActive)  { timeSlowTimer--;  if (timeSlowTimer <= 0)  timeSlowActive = false; }
  if (teleportFlash > 0) teleportFlash--;
  const ship: Ship = {
    ...s.ship, x: shipX, y: shipY, godMode, godTimer, flash, flashTimer,
    shieldActive, shieldTimer, multishotActive, multishotTimer,
    rapidfireActive, rapidfireTimer, timeSlowActive, timeSlowTimer, teleportFlash,
  };
  const isInvul = godMode || shieldActive;

  // ── firing ────────────────────────────────────────────────────────────
  let bullets = [...s.bullets];
  const fireRate = rapidfireActive ? 5 : 11;
  let fireTimer = s.fireTimer;
  if (fireGesture) {
    fireTimer++;
    if (fireTimer >= fireRate) {
      fireTimer = 0;
      const spd = diff.bulletSpeed;
      const shots: Omit<Bullet, "id">[] = [
        { x: shipX, y: shipY - ship.h / 2, dx: 0, dy: -spd, fromPlayer: true, size: rapidfireActive ? 5 : 4 },
        { x: shipX - 9, y: shipY - ship.h / 4, dx: -0.6, dy: -spd, fromPlayer: true, size: 3 },
        { x: shipX + 9, y: shipY - ship.h / 4, dx: 0.6, dy: -spd, fromPlayer: true, size: 3 },
      ];
      if (multishotActive) {
        shots.push({ x: shipX - 18, y: shipY, dx: -2.5, dy: -spd * 0.85, fromPlayer: true, size: 3.5 });
        shots.push({ x: shipX + 18, y: shipY, dx: 2.5, dy: -spd * 0.85, fromPlayer: true, size: 3.5 });
        shots.push({ x: shipX - 12, y: shipY + 6, dx: -3, dy: -spd * 0.5, fromPlayer: true, size: 2.5 });
        shots.push({ x: shipX + 12, y: shipY + 6, dx: 3, dy: -spd * 0.5, fromPlayer: true, size: 2.5 });
      }
      shots.forEach(b => bullets.push({ ...b, id: nextId++ }));
      sfx.push("laser");
    }
  } else { fireTimer = 0; }

  bullets = bullets.map(b => ({ ...b, x: b.x + b.dx, y: b.y + b.dy }))
    .filter(b => b.x > -30 && b.x < W + 30 && b.y > -30 && b.y < H + 30);

  // ── power-up spawning ─────────────────────────────────────────────────
  let powerUpSpawnTimer = s.powerUpSpawnTimer - 1;
  let powerUps = [...s.powerUps];
  if (powerUpSpawnTimer <= 0 && !s.boss) {
    powerUps.push(makePowerUp(W, nextId++, s.score));
    powerUpSpawnTimer = diff.powerUpRate;
  }

  // ── power-up collection ───────────────────────────────────────────────
  let newParticles: Particle[] = [...s.particles];
  let score = s.score;
  let phase: GamePhase = s.phase;
  let lives = s.lives;
  const activePUs: typeof powerUps = [];
  let newShip = ship;

  for (const pu of powerUps) {
    const y = pu.y + pu.speed;
    if (dist(pu.x, y, ship.x, ship.y) < pu.r + 22) {
      sfx.push("powerup");
      if (pu.kind === "shield")    { newShip = { ...newShip, shieldActive: true, shieldTimer: POWERUP_DURATION }; }
      else if (pu.kind === "multishot") { newShip = { ...newShip, multishotActive: true, multishotTimer: POWERUP_DURATION }; }
      else if (pu.kind === "rapidfire") { newShip = { ...newShip, rapidfireActive: true, rapidfireTimer: POWERUP_DURATION }; }
      else if (pu.kind === "timeslow")  { newShip = { ...newShip, timeSlowActive: true, timeSlowTimer: TIMESLOW_DURATION }; }
      else if (pu.kind === "wormhole")  {
        sfx.push("wormhole");
        newShip = { ...newShip, x: rnd(50, W - 50), y: rnd(100, H - 150), teleportFlash: 20 };
      }
      const col = pu.kind === "shield" ? "#44ffaa" : pu.kind === "multishot" ? "#ffe944" :
                  pu.kind === "rapidfire" ? "#ff8844" : pu.kind === "timeslow" ? "#88ccff" : "#cc88ff";
      const r2 = emitPs(newParticles, nextId, pu.x, y, 18, col, 5);
      newParticles = r2.particles; nextId = r2.nextId;
      continue;
    }
    if (y > H + pu.r) continue;
    activePUs.push({ ...pu, y, pulse: pu.pulse + 0.08 });
  }

  // ── meteor shower ─────────────────────────────────────────────────────
  let { meteorShower, meteorShowerTimer, meteorShowerWarnTimer, meteorShowerCooldown } = s;
  if (meteorShowerWarnTimer > 0) {
    meteorShowerWarnTimer--;
    if (meteorShowerWarnTimer === 0) { meteorShower = true; meteorShowerTimer = METEOR_DURATION; }
  }
  if (meteorShower && meteorShowerTimer > 0) {
    meteorShowerTimer--;
    if (meteorShowerTimer <= 0) {
      meteorShower = false;
      // update cooldown to next milestone
      const nextMilestone = METEOR_SCORES.find(ms => ms > score) ?? 99999;
      meteorShowerCooldown = nextMilestone;
    }
  }
  // trigger check
  if (!meteorShower && meteorShowerWarnTimer === 0 && !s.boss && score >= meteorShowerCooldown) {
    meteorShowerWarnTimer = METEOR_WARN;
    sfx.push("meteorWarning");
  }

  // ── boss check / warning ──────────────────────────────────────────────
  let boss = s.boss ? { ...s.boss } : null;
  let bossWarningTimer = s.bossWarningTimer;
  let nextBossScore = s.nextBossScore;
  let playerHit = false;

  if (!boss && score >= nextBossScore && phase === "playing") {
    sfx.push("bossWarning");
    return { ...s, phase: "bossWarning", bossWarningTimer: 180, sfx };
  }

  // ── boss update ───────────────────────────────────────────────────────
  if (boss && !boss.dying) {
    if (!boss.entryDone) {
      boss.y = Math.min(boss.y + 2.5 * slowF, 80);
      if (boss.y >= 80) boss.entryDone = true;
    } else {
      boss.x += boss.moveDx * slowF;
      if (boss.x > W - boss.w / 2 - 20 || boss.x < boss.w / 2 + 20) boss.moveDx *= -1;
      const hpPct = boss.hp / boss.maxHp;
      if (hpPct < 0.3) boss.bossPhase = 3;
      else if (hpPct < 0.65) boss.bossPhase = 2;
      boss.radialTimer -= slowF;
      if (boss.radialTimer <= 0) {
        const count = boss.bossPhase >= 2 ? 10 : 7;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          const spd = (3 + boss.bossPhase * 0.8) * slowF;
          bullets.push({ id: nextId++, x: boss.x, y: boss.y + boss.h / 2, dx: Math.cos(a) * spd, dy: Math.sin(a) * spd, fromPlayer: false, size: 5 });
        }
        boss.radialTimer = boss.bossPhase === 3 ? 90 : boss.bossPhase === 2 ? 130 : 180;
      }
      if (boss.bossPhase >= 2) {
        boss.aimTimer -= slowF;
        if (boss.aimTimer <= 0) {
          const dx2 = newShip.x - boss.x, dy2 = newShip.y - boss.y;
          const d = Math.sqrt(dx2 ** 2 + dy2 ** 2) || 1;
          const spd = 6 * slowF;
          bullets.push({ id: nextId++, x: boss.x, y: boss.y + boss.h / 2, dx: (dx2 / d) * spd, dy: (dy2 / d) * spd, fromPlayer: false, size: 6 });
          boss.aimTimer = boss.bossPhase === 3 ? 45 : 70;
        }
      }
      if (boss.bossPhase === 3) {
        boss.kamikazeTimer -= slowF;
        if (boss.kamikazeTimer <= 0) {
          s.kamikazes.push(makeKamikaze(W, nextId++, newShip.x, newShip.y));
          s.kamikazes.push(makeKamikaze(W, nextId++, newShip.x, newShip.y));
          boss.kamikazeTimer = 180;
        }
      }
      if (boss.hit) { boss.hitTimer--; if (boss.hitTimer <= 0) boss.hit = false; }
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; if (!b.fromPlayer) continue;
        if (pointRect(b.x, b.y, boss.x - boss.w / 2, boss.y - boss.h / 2, boss.w, boss.h)) {
          bullets.splice(i, 1); boss.hp--; boss.hit = true; boss.hitTimer = 8;
          score += registerKill(5);
          shake = mergeShake(shake, 4, 8);
          if (boss.hp <= 0) {
            sfx.push("bossDefeated"); sfx.push("explosion_lg");
            shake = makeShake(22, 40);
            const r2 = emitPs(newParticles, nextId, boss.x, boss.y, 60, () => `hsl(${rndInt(0, 60)},100%,70%)`, 9, 70);
            newParticles = r2.particles; nextId = r2.nextId;
            score += 200; lives = Math.min(lives + 1, 5);
            boss = null; break;
          }
        }
      }
      if (boss && !isInvul && circleRect(boss.x, boss.y, 40, newShip.x - newShip.w / 2, newShip.y - newShip.h / 2, newShip.w, newShip.h)) {
        playerHit = true;
      }
    }
  }

  // ── asteroids ─────────────────────────────────────────────────────────
  let asteroids = [...s.asteroids];
  let roidSpawnTimer = s.roidSpawnTimer - 1;
  const showerFactor = meteorShower ? 4 : 1;
  const maxRoids = diff.roidMaxCount * (meteorShower ? 3 : 1);
  if (roidSpawnTimer <= 0 && asteroids.filter(a => !a.melt).length < maxRoids) {
    asteroids.push(makeAsteroid(W, H, nextId++, diff.roidSpeed * rnd(0.8, 1.3) * (meteorShower ? 1.6 : 1), true));
    roidSpawnTimer = Math.floor(diff.roidSpawnRate / showerFactor);
  }
  const newRoids: typeof asteroids = [];
  for (let a of asteroids) {
    if (a.melt) {
      const ns = a.meltScale - 0.07;
      if (ns <= 0) { asteroids.push(makeAsteroid(W, H, nextId++, diff.roidSpeed * rnd(0.9, 1.2), true)); continue; }
      newRoids.push({ ...a, meltScale: ns, rot: a.rot + a.rotSpeed * 8 }); continue;
    }
    let { x: ax, y: ay, rot } = a;
    ay += a.speed * slowF; rot += a.rotSpeed;
    let hit = false;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]; if (!b.fromPlayer) continue;
      if (dist(b.x, b.y, ax, ay) < a.r * 0.88) {
        bullets.splice(i, 1); hit = true;
        score += registerKill(1);
        sfx.push("explosion_sm");
        shake = mergeShake(shake, 3, 5);
        const r2 = emitPs(newParticles, nextId, ax, ay, 8, () => `hsl(${rndInt(20, 45)},100%,70%)`);
        newParticles = r2.particles; nextId = r2.nextId; break;
      }
    }
    if (hit) {
      if (a.r > 15) {
        for (let k = 0; k < 2; k++) newRoids.push(makeAsteroid(W, H, nextId++, diff.roidSpeed * rnd(1, 1.4)));
      }
      continue;
    }
    if (!isInvul && circleRect(ax, ay, a.r * 0.78, newShip.x - newShip.w / 2, newShip.y - newShip.h / 2, newShip.w, newShip.h)) playerHit = true;
    if (ay > H + a.r) { score += 1; asteroids.push(makeAsteroid(W, H, nextId++, diff.roidSpeed * rnd(0.9, 1.2), true)); continue; }
    newRoids.push({ ...a, x: ax, y: ay, rot });
  }

  // ── aliens ────────────────────────────────────────────────────────────
  let aliens = [...s.aliens];
  let alienSpawnTimer = s.alienSpawnTimer - 1;
  if (s.chapter >= 2 && !boss) {
    if (alienSpawnTimer <= 0 && aliens.length < diff.alienCount) {
      aliens.push(makeAlien(W, nextId++, diff.alienSpeed));
      alienSpawnTimer = rndInt(1500, 3500);
    }
  }
  const newAliens: typeof aliens = [];
  for (let al of aliens) {
    let { x, y, targetX: tx, targetY: ty, fireTimer: ft, shiftTimer: st, hit: alHit, hitTimer: ht, life } = al;
    const spd = diff.alienSpeed * slowF;
    x += (tx - x) * spd; y += (ty - y) * spd;
    ft -= slowF; st--;
    if (alHit) { ht--; if (ht <= 0) alHit = false; }
    if (st <= 0) { tx = rnd(al.w, W - al.w); ty = rnd(50, 230); st = rndInt(1200, 3000); }
    if (ft <= 0) {
      const dx2 = newShip.x - x, dy2 = newShip.y - y;
      const d = Math.sqrt(dx2 ** 2 + dy2 ** 2) || 1;
      const spd2 = (4.5 + diff.lvl * 0.5) * slowF;
      bullets.push({ id: nextId++, x, y: y + al.h / 2, dx: (dx2 / d) * spd2, dy: (dy2 / d) * spd2, fromPlayer: false, size: 5 });
      ft = diff.alienFireRate + rndInt(0, 25);
    }
    let destroyed = false;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]; if (!b.fromPlayer) continue;
      if (pointRect(b.x, b.y, x - al.w / 2, y - al.h / 2, al.w, al.h)) {
        bullets.splice(i, 1); life--; alHit = true; ht = 12;
        score += registerKill(10);
        if (life <= 0) {
          destroyed = true; score += registerKill(20); sfx.push("explosion_sm");
          shake = mergeShake(shake, 5, 8);
          const r2 = emitPs(newParticles, nextId, x, y, 16, () => `hsl(${rndInt(180, 220)},100%,70%)`, 5);
          newParticles = r2.particles; nextId = r2.nextId; break;
        }
      }
    }
    if (destroyed) continue;
    if (!isInvul && pointRect(newShip.x, newShip.y, x - al.w / 2, y - al.h / 2, al.w, al.h)) playerHit = true;
    newAliens.push({ ...al, x, y, targetX: tx, targetY: ty, fireTimer: ft, shiftTimer: st, hit: alHit, hitTimer: ht, life });
  }

  // ── kamikazes ─────────────────────────────────────────────────────────
  let kamikazes = [...s.kamikazes];
  let kamikazeTimer = s.kamikazeTimer - 1;
  if (kamikazeTimer <= 0 && s.chapter >= 1 && !boss) {
    kamikazes.push(makeKamikaze(W, nextId++, newShip.x, newShip.y));
    kamikazeTimer = diff.kamikazeRate;
  }
  const newKamikazes: typeof kamikazes = [];
  for (let k of kamikazes) {
    const trail = [...k.trail, { x: k.x, y: k.y }].slice(-8);
    const nx = k.x + k.dx * slowF, ny = k.y + k.dy * slowF;
    let hit = false;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]; if (!b.fromPlayer) continue;
      if (dist(b.x, b.y, nx, ny) < k.r + 4) {
        bullets.splice(i, 1); hit = true;
        score += registerKill(8);
        sfx.push("explosion_sm"); shake = mergeShake(shake, 4, 6);
        const r2 = emitPs(newParticles, nextId, nx, ny, 10, () => `hsl(${rndInt(0, 40)},100%,70%)`, 4);
        newParticles = r2.particles; nextId = r2.nextId; break;
      }
    }
    if (hit) continue;
    if (!isInvul && dist(nx, ny, newShip.x, newShip.y) < k.r + 16) { playerHit = true; continue; }
    if (nx < -30 || nx > W + 30 || ny > H + 30) continue;
    newKamikazes.push({ ...k, x: nx, y: ny, trail });
  }

  // ── snipers ───────────────────────────────────────────────────────────
  let snipers = [...s.snipers];
  let sniperTimer = s.sniperTimer - 1;
  if (sniperTimer <= 0 && s.chapter >= 2 && !boss && snipers.length < 3) {
    snipers.push(makeSniper(W, nextId++));
    sniperTimer = diff.sniperRate;
  }
  const newSnipers: typeof snipers = [];
  for (let sn of snipers) {
    let { x, y, chargeTimer, fired, exitTimer, hp, hit: snHit, hitTimer: snHt } = sn;
    const targetSX = x < W / 2 ? rnd(60, 180) : rnd(W - 180, W - 60);
    if (!fired) {
      x += (targetSX - x) * 0.04;
      chargeTimer += slowF;
      if (chargeTimer >= sn.chargeMax && !fired) {
        fired = true;
        const dx2 = newShip.x - x, dy2 = newShip.y - y;
        const d = Math.sqrt(dx2 ** 2 + dy2 ** 2) || 1;
        const spd = 14 * (slowF < 0.5 ? 0.5 : 1); // sniper shot still fast even in slow time
        bullets.push({ id: nextId++, x, y, dx: (dx2 / d) * spd, dy: (dy2 / d) * spd, fromPlayer: false, size: 6 });
        exitTimer = 120;
      }
    } else { exitTimer--; x += (x < W / 2 ? -2 : 2); }
    if (snHit) { snHt--; if (snHt <= 0) snHit = false; }
    let destroyed = false;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]; if (!b.fromPlayer) continue;
      if (pointRect(b.x, b.y, x - sn.w / 2, y - sn.h / 2, sn.w, sn.h)) {
        bullets.splice(i, 1); hp--; snHit = true; snHt = 10;
        score += registerKill(15);
        if (hp <= 0) {
          destroyed = true; sfx.push("explosion_sm"); shake = mergeShake(shake, 4, 6);
          const r2 = emitPs(newParticles, nextId, x, y, 12, () => `hsl(${rndInt(270, 310)},100%,70%)`, 4);
          newParticles = r2.particles; nextId = r2.nextId; break;
        }
      }
    }
    if (destroyed) continue;
    if (!isInvul && pointRect(newShip.x, newShip.y, x - sn.w / 2, y - sn.h / 2, sn.w, sn.h)) playerHit = true;
    if (exitTimer < 0 && fired) continue;
    if (x < -60 || x > W + 60) continue;
    newSnipers.push({ ...sn, x, y, chargeTimer, fired, exitTimer, hp, hit: snHit, hitTimer: snHt });
  }

  // ── swarms ────────────────────────────────────────────────────────────
  let swarms = [...s.swarms];
  let swarmTimer = s.swarmTimer - 1;
  if (swarmTimer <= 0 && s.chapter >= 2 && !boss && swarms.length < 3) {
    swarms.push(makeSwarm(W, nextId++));
    swarmTimer = diff.swarmRate;
  }
  const newSwarms: typeof swarms = [];
  for (let sw of swarms) {
    const phase2 = sw.phase + 0.025;
    const cy = sw.cy + sw.speed * slowF;
    const cx = sw.cx + Math.sin(phase2) * 1.5;
    let ft = sw.fireTimer - slowF;
    const newMembers: SwarmMember[] = [];
    let swarmAlive = false;
    for (let m of sw.members) {
      if (!m.alive) { newMembers.push(m); continue; }
      const mx = cx + (m.x - sw.cx), my = cy + (m.y - sw.cy);
      let alive = true;
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; if (!b.fromPlayer) continue;
        if (dist(b.x, b.y, mx, my) < m.r + 4) {
          bullets.splice(i, 1); alive = false;
          score += registerKill(5); sfx.push("explosion_sm");
          const r2 = emitPs(newParticles, nextId, mx, my, 6, () => `hsl(${rndInt(100, 140)},100%,70%)`, 3);
          newParticles = r2.particles; nextId = r2.nextId; break;
        }
      }
      if (alive && !isInvul && dist(mx, my, newShip.x, newShip.y) < m.r + 16) { playerHit = true; alive = false; }
      newMembers.push({ ...m, x: mx, y: my, alive });
      if (alive) swarmAlive = true;
    }
    if (!swarmAlive) continue;
    if (ft <= 0) {
      newMembers.filter(m => m.alive).forEach(m => {
        const dx2 = newShip.x - m.x, dy2 = newShip.y - m.y;
        const d = Math.sqrt(dx2 ** 2 + dy2 ** 2) || 1;
        const spd = 4 * slowF;
        bullets.push({ id: nextId++, x: m.x, y: m.y, dx: (dx2 / d) * spd, dy: (dy2 / d) * spd, fromPlayer: false, size: 4 });
      });
      ft = 90;
    }
    if (cy > H + 60) continue;
    newSwarms.push({ ...sw, cx, cy, phase: phase2, members: newMembers, fireTimer: ft });
  }

  // ── enemy bullets hit player ──────────────────────────────────────────
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]; if (b.fromPlayer) continue;
    if (!isInvul && pointRect(b.x, b.y, newShip.x - newShip.w / 2, newShip.y - newShip.h / 2, newShip.w, newShip.h)) {
      bullets.splice(i, 1); playerHit = true;
    }
  }

  // ── laser walls ───────────────────────────────────────────────────────
  let laserWalls = [...s.laserWalls];
  let obstacleSpawnTimer = s.obstacleSpawnTimer - 1;
  if (obstacleSpawnTimer <= 0 && s.chapter >= 1 && !boss) {
    if (Math.random() < 0.45) laserWalls.push(makeLaserWall(W, nextId++, diff.laserSpeed, diff.doubleLaser));
    else if (s.plasmaOrbs.length < diff.orbCount) s.plasmaOrbs.push(makePlasmaOrb(W, H, nextId++, diff.orbSpeed));
    obstacleSpawnTimer = diff.laserSpawnRate;
  }
  const newLasers: typeof laserWalls = [];
  for (let lw of laserWalls) {
    if (lw.warning) { const wt = lw.warningTimer - 1; newLasers.push({ ...lw, warningTimer: wt, warning: wt > 0 }); continue; }
    const y = lw.y + lw.speed * slowF;
    const secondY = lw.double ? lw.secondY + lw.speed * slowF : lw.secondY;
    const checkBeam = (by: number) => {
      if (!isInvul && Math.abs(newShip.y - by) < 9 && !(newShip.x >= lw.gapX && newShip.x <= lw.gapX + lw.gapW)) playerHit = true;
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; if (!b.fromPlayer) continue;
        if (Math.abs(b.y - by) < 8 && !(b.x >= lw.gapX && b.x <= lw.gapX + lw.gapW)) bullets.splice(i, 1);
      }
    };
    checkBeam(y);
    if (lw.double && secondY > -30) checkBeam(secondY);
    if (y > H + 20) { score += 5; continue; }
    newLasers.push({ ...lw, y, secondY });
  }

  // ── plasma orbs ───────────────────────────────────────────────────────
  let plasmaOrbs = [...s.plasmaOrbs];
  const newOrbs: typeof plasmaOrbs = [];
  for (let po of plasmaOrbs) {
    let { x, y, dx, dy } = po;
    x += dx * slowF; y += dy * slowF;
    if (x - po.r < 0) { dx = Math.abs(dx); x = po.r; }
    if (x + po.r > W) { dx = -Math.abs(dx); x = W - po.r; }
    if (y - po.r < 0) { dy = Math.abs(dy); y = po.r; }
    if (y + po.r > H) { dy = -Math.abs(dy); y = H - po.r; }
    let orbHit = false;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]; if (!b.fromPlayer) continue;
      if (dist(b.x, b.y, x, y) < po.r) {
        bullets.splice(i, 1); orbHit = true;
        score += registerKill(15); sfx.push("explosion_sm"); shake = mergeShake(shake, 4, 7);
        const r2 = emitPs(newParticles, nextId, x, y, 12, () => `hsl(${po.hue},100%,75%)`, 4);
        newParticles = r2.particles; nextId = r2.nextId; break;
      }
    }
    if (orbHit) continue;
    if (!isInvul && circleRect(x, y, po.r, newShip.x - newShip.w / 2, newShip.y - newShip.h / 2, newShip.w, newShip.h)) playerHit = true;
    newOrbs.push({ ...po, x, y, dx, dy });
  }

  // ── particles ─────────────────────────────────────────────────────────
  const updatedParticles = newParticles
    .map(p => ({ ...p, x: p.x + p.dx * slowF, y: p.y + p.dy * slowF, dy: p.dy + 0.06, life: p.life - 1 }))
    .filter(p => p.life > 0);

  // ── chapter advance ───────────────────────────────────────────────────
  let chapter = s.chapter;
  if (score >= 80 && chapter < 2) {
    chapter = 2;
    for (let k = 0; k < 2; k++) aliens.push(makeAlien(W, nextId++, diff.alienSpeed));
  }

  // ── player hit ────────────────────────────────────────────────────────
  if (playerHit) {
    sfx.push("lifeLost");
    shake = makeShake(16, 20);
    lives--;
    if (lives <= 0) {
      const hi = Math.max(s.highScore, score);
      localStorage.setItem(LS_HI, String(hi));
      const r2 = emitPs(updatedParticles, nextId, newShip.x, newShip.y, 40, () => `hsl(${rndInt(0, 40)},100%,70%)`, 7, 60);
      return { ...s, phase: "gameover", score, highScore: hi, lives: 0, stars, particles: r2.particles, nextId: r2.nextId, frame, shake, sfx };
    }
    newShip = { ...newShip, godMode: true, godTimer: LIFE_GOD_DURATION, flash: false, flashTimer: 0 };
  }

  return {
    ...s, phase, score, chapter, diffLevel: diff.lvl, lives, frame,
    ship: newShip, bullets,
    asteroids: newRoids, aliens: newAliens,
    kamikazes: newKamikazes, snipers: newSnipers, swarms: newSwarms,
    boss, laserWalls: newLasers, plasmaOrbs: newOrbs,
    powerUps: activePUs, stars, particles: updatedParticles,
    shake, combo, comboTimer, comboMult: cMult, comboDisplayTimer,
    meteorShower, meteorShowerTimer, meteorShowerWarnTimer, meteorShowerCooldown,
    fireTimer, fireActive: fireGesture,
    roidSpawnTimer, alienSpawnTimer, kamikazeTimer,
    sniperTimer, swarmTimer, obstacleSpawnTimer, powerUpSpawnTimer,
    nextId, bossWarningTimer, nextBossScore, sfx,
  };
}
