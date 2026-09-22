import React, { useEffect, useRef } from "react";

interface Particle {
  destX: number;
  destY: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  color: number;
  offset: number;
}

function easeOutCubic(t: number, b: number, c: number, d: number): number {
  return c * ((t = t / d - 1) * t * t + 1) + b;
}

const LINE1 = "We Create High-Impact";
const LINE2 = "Booth Gaming Experiences";
const FONT_FAMILY = "'Plus Jakarta Sans', sans-serif";
const FONT_WEIGHT = 800;

const START_DELAY = 40;
const DURATION = 420;
const STEP = 1;

export function ParticleText() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let stopped = false;
    let animId: number;
    let tick = 0;
    let particles: Particle[] = [];

    async function init() {
      const W = Math.min(wrap!.clientWidth || 1200, 1400);

      let fontSize = Math.max(Math.min(W / 9, 110), 38);
      await document.fonts.ready;
      try {
        await document.fonts.load(`${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`);
      } catch (_) {}

      const offCanvas = document.createElement("canvas");
      const offCtx = offCanvas.getContext("2d")!;

      offCtx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`;

      const maxTxtW = Math.max(
        offCtx.measureText(LINE1).width,
        offCtx.measureText(LINE2).width
      );

      if (maxTxtW > W * 0.95) {
        fontSize = Math.floor((fontSize * (W * 0.95)) / maxTxtW);
      }

      const lineH = fontSize * 1.3;
      const H = Math.ceil(lineH * 2 + fontSize * 0.3);

      canvas!.width = W;
      canvas!.height = H;

      offCtx.canvas.width = W;
      offCtx.canvas.height = H;

      offCtx.font = `${fontSize}px ${FONT_FAMILY}`;

      const w1 = offCtx.measureText(LINE1).width;
      const w2 = offCtx.measureText(LINE2).width;

      const x1 = (W - w1) / 2;
      const x2 = (W - w2) / 2;

      // Draw static text for sampling
      offCtx.fillStyle = "#ffffff";
      offCtx.fillText(LINE1, x1, fontSize);

      const grad = offCtx.createLinearGradient(x2, 0, x2 + w2, 0);
      grad.addColorStop(0, "#00c2ff");
      grad.addColorStop(0.3, "#33ff8c");
      grad.addColorStop(0.6, "#ffc640");
      grad.addColorStop(1, "#e54cff");

      offCtx.fillStyle = grad;
      offCtx.fillText(LINE2, x2, fontSize + lineH);

      const imgData = offCtx.getImageData(0, 0, W, H);
      const data = imgData.data;

      particles = [];

      for (let y = 0; y < H; y += STEP) {
        for (let x = 0; x < W; x += STEP) {
          const i = (y * W + x) * 4;

          if (data[i + 3] > 120) {
            const sx = Math.random() * W;
            const sy = Math.random() * H;

            particles.push({
              destX: x,
              destY: y,
              x: sx,
              y: sy,
              startX: sx,
              startY: sy,
              offset: Math.random() * 100,
              color:
                data[i] |
                (data[i + 1] << 8) |
                (data[i + 2] << 16) |
                (255 << 24),
            });
          }
        }
      }

      draw(W, H, x1, x2, w1, w2, fontSize, lineH);
    }

    function draw(
      W: number,
      H: number,
      x1: number,
      x2: number,
      w1: number,
      w2: number,
      fontSize: number,
      lineH: number
    ) {
      if (stopped) return;

      const ctx = canvas!.getContext("2d")!;
      const t = tick - START_DELAY;

      const frame = ctx.createImageData(W, H);
      const pixels = new Uint32Array(frame.data.buffer);

      const time = tick * 0.02;

      for (const p of particles) {
        if (t > 0) {
          const ct = Math.min(t, DURATION);

          const baseX = easeOutCubic(ct, p.startX, p.destX - p.startX, DURATION);
          const baseY = easeOutCubic(ct, p.startY, p.destY - p.startY, DURATION);

          // floating motion
          p.x = baseX + Math.sin(time + p.offset) * 0.8;
          p.y = baseY + Math.cos(time + p.offset) * 0.8;
        }

        const px = Math.round(p.x);
        const py = Math.round(p.y);

        if (px >= 0 && px < W && py >= 0 && py < H) {
          pixels[py * W + px] = p.color;
        }
      }

      ctx.putImageData(frame, 0, 0);

      // 🔥 AURORA OVERLAY TEXT
      ctx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`;

      // Line 1
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillText(LINE1, x1, fontSize);

      // Animated gradient
      const shift = (Math.sin(tick * 0.02) + 1) / 2;

      const grad = ctx.createLinearGradient(x2, 0, x2 + w2, 0);
      grad.addColorStop(0, `hsl(${200 + shift * 40},100%,60%)`);
      grad.addColorStop(0.3, `hsl(${140 + shift * 40},100%,60%)`);
      grad.addColorStop(0.6, `hsl(${40 + shift * 40},100%,60%)`);
      grad.addColorStop(1, `hsl(${280 + shift * 40},100%,65%)`);

      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.12;
      ctx.fillText(LINE2, x2, fontSize + lineH);
      ctx.globalAlpha = 1;

      tick++;

      if (t < DURATION + 100) {
        animId = requestAnimationFrame(() =>
          draw(W, H, x1, x2, w1, w2, fontSize, lineH)
        );
      }
    }

    init();

    return () => {
      stopped = true;
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="w-full max-w-[1400px] mx-auto mb-6 px-4"
    >
      <canvas ref={canvasRef} className="w-full h-auto" />
    </div>
  );
}