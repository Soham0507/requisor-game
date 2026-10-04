/* ---------- Game 3: The Number (keynote-style stat guessing on a dial) ---------- */

// A tactile ruler dial: drag or flick the tape under a fixed needle.
class Dial {
  constructor(root, { min, max, step, value, onChange, onTick }) {
    Object.assign(this, { root, min, max, step, value, onChange, onTick });
    this.canvas = $('canvas', root);
    this.ctx = this.canvas.getContext('2d');
    this.dec = decimalsOf(step);
    const steps = (max - min) / step;
    this.px = clamp(2200 / steps, 7, 24);
    const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
    this.major = nice.find((n) => n * this.px >= 84) || 1000;
    this.v = 0; this.drag = null; this.anim = null; this.lastStep = this.snap(value);
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.bind(); this.resize();
  }
  snap(v) { return Number((Math.round((v - this.min) / this.step) * this.step + this.min).toFixed(this.dec)); }
  set(v, fromUser = true) {
    this.value = clamp(v, this.min, this.max);
    const s = this.snap(this.value);
    if (s !== this.lastStep) { this.lastStep = s; if (fromUser && this.onTick) this.onTick(); this.onChange(s); }
    this.draw();
  }
  get snapped() { return this.snap(this.value); }
  resize() {
    const r = this.root.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }
  draw() {
    const { ctx, w, h, px, step, min, max } = this;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, first = Math.max(0, Math.floor((this.value - min) / step - cx / px) - 1);
    const last = Math.min(Math.round((max - min) / step), Math.ceil((this.value - min) / step + cx / px) + 1);
    const base = h * 0.66;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `600 13px -apple-system, BlinkMacSystemFont, Inter, Helvetica, Arial, sans-serif`;
    const mUnit = this.major * step, onGrid = (v, u) => Math.abs(v / u - Math.round(v / u)) < 1e-6;
    for (let i = first; i <= last; i++) {
      const v = min + i * step, x = cx + (v - this.value) / step * px;
      const isMajor = onGrid(v, mUnit), isMid = !isMajor && this.major % 2 === 0 && onGrid(v, mUnit / 2);
      const len = isMajor ? 30 : isMid ? 20 : 12;
      ctx.fillStyle = isMajor ? 'rgba(29,29,31,.62)' : 'rgba(29,29,31,.24)';
      const bw = isMajor ? 2 : 1.4;
      ctx.fillRect(Math.round(x - bw / 2), base - len, bw, len);
      if (isMajor) { ctx.fillStyle = 'rgba(29,29,31,.5)'; ctx.fillText(fmt(Number(v.toFixed(this.dec)), this.dec), x, base + 20); }
    }
  }
  bind() {
    const el = this.root;
    el.addEventListener('pointerdown', (e) => {
      cancelAnimationFrame(this.anim); el.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, t: performance.now(), v: 0 };
      this.root.classList.add('touched');
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const now = performance.now(), dx = e.clientX - this.drag.x, dt = Math.max(1, now - this.drag.t);
      this.drag.v = 0.8 * (dx / dt) + 0.2 * this.drag.v;
      this.drag.x = e.clientX; this.drag.t = now;
      this.set(this.value - (dx / this.px) * this.step);
    });
    const release = () => {
      if (!this.drag) return;
      let v = this.drag.v; this.drag = null;
      let prev = performance.now();
      const glide = (now) => {
        const dt = now - prev; prev = now;
        v *= Math.pow(0.94, dt / 16);
        this.set(this.value - (v * dt / this.px) * this.step);
        if (Math.abs(v) > 0.02 && this.value > this.min && this.value < this.max) this.anim = requestAnimationFrame(glide);
        else this.settle();
      };
      if (Math.abs(v) > 0.05) this.anim = requestAnimationFrame(glide); else this.settle();
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('keydown', (e) => {
      const k = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -this.major, PageUp: this.major }[e.key];
      if (k) { e.preventDefault(); this.nudge(k); }
    });
  }
  settle() {
    const from = this.value, to = this.snapped, t0 = performance.now();
    const go = (now) => { const k = clamp((now - t0) / 180, 0, 1); this.set(lerp(from, to, easeOutCubic(k)), false); if (k < 1) this.anim = requestAnimationFrame(go); };
    this.anim = requestAnimationFrame(go);
  }
  nudge(n) { cancelAnimationFrame(this.anim); this.set(this.snapped + n * this.step); this.settle(); }
  destroy() { cancelAnimationFrame(this.anim); window.removeEventListener('resize', this.resize); }
}

GAMES.number = {
  id: 'number', name: 'The Number',
  tile: {
    kind: 'Estimation game', title: 'The Number',
    blurb: 'Players guess the stats behind the brand on a tactile dial. Then the real number lands, keynote style, with the story behind it.',
    chips: [['target', '5 rounds'], ['gauge', 'Your proof points'], ['trophy', 'Closest wins']],
  },
  art(stage) {
    const n = stage.content.rounds.length;
    return `<div class="n-art" aria-hidden="true"><div class="big" data-roll>000</div><div class="cap">${n} numbers. One dial. How close can you get?</div><div class="tape"></div></div>`;
  },
  afterArt(stage, el) {
    const roll = $('[data-roll]', el); if (!roll) return;
    const rounds = stage.content.rounds;
    let k = 0;
    const next = () => {
      const r = rounds[k++ % rounds.length], dec = decimalsOf(r.step);
      // a plausible value from the range that is never the real answer
      let v; do { v = r.min + Math.round(Math.random() * ((r.max - r.min) / r.step)) * r.step; } while (Math.abs(v - r.answer) < r.step * 2);
      roll.style.opacity = '0'; roll.style.transform = 'translateY(14px)';
      stage.after(260, () => { roll.textContent = fmt(Number(v.toFixed(dec)), dec); roll.style.opacity = '1'; roll.style.transform = 'none'; });
    };
    roll.style.transition = 'opacity .26s ease, transform .5s var(--ease)';
    next(); stage.every(1900, next);
  },
  cleanup(stage) { if (stage._dial) { stage._dial.destroy(); stage._dial = null; } },
  async play(stage) {
    const c = stage.content, ep = stage.epoch, rounds = c.rounds;
    const results = [];
    for (let r = 0; r < rounds.length; r++) {
      const R = rounds[r], dec = decimalsOf(R.step), f = (v) => fmt(v, dec);
      stage.capsules(r, rounds.length);
      const el = stage.screen(`
        <div class="n-round">
          <div class="eyebrow">Round ${r + 1} of ${rounds.length}</div>
          <h2 class="n-prompt">${esc(R.prompt)}</h2>
          <div class="n-read"><div class="big" data-read>${f(R.start)}</div><div class="unit">${esc(R.unit)}</div></div>
          <div class="dial-wrap">
            <button class="step-btn" data-n="-1" aria-label="Lower">${icon('minus', 22, 2.4)}</button>
            <div class="dial" tabindex="0" role="slider" aria-label="Your guess" aria-valuemin="${R.min}" aria-valuemax="${R.max}" aria-valuenow="${R.start}"><canvas></canvas><div class="needle"></div><div class="hint">Drag the dial to set your guess</div></div>
            <button class="step-btn" data-n="1" aria-label="Higher">${icon('plus', 22, 2.4)}</button>
          </div>
          <button class="btn btn-primary btn-lg" data-lock>${icon('lock', 20, 2)}Lock it in</button>
        </div>`);
      const read = $('[data-read]', el), dialEl = $('.dial', el);
      let lastTick = 0;
      const dial = new Dial(dialEl, {
        min: R.min, max: R.max, step: R.step, value: R.start,
        onChange: (v) => { read.textContent = f(v); dialEl.setAttribute('aria-valuenow', v); $('.hint', dialEl).style.opacity = '0'; },
        onTick: () => { const now = performance.now(); if (now - lastTick > 34) { Sound.tick(); lastTick = now; } },
      });
      stage._dial = dial;
      $$('[data-n]', el).forEach((b) => {
        let hold;
        const go = () => dial.nudge(Number(b.dataset.n));
        b.addEventListener('pointerdown', () => { go(); Sound.tick(); hold = setInterval(() => { go(); Sound.tick(); }, 110); stage.intervals.add(hold); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => b.addEventListener(t, () => clearInterval(hold)));
      });
      const guess = await new Promise((res) => $('[data-lock]', el).addEventListener('click', () => res(dial.snapped), { once: true }));
      if (!stage.live(ep)) return;
      dial.destroy(); stage._dial = null;
      Sound.select();

      const range = R.max - R.min, diff = Math.abs(guess - R.answer), ratio = diff / range;
      const pts = Math.round(1000 * Math.exp(-3.5 * ratio));
      const verdict = ratio <= 0.02 ? 'Nailed it.' : ratio <= 0.08 ? 'So close.' : ratio <= 0.2 ? 'Not bad.' : 'Now you know.';
      results.push({ prompt: R.prompt, guess, answer: R.answer, pts, ratio });
      const pos = (v) => `${((v - R.min) / range) * 100}%`;
      const rv = stage.screen(`
        <div class="n-round">
          <div class="eyebrow">Round ${r + 1} of ${rounds.length}</div>
          <h2 class="n-prompt">${esc(R.prompt)}</h2>
          <div class="n-compare">
            <div class="col you"><span>Your guess</span><b>${f(guess)}</b></div>
            <div class="col real"><span>The number</span><b data-count>${f(R.min)}</b></div>
          </div>
          <div class="unit" style="color:var(--ink-2);font-weight:600">${esc(R.unit)}</div>
          <div class="n-scale">
            <div class="n-track"><div class="n-gap" style="left:${pos(Math.min(guess, R.min))};width:0"></div><div class="n-dot you" style="left:${pos(guess)}"></div><div class="n-dot real" style="left:${pos(R.min)}"></div></div>
            <div class="n-ends"><span>${f(R.min)}</span><span>${f(R.max)}</span></div>
          </div>
          <div class="n-verdict" style="visibility:hidden"><div class="pts">+${fmt(pts)}</div><div class="t-headline">${verdict}</div><p class="ctx">${esc(R.context)}</p></div>
          <button class="btn btn-primary btn-lg" data-next style="visibility:hidden">${r + 1 < rounds.length ? 'Next round' : 'See my score'}${icon('arrow-right', 20, 2.2)}</button>
        </div>`);
      const cnt = $('[data-count]', rv), dot = $('.n-dot.real', rv), gap = $('.n-gap', rv);
      await stage.wait(350);
      if (!stage.live(ep)) return;
      let lastShown = null;
      await stage.tween(1500, (k) => {
        const v = R.min + (R.answer - R.min) * k;
        const shown = f(Number((Math.round(v / R.step) * R.step).toFixed(dec)));
        if (shown !== lastShown) { cnt.textContent = shown; lastShown = shown; }
        dot.style.transition = 'none'; dot.style.left = pos(v);
        const a = Math.min(guess, v), b = Math.max(guess, v);
        gap.style.transition = 'none'; gap.style.left = pos(a); gap.style.width = `${((b - a) / range) * 100}%`;
      }, easeOutQuint);
      if (!stage.live(ep)) return;
      cnt.textContent = f(R.answer);
      $('.n-verdict', rv).style.visibility = 'visible';
      $('.n-verdict', rv).style.animation = 'pop-in .5s var(--spring)';
      if (pts >= 700) Sound.correct(); else Sound.select();
      stage.floater(`+${fmt(pts)}`, $('.n-compare', rv));
      const next = $('[data-next]', rv);
      await stage.wait(500);
      if (!stage.live(ep)) return;
      next.style.visibility = 'visible'; next.style.animation = 'pop-in .45s var(--spring)';
      await new Promise((res) => next.addEventListener('click', res, { once: true }));
      if (!stage.live(ep)) return;
      Sound.tap();
    }

    stage.top('');
    const total = results.reduce((s, x) => s + x.pts, 0);
    const accuracy = Math.round(results.reduce((s, x) => s + (1 - Math.min(1, x.ratio)), 0) / results.length * 100);
    const data = await stage.lead({ ...c.lead, allowSkip: true, tile: ptile('target', 'var(--brand)', 56) });
    if (!stage.live(ep)) return;
    const code = stage.code();
    const lead = stage.saveLead(data, { result: `${accuracy}% accuracy`, score: total, code });
    const key = `${stage.brand.id}:number`;
    const list = Boards.get(key, c.seed || []);
    let rank = null, meId = null;
    if (lead) { const me = { id: uid(), name: `${lead.firstName} ${lead.lastName ? lead.lastName[0] + '.' : ''}`.trim(), score: total }; meId = me.id; rank = Boards.add(key, me); }
    const el = stage.screen(`
      <div class="result split">
        <div class="result-main">
          <div class="result-head">
            <div class="eyebrow">${lead ? `Sharp eye, ${esc(lead.firstName)}.` : 'Sharp eye.'}</div>
            <div class="result-score" data-count>0<small>/ ${fmt(rounds.length * 1000)}</small></div>
            <p class="t-sub">${rank ? (rank === 1 ? 'Closest guesser today. So far.' : `You’re #${rank} of ${list.length} players today.`) : `${accuracy}% accurate across ${rounds.length} rounds.`}</p>
          </div>
          <div class="stats" style="--n:3">
            <div class="stat"><b>${accuracy}%</b><span>Accuracy</span></div>
            <div class="stat"><b>+${fmt(Math.max(...results.map((x) => x.pts)))}</b><span>Best round</span></div>
            <div class="stat"><b>${results.filter((x) => x.ratio <= 0.02).length}</b><span>Bullseyes</span></div>
          </div>
          ${stage.takeHome(c.takeHome.title, c.takeHome.sub, code)}
          ${stage.resultActions()}
        </div>
        <div class="result-side">
          ${boardHTML(list, meId, { top: 3 })}
          <div class="board rounds-card"><div class="board-title">Your guesses vs. the numbers</div>
            <div class="rounds-mini">${results.map((x, i) => `<div><span>${fmt(x.guess, decimalsOf(rounds[i].step))} vs <b style="color:var(--brand-text)">${fmt(x.answer, decimalsOf(rounds[i].step))}</b> ${esc(rounds[i].unit)}</span><span class="bar"><i style="width:${x.pts / 10}%"></i></span><b>${fmt(x.pts)}</b></div>`).join('')}</div>
          </div>
        </div>
      </div>`);
    const counter = $('[data-count]', el);
    stage.tween(1200, (k) => { counter.firstChild.nodeValue = fmt(Math.round(total * k)); });
    if (rank && rank <= 3) { Sound.win(); stage.confetti(); } else Sound.correct();
    stage.bindResult(el);
  },
};
