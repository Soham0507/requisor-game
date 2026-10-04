/* =====================================================================
   Activate8 runtime: utilities, theme engine, sound, confetti, stage,
   lead capture, leaderboards. Games plug in through GAMES[id].
   ===================================================================== */

// ---------- utilities ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const uid = () => Math.random().toString(36).slice(2, 10);
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || '?';
const bus = new EventTarget();
// Apple devices render SF Pro, which is already tight at display sizes; CSS eases tracking there.
if (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) document.documentElement.classList.add('apple');
const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));
const decimalsOf = (step) => { const s = String(step); return s.includes('.') ? s.split('.')[1].length : 0; };

function icon(name, size = 24, sw = 1.8, cls = '') {
  const p = ICONS[name];
  if (!p) { console.warn('[a8] missing icon', name); return ''; }
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
function ptile(iconName, color, size = 64, extra = '') {
  const s = size == null ? '' : `;--s:${typeof size === 'number' ? size + 'px' : size}`;
  return `<span class="ptile ${extra}" style="--c:${esc(color || 'var(--brand)')}${s}">${icon(iconName, 24, 1.9)}</span>`;
}

// ---------- color + theme engine ----------
const Color = {
  hexToRgb(hex) {
    let h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(h)) h = '2F6BFF';
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },
  hex({ r, g, b }) { return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase(); },
  mix(a, b, t) { return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) }; },
  lum({ r, g, b }) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); },
  contrast(a, b) { const l1 = Color.lum(a), l2 = Color.lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); },
};
const WHITE = { r: 255, g: 255, b: 255 }, BLACK = { r: 0, g: 0, b: 0 };
function themeFor(hex) {
  const c = Color.hexToRgb(hex);
  let text = c, i = 0;
  while (Color.contrast(text, WHITE) < 4.6 && i++ < 24) text = Color.mix(text, BLACK, 0.08);
  return {
    '--brand': Color.hex(c),
    '--brand-rgb': `${c.r}, ${c.g}, ${c.b}`,
    '--brand-50': Color.hex(Color.mix(c, WHITE, 0.93)),
    '--brand-100': Color.hex(Color.mix(c, WHITE, 0.86)),
    '--brand-200': Color.hex(Color.mix(c, WHITE, 0.7)),
    '--brand-300': Color.hex(Color.mix(c, WHITE, 0.45)),
    '--brand-600': Color.hex(Color.mix(c, BLACK, 0.12)),
    '--brand-700': Color.hex(Color.mix(c, BLACK, 0.3)),
    '--brand-text': Color.hex(text),
    '--on-brand': Color.contrast(c, WHITE) >= 2.6 ? '#FFFFFF' : '#1D1D1F',
  };
}
function applyTheme(hex, el = document.documentElement) {
  const t = themeFor(hex);
  for (const k in t) el.style.setProperty(k, t[k]);
  return t;
}

// ---------- sound (synthesized, no files) ----------
const Sound = {
  ctx: null, on: true, master: null,
  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  },
  tone(freq, dur = 0.12, type = 'sine', gain = 0.08, when = 0, attack = 0.006) {
    if (!this.on) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.03);
  },
  tap() { this.tone(900, 0.07, 'sine', 0.045); },
  tick() { this.tone(2400, 0.022, 'triangle', 0.03); },
  select() { this.tone(660, 0.09, 'sine', 0.05); this.tone(990, 0.12, 'sine', 0.035, 0.05); },
  correct() { this.tone(1046.5, 0.16, 'sine', 0.07); this.tone(1568, 0.3, 'sine', 0.06, 0.08); },
  wrong() { this.tone(233, 0.22, 'triangle', 0.08); this.tone(196, 0.3, 'triangle', 0.06, 0.09); },
  win() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.32, 'sine', 0.065, i * 0.085)); this.tone(1318.5, 0.7, 'sine', 0.05, 0.34); },
  count(final) { this.tone(final ? 1318.5 : 784, final ? 0.36 : 0.14, 'sine', 0.07); },
  boost() { [784, 1046.5, 1318.5].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.05, i * 0.06)); },
  whoosh() { this.tone(320, 0.25, 'sine', 0.04); this.tone(480, 0.2, 'sine', 0.03, 0.05); },
};

// ---------- confetti ----------
function burstConfetti(canvas, opts = {}) {
  if (!canvas || REDUCED) return () => {};
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const colors = opts.colors || [css.getPropertyValue('--brand').trim(), css.getPropertyValue('--brand-300').trim(), css.getPropertyValue('--brand-700').trim(), '#FFB340', '#FFFFFF', '#34C759'];
  const N = opts.count || (W < 600 ? 110 : 170);
  const parts = [];
  const ox = opts.x ?? W / 2, oy = opts.y ?? H * 0.42;
  for (let i = 0; i < N; i++) {
    const a = rand(-Math.PI * 0.92, -Math.PI * 0.08), s = rand(7, Math.min(22, H / 38));
    parts.push({ x: ox + rand(-30, 30), y: oy, vx: Math.cos(a) * s * rand(0.6, 1.3), vy: Math.sin(a) * s, w: rand(6, 10), h: rand(9, 15), r: rand(0, 6.3), vr: rand(-0.25, 0.25), c: colors[i % colors.length], circle: Math.random() < 0.28, life: 0, ttl: rand(120, 190), wob: rand(0, 6.3) });
  }
  let raf;
  const step = () => {
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of parts) {
      if (++p.life > p.ttl) continue;
      alive++;
      p.vx *= 0.986; p.vy = p.vy * 0.986 + 0.3; p.x += p.vx + Math.sin(p.life * 0.08 + p.wob) * 0.6; p.y += p.vy; p.r += p.vr;
      ctx.globalAlpha = Math.min(1, (p.ttl - p.life) / 34);
      ctx.fillStyle = p.c;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      if (p.circle) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2.2, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.scale(1, Math.cos(p.life * 0.14 + p.wob)); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      if (p.c === '#FFFFFF') { ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 1; ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (alive) raf = requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
  };
  step();
  return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); };
}

// ---------- brand rendering ----------
function markSVG(brand, cls = 'mark') {
  const inner = brand.mark || `<rect x="1" y="1" width="22" height="22" rx="6.6" fill="var(--brand)"/><text x="12" y="16.4" text-anchor="middle" font-size="13" font-weight="700" fill="var(--on-brand)" font-family="-apple-system, BlinkMacSystemFont, Inter, Helvetica, Arial, sans-serif">${esc(initials(brand.name).slice(0, 1))}</text>`;
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}
function logoHTML(brand, size = '') {
  if (brand.logoImg) return `<span class="logo ${size}"><img src="${brand.logoImg}" alt="${esc(brand.name)}"></span>`;
  const suffix = brand.wordSuffix ? `<span class="word light">${esc(brand.wordSuffix)}</span>` : '';
  return `<span class="logo ${size}" aria-label="${esc(brand.name)}">${markSVG(brand)}<span class="word ${brand.wordClass || ''}">${esc(brand.word || brand.name)}</span>${suffix}</span>`;
}
function resolveText(obj, brand) {
  if (typeof obj === 'string') return obj.split('{brand}').join(brand.name);
  if (Array.isArray(obj)) return obj.map((v) => resolveText(v, brand));
  if (obj && typeof obj === 'object') { const o = {}; for (const k in obj) o[k] = resolveText(obj[k], brand); return o; }
  return obj;
}

// ---------- leaderboards + leads (in memory for this preview) ----------
const SEED_NAMES = ['Ava R.', 'Jordan T.', 'Priya S.', 'Luis M.', 'Hannah K.', 'Dev P.', 'Sam W.', 'Aisha B.', 'Chris O.', 'Elena V.', 'Marcus L.', 'Nora H.'];
const Boards = {
  data: {},
  get(key, seedScores) {
    if (!this.data[key]) {
      const names = shuffle(SEED_NAMES);
      this.data[key] = seedScores.map((score, i) => ({ id: uid(), name: names[i % names.length], score, seed: true })).sort((a, b) => b.score - a.score);
    }
    return this.data[key];
  },
  add(key, entry) { const list = this.data[key]; list.push(entry); list.sort((a, b) => b.score - a.score); return list.indexOf(entry) + 1; },
};
function boardHTML(list, meId, opts = {}) {
  const fmtScore = opts.format || ((s) => fmt(s));
  const meIdx = list.findIndex((e) => e.id === meId);
  const top = Math.min(opts.top || 5, list.length);
  const rows = [];
  const row = (e, i) => `<div class="brow ${e.id === meId ? 'me' : ''}"><span class="rk ${i < 3 ? 'top' : ''}">${i + 1}</span><span class="av">${esc(initials(e.name))}</span><span class="nm">${esc(e.name)}${e.id === meId ? '<small>YOU</small>' : ''}</span><span class="sc">${fmtScore(e.score)}</span></div>`;
  for (let i = 0; i < top; i++) rows.push(row(list[i], i));
  if (meIdx >= top) { if (meIdx > top) rows.push('<div class="brow gap">•••</div>'); rows.push(row(list[meIdx], meIdx)); }
  return `<div class="board"><div class="board-title"><span>${esc(opts.title || 'Today’s leaderboard')}</span>${icon('trophy', 18, 2)}</div>${rows.join('')}</div>`;
}
const Leads = {
  list: [],
  add(lead) { this.list.unshift(lead); emit('leads', lead); if (typeof window.A8_ON_LEAD === 'function') { try { window.A8_ON_LEAD(lead); } catch (e) {} } },
};

// ---------- QR (qrious from cdnjs; falls back to plain text) ----------
function renderQR(canvas, text) {
  const box = canvas && canvas.closest('.qr');
  if (!canvas || !window.QRious) { if (box) box.hidden = true; return false; }
  try { new window.QRious({ element: canvas, value: text, size: 164, level: 'M', foreground: '#1D1D1F', background: '#FFFFFF', padding: 0 }); return true; }
  catch (e) { if (box) box.hidden = true; return false; }
}

// ---------- sheets ----------
function openSheet({ html, cls = '', host = document.body, dismissable = true, onClose, label = 'Dialog' }) {
  const layer = document.createElement('div');
  layer.className = 'sheet-layer';
  layer.innerHTML = `<div class="sheet-backdrop"></div><div class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="sheet-grab"></div>${html}</div>`;
  host.appendChild(layer);
  let closed = false;
  const close = (why) => {
    if (closed) return; closed = true;
    layer.classList.add('out');
    setTimeout(() => layer.remove(), 380);
    if (onClose) onClose(why);
  };
  if (dismissable) layer.querySelector('.sheet-backdrop').addEventListener('click', () => close('backdrop'));
  return { el: layer.querySelector('.sheet'), layer, close };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'hotmail.com'];

function leadSheet(stage, opts) {
  const b = stage.brand, cfg = b.lead || {};
  const fields = cfg.fields || [
    { key: 'firstName', label: 'First name', required: true, half: true, autocomplete: 'given-name' },
    { key: 'lastName', label: 'Last name', half: true, autocomplete: 'family-name' },
    { key: 'email', label: 'Email', type: 'email', required: true },
  ];
  const fieldHTML = (f) => {
    if (f.choices) {
      return `<div class="choice" data-key="${f.key}"><span class="choice-label">${esc(f.label)}${f.required ? '' : ' <span class="opt">(optional)</span>'}</span><div class="choice-chips">${f.choices.map((c) => `<button type="button" aria-pressed="false" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`;
    }
    const type = f.type === 'email' ? 'email' : 'text';
    const im = f.inputmode || (f.type === 'email' ? 'email' : f.type === 'zip' ? 'numeric' : 'text');
    const extra = f.type === 'email' ? 'autocapitalize="off" autocorrect="off" spellcheck="false"' : f.type === 'zip' ? 'maxlength="5" pattern="[0-9]*"' : 'autocapitalize="words"';
    const opt = f.required ? '' : ' <span class="opt">(optional)</span>';
    let h = `<label class="field" data-key="${f.key}"><input id="lf-${f.key}" name="${f.key}" type="${type}" inputmode="${im}" autocomplete="${f.autocomplete || (f.type === 'email' ? 'email' : 'off')}" placeholder=" " ${extra}><span class="flabel">${esc(f.label)}${opt}</span></label>`;
    if (f.type === 'email') h += `<div class="domains" hidden>${DOMAINS.map((d) => `<button type="button" data-d="${d}">@${d}</button>`).join('')}</div>`;
    return h;
  };
  let body = '', i = 0;
  while (i < fields.length) {
    const f = fields[i];
    if (f.half && fields[i + 1] && fields[i + 1].half) { body += `<div class="frow">${fieldHTML(f)}${fieldHTML(fields[i + 1])}</div>`; i += 2; }
    else { body += fieldHTML(f); i += 1; }
  }
  const optLabel = resolveText(cfg.optInLabel || 'Send me news and offers from {brand}', b);
  const fine = `We use your details to send ${esc(opts.sends || 'your result')} and, if you opt in, updates from ${esc(b.name)}. ${esc(b.name)}’s privacy policy applies. Unsubscribe anytime.`;
  const html = `
    <button type="button" class="icon-btn sheet-close" data-leave aria-label="Leave this game">${icon('x', 20)}</button>
    <div class="sheet-head">${opts.tile || ''}<h2>${esc(opts.title)}</h2>${opts.sub ? `<p>${esc(opts.sub)}</p>` : ''}</div>
    <form class="lead-form" novalidate>
      ${body}
      <label class="toggle-row" for="lf-optin"><span>${esc(optLabel)}</span><input id="lf-optin" type="checkbox" class="switch"${cfg.optInDefault ? ' checked' : ''}></label>
      <button class="btn btn-primary btn-block" type="submit">${esc(opts.cta || 'Continue')}${icon('arrow-right', 20, 2.2)}</button>
      ${opts.allowSkip ? '<button type="button" class="btn btn-ghost" data-skip>Skip for now</button>' : ''}
      <p class="fine">${fine}</p>
    </form>`;

  return new Promise((resolve) => {
    stage.$screens.classList.toggle('dim', !!opts.dim);
    const sh = openSheet({ html, host: stage.el, dismissable: false, label: opts.title });
    stage.sheet = sh;
    $('[data-leave]', sh.el).addEventListener('click', () => { Sound.tap(); stage.attract(); });
    const form = $('form', sh.el);
    const email = $('#lf-email', sh.el), doms = $('.domains', sh.el);
    if (email && doms) {
      const sync = () => {
        const v = email.value; const at = v.indexOf('@');
        const show = v.length > 0 && (at === -1 || !v.slice(at + 1).includes('.'));
        doms.hidden = !show;
        if (show && at > -1) { const part = v.slice(at + 1).toLowerCase(); $$('button', doms).forEach((btn) => { btn.hidden = !btn.dataset.d.startsWith(part); }); }
        else $$('button', doms).forEach((btn) => { btn.hidden = false; });
      };
      email.addEventListener('input', sync);
      doms.addEventListener('click', (e) => {
        const btn = e.target.closest('button'); if (!btn) return;
        const local = email.value.split('@')[0];
        email.value = `${local}@${btn.dataset.d}`; Sound.tap(); sync(); email.focus();
        clearErr(email.closest('.field'));
      });
    }
    $$('.choice-chips', sh.el).forEach((wrap) => wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button'); if (!btn) return;
      $$('button', wrap).forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
      Sound.tap();
    }));
    const clearErr = (fieldEl) => { if (!fieldEl) return; fieldEl.classList.remove('invalid'); const n = $('.ferr', fieldEl); if (n) n.remove(); };
    const setErr = (fieldEl, msg) => { fieldEl.classList.add('invalid'); const n = $('.ferr', fieldEl); if (n) n.remove(); fieldEl.insertAdjacentHTML('beforeend', `<span class="ferr" role="alert">${icon('circle-x', 14, 2)}${esc(msg)}</span>`); };
    form.addEventListener('input', (e) => clearErr(e.target.closest('.field')));
    const finish = (lead) => {
      stage.sheet = null; sh.close('done');
      stage.$screens.classList.remove('dim');
      resolve(lead);
    };
    const skip = $('[data-skip]', sh.el);
    if (skip) skip.addEventListener('click', () => { Sound.tap(); finish(null); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {}; let firstBad = null;
      for (const f of fields) {
        if (f.choices) {
          const sel = $(`.choice[data-key="${f.key}"] [aria-pressed="true"]`, sh.el);
          data[f.key] = sel ? sel.dataset.v : '';
          continue;
        }
        const input = $(`#lf-${f.key}`, sh.el), wrap = input.closest('.field');
        const v = input.value.trim(); data[f.key] = v;
        let msg = '';
        if (f.required && !v) msg = `Enter your ${f.label.toLowerCase()}.`;
        else if (v && f.type === 'email' && !EMAIL_RE.test(v)) msg = 'That email looks incomplete. Check for a typo.';
        else if (v && f.type === 'zip' && !/^\d{5}$/.test(v)) msg = 'Use a 5-digit ZIP code.';
        if (msg) { setErr(wrap, msg); firstBad = firstBad || input; } else clearErr(wrap);
      }
      if (firstBad) { Sound.wrong(); firstBad.focus(); return; }
      data.optIn = $('#lf-optin', sh.el).checked;
      Sound.select();
      finish(data);
    });
  });
}

// ---------- stage (one game at a time, full screen) ----------
class Stage {
  constructor(app) {
    this.app = app; this.el = null; this.timers = new Set(); this.intervals = new Set(); this.rafs = new Set();
    this.lastActive = Date.now(); this.sheet = null; this.idleSheet = null; this.mode = 'off';
    this.onKey = (e) => {
      if (e.key !== 'Escape' || this.idleSheet) return;
      if (this.sheet) this.attract(); else this.close();
    };
    this.onActivity = () => { this.lastActive = Date.now(); };
  }
  get kiosk() { return this.app.kiosk; }

  open(gameId) {
    this.app.persist();
    const brand = this.app.brand;
    this.brand = brand; this.gameId = gameId; this.game = GAMES[gameId];
    this.content = resolveText(brand.games[gameId], brand);
    this.products = resolveText(brand.products || {}, brand);
    const el = document.createElement('div');
    el.className = 'stage';
    el.innerHTML = `
      <div class="aura" aria-hidden="true"><i></i><i></i><i></i></div>
      <header class="topbar">
        <div class="tb-left">${logoHTML(brand)}</div>
        <div class="tb-center" aria-live="polite"></div>
        <div class="tb-right">
          <button class="icon-btn" data-act="sound" aria-label="Sound on or off">${icon(Sound.on ? 'volume-2' : 'volume-x', 20)}</button>
          ${document.fullscreenEnabled ? `<button class="icon-btn" data-act="fs" aria-label="Full screen">${icon('maximize', 18)}</button>` : ''}
          <button class="icon-btn" data-act="exit" aria-label="Back to the library">${icon('x', 20)}</button>
        </div>
      </header>
      <div class="screens"></div>
      <div class="toast-host"></div>
      <canvas class="confetti" aria-hidden="true"></canvas>`;
    document.body.appendChild(el);
    document.body.classList.add('stage-open');
    this.el = el; this.$screens = $('.screens', el); this.$top = $('.tb-center', el);
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]'); if (!btn || !el.contains(btn)) return;
      const act = btn.dataset.act;
      if (act === 'sound') { Sound.on = !Sound.on; btn.innerHTML = icon(Sound.on ? 'volume-2' : 'volume-x', 20); if (Sound.on) Sound.tap(); }
      if (act === 'fs') this.toggleFullscreen();
      if (act === 'exit') this.close();
    });
    ['pointerdown', 'keydown', 'touchstart'].forEach((t) => el.addEventListener(t, this.onActivity, { passive: true }));
    document.addEventListener('keydown', this.onKey);
    this.idleLoop = setInterval(() => this.checkIdle(), 1000);
    this.attract();
  }

  close() {
    if (!this.el) return;
    this.clear();
    clearInterval(this.idleLoop);
    document.removeEventListener('keydown', this.onKey);
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    const el = this.el; this.el = null; this.mode = 'off';
    el.style.transition = 'opacity .3s ease'; el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
    document.body.classList.remove('stage-open');
    this.app.onStageClosed();
  }

  toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else (document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen() : Promise.reject()).catch(() => this.toast(`${icon('info', 20)}<span>Full screen isn’t available in this view.</span>`));
    } catch (e) { /* optional */ }
  }

  // tracked async helpers: when the stage resets, pending work simply never resumes
  clear() {
    this.timers.forEach(clearTimeout); this.timers.clear();
    this.intervals.forEach(clearInterval); this.intervals.clear();
    this.rafs.forEach(cancelAnimationFrame); this.rafs.clear();
    if (this.stopConfetti) { this.stopConfetti(); this.stopConfetti = null; }
    if (this.sheet) { this.sheet.close('reset'); this.sheet = null; }
    if (this.idleSheet) { this.idleSheet.close('reset'); this.idleSheet = null; }
    if (this.$screens) this.$screens.classList.remove('dim');
    if (this.game && this.game.cleanup) this.game.cleanup(this);
    this.epoch = (this.epoch || 0) + 1;
  }
  after(ms, fn) { const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms); this.timers.add(id); return id; }
  every(ms, fn) { const id = setInterval(fn, ms); this.intervals.add(id); return id; }
  stopEvery(id) { clearInterval(id); this.intervals.delete(id); }
  wait(ms) { return new Promise((r) => this.after(ms, r)); }
  frame(fn) { const id = requestAnimationFrame((t) => { this.rafs.delete(id); fn(t); }); this.rafs.add(id); return id; }
  tween(ms, fn, ease = easeOutCubic) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = (now) => { const t = clamp((now - t0) / ms, 0, 1); fn(ease(t), t); if (t < 1) this.frame(step); else resolve(); };
      this.frame(step);
    });
  }
  live(epoch) { return this.el && this.epoch === epoch; }

  screen(html, cls = '', after = '') {
    const host = this.$screens;
    const old = $$('.screen', host).filter((s) => !s.classList.contains('leave'));
    const el = document.createElement('section');
    el.className = `screen ${cls}`;
    el.innerHTML = `<div class="inner">${html}</div>${after}`;
    const born = performance.now();
    el.addEventListener('click', (e) => { if (performance.now() - born < 340) { e.stopPropagation(); e.preventDefault(); } }, true);
    host.appendChild(el);
    void el.offsetWidth;
    el.classList.add('active');
    old.forEach((o) => { o.classList.remove('active'); o.classList.add('leave'); setTimeout(() => o.remove(), 450); });
    return el;
  }
  top(html) { if (this.$top) this.$top.innerHTML = html; }
  capsules(i, n) { this.top(`<div class="capsules" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${i}">${Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join('')}</div>`); }

  toast(html, ms = 2400) {
    const host = $('.toast-host', this.el); if (!host) return;
    host.innerHTML = '';
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; host.appendChild(t);
    this.after(ms, () => { t.classList.add('out'); this.after(360, () => t.remove()); });
  }
  floater(text, anchor, color) {
    if (!anchor || !this.el) return;
    const r = anchor.getBoundingClientRect(), sr = this.el.getBoundingClientRect();
    const f = document.createElement('div'); f.className = 'floater'; f.textContent = text;
    if (color) f.style.color = color;
    f.style.left = `${r.left - sr.left + r.width / 2}px`; f.style.top = `${r.top - sr.top - 6}px`;
    this.el.appendChild(f); setTimeout(() => f.remove(), 1200);
  }
  confetti(opts) { if (this.stopConfetti) this.stopConfetti(); this.stopConfetti = burstConfetti($('canvas.confetti', this.el), opts); }

  async countdown() {
    const ep = this.epoch;
    for (const n of ['3', '2', '1']) {
      if (!this.live(ep)) return;
      this.screen(`<div class="countdown"><b>${n}</b></div>`, 'quick');
      Sound.count(false);
      await this.wait(760);
    }
    if (!this.live(ep)) return;
    this.screen(`<div class="countdown"><b class="go">Go</b></div>`, 'quick');
    Sound.count(true);
    await this.wait(520);
  }

  // ----- flow -----
  attract() {
    this.clear(); this.mode = 'attract'; this.top('');
    this.el.classList.remove('quiet');
    const c = this.content, g = this.game, b = this.brand;
    const meta = (c.meta || []).map((m) => `<span>${icon(m.icon, 18, 2)}${esc(m.text)}</span>`).join('');
    const prize = c.prize ? `<div class="prize-line">${ptile(c.prize.icon || 'gift', c.prize.color || 'var(--brand)', 30)}${esc(c.prize.text)}</div>` : '';
    const el = this.screen(`
      <div class="attract">
        <div class="attract-copy">
          <div class="eyebrow">${esc(c.eyebrow)}</div>
          <h1 class="t-hero">${esc(c.title)}</h1>
          <p class="t-sub">${esc(c.subtitle)}</p>
          ${prize}
          <div class="attract-cta"><button class="btn btn-primary btn-xl" data-start>${esc(c.cta || 'Start')}${icon('arrow-right', 22, 2.2)}</button></div>
          <div class="meta-row">${meta}</div>
        </div>
        <div class="attract-art">${g.art(this)}</div>
      </div>`, 'is-attract', '<div class="powered">Powered by <b>Activate8</b></div>');
    $('[data-start]', el).addEventListener('click', () => { Sound.ensure(); Sound.select(); this.play(); });
    if (g.afterArt) g.afterArt(this, el);
  }
  play() {
    this.clear(); this.mode = 'play'; this.lastActive = Date.now();
    this.el.classList.add('quiet');
    this.game.play(this);
  }
  lead(opts) {
    this.mode = 'lead';
    return leadSheet(this, opts).then((data) => { this.mode = 'play'; return data; });
  }
  saveLead(data, extra) {
    if (!data) return null;
    const lead = { id: uid(), ts: new Date().toISOString(), brand: this.brand.name, game: this.game.name, ...data, ...extra };
    Leads.add(lead);
    return lead;
  }
  code() { return `${this.brand.code || 'A8'}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }
  takeHome(title, sub, code) {
    const url = `${(this.brand.url || 'https://activate.requisor.io').replace(/\/$/, '')}/?r=${code}`;
    return `<div class="takehome"><div class="qr"><canvas data-qr="${esc(url)}" width="164" height="164"></canvas></div><div><b>${esc(title)}</b><span>${esc(sub)}</span><code>${esc(url.replace(/^https?:\/\//, ''))}</code></div></div>`;
  }
  mountQR(root) { $$('canvas[data-qr]', root).forEach((cv) => renderQR(cv, cv.dataset.qr)); }
  resultActions(primary = 'Done') {
    return `<div class="result-actions">
      <button class="btn btn-secondary btn-lg" data-again>${icon('rotate-ccw', 20, 2)}Play again</button>
      <button class="btn btn-primary btn-lg" data-done>${esc(primary)}</button>
    </div>
    <div class="reset-note" data-reset ${this.kiosk ? '' : 'hidden'}><span class="mini-ring"></span><span data-reset-text>Back to the start in 30s</span><button type="button" data-stay>Stay here</button></div>`;
  }
  bindResult(el) {
    this.mode = 'result';
    this.mountQR(el);
    $('[data-again]', el).addEventListener('click', () => { Sound.tap(); this.play(); });
    $('[data-done]', el).addEventListener('click', () => { Sound.tap(); this.attract(); });
    const note = $('[data-reset]', el);
    if (this.kiosk && note) {
      const total = 30; let left = total;
      const ring = $('.mini-ring', note), txt = $('[data-reset-text]', note);
      const id = this.every(1000, () => {
        left -= 1;
        ring.style.setProperty('--p', String(left / total));
        txt.textContent = `Back to the start in ${left}s`;
        if (left <= 0) { this.stopEvery(id); this.attract(); }
      });
      $('[data-stay]', note).addEventListener('click', () => { this.stopEvery(id); this.mode = 'hold'; this.lastActive = Date.now(); note.innerHTML = `${icon('check', 16, 2.4)}<span>Paused. Resets after 75 seconds without a tap.</span>`; });
    }
  }
  checkIdle() {
    if (!this.el || !this.kiosk || this.idleSheet) return;
    if (this.mode !== 'play' && this.mode !== 'lead' && this.mode !== 'hold') return;
    if (Date.now() - this.lastActive < 75000) return;
    let left = 10;
    const sh = openSheet({
      host: this.el, dismissable: false, label: 'Still playing?',
      html: `<div class="sheet-head"><div class="idle-ring" style="--p:1"><b>${left}</b></div><h2>Still playing?</h2><p>This game resets for the next player when the timer runs out.</p></div><button class="btn btn-primary btn-block btn-lg" data-keep>Keep playing</button>`,
    });
    this.idleSheet = sh;
    const ring = $('.idle-ring', sh.el), num = $('b', ring);
    const id = setInterval(() => {
      left -= 1; ring.style.setProperty('--p', String(left / 10)); num.textContent = left;
      if (left <= 0) { clearInterval(id); this.idleSheet = null; sh.close(); this.attract(); }
    }, 1000);
    $('[data-keep]', sh.el).addEventListener('click', () => { clearInterval(id); this.idleSheet = null; this.lastActive = Date.now(); sh.close(); Sound.tap(); });
  }
}

// Shared quiz helper: renders answers, resolves {index, correct} after feedback.
function answersHTML(options, cls = '') {
  return `<div class="answers ${cls}">${options.map((o, i) => `<button class="answer" data-i="${i}" style="animation-delay:${80 + i * 60}ms"><span class="key">${'ABCD'[i]}</span><span>${esc(o)}</span><span class="mark"></span></button>`).join('')}</div>`;
}
function bindAnswers(stage, root, correctIndex, onPick) {
  const wrap = $('.answers', root);
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.answer'); if (!btn || wrap.classList.contains('locked')) return;
    wrap.classList.add('locked');
    const i = Number(btn.dataset.i), ok = i === correctIndex;
    const right = $(`.answer[data-i="${correctIndex}"]`, wrap);
    right.classList.add('correct'); $('.mark', right).innerHTML = icon('check', 18, 3);
    if (!ok) { btn.classList.add('wrong'); $('.mark', btn).innerHTML = icon('x', 18, 3); Sound.wrong(); }
    else Sound.correct();
    onPick(i, ok, btn);
  });
}

const GAMES = {};
