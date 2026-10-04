/* ---------- Game 2: Trivia Rush (60-second trivia, streaks, leaderboard) ---------- */
GAMES.trivia = {
  id: 'trivia', name: 'Trivia Rush',
  tile: {
    kind: 'Timed trivia', title: 'Trivia Rush',
    blurb: 'Sixty seconds of rapid-fire questions. Streaks multiply points, every answer teaches a brand fact, and the leaderboard keeps people coming back.',
    chips: [['timer', '60 sec'], ['trophy', 'Leaderboard'], ['flame', 'Streaks']],
  },
  art() {
    return `<div class="tr-art" aria-hidden="true">
      <div class="ring" style="--p:.72"><div class="in"><b>43</b><small>seconds</small></div></div>
      <span class="badge b1 good">${icon('circle-check', 20, 2)}+180</span>
      <span class="badge b2">${icon('flame', 20, 2)}Streak ×3</span>
      <span class="badge b3">${icon('trophy', 20, 2)}#1 today</span>
    </div>`;
  },
  async play(stage) {
    const c = stage.content, ep = stage.epoch;
    const D = (c.duration || 60) * 1000;
    const qs = shuffle(c.questions).map((q) => {
      const order = shuffle(q.options.map((_, i) => i));
      return { q: q.q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer), fact: q.fact };
    });
    await stage.countdown();
    if (!stage.live(ep)) return;

    let left = D, score = 0, correct = 0, answered = 0, streak = 0, best = 0, idx = 0, paused = true, ended = false;
    let last = performance.now(), qStart = 0;
    stage.top(`<div class="hud-pill" data-timer><span class="timer-ring" style="--p:1"></span><span data-t>1:00</span></div><div class="hud-pill"><span data-s>0</span><small>pts</small></div>`);
    const $t = $('[data-t]', stage.$top), $ring = $('.timer-ring', stage.$top), $pill = $('[data-timer]', stage.$top), $s = $('[data-s]', stage.$top);
    let lastSec = 60;
    const loop = (now) => {
      if (ended) return;
      const dt = now - last; last = now;
      if (!paused && !ended) {
        left = Math.max(0, left - dt);
        const sec = Math.ceil(left / 1000);
        $t.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
        $ring.style.setProperty('--p', String(left / D));
        $pill.classList.toggle('warn', sec <= 10);
        if (sec !== lastSec && sec <= 5 && sec > 0) Sound.tick();
        lastSec = sec;
        if (left <= 0) { end(true); return; }
      }
      stage.frame(loop);
    };
    stage.frame(loop);

    const multFor = (s) => (s >= 5 ? 2 : s >= 3 ? 1.5 : 1);
    const ask = () => {
      const q = qs[idx];
      const el = stage.screen(`
        <div class="qwrap">
          <div class="qhead">
            <div class="tr-meta"><span class="eyebrow muted">Question ${idx + 1}</span>${streak >= 2 ? `<span class="streak">${icon('flame', 16, 2.2)}${streak} in a row · next one ×${multFor(streak + 1)}</span>` : ''}</div>
            <h2 class="qtext sm">${esc(q.q)}</h2>
          </div>
          ${answersHTML(q.options)}
          <div class="tr-fact-slot" aria-live="polite"></div>
        </div>`);
      qStart = performance.now(); paused = false;
      bindAnswers(stage, el, q.answer, (i, ok, btn) => {
        paused = true; answered++;
        const t = performance.now() - qStart;
        if (ok) {
          correct++; streak++; best = Math.max(best, streak);
          const pts = Math.round((100 + Math.round(100 * clamp(1 - t / 8000, 0, 1))) * multFor(streak));
          score += pts;
          stage.floater(`+${pts}`, btn);
          $s.textContent = fmt(score);
        } else streak = 0;
        const slot = $('.tr-fact-slot', el);
        if (q.fact) slot.innerHTML = `<div class="fact">${icon('lightbulb', 20, 2)}<span><b>${ok ? 'Right.' : 'Good to know.'}</b> ${esc(q.fact)}</span></div>`;
        stage.after(q.fact ? (ok ? 1500 : 2100) : 900, () => {
          idx++;
          if (idx >= qs.length) end(false); else ask();
        });
      });
    };

    const end = async (timeUp) => {
      if (ended) return; ended = true; paused = true;
      stage.capsules(1, 1); stage.top('');
      stage.screen(`<div class="bigword"><h2>${timeUp ? 'Time.' : 'All done.'}</h2><p class="t-sub">${correct} correct · ${fmt(score)} points</p></div>`);
      Sound.whoosh();
      await stage.wait(1500);
      if (!stage.live(ep)) return;
      const data = await stage.lead({ ...c.lead, allowSkip: true, tile: ptile('trophy', 'var(--brand)', 56) });
      if (!stage.live(ep)) return;
      const code = stage.code();
      const lead = stage.saveLead(data, { result: `${correct}/${answered} correct`, score, code });
      const key = `${stage.brand.id}:trivia`;
      const list = Boards.get(key, c.seed || []);
      let rank = null, meId = null;
      if (lead) { const me = { id: uid(), name: `${lead.firstName} ${lead.lastName ? lead.lastName[0] + '.' : ''}`.trim(), score }; meId = me.id; rank = Boards.add(key, me); }
      const acc = answered ? Math.round((correct / answered) * 100) : 0;
      const el = stage.screen(`
        <div class="result split">
          <div class="result-main">
            <div class="result-head">
              <div class="eyebrow">${lead ? `Nice run, ${esc(lead.firstName)}.` : 'Nice run.'}</div>
              <div class="result-score" data-count>0<small>pts</small></div>
              <p class="t-sub">${rank ? (rank === 1 ? 'You’re #1 today. Hold on to it.' : `You’re #${rank} of ${list.length} players today.`) : 'Add your name next time to join the leaderboard.'}</p>
            </div>
            <div class="stats" style="--n:3">
              <div class="stat"><b>${correct}/${answered}</b><span>Correct</span></div>
              <div class="stat"><b>${best}</b><span>Best streak</span></div>
              <div class="stat"><b>${acc}%</b><span>Accuracy</span></div>
            </div>
            ${stage.takeHome(c.takeHome.title, c.takeHome.sub, code)}
            ${stage.resultActions()}
          </div>
          <div class="result-side">${boardHTML(list, meId)}</div>
        </div>`);
      const counter = $('[data-count]', el);
      stage.tween(1200, (k) => { counter.firstChild.nodeValue = fmt(Math.round(score * k)); });
      if (rank && rank <= 3) { Sound.win(); stage.confetti(); } else Sound.correct();
      stage.bindResult(el);
    };

    ask();
  },
};
