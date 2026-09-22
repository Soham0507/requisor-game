let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let ambientNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
let drumInterval: ReturnType<typeof setInterval> | null = null;
let isMuted = false;
let stopAmbienceTimer: ReturnType<typeof setTimeout> | null = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return { ctx: audioCtx, master: masterGain! };
}

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1);
  }
  return buffer;
}

export function startAmbience() {
  if (ambientNodes) return;
  const { ctx, master } = getCtx();

  const noiseBuffer = createNoiseBuffer(ctx, 4);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 600;
  filter.Q.value = 0.5;

  const filter2 = ctx.createBiquadFilter();
  filter2.type = "lowpass";
  filter2.frequency.value = 1200;

  const gain = ctx.createGain();
  gain.gain.value = isMuted ? 0 : 0.06;

  source.connect(filter);
  filter.connect(filter2);
  filter2.connect(gain);
  gain.connect(master);
  source.start();

  ambientNodes = { source, gain };

  startDrumBeat();
}

export function stopAmbience() {
  if (stopAmbienceTimer) {
    clearTimeout(stopAmbienceTimer);
    stopAmbienceTimer = null;
  }
  if (ambientNodes) {
    const { ctx } = getCtx();
    ambientNodes.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    const nodes = ambientNodes;
    stopAmbienceTimer = setTimeout(() => {
      try { nodes.source.stop(); } catch {}
      stopAmbienceTimer = null;
    }, 600);
    ambientNodes = null;
  }
  stopDrumBeat();
}

function startDrumBeat() {
  if (drumInterval) return;
  let beat = 0;
  drumInterval = setInterval(() => {
    if (isMuted) return;
    const { ctx, master } = getCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (beat % 4 === 0) {
      osc.frequency.value = 80;
      gain.gain.value = 0.15;
    } else if (beat % 4 === 2) {
      osc.frequency.value = 60;
      gain.gain.value = 0.1;
    } else {
      osc.frequency.value = 100;
      gain.gain.value = 0.05;
    }

    osc.connect(gain);
    gain.connect(master);
    osc.start(ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);

    if (beat % 4 === 0) {
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.05);
      const nGain = ctx.createGain();
      nGain.gain.value = 0.04;
      const hpf = ctx.createBiquadFilter();
      hpf.type = "highpass";
      hpf.frequency.value = 8000;
      noise.connect(hpf);
      hpf.connect(nGain);
      nGain.connect(master);
      noise.start(ctx.currentTime + 0.075);
      nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      noise.stop(ctx.currentTime + 0.15);
    }

    beat = (beat + 1) % 8;
  }, 500);
}

function stopDrumBeat() {
  if (drumInterval) {
    clearInterval(drumInterval);
    drumInterval = null;
  }
}

export function playCrowdCheer() {
  if (isMuted) return;
  const { ctx, master } = getCtx();
  const duration = 1.8;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration);

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1500;
  bp.Q.value = 0.3;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 4000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.1);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  noise.connect(bp);
  bp.connect(lp);
  lp.connect(gain);
  gain.connect(master);
  noise.start();
  noise.stop(ctx.currentTime + duration);

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 400 + i * 200;
    osc.frequency.linearRampToValueAtTime(600 + i * 250, ctx.currentTime + 0.3);
    oGain.gain.setValueAtTime(0, ctx.currentTime);
    oGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.05);
    oGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(oGain);
    oGain.connect(master);
    osc.start(ctx.currentTime + i * 0.05);
    osc.stop(ctx.currentTime + 0.8);
  }

  if (ambientNodes) {
    ambientNodes.gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.2);
    ambientNodes.gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + duration);
  }
}

export function playMissGroan() {
  if (isMuted) return;
  const { ctx, master } = getCtx();
  const duration = 1.2;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration);

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 400;
  bp.Q.value = 0.8;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  noise.connect(bp);
  bp.connect(gain);
  gain.connect(master);
  noise.start();
  noise.stop(ctx.currentTime + duration);

  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.6);
  oGain.gain.setValueAtTime(0.08, ctx.currentTime);
  oGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  osc.connect(oGain);
  oGain.connect(master);
  osc.start();
  osc.stop(ctx.currentTime + 0.6);

  if (ambientNodes) {
    ambientNodes.gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.3);
    ambientNodes.gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + duration);
  }
}

export function playSwoosh() {
  if (isMuted) return;
  const { ctx, master } = getCtx();

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.3);

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(2000, ctx.currentTime);
  bp.frequency.exponentialRampToValueAtTime(6000, ctx.currentTime + 0.15);
  bp.Q.value = 1;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  noise.connect(bp);
  bp.connect(gain);
  gain.connect(master);
  noise.start();
  noise.stop(ctx.currentTime + 0.3);
}

export function playBuzzer() {
  if (isMuted) return;
  const { ctx, master } = getCtx();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 220;
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.setValueAtTime(0.12, ctx.currentTime + 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
  osc.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(ctx.currentTime + 1.0);
}

export function toggleMute(): boolean {
  isMuted = !isMuted;
  if (ambientNodes) {
    const { ctx } = getCtx();
    ambientNodes.gain.gain.linearRampToValueAtTime(isMuted ? 0 : 0.06, ctx.currentTime + 0.1);
  }
  return isMuted;
}

export function getIsMuted(): boolean {
  return isMuted;
}

export function initAudio() {
  getCtx();
}
