/* ---------- Game 5: Recall (memory match, then a recall quiz) ---------- */
GAMES.recall = {
  id: 'recall', name: 'Recall',
  tile: {
    kind: 'Memory + recall', title: 'Recall',
    blurb: 'Players flip cards to match six brand features, then answer three questions on what they remember. You get a brand recall score for every player.',
    chips: [['layout-grid', '6 pairs'], ['brain', 'Recall score'], ['trophy', 'Leaderboard']],
  },
  art(stage) {
    const pairs = stage.content.pairs;
    const back = `<div class="card back"><span class="badge-mark">${hubInner(stage.brand)}</span></div>`;
    const front = (p) => `<div class="card front">${ptile(p.icon, 'var(--brand)', null)}<b>${esc(p.title)}</b></div>`;
    return `<div class="r-art" aria-hidden="true">${back}${front(pairs[0]).replace('card front', 'card front hit')}${front(pairs[1])}${back}</div>`;
  },
  cleanup(stage) { if (stage._fit) { window.removeEventListener('resize', stage._fit); stage._fit = null; } },
  async play(stage) {
    const c = stage.content, ep = stage.epoch, pairs = c.pairs;
    const deck = shuffle(pairs.flatMap((p) => [p, p]));
    let first = null, lock = true, moves = 0, found = 0, t0 = 0, secs = 0, timerId = null;
    stage.top(`<div class="hud-pill">${icon('timer', 18, 2.2)}<span data-time>0:00</span></div><div class="hud-pill">${icon('layout-grid', 18, 2.2)}<span data-found>0</span><small>/ ${pairs.length}</small></div><div class="hud-pill"><span data-moves>0</span><small>moves</small></div>`);
    const $time = $('[data-time]', stage.$top), $found = $('[data-found]', stage.$top), $moves = $('[data-moves]', stage.$top);
    const el = stage.screen(`
      <div class="r-board">
        <div class="qhead"><h2 class="qtext sm" data-head>Study the cards.</h2><p class="t-callout" data-sub>They flip back in a moment. Then find each pair.</p></div>
        <div class="mgrid">${deck.map((p, i) => `
          <button class="mcard up" data-i="${i}" data-id="${esc(p.id)}" style="animation-delay:${i * 40}ms" aria-label="Card ${i + 1}">
            <span class="in">
              <span class="mface mback"><span class="badge-mark">${hubInner(stage.brand)}</span></span>
              <span class="mface mfront">${ptile(p.icon, 'var(--brand)', null)}<b>${esc(p.title)}</b><small>${esc(p.detail)}</small></span>
            </span>
            <span class="tick">${icon('check', 14, 3)}</span>
          </button>`).join('')}</div>
      </div>`, 'has-toast');
    const grid = $('.mgrid', el), head = $('[data-head]', el), sub = $('[data-sub]', el);
    const fit = () => {
      const W = stage.el.clientWidth, H = stage.el.clientHeight;
      const wide = W / H >= 1.05;
      const cols = wide ? 4 : 3, rows = wide ? 3 : 4, gap = W < 500 ? 10 : 14;
      const phone = W <= 640;
      const availW = Math.min(W - 40, 1000), availH = H - (phone ? 120 : 84) - 120 - (phone ? 40 : 100);
      const size = Math.floor(Math.min((availW - gap * (cols - 1)) / cols, (availH - gap * (rows - 1)) / rows, 200));
      grid.style.setProperty('--cols', cols); grid.style.setProperty('--card', `${Math.max(64, size)}px`); grid.style.setProperty('--gap', `${gap}px`);
      $$('.mcard', grid).forEach((m) => m.classList.toggle('small', size < 128));
    };
    fit(); stage._fit = fit; window.addEventListener('resize', fit);

    // Preview: every feature face up, then shuffle face down.
    await stage.wait(2600);
    if (!stage.live(ep)) return;
    $$('.mcard', grid).forEach((m, i) => stage.after(i * 35, () => m.classList.remove('up')));
    Sound.whoosh();
    await stage.wait(700);
    if (!stage.live(ep)) return;
    head.textContent = 'Find the pairs.'; sub.textContent = 'Tap two cards. Match all six as fast as you can.';
    lock = false; t0 = performance.now();
    timerId = stage.every(250, () => { secs = Math.floor((performance.now() - t0) / 1000); $time.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`; });

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.mcard');
      if (!card || lock || card.classList.contains('up')) return;
      card.classList.add('up'); Sound.tap();
      if (!first) { first = card; return; }
      const a = first, b = card; first = null; moves++; $moves.textContent = moves;
      if (a.dataset.id === b.dataset.id) {
        a.classList.add('matched'); b.classList.add('matched'); found++; $found.textContent = found;
        const p = pairs.find((x) => x.id === a.dataset.id);
        Sound.correct();
        stage.toast(`${ptile(p.icon, 'var(--brand)', 34)}<span><b>${esc(p.title)}.</b> ${esc(p.detail)}</span>`, 2000);
        if (found === pairs.length) {
          stage.stopEvery(timerId); lock = true;
          const final = Math.max(1, Math.floor((performance.now() - t0) / 1000));
          $time.textContent = `${Math.floor(final / 60)}:${String(final % 60).padStart(2, '0')}`;
          stage.after(900, () => recallRound(final));
        }
      } else {
        lock = true;
        stage.after(380, () => { a.classList.add('miss'); b.classList.add('miss'); });
        stage.after(950, () => { a.classList.remove('up', 'miss'); b.classList.remove('up', 'miss'); lock = false; });
      }
    });

    const recallRound = async (elapsed) => {
      stage.screen(`<div class="bigword"><h2>All six.</h2><p class="t-sub">Found in ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')} with ${moves} moves. Now, what do you remember?</p></div>`);
      Sound.win();
      await stage.wait(1800);
      if (!stage.live(ep)) return;
      const qs = c.questions.map((q) => { const o = shuffle(q.options.map((_, i) => i)); return { q: q.q, options: o.map((i) => q.options[i]), answer: o.indexOf(q.answer) }; });
      let right = 0;
      for (let k = 0; k < qs.length; k++) {
        stage.capsules(k, qs.length);
        const q = qs[k];
        const qel = stage.screen(`
          <div class="qwrap" style="max-width:760px">
            <div class="qhead"><div class="eyebrow">Recall ${k + 1} of ${qs.length}</div><h2 class="qtext sm">${esc(q.q)}</h2></div>
            ${answersHTML(q.options, 'one')}
          </div>`);
        const ok = await new Promise((res) => bindAnswers(stage, qel, q.answer, (i, good) => res(good)));
        if (!stage.live(ep)) return;
        if (ok) right++;
        await stage.wait(1100);
        if (!stage.live(ep)) return;
      }
      stage.top('');
      const memory = Math.max(300, 1500 - Math.max(0, elapsed - 20) * 12 - Math.max(0, moves - 6) * 20);
      const score = memory + right * 400;
      const recallPct = Math.round((right / qs.length) * 100);
      const data = await stage.lead({ ...c.lead, allowSkip: true, tile: ptile('brain', 'var(--brand)', 56) });
      if (!stage.live(ep)) return;
      const code = stage.code();
      const lead = stage.saveLead(data, { result: `${right}/${qs.length} recalled`, score, code });
      const key = `${stage.brand.id}:recall`;
      const list = Boards.get(key, c.seed || []);
      let rank = null, meId = null;
      if (lead) { const me = { id: uid(), name: `${lead.firstName} ${lead.lastName ? lead.lastName[0] + '.' : ''}`.trim(), score }; meId = me.id; rank = Boards.add(key, me); }
      const res = stage.screen(`
        <div class="result split">
          <div class="result-main">
            <div class="result-head">
              <div class="eyebrow">${lead ? `Great memory, ${esc(lead.firstName)}.` : 'Great memory.'}</div>
              <div class="result-score" data-count>0<small>pts</small></div>
              <p class="t-sub">${rank ? (rank === 1 ? 'Top score today.' : `You’re #${rank} of ${list.length} players today.`) : `You remembered ${right} of ${qs.length} ${esc(stage.brand.name)} facts.`}</p>
            </div>
            <div class="stats" style="--n:3">
              <div class="stat"><b>${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}</b><span>Time</span></div>
              <div class="stat"><b>${moves}</b><span>Moves</span></div>
              <div class="stat"><b>${recallPct}%</b><span>Brand recall</span></div>
            </div>
            ${stage.takeHome(c.takeHome.title, c.takeHome.sub, code)}
            ${stage.resultActions()}
          </div>
          <div class="result-side">${boardHTML(list, meId)}</div>
        </div>`);
      const counter = $('[data-count]', res);
      stage.tween(1200, (k) => { counter.firstChild.nodeValue = fmt(Math.round(score * k)); });
      if (right === qs.length || (rank && rank <= 3)) { Sound.win(); stage.confetti(); } else Sound.correct();
      stage.bindResult(res);
    };
  },
};
