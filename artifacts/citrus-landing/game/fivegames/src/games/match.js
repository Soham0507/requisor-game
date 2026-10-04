/* ---------- Game 1: Match (personality quiz to product reveal) ---------- */
GAMES.match = {
  id: 'match', name: 'Match',
  tile: {
    kind: 'Personality quiz', title: 'Match',
    blurb: 'Five questions lead each player to the product made for them, revealed with a match score and the specs that prove it.',
    chips: [['timer', '60 sec'], ['mail', 'Lead before reveal'], ['sparkles', 'Personal result']],
  },
  art(stage) {
    const P = stage.products, ids = Object.keys(P).slice(0, 4);
    return `<div class="m-art" aria-hidden="true">${ids.map((id) => ptile(P[id].icon, P[id].color, null)).join('')}
      <span class="pill brand chip">${icon('sparkles', 16, 2)}94% match</span></div>`;
  },
  play(stage) {
    const c = stage.content, P = stage.products, qs = c.questions;
    const ids = Object.keys(P);
    const picks = [];
    const ep = stage.epoch;

    const ask = (i) => {
      stage.capsules(i, qs.length);
      const q = qs[i];
      const el = stage.screen(`
        <div class="qwrap">
          <div class="qhead"><div class="eyebrow">Question ${i + 1} of ${qs.length}</div><h2 class="qtext">${esc(q.q)}</h2></div>
          <div class="options">${q.options.map((o, k) => `
            <button class="option" data-k="${k}" style="animation-delay:${120 + k * 70}ms">
              <span class="otile">${icon(o.icon, 28, 1.8)}</span>
              <span><span class="olabel">${esc(o.label)}</span><span class="osub">${esc(o.sub || '')}</span></span>
              <span class="ocheck">${icon('check', 16, 3)}</span>
            </button>`).join('')}</div>
          <div class="qnav">${i > 0 ? `<button class="btn btn-ghost" data-back>${icon('chevron-left', 18, 2.2)}Back</button>` : ''}</div>
        </div>`);
      const wrap = $('.options', el);
      wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.option');
        if (!btn || wrap.classList.contains('locked')) return;
        wrap.classList.add('locked'); btn.classList.add('selected');
        Sound.select();
        picks[i] = q.options[Number(btn.dataset.k)];
        const back = $('[data-back]', el); if (back) back.disabled = true;
        stage.after(560, () => (i + 1 < qs.length ? ask(i + 1) : reveal()));
      });
      const back = $('[data-back]', el);
      if (back) back.addEventListener('click', () => { if (wrap.classList.contains('locked')) return; Sound.tap(); picks.length = i - 1; ask(i - 1); });
    };

    const reveal = async () => {
      stage.capsules(qs.length, qs.length);
      // Score every product, highest total wins.
      const totals = Object.fromEntries(ids.map((id) => [id, 0]));
      picks.forEach((o) => { for (const k in o.score) if (k in totals) totals[k] += o.score[k]; });
      const ranked = ids.slice().sort((a, b) => totals[b] - totals[a] || ids.indexOf(a) - ids.indexOf(b));
      const maxTotal = qs.reduce((s, q) => s + Math.max(...q.options.map((o) => Math.max(0, ...Object.values(o.score)))), 0) || 1;
      const topId = ranked[0], top = P[topId], run = P[ranked[1]];
      const pct = Math.round(80 + 18 * Math.min(1, totals[topId] / maxTotal));
      const runPct = Math.max(52, Math.round(pct * (totals[ranked[1]] / Math.max(1, totals[topId]))) - 3);

      // Suspense: the lineup flickers and lands on the match.
      const sh = stage.screen(`
        <div class="m-shuffle">
          <div class="row">${ids.map((id) => ptile(P[id].icon, P[id].color, null)).join('')}</div>
          <div class="qhead"><h2 class="t-title">Finding your match</h2><p class="t-sub">Weighing your ${qs.length} answers.</p></div>
        </div>`);
      const tiles = $$('.ptile', sh);
      const target = ids.indexOf(topId);
      const delays = [110, 100, 100, 110, 120, 140, 170, 210, 260, 330];
      let pos = 0;
      for (let k = 0; k < delays.length; k++) {
        tiles.forEach((t) => t.classList.remove('hot'));
        pos = k === delays.length - 1 ? target : (pos + 1) % tiles.length;
        tiles[pos].classList.add('hot'); Sound.tick();
        await stage.wait(delays[k]);
      }
      if (!stage.live(ep)) return;
      Sound.select();
      await stage.wait(500);

      // Build the reveal now, blurred behind the lead sheet as a teaser.
      const code = stage.code();
      const el = stage.screen(`
        <div class="m-reveal" style="--c:${esc(top.color)}">
          <div class="m-hero">
            <div class="halo"></div><div class="disc"></div>
            ${ptile(top.icon, top.color, null)}
            <div class="pct"><div class="pct-ring" style="--p:${pct / 100}"><div><b>${pct}%</b><small>match</small></div></div></div>
          </div>
          <div class="m-copy">
            <div class="eyebrow" data-greet>Your match</div>
            <h1 class="name">${esc(top.name)}</h1>
            <p class="line">${esc(top.line)}</p>
            <div class="specs">${top.specs.map((s) => `<div class="spec">${icon(s.icon, 22, 1.9)}<b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('')}</div>
            <div class="runner">${ptile(run.icon, run.color, 28)}<span>Runner-up: <b>${esc(run.name)}</b> · ${runPct}% match</span></div>
            ${stage.takeHome(c.takeHome.title, c.takeHome.sub, code)}
            ${stage.resultActions('Done')}
          </div>
        </div>`, 'pending');
      const data = await stage.lead({ ...c.lead, dim: true, tile: ptile('sparkles', 'var(--brand)', 56) });
      if (!stage.live(ep)) return;
      const lead = stage.saveLead(data, { result: top.name, score: `${pct}% match`, detail: picks.map((p) => p.label).join(' · '), code });
      el.classList.remove('pending');
      stage.top('');
      const greet = $('[data-greet]', el);
      if (lead && lead.firstName) greet.textContent = `${lead.firstName}, meet your match`;
      Sound.win();
      stage.confetti({ y: el.getBoundingClientRect().height * 0.35 });
      stage.bindResult(el);
    };

    ask(0);
  },
};
