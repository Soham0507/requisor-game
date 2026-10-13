/* ---------- Game 4: Spin to Win (quiz answers grow the top prizes) ---------- */
const TIER_ORDER = ['grand', 'major', 'minor', 'none'];
const polar = (cx, cy, r, deg) => { const t = (deg * Math.PI) / 180; return [cx + r * Math.sin(t), cy - r * Math.cos(t)]; };
function wheelGeometry(weights) {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let a = 0;
  return weights.map((w) => { const s = a; a += (w / total) * 360; return { s, e: a, m: (s + a) / 2, w: a - s, p: w / total }; });
}
function wedgePath(cx, cy, r, s, e) {
  const [x1, y1] = polar(cx, cy, r, s), [x2, y2] = polar(cx, cy, r, e);
  return `M${cx} ${cy}L${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
}
// With a brand logo, every wedge shows it (not a per-prize icon). The logo sits
// in a fixed-size white tile that is only shrunk when a wedge is too narrow to
// hold it, so it always fits inside its own section.
function segsSVG(prizes, weights, logo) {
  const geo = wheelGeometry(weights);
  let alt = 0;
  const wedges = geo.map((g, i) => {
    const t = prizes[i].tier;
    const fill = t === 'grand' ? 'var(--brand)' : t === 'major' ? 'var(--brand-200)' : t === 'none' ? '#ECECF0' : (alt++ % 2 ? 'var(--brand-50)' : '#FFFFFF');
    const ink = t === 'grand' ? 'var(--on-brand)' : t === 'major' ? 'var(--brand-700)' : t === 'none' ? '#8E8E93' : 'var(--brand-text)';
    const sz = g.w < 13 ? 18 : 28;
    const [ix, iy] = polar(200, 200, 128, g.m);
    if (logo) {
      const chord = 2 * 128 * Math.sin((g.w * Math.PI) / 360);
      const box = Math.max(14, Math.min(44, chord * 0.82));
      return `<path d="${wedgePath(200, 200, 184, g.s, g.e)}" fill="${fill}" stroke="#fff" stroke-width="2.5"/>` +
        `<g transform="translate(${ix.toFixed(2)} ${iy.toFixed(2)}) rotate(${g.m.toFixed(2)})"><image href="${logo}" x="${-box / 2}" y="${-box / 2}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet"/></g>`;
    }
    return `<path d="${wedgePath(200, 200, 184, g.s, g.e)}" fill="${fill}" stroke="#fff" stroke-width="2.5"/>` +
      `<g transform="translate(${ix.toFixed(2)} ${iy.toFixed(2)}) rotate(${g.m.toFixed(2)}) translate(${-sz / 2} ${-sz / 2}) scale(${sz / 24})" stroke="${ink}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[prizes[i].icon] || ''}</g>`;
  }).join('');
  const pegs = geo.map((g) => { const [x, y] = polar(200, 200, 191.5, g.s); return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.6" fill="#fff" stroke="rgba(0,0,0,.12)" stroke-width="1"/>`; }).join('');
  return wedges + pegs;
}
function wheelMarkup(prizes, weights, logo) {
  const id = uid();
  return `<svg class="wheel wheel-base" viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="200" r="199" fill="#fff"/><circle cx="200" cy="200" r="198.5" fill="none" stroke="rgba(0,0,0,.07)"/></svg>` +
    `<svg class="wheel wheel-spin" viewBox="0 0 400 400" aria-hidden="true"><g class="segs">${segsSVG(prizes, weights, logo)}</g></svg>` +
    `<svg class="wheel wheel-gloss" viewBox="0 0 400 400" aria-hidden="true"><defs><radialGradient id="wg${id}" cx="34%" cy="22%" r="78%"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="200" cy="200" r="184" fill="url(#wg${id})"/></svg>`;
}
const WHEEL_POINTER = '<svg class="wheel-pointer" viewBox="0 0 44 54" aria-hidden="true"><path d="M22 52C18.5 44.5 6 31.5 6 20.5a16 16 0 1 1 32 0C38 31.5 25.5 44.5 22 52Z" fill="#1D1D1F"/><circle cx="22" cy="20.5" r="6.5" fill="#fff"/></svg>';
const hubInner = (brand) => (brand.logoImg ? `<img src="${brand.logoImg}" alt="">` : markSVG(brand));

GAMES.spin = {
  id: 'spin', name: 'Spin to Win',
  tile: {
    kind: 'Prize wheel', title: 'Spin to Win',
    blurb: 'Three quick questions power up the wheel. Right answers grow the top prizes, so knowing the brand pays off.',
    chips: [['zap', 'Quiz boosts'], ['ticket', 'Prize codes'], ['sliders-horizontal', 'Odds you control']],
  },
  art(stage) {
    const P = stage.content.prizes;
    return `<div class="s-art" aria-hidden="true"><div class="wheel-box" style="--wsz:clamp(260px, 34vw, 430px)">${wheelMarkup(P, P.map((p) => p.weight), stage.brand.logoImg)}${WHEEL_POINTER}<div class="wheel-hub">${hubInner(stage.brand)}</div></div></div>`;
  },
  cleanup(stage) { if (stage._fit) { window.removeEventListener('resize', stage._fit); stage._fit = null; } },
  play(stage) {
    const c = stage.content, prizes = c.prizes, ep = stage.epoch;
    const base = prizes.map((p) => p.weight);
    let weights = base.slice(), boosts = 0, rot = 0, spinning = false, ready = false;
    const qs = c.questions.map((q) => { const o = shuffle(q.options.map((_, i) => i)); return { q: q.q, options: o.map((i) => q.options[i]), answer: o.indexOf(q.answer) }; });
    stage.top(`<div class="hud-pill">${icon('zap', 18, 2.2)}<span data-b>0</span><small>of 3 boosts</small></div>`);

    const el = stage.screen(`
      <div class="s-layout">
        <div class="wheel-box" data-wheel>${wheelMarkup(prizes, weights, stage.brand.logoImg)}${WHEEL_POINTER}<button class="wheel-hub" data-hub disabled aria-label="Spin">${hubInner(stage.brand)}</button></div>
        <div class="s-panel" data-panel></div>
      </div>`);
    const box = $('[data-wheel]', el), segs = $('.segs', box), spinSvg = $('.wheel-spin', box), pointer = $('.wheel-pointer', box), hub = $('[data-hub]', box), panel = $('[data-panel]', el);
    const fit = () => {
      const W = stage.el.clientWidth, H = stage.el.clientHeight;
      const wide = W > 900 && W / H > 1.05;
      const s = wide ? Math.min(H - 190, W * 0.42, 560) : Math.min(W - 56, H * (W <= 640 ? 0.335 : 0.42), 440);
      box.style.setProperty('--wsz', `${Math.round(Math.max(220, s))}px`);
    };
    fit(); stage._fit = fit; window.addEventListener('resize', fit);

    const odds = (ws) => { const t = ws.reduce((a, b) => a + b, 0); return ws.map((w) => (w / t) * 100); };
    const topOdds = (ws) => { const o = odds(ws); return prizes.reduce((s, p, i) => s + (p.tier === 'grand' || p.tier === 'major' ? o[i] : 0), 0); };
    const setRot = (d) => { rot = d; spinSvg.style.transform = `rotate(${d.toFixed(3)}deg)`; };
    const redraw = () => { segs.innerHTML = segsSVG(prizes, weights, stage.brand.logoImg); };

    const growWheel = async () => {
      const from = weights.slice();
      const to = weights.map((w, i) => (prizes[i].tier === 'grand' ? w * 1.8 : prizes[i].tier === 'major' ? w * 1.35 : w));
      const strip = $('[data-top]', panel);
      await stage.tween(800, (k) => {
        weights = from.map((w, i) => lerp(w, to[i], k)); redraw();
        if (strip) strip.textContent = `${Math.round(topOdds(weights))}%`;
      }, easeOutCubic);
    };

    const ask = (k) => {
      const q = qs[k];
      panel.innerHTML = `
        <div class="boost-meter"><div class="bolts">${[0, 1, 2].map((i) => `<span class="bolt ${i < boosts ? 'on' : ''}">${icon('zap', 18, 2.2)}</span>`).join('')}</div><span>Question ${k + 1} of 3</span></div>
        <h2 class="qtext">${esc(q.q)}</h2>
        ${answersHTML(q.options, 'one')}
        <div class="odds-head" style="padding:0 4px"><span>Odds of a top prize</span><span class="pill brand" data-top>${Math.round(topOdds(weights))}%</span></div>`;
      panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = 'pop-in .5s var(--ease)';
      bindAnswers(stage, panel, q.answer, async (i, ok) => {
        if (ok) {
          boosts++;
          $('[data-b]', stage.$top).textContent = boosts;
          const bolt = $$('.bolt', panel)[boosts - 1]; if (bolt) bolt.classList.add('on');
          Sound.boost();
          stage.toast(`${ptile('zap', '#FF9F0A', 34)}<span><b>Boost.</b> The top prizes just grew.</span>`, 1800);
          await growWheel();
        }
        await stage.wait(ok ? 600 : 1200);
        if (k + 1 < qs.length) ask(k + 1); else armSpin();
      });
    };

    const legend = (won = -1) => {
      const o = odds(weights), b = odds(base);
      const idx = prizes.map((_, i) => i).sort((x, y) => TIER_ORDER.indexOf(prizes[x].tier) - TIER_ORDER.indexOf(prizes[y].tier) || o[y] - o[x]);
      return `<div class="odds"><div class="odds-head"><span>Prize</span><span>Your odds</span></div>${idx.map((i) => {
        const p = prizes[i], up = o[i] - b[i] > 0.5;
        const tile = p.tier === 'grand' ? ptile(p.icon, 'var(--brand)', 32) : `<span class="ptile soft" style="--s:32px">${icon(p.icon, 24, 1.9)}</span>`;
        return `<div class="odds-row ${up ? 'up' : ''} ${i === won ? 'won' : ''}" data-i="${i}">${tile}<span class="nm">${esc(p.label)}</span><span class="pc">${up ? `<s style="opacity:.45;font-weight:500">${Math.round(b[i])}%</s> ` : ''}${Math.round(o[i])}%</span></div>`;
      }).join('')}</div>`;
    };

    const armSpin = () => {
      ready = true;
      box.classList.add('ready'); hub.disabled = false;
      hub.innerHTML = '<span class="go">SPIN</span>';
      const head = boosts === 3 ? 'Fully boosted. Time to spin.' : boosts ? 'Boosted. Time to spin.' : 'Your wheel is ready.';
      panel.innerHTML = `
        <div class="boost-meter"><div class="bolts">${[0, 1, 2].map((i) => `<span class="bolt ${i < boosts ? 'on' : ''}">${icon('zap', 18, 2.2)}</span>`).join('')}</div><span>${boosts} of 3 boosts earned</span></div>
        <h2 class="qtext">${head}</h2>
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap" class="spin-cta"><button class="btn btn-primary btn-xl" data-spin>${icon('rotate-ccw', 22, 2.2)}Spin the wheel</button><span class="t-foot">or flick the wheel</span></div>
        ${legend()}`;
      panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = 'pop-in .5s var(--ease)';
      $('[data-spin]', panel).addEventListener('click', () => spin(1));
    };
    hub.addEventListener('click', () => { if (ready && !spinning) spin(1); });

    // Flick to spin
    let drag = null;
    const angleOf = (e) => { const r = box.getBoundingClientRect(); return (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI; };
    box.addEventListener('pointerdown', (e) => {
      if (!ready || spinning || e.target.closest('[data-hub]')) return;
      box.setPointerCapture(e.pointerId);
      drag = { a: angleOf(e), t: performance.now(), v: 0, moved: 0 };
    });
    box.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const a = angleOf(e), now = performance.now();
      let da = a - drag.a; if (da > 180) da -= 360; if (da < -180) da += 360;
      const dt = Math.max(1, now - drag.t);
      drag.v = 0.7 * (da / dt) + 0.3 * drag.v; drag.a = a; drag.t = now; drag.moved += Math.abs(da);
      setRot(rot + da);
    });
    const release = () => { if (!drag) return; const d = drag; drag = null; if (Math.abs(d.v) > 0.18 || d.moved > 40) spin(d.v < 0 ? -1 : 1); };
    box.addEventListener('pointerup', release); box.addEventListener('pointercancel', release);

    const segAt = (deg) => { const phi = (((360 - (deg % 360)) % 360) + 360) % 360; return wheelGeometry(weights).findIndex((g) => phi >= g.s && phi < g.e); };
    const pick = () => { const t = weights.reduce((a, b) => a + b, 0); let r = Math.random() * t; for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; } return weights.length - 1; };

    const spin = async (dir) => {
      if (spinning) return;
      spinning = true; ready = false; box.classList.remove('ready'); hub.disabled = true;
      const btn = $('[data-spin]', panel); if (btn) btn.disabled = true;
      Sound.whoosh();
      const k = pick(), g = wheelGeometry(weights)[k];
      const theta = g.s + g.w * rand(0.22, 0.78);
      const T = (((360 - theta) % 360) + 360) % 360, cur = ((rot % 360) + 360) % 360;
      const delta = dir > 0 ? 360 * 6 + ((((T - cur) % 360) + 360) % 360) : -(360 * 6 + ((((cur - T) % 360) + 360) % 360));
      const start = rot; let seg = segAt(start), lastTick = 0;
      await stage.tween(5800, (e) => {
        setRot(start + delta * e);
        const s = segAt(rot);
        if (s !== seg) {
          seg = s; const now = performance.now();
          if (now - lastTick > 40) { Sound.tick(); lastTick = now; pointer.classList.remove('flick'); void pointer.getBoundingClientRect(); pointer.classList.add('flick'); }
        }
      }, (t) => 1 - Math.pow(1 - t, 4));
      if (!stage.live(ep)) return;
      land(k);
    };

    const land = async (k) => {
      const p = prizes[k], win = p.tier !== 'none';
      hub.innerHTML = hubInner(stage.brand);
      const row = $(`.odds-row[data-i="${k}"]`, panel); if (row) row.classList.add('won');
      if (win) { Sound.win(); stage.confetti(); } else Sound.wrong();
      await stage.wait(900);
      if (!stage.live(ep)) return;
      panel.innerHTML = win ? `
        <div class="prize-card">
          ${ptile(p.icon, p.tier === 'grand' ? 'var(--brand)' : 'var(--brand-600)', 84)}
          <div class="eyebrow">${p.tier === 'grand' ? 'Top prize' : 'You won'}</div>
          <h2>${esc(p.label)}</h2>
          <p class="t-sub">Claim it now and we’ll send your prize code.</p>
          <button class="btn btn-primary btn-xl" data-claim>Claim my prize${icon('arrow-right', 22, 2.2)}</button>
        </div>` : `
        <div class="prize-card">
          ${ptile('sparkles', '#8E8E93', 84)}
          <div class="eyebrow muted">So close</div>
          <h2>Not this time.</h2>
          <p class="t-sub">You can still enter tonight’s draw for the top prize.</p>
          <button class="btn btn-primary btn-xl" data-claim>Enter the draw${icon('arrow-right', 22, 2.2)}</button>
        </div>`;
      await new Promise((res) => $('[data-claim]', panel).addEventListener('click', res, { once: true }));
      if (!stage.live(ep)) return;
      Sound.tap();
      const L = win ? c.lead : c.loseLead;
      const data = await stage.lead({ ...L, allowSkip: !win, tile: win ? ptile(p.icon, 'var(--brand)', 56) : ptile('ticket', 'var(--brand)', 56) });
      if (!stage.live(ep)) return;
      const code = stage.code();
      const lead = stage.saveLead(data, { result: win ? p.label : 'Grand prize draw', score: `${boosts}/3 boosts`, code });
      stage.top('');
      const name = lead && lead.firstName ? esc(lead.firstName) : '';
      const res = stage.screen(win ? `
        <div class="result">
          <div class="result-head">
            ${ptile(p.icon, 'var(--brand)', 88)}
            <div class="eyebrow">${name ? `It’s yours, ${name}.` : 'It’s yours.'}</div>
            <h1 class="t-title">${esc(p.label)}</h1>
            <p class="t-sub">Show this code at the ${esc(stage.brand.name)} booth to collect.</p>
          </div>
          <div class="code-label">Prize code</div>
          <div class="prize-code">${esc(code)}</div>
          ${stage.takeHome('Save your prize code', 'Scan to keep it on your phone.', code)}
          ${stage.resultActions()}
        </div>` : `
        <div class="result">
          <div class="result-head">
            ${ptile('ticket', 'var(--brand)', 88)}
            <div class="eyebrow">${lead ? `You’re in, ${name}.` : 'Thanks for playing.'}</div>
            <h1 class="t-title">${lead ? 'You’re in tonight’s draw.' : 'Better luck next spin.'}</h1>
            <p class="t-sub">${lead ? 'We’ll email the winner after the event.' : 'Come back and play again any time today.'}</p>
          </div>
          ${lead ? `<div class="code-label">Draw entry number</div><div class="prize-code">${esc(code)}</div>` : ''}
          ${stage.resultActions()}
        </div>`);
      if (win) stage.confetti();
      stage.bindResult(res);
    };

    ask(0);
  },
};
