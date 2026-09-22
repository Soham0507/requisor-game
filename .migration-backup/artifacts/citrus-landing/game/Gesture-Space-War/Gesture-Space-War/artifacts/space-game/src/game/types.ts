export type GamePhase = "title" | "playing" | "bossWarning" | "gameover";
export type PowerUpKind = "multishot" | "shield" | "rapidfire" | "wormhole" | "timeslow";

export interface Ship {
  x: number; y: number; w: number; h: number;
  godMode: boolean; godTimer: number;
  flash: boolean; flashTimer: number;
  shieldActive: boolean; shieldTimer: number;
  multishotActive: boolean; multishotTimer: number;
  rapidfireActive: boolean; rapidfireTimer: number;
  timeSlowActive: boolean; timeSlowTimer: number;
  teleportFlash: number;
}

export interface Bullet {
  id: number; x: number; y: number; dx: number; dy: number;
  fromPlayer: boolean; size: number;
}

export interface Asteroid {
  id: number; x: number; y: number; r: number; speed: number;
  rot: number; rotSpeed: number; verts: number[];
  melt: boolean; meltScale: number;
}

export interface Alien {
  id: number; x: number; y: number; w: number; h: number;
  life: number; maxLife: number;
  targetX: number; targetY: number;
  fireTimer: number; shiftTimer: number;
  hit: boolean; hitTimer: number;
}

export interface KamikazeEnemy {
  id: number; x: number; y: number; r: number;
  dx: number; dy: number;
  trail: { x: number; y: number }[];
}

export interface SniperEnemy {
  id: number; x: number; y: number; w: number; h: number;
  chargeTimer: number; chargeMax: number;
  fired: boolean; exitTimer: number;
  hp: number; hit: boolean; hitTimer: number;
}

export interface SwarmMember { x: number; y: number; r: number; alive: boolean; }
export interface SwarmGroup {
  id: number;
  cx: number; cy: number;
  phase: number;
  members: SwarmMember[];
  fireTimer: number; speed: number;
}

export interface Boss {
  id: number; x: number; y: number; w: number; h: number;
  hp: number; maxHp: number;
  bossPhase: 1 | 2 | 3;
  entryDone: boolean;
  radialTimer: number; aimTimer: number; kamikazeTimer: number;
  moveDx: number; moveTimer: number;
  hit: boolean; hitTimer: number;
  dying: boolean; dyingTimer: number;
  scoreThreshold: number;
}

export interface LaserWall {
  id: number; y: number; speed: number; gapX: number; gapW: number;
  warning: boolean; warningTimer: number;
  double: boolean; secondY: number;
}

export interface PlasmaOrb {
  id: number; x: number; y: number; r: number; dx: number; dy: number; hue: number;
}

export interface PowerUp {
  id: number; kind: PowerUpKind; x: number; y: number;
  r: number; speed: number; rot: number; pulse: number;
}

export interface Star { x: number; y: number; size: number; alpha: number; speed: number; }

export interface Particle {
  id: number; x: number; y: number; dx: number; dy: number;
  life: number; maxLife: number; color: string; size: number;
}

export interface Shake {
  x: number; y: number; timer: number; intensity: number;
}

export interface GameState {
  phase: GamePhase;
  score: number; highScore: number;
  chapter: number; diffLevel: number;
  lives: number;
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  aliens: Alien[];
  kamikazes: KamikazeEnemy[];
  snipers: SniperEnemy[];
  swarms: SwarmGroup[];
  boss: Boss | null;
  bossWarningTimer: number;
  nextBossScore: number;
  laserWalls: LaserWall[];
  plasmaOrbs: PlasmaOrb[];
  powerUps: PowerUp[];
  stars: Star[];
  particles: Particle[];
  shake: Shake;
  // combo
  combo: number;
  comboTimer: number;
  comboMult: number;
  comboDisplayTimer: number; // frames to show combo text
  // meteor shower
  meteorShower: boolean;
  meteorShowerTimer: number;
  meteorShowerWarnTimer: number;
  meteorShowerCooldown: number;
  fireActive: boolean; fireTimer: number;
  chapterTimer: number;
  obstacleSpawnTimer: number; roidSpawnTimer: number;
  alienSpawnTimer: number; kamikazeTimer: number;
  sniperTimer: number; swarmTimer: number;
  powerUpSpawnTimer: number;
  nextId: number; frame: number;
  sfx: string[];
}
