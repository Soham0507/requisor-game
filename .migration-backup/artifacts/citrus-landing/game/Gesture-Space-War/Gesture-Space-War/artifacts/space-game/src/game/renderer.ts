import type { GameState, Ship, PowerUp, Boss, KamikazeEnemy, SniperEnemy, SwarmGroup } from "./types";
import shipImgSrc from "@assets/2150675459-removebg-preview_1779965567816.png";

const SHIP_IMG = new Image();
SHIP_IMG.src = shipImgSrc;
const SHIP_DRAW_W = 80;
const SHIP_DRAW_H = 100;

export function render(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number) {
  const danger = Math.min((state.diffLevel - 1) / 5, 1);
  const bgR = Math.floor(3 + danger * 22);

  // time-slow tint
  if (state.ship.timeSlowActive) {
    const rem = state.ship.timeSlowTimer / 300;
    ctx.fillStyle = `rgba(${bgR},4,${Math.floor(22 + rem * 40)})`;
  } else {
    ctx.fillStyle = `rgb(${bgR},1,10)`;
  }
  ctx.fillRect(0, 0, W, H);

  // time-slow vignette
  if (state.ship.timeSlowActive) {
    const t = state.ship.timeSlowTimer / 300;
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, "transparent");
    vg.addColorStop(1, `rgba(0,80,200,${t * 0.22})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  for (const s of state.stars) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const p of state.particles) {
    const t = p.life / p.maxLife;
    ctx.globalAlpha = t;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const pu of state.powerUps) drawPowerUp(ctx, pu);

  // laser walls
  for (const lw of state.laserWalls) {
    const drawBeam = (beamY: number, isSecond = false) => {
      if (lw.warning) {
        const a = (Math.sin(Date.now() / 65) + 1) / 2 * 0.55 + 0.2;
        ctx.globalAlpha = a;
        ctx.strokeStyle = "#ff4444"; ctx.lineWidth = isSecond ? 1.5 : 2;
        ctx.setLineDash([10, 6]);
        ctx.beginPath(); ctx.moveTo(0, beamY); ctx.lineTo(W, beamY); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        if (!isSecond) {
          ctx.fillStyle = "#ff444499"; ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
          ctx.fillText("⚠  LASER WALL", W / 2, beamY < 80 ? 46 : beamY - 14); ctx.textAlign = "left";
        }
      } else {
        ctx.shadowColor = "#ff1111"; ctx.shadowBlur = 24;
        ctx.strokeStyle = isSecond ? "#ff6633" : "#ff2222"; ctx.lineWidth = isSecond ? 3.5 : 5;
        ctx.beginPath(); ctx.moveTo(0, beamY); ctx.lineTo(lw.gapX, beamY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lw.gapX + lw.gapW, beamY); ctx.lineTo(W, beamY); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#33ff8844"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(lw.gapX, beamY); ctx.lineTo(lw.gapX + lw.gapW, beamY); ctx.stroke();
        ctx.setLineDash([]);
      }
    };
    drawBeam(lw.y);
    if (lw.double && lw.secondY > -30) drawBeam(lw.secondY, true);
  }

  // plasma orbs
  for (const po of state.plasmaOrbs) {
    const pulse = 1 + Math.sin(Date.now() / 280 + po.id * 0.7) * 0.18;
    ctx.shadowColor = `hsl(${po.hue},100%,70%)`; ctx.shadowBlur = 26;
    const g = ctx.createRadialGradient(po.x, po.y, 0, po.x, po.y, po.r * pulse);
    g.addColorStop(0, `hsl(${po.hue},100%,95%)`);
    g.addColorStop(0.45, `hsl(${po.hue},100%,65%)`);
    g.addColorStop(1, `hsla(${po.hue},100%,40%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(po.x, po.y, po.r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // asteroids
  for (const a of state.asteroids) {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
    const sc = a.melt ? a.meltScale : 1; ctx.scale(sc, sc);
    // meteor shower tint — brighter orange
    const col = state.meteorShower ? "#bb7733" : "#6a4e30";
    ctx.shadowColor = "#88664488"; ctx.shadowBlur = state.meteorShower ? 14 : 8;
    ctx.fillStyle = col; ctx.strokeStyle = state.meteorShower ? "#ffaa55" : "#c89050"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(a.verts[0], a.verts[1]);
    for (let i = 2; i < a.verts.length; i += 2) ctx.lineTo(a.verts[i], a.verts[i + 1]);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.restore();
  }

  // aliens
  for (const al of state.aliens) {
    ctx.save(); ctx.translate(al.x, al.y);
    const c = al.hit ? "#ffffff" : "#22ccff";
    ctx.shadowColor = c; ctx.shadowBlur = 16;
    ctx.fillStyle = al.hit ? "#ffffff" : "#0e88cc"; ctx.strokeStyle = c; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -al.h / 2); ctx.lineTo(-al.w / 2, al.h / 2); ctx.lineTo(al.w / 2, al.h / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#004499aa";
    ctx.beginPath(); ctx.moveTo(-al.w / 2, 0); ctx.lineTo(-al.w * 0.92, al.h * 0.62); ctx.lineTo(-al.w * 0.12, al.h * 0.3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(al.w / 2, 0); ctx.lineTo(al.w * 0.92, al.h * 0.62); ctx.lineTo(al.w * 0.12, al.h * 0.3); ctx.closePath(); ctx.fill();
    const lr = al.life / al.maxLife;
    ctx.fillStyle = "#111"; ctx.fillRect(-al.w / 2, -al.h / 2 - 10, al.w, 5);
    ctx.fillStyle = lr > 0.5 ? "#22ff66" : "#ffaa22";
    ctx.fillRect(-al.w / 2, -al.h / 2 - 10, al.w * lr, 5);
    ctx.shadowBlur = 0; ctx.restore();
  }

  for (const k of state.kamikazes) drawKamikaze(ctx, k);
  for (const sn of state.snipers) drawSniper(ctx, sn);
  for (const sw of state.swarms) drawSwarm(ctx, sw);
  if (state.boss) drawBoss(ctx, state.boss, W);

  // bullets
  for (const b of state.bullets) {
    if (b.fromPlayer) {
      ctx.shadowColor = "#88eeff"; ctx.shadowBlur = 12; ctx.fillStyle = "#ccffff";
      ctx.save(); ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.dy, b.dx) + Math.PI / 2);
      ctx.beginPath(); ctx.ellipse(0, 0, b.size * 0.7, b.size * 1.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      // time-slow tints enemy bullets blue
      const col = state.ship.timeSlowActive ? "#4488ff" : "#ff7733";
      const glow = state.ship.timeSlowActive ? "#2244ff" : "#ff6600";
      ctx.shadowColor = glow; ctx.shadowBlur = 14; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  drawShip(ctx, state.ship);

  // teleport flash
  if (state.ship.teleportFlash > 0) {
    ctx.globalAlpha = state.ship.teleportFlash / 20 * 0.5;
    ctx.fillStyle = "#cc88ff";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // ── combo display (center screen pop) ──
  if (state.comboDisplayTimer > 0 && state.comboMult > 1) {
    drawCombo(ctx, W, H, state.comboMult, state.combo, state.comboDisplayTimer);
  }

  // ── meteor shower overlay ──
  if (state.meteorShowerWarnTimer > 0) {
    drawMeteorWarning(ctx, W, H, state.meteorShowerWarnTimer);
  }
  if (state.meteorShower && state.meteorShowerTimer > 0) {
    drawMeteorShowerHUD(ctx, W, state.meteorShowerTimer);
  }
}

// ── Combo display ─────────────────────────────────────────────────────────
function drawCombo(ctx: CanvasRenderingContext2D, W: number, H: number, mult: number, combo: number, timer: number) {
  const t = Math.min(timer / 30, 1);
  const scale = 1 + (1 - t) * 0.5;
  const alpha = t;
  const colors = ["", "", "#ffe944", "#ff9933", "#ff4444", "#ff44ff"];
  const color = colors[Math.min(mult, 5)];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, H / 2 - 40);
  ctx.scale(scale, scale);
  ctx.shadowColor = color; ctx.shadowBlur = 30;
  ctx.font = `bold ${44 + mult * 4}px 'Courier New', monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(`✕${mult}  COMBO`, 0, 0);
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = "#ffffff88";
  ctx.fillText(`${combo} kills in a row`, 0, 36);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.shadowBlur = 0; ctx.restore();
}

// ── Meteor shower ─────────────────────────────────────────────────────────
function drawMeteorWarning(ctx: CanvasRenderingContext2D, W: number, H: number, timer: number) {
  const pulse = (Math.sin(Date.now() / 80) + 1) / 2;
  ctx.globalAlpha = 0.75 + pulse * 0.2;
  ctx.shadowColor = "#ff8833"; ctx.shadowBlur = 30;
  ctx.font = "bold 36px 'Courier New', monospace";
  ctx.textAlign = "center"; ctx.fillStyle = `rgba(255,${140 + Math.floor(pulse * 60)},50,1)`;
  ctx.fillText("☄  METEOR SHOWER INCOMING  ☄", W / 2, H * 0.38);
  ctx.font = "14px monospace"; ctx.fillStyle = "#ffcc88cc";
  ctx.fillText("brace yourself", W / 2, H * 0.38 + 32);
  ctx.textAlign = "left"; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function drawMeteorShowerHUD(ctx: CanvasRenderingContext2D, W: number, timer: number) {
  const rem = timer / 720;
  ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
  ctx.shadowColor = "#ff6622"; ctx.shadowBlur = 10;
  ctx.fillStyle = "#ff8844";
  ctx.fillText(`☄ METEOR SHOWER  ${Math.ceil(timer / 60)}s`, W / 2, 52);
  // bar under level badge
  const bw = 140;
  ctx.fillStyle = "#331100"; ctx.fillRect(W / 2 - bw / 2, 56, bw, 4);
  ctx.fillStyle = "#ff5522"; ctx.fillRect(W / 2 - bw / 2, 56, bw * rem, 4);
  ctx.textAlign = "left"; ctx.shadowBlur = 0;
}

// ── Kamikaze ──────────────────────────────────────────────────────────────
function drawKamikaze(ctx: CanvasRenderingContext2D, k: KamikazeEnemy) {
  for (let i = 0; i < k.trail.length; i++) {
    const t = i / k.trail.length;
    ctx.globalAlpha = t * 0.5;
    ctx.fillStyle = `hsl(${10 + t * 20},100%,60%)`;
    ctx.beginPath(); ctx.arc(k.trail[i].x, k.trail[i].y, k.r * t * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const angle = Math.atan2(k.dy, k.dx);
  ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(angle + Math.PI / 2);
  ctx.shadowColor = "#ff4422"; ctx.shadowBlur = 16;
  ctx.fillStyle = "#ff3300"; ctx.strokeStyle = "#ff8844"; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -k.r * 1.5); ctx.lineTo(-k.r, k.r); ctx.lineTo(0, k.r * 0.4); ctx.lineTo(k.r, k.r);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.restore();
}

// ── Sniper ────────────────────────────────────────────────────────────────
function drawSniper(ctx: CanvasRenderingContext2D, sn: SniperEnemy) {
  ctx.save(); ctx.translate(sn.x, sn.y);
  const charge = sn.chargeTimer / sn.chargeMax;
  const c = sn.hit ? "#ffffff" : `hsl(${270 + charge * 60},100%,${55 + charge * 20}%)`;
  ctx.shadowColor = c; ctx.shadowBlur = 10 + charge * 20;
  ctx.fillStyle = sn.hit ? "#ffffff" : `hsl(${270 + charge * 60},80%,40%)`;
  ctx.strokeStyle = c; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -sn.h / 2); ctx.lineTo(-sn.w / 2, 0); ctx.lineTo(-sn.w / 3, sn.h / 2);
  ctx.lineTo(sn.w / 3, sn.h / 2); ctx.lineTo(sn.w / 2, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  if (!sn.fired && charge > 0.1) {
    ctx.shadowColor = `hsl(${30 + charge * 30},100%,70%)`; ctx.shadowBlur = 12 + charge * 15;
    ctx.fillStyle = `hsl(${30 + charge * 30},100%,75%)`;
    ctx.beginPath(); ctx.arc(0, 0, 4 + charge * 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.restore();
}

// ── Swarm ─────────────────────────────────────────────────────────────────
function drawSwarm(ctx: CanvasRenderingContext2D, sw: SwarmGroup) {
  for (const m of sw.members) {
    if (!m.alive) continue;
    const pulse = 1 + Math.sin(Date.now() / 200 + sw.id) * 0.2;
    ctx.shadowColor = "#44ff44"; ctx.shadowBlur = 10;
    ctx.fillStyle = "#22cc22"; ctx.strokeStyle = "#88ff88"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// ── Boss ──────────────────────────────────────────────────────────────────
function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, W: number) {
  const { x, y, w, h, hp, maxHp, bossPhase, hit } = boss;
  ctx.save(); ctx.translate(x, y);
  const hpPct = hp / maxHp;
  const baseColor = bossPhase === 3 ? "#ff2200" : bossPhase === 2 ? "#ff8800" : "#dd00ff";
  const glowColor = bossPhase === 3 ? "#ff4400" : bossPhase === 2 ? "#ffaa00" : "#ee44ff";
  ctx.shadowColor = hit ? "#ffffff" : glowColor;
  ctx.shadowBlur = hit ? 40 : 20 + Math.sin(Date.now() / 200) * 8;
  ctx.fillStyle = hit ? "#ffffff" : (bossPhase === 3 ? "#550000" : bossPhase === 2 ? "#553300" : "#330044");
  ctx.strokeStyle = hit ? "#ffffff" : baseColor; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2); ctx.lineTo(w / 2, -h / 4); ctx.lineTo(w / 2, h / 3);
  ctx.lineTo(w / 4, h / 2); ctx.lineTo(-w / 4, h / 2); ctx.lineTo(-w / 2, h / 3); ctx.lineTo(-w / 2, -h / 4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = hit ? "#ffffff" : baseColor + "88";
  ctx.beginPath(); ctx.moveTo(w / 2, -h / 8); ctx.lineTo(w * 0.85, h / 4); ctx.lineTo(w / 2, h / 3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-w / 2, -h / 8); ctx.lineTo(-w * 0.85, h / 4); ctx.lineTo(-w / 2, h / 3); ctx.closePath(); ctx.fill();
  const turrets: [number, number][] = [[-w * 0.28, h * 0.3], [0, h * 0.5], [w * 0.28, h * 0.3]];
  for (const [tx, ty] of turrets) {
    ctx.fillStyle = hit ? "#ffffff" : baseColor; ctx.shadowColor = glowColor; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(tx, ty, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill();
  }
  const t2 = Date.now() / 300;
  const coreR = 14 + Math.sin(t2 * bossPhase) * 4;
  ctx.shadowColor = glowColor; ctx.shadowBlur = 30;
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
  cg.addColorStop(0, "#ffffff"); cg.addColorStop(0.4, glowColor); cg.addColorStop(1, baseColor + "00");
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
  // HP bar
  const barW = Math.min(W * 0.6, 500), barX = W / 2 - barW / 2, barY = 8;
  ctx.fillStyle = "#11001a"; ctx.fillRect(barX, barY, barW, 16);
  const hpColor = hpPct > 0.6 ? "#dd00ff" : hpPct > 0.3 ? "#ff8800" : "#ff2200";
  ctx.fillStyle = hpColor; ctx.fillRect(barX, barY, barW * hpPct, 16);
  ctx.strokeStyle = hpColor + "88"; ctx.lineWidth = 2; ctx.strokeRect(barX, barY, barW, 16);
  ctx.shadowColor = hpColor; ctx.shadowBlur = 10;
  ctx.font = "bold 11px monospace"; ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
  ctx.fillText(`⚡ BOSS  ${hp} / ${maxHp}  [PHASE ${bossPhase}]`, W / 2, 22);
  ctx.textAlign = "left"; ctx.shadowBlur = 0;
}

// ── Power-up ──────────────────────────────────────────────────────────────
const POWERUP_CFG = {
  multishot: { fill: "#ffe944", glow: "#ffcc00", icon: "⚡", label: "MULTI-SHOT" },
  shield:    { fill: "#44ffaa", glow: "#00ffcc", icon: "🛡", label: "SHIELD" },
  rapidfire: { fill: "#ff8844", glow: "#ff4400", icon: "🔥", label: "RAPID" },
  wormhole:  { fill: "#cc88ff", glow: "#9944ff", icon: "🌀", label: "WORMHOLE" },
  timeslow:  { fill: "#88ccff", glow: "#4488ff", icon: "⏳", label: "TIME SLOW" },
} as const;

function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUp) {
  const cfg = POWERUP_CFG[pu.kind];
  const pulse = 1 + Math.sin(pu.pulse) * 0.2;
  const r = pu.r * pulse;
  ctx.save(); ctx.translate(pu.x, pu.y);
  ctx.shadowColor = cfg.glow; ctx.shadowBlur = 32;
  const spin = (Date.now() / 600 + pu.id * 0.5) % (Math.PI * 2);
  ctx.strokeStyle = cfg.glow + "99"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
  ctx.save(); ctx.rotate(spin);
  ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI * 2); ctx.stroke();
  ctx.restore(); ctx.setLineDash([]);
  const g = ctx.createRadialGradient(0, -r * 0.2, 0, 0, 0, r);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.4, cfg.fill); g.addColorStop(1, cfg.glow + "55");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = `${Math.floor(r * 1.1)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#000"; ctx.globalAlpha = 0.9;
  ctx.fillText(cfg.icon, 0, 1);
  ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic";
  ctx.font = "bold 9px monospace"; ctx.fillStyle = cfg.fill; ctx.shadowColor = cfg.glow; ctx.shadowBlur = 6;
  ctx.fillText(cfg.label, 0, r + 16); ctx.shadowBlur = 0; ctx.textAlign = "left"; ctx.restore();
}

// ── Ship ──────────────────────────────────────────────────────────────────
function drawShip(ctx: CanvasRenderingContext2D, ship: Ship) {
  if (ship.godMode && ship.flash) return;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  const t = Date.now() / 180;
  const eg = 0.65 + Math.sin(t) * 0.35;
  const hw = SHIP_DRAW_W / 2;
  const hh = SHIP_DRAW_H / 2;

  if (ship.shieldActive) {
    const sr = 56 + Math.sin(t * 2.2) * 5;
    const rem = ship.shieldTimer / 600;
    ctx.shadowColor = "#44ffaa"; ctx.shadowBlur = 36;
    ctx.strokeStyle = `rgba(68,255,170,${0.35 + rem * 0.5})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, sr, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(68,255,170,${0.04 + rem * 0.06})`;
    ctx.beginPath(); ctx.arc(0, 0, sr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  const exLen = ship.rapidfireActive ? 32 + Math.sin(t * 5) * 10 : 20 + Math.sin(t * 3) * 7;
  ctx.shadowColor = ship.timeSlowActive ? "#88ccff" : "#66aaff"; ctx.shadowBlur = 18;
  ctx.fillStyle = ship.timeSlowActive ? `rgba(80,180,255,${eg * 0.9})` : `rgba(80,140,255,${eg * 0.9})`;
  ctx.beginPath();
  ctx.moveTo(-8, hh - 8); ctx.lineTo(0, hh + exLen); ctx.lineTo(8, hh - 8);
  ctx.closePath(); ctx.fill();
  if (ship.multishotActive) {
    ctx.fillStyle = `rgba(255,210,60,${eg * 0.75})`;
    for (const sx of [-28, 28]) {
      const wLen = exLen * 0.6;
      ctx.beginPath();
      ctx.moveTo(sx - 5, hh - 14); ctx.lineTo(sx, hh - 6 + wLen); ctx.lineTo(sx + 5, hh - 14);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.shadowBlur = 0;

  if (SHIP_IMG.complete && SHIP_IMG.naturalWidth > 0) {
    ctx.drawImage(SHIP_IMG, -hw, -hh, SHIP_DRAW_W, SHIP_DRAW_H);
  } else {
    ctx.fillStyle = "#aac8ee";
    ctx.beginPath();
    ctx.moveTo(0, -hh); ctx.lineTo(-hw, hh); ctx.lineTo(hw, hh);
    ctx.closePath(); ctx.fill();
  }

  if (ship.godMode) {
    ctx.shadowColor = "#ffdd88"; ctx.shadowBlur = 28;
    ctx.strokeStyle = `rgba(255,220,100,${eg})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 54, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  if (ship.rapidfireActive) {
    ctx.shadowColor = "#ff7722"; ctx.shadowBlur = 20;
    ctx.strokeStyle = `rgba(255,120,40,${eg * 0.7})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, -hh * 0.35, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  // time-slow aura
  if (ship.timeSlowActive) {
    const rem = ship.timeSlowTimer / 300;
    const sa = (Math.sin(Date.now() / 120) + 1) / 2;
    ctx.shadowColor = "#44aaff"; ctx.shadowBlur = 24 + sa * 12;
    ctx.strokeStyle = `rgba(80,180,255,${0.3 + rem * 0.4})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 62 + sa * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

// ── Landmark overlay ──────────────────────────────────────────────────────
export const HAND_CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],[0,17],
];

export function drawLandmarks(ctx: CanvasRenderingContext2D, landmarks: Array<{ x: number; y: number }>, isFist: boolean, W: number, H: number) {
  const color = isFist ? "#ff6644" : "#44ffaa";
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = color + "cc"; ctx.lineWidth = 1.5;
  for (const [a, b] of HAND_CONNECTIONS) {
    const la = landmarks[a], lb = landmarks[b];
    ctx.beginPath();
    ctx.moveTo((1 - la.x) * W, la.y * H);
    ctx.lineTo((1 - lb.x) * W, lb.y * H);
    ctx.stroke();
  }
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    const isTip = [4, 8, 12, 16, 20].includes(i);
    ctx.fillStyle = isTip ? "#ffffff" : color;
    ctx.shadowColor = color; ctx.shadowBlur = isTip ? 6 : 3;
    ctx.beginPath(); ctx.arc((1 - lm.x) * W, lm.y * H, isTip ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export function renderBossWarning(ctx: CanvasRenderingContext2D, W: number, H: number, timer: number) {
  const t = 1 - timer / 180;
  const pulse = (Math.sin(Date.now() / 120) + 1) / 2;
  ctx.fillStyle = `rgba(40,0,0,${0.7 + pulse * 0.15})`;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.shadowColor = "#ff2200"; ctx.shadowBlur = 40 + pulse * 20;
  ctx.font = "bold 62px 'Courier New', monospace";
  ctx.fillStyle = `rgba(255,60,0,${0.7 + pulse * 0.3})`;
  ctx.fillText("⚠  BOSS INCOMING  ⚠", W / 2, H / 2 - 20);
  ctx.shadowBlur = 15;
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillStyle = "#ffaa44";
  ctx.fillText("Prepare yourself...", W / 2, H / 2 + 28);
  const barW = 280, barH = 8;
  ctx.fillStyle = "#330000"; ctx.fillRect(W / 2 - barW / 2, H / 2 + 60, barW, barH);
  ctx.fillStyle = "#ff2200"; ctx.fillRect(W / 2 - barW / 2, H / 2 + 60, barW * t, barH);
  ctx.textAlign = "left"; ctx.shadowBlur = 0;
}
