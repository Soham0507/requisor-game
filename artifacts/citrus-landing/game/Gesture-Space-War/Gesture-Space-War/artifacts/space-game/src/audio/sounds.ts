let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// ── throttle laser sfx ──
let lastLaserT = 0;
export function sfxLaser() {
  const now = Date.now();
  if (now - lastLaserT < 70) return;
  lastLaserT = now;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(700, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, c.currentTime + 0.06);
    g.gain.setValueAtTime(0.07, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
    osc.connect(g); g.connect(c.destination);
    osc.start(); osc.stop(c.currentTime + 0.07);
  } catch { /* ignore */ }
}

export function sfxExplosion(size: "sm" | "lg" = "sm") {
  try {
    const c = getCtx();
    const dur = size === "lg" ? 0.75 : 0.22;
    const rate = c.sampleRate;
    const buf = c.createBuffer(1, Math.floor(rate * dur), rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 0.6);
    }
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = "lowpass"; filt.frequency.value = size === "lg" ? 280 : 900;
    const g = c.createGain();
    g.gain.setValueAtTime(size === "lg" ? 0.75 : 0.4, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(filt); filt.connect(g); g.connect(c.destination);
    src.start(); src.stop(c.currentTime + dur);
  } catch { /* ignore */ }
}

export function sfxLifeLost() {
  try {
    const c = getCtx();
    [440, 330, 220].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      osc.connect(g); g.connect(c.destination);
      const t = c.currentTime + i * 0.13;
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t); osc.stop(t + 0.25);
    });
  } catch { /* ignore */ }
}

export function sfxPowerUp() {
  try {
    const c = getCtx();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      osc.connect(g); g.connect(c.destination);
      const t = c.currentTime + i * 0.07;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch { /* ignore */ }
}

export function sfxWormhole() {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, c.currentTime + 0.35);
    osc.frequency.exponentialRampToValueAtTime(260, c.currentTime + 0.7);
    g.gain.setValueAtTime(0.28, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
    osc.connect(g); g.connect(c.destination);
    osc.start(); osc.stop(c.currentTime + 0.75);
  } catch { /* ignore */ }
}

export function sfxBossWarning() {
  try {
    const c = getCtx();
    [60, 80, 60, 100].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sawtooth"; osc.frequency.value = freq;
      osc.connect(g); g.connect(c.destination);
      const t = c.currentTime + i * 0.25;
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t); osc.stop(t + 0.25);
    });
  } catch { /* ignore */ }
}

export function sfxMeteorWarning() {
  try {
    const c = getCtx();
    [120, 160, 200, 160, 120].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sawtooth"; osc.frequency.value = freq;
      osc.connect(g); g.connect(c.destination);
      const t = c.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t); osc.stop(t + 0.15);
    });
  } catch { /* ignore */ }
}

export function sfxBossDefeated() {
  try {
    const c = getCtx();
    [440, 550, 660, 880, 1100].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      osc.connect(g); g.connect(c.destination);
      const t = c.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t); osc.stop(t + 0.45);
    });
    sfxExplosion("lg");
  } catch { /* ignore */ }
}

// ── Background music ──────────────────────────────────────────────────────
let musicActive = false;
let musicPad: { osc: OscillatorNode; g: GainNode }[] = [];
let bassInterval: ReturnType<typeof setInterval> | null = null;
let melodyInterval: ReturnType<typeof setInterval> | null = null;
let bassIdx = 0;
const BASS_FREQS = [55, 55, 73.4, 55, 55, 61.7, 55, 82.4];
const MELODY = [440, 0, 493.8, 0, 392, 329.6, 0, 440];
let melIdx = 0;

export function startMusic() {
  if (musicActive) return;
  musicActive = true;
  try {
    const c = getCtx();
    // ambient pad
    [110, 138.6, 164.8, 220].forEach(freq => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "triangle"; osc.frequency.value = freq;
      osc.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.018, c.currentTime);
      osc.start();
      musicPad.push({ osc, g });
    });
    // bass pulse
    bassInterval = setInterval(() => {
      if (!musicActive) return;
      try {
        const c2 = getCtx();
        const f = BASS_FREQS[bassIdx++ % BASS_FREQS.length];
        const osc = c2.createOscillator();
        const g = c2.createGain();
        osc.type = "square"; osc.frequency.value = f;
        osc.connect(g); g.connect(c2.destination);
        g.gain.setValueAtTime(0.045, c2.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c2.currentTime + 0.38);
        osc.start(); osc.stop(c2.currentTime + 0.42);
      } catch { /* ignore */ }
    }, 480);
    // melody arpeggio
    melodyInterval = setInterval(() => {
      if (!musicActive) return;
      try {
        const c2 = getCtx();
        const f = MELODY[melIdx++ % MELODY.length];
        if (!f) return;
        const osc = c2.createOscillator();
        const g = c2.createGain();
        osc.type = "sine"; osc.frequency.value = f;
        osc.connect(g); g.connect(c2.destination);
        g.gain.setValueAtTime(0.008, c2.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c2.currentTime + 0.3);
        osc.start(); osc.stop(c2.currentTime + 0.35);
      } catch { /* ignore */ }
    }, 960);
  } catch { /* ignore */ }
}

export function stopMusic() {
  musicActive = false;
  if (bassInterval) { clearInterval(bassInterval); bassInterval = null; }
  if (melodyInterval) { clearInterval(melodyInterval); melodyInterval = null; }
  const c = ctx;
  musicPad.forEach(({ osc, g }) => {
    try {
      if (c) {
        g.gain.setValueAtTime(g.gain.value, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
        osc.stop(c.currentTime + 0.65);
      }
    } catch { /* ignore */ }
  });
  musicPad = [];
}

export function setBossIntensity(boss: boolean) {
  if (!musicActive) return;
  const c = ctx;
  if (!c) return;
  musicPad.forEach(({ g }) => {
    try {
      g.gain.setValueAtTime(g.gain.value, c.currentTime);
      g.gain.linearRampToValueAtTime(boss ? 0.045 : 0.018, c.currentTime + 0.8);
    } catch { /* ignore */ }
  });
}
