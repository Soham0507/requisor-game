/* =====================================================================
   Activate8 library: brand kit, game bento, session leads.
   ===================================================================== */
const A8_MARK = '<svg class="a8-mark" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="8" fill="#1D1D1F"/><path d="M11 8.6v10.8a1 1 0 0 0 1.52.86l8.62-5.4a1 1 0 0 0 0-1.72l-8.62-5.4A1 1 0 0 0 11 8.6Z" fill="#5BD49A"/></svg>';
const SWATCHES = ['#0A84FF', '#30B0C7', '#34A853', '#FF9F0A', '#FF375F', '#BF5AF2', '#FFCC00', '#1D1D1F'];
const GAME_ORDER = ['match', 'trivia', 'number', 'spin', 'recall'];

const TILE_ART = {
  match(k) {
    const q = k.games.match.questions[0];
    const prods = Object.values(k.products), p = prods[1] || prods[0];
    return `<div class="art-match" aria-hidden="true">
      <div class="am-card">
        <div class="bar"><i class="on"></i><i class="on"></i><i></i><i></i><i></i></div>
        <div class="q">${esc(q.q)}</div>
        <div class="grid">${q.options.map((o, i) => `<div class="opt ${i === 1 ? 'sel' : ''}">${ptile(o.icon, 'var(--brand)', 40)}<span>${esc(o.label)}</span></div>`).join('')}</div>
      </div>
      <div class="am-result">${ptile(p.icon, p.color, 58)}<div><span class="k">Your match · 94%</span><b>${esc(p.name)}</b><span class="l">${esc(p.specs[0].value)} · ${esc(p.specs[0].label)}</span></div></div>
    </div>`;
  },
  trivia(k) {
    const q = k.games.trivia.questions[0], wrong = q.options.find((_, i) => i !== q.answer);
    return `<div class="art-trivia" aria-hidden="true"><div class="ring" style="--p:.72"><b>43</b></div>
      <div class="ans"><div class="ok">${esc(q.options[q.answer])}${icon('check', 18, 2.6)}</div><div>${esc(wrong)}</div></div></div>`;
  },
  number(k) {
    const r = k.games.number.rounds[0];
    return `<div class="art-number" aria-hidden="true"><div class="big">${esc(fmt(r.start, decimalsOf(r.step)))}</div><div class="unit">${esc(r.unit)} · your guess</div><div class="ruler"></div><div class="needle"></div></div>`;
  },
  spin(k, brand) {
    const P = k.games.spin.prizes;
    return `<div class="art-spin" aria-hidden="true"><div class="mini-wheel">${wheelMarkup(P, P.map((p) => p.weight))}${WHEEL_POINTER}<div class="wheel-hub">${hubInner(brand)}</div></div>
      <div class="boosts"><div><span class="b on">${icon('zap', 16, 2.2)}</span>Boost earned</div><div><span class="b on">${icon('zap', 16, 2.2)}</span>Boost earned</div><div><span class="b">${icon('zap', 16, 2.2)}</span>One to go</div></div></div>`;
  },
  recall(k) {
    const pr = k.games.recall.pairs;
    const cell = (i) => (i === 1 || i === 10 ? `<i class="hit">${icon(pr[0].icon, 22, 2)}</i>` : i === 6 ? `<i class="up">${icon(pr[1].icon, 22, 2)}</i>` : '<i></i>');
    return `<div class="art-recall" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => cell(i)).join('')}</div>`;
  },
};

const App = {
  brandId: 'halden', customBase: 'halden', kiosk: true,
  custom: { name: '', color: '#0A84FF', logoImg: null },
  stage: null, leadsAtOpen: 0,

  get brand() {
    if (this.brandId !== 'custom') return BRANDS[this.brandId];
    const base = BRANDS[this.customBase] || BRANDS.halden;
    const name = (this.custom.name || '').trim() || 'Your Brand';
    return {
      ...base, id: 'custom', name, word: name, wordClass: '', wordSuffix: '', mark: null,
      nameSet: !!(this.custom.name || '').trim(),
      color: this.custom.color, logoImg: this.custom.logoImg, productImg: this.custom.productImg || null, vertical: 'Custom brand kit',
      code: name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'A8',
    };
  },
  kit() { const b = this.brand; return { games: resolveText(b.games, b), products: resolveText(b.products, b) }; },

  persist() {
    try { localStorage.setItem('a8.kit', JSON.stringify({ brandId: this.brandId, customBase: this.customBase, kiosk: this.kiosk, custom: { name: this.custom.name, color: this.custom.color } })); } catch (e) { /* storage is optional */ }
  },
  restore(snap) {
    let s = snap && snap.brandId ? snap : null;
    if (!s) { try { s = JSON.parse(localStorage.getItem('a8.kit') || 'null'); } catch (e) { s = null; } }
    if (!s) return;
    if (s.brandId && (BRANDS[s.brandId] || s.brandId === 'custom')) this.brandId = s.brandId;
    if (s.customBase && BRANDS[s.customBase]) this.customBase = s.customBase;
    if (typeof s.kiosk === 'boolean') this.kiosk = s.kiosk;
    if (s.custom) this.custom = { ...this.custom, ...s.custom, logoImg: s.custom.logoImg || null };
    if (Array.isArray(snap && snap.leads)) Leads.list = snap.leads;
  },

  init(snap) {
    this.restore(snap);
    this.stage = new Stage(this);
    $('#app').innerHTML = this.shell();
    this.bind();
    this.applyBrand();
    this.updateLeadCount();
    bus.addEventListener('leads', () => this.updateLeadCount(true));
    window.addEventListener('resize', () => this.moveThumb());
  },

  shell() {
    return `
    <header class="nav"><div class="nav-in">
      <a class="a8" href="#top" aria-label="Activate8">${A8_MARK}<span>Activate<b>8</b></span><span class="by">by Requisor AI</span></a>
      <div class="nav-actions"><button class="btn btn-secondary leads-btn" id="leadsBtn">${icon('users', 17, 2)}Leads <span class="count zero" id="leadCount">0</span></button></div>
    </div></header>
    <main id="top">
      <section class="wrap lib-hero">
        <div class="eyebrow"><i></i>Game library</div>
        <h1>Five games that put <em>your brand</em> in their hands.</h1>
        <p>Quiz-powered experiences for booths, kiosks, and QR codes. Every play teaches something about your brand and ends with a lead you can follow up.</p>
      </section>
      <section class="wrap" aria-label="Brand kit"><div class="kit" id="kit"></div></section>
      <section class="wrap">
        <div class="section-head"><h2>Pick a game. Tap to play.</h2><p>Each game runs full screen on an iPad or a phone, captures the lead, and resets itself for the next player.</p></div>
        <div class="bento" id="bento"></div>
      </section>
      <section class="wrap">
        <div class="section-head"><h2>From brand kit to booth.</h2></div>
        <div class="how">
          <div class="how-step"><span class="n">1</span><h3>Load your brand kit</h3><p>Logo, colors, and the products you want people to remember.</p></div>
          <div class="how-step"><span class="n">2</span><h3>Write the questions</h3><p>Start from a template or bring your own quiz, stats, prizes, and odds.</p></div>
          <div class="how-step"><span class="n">3</span><h3>Launch on any screen</h3><p>Run it on a kiosk iPad or behind a QR code. Each player’s details, score, and answers land in your leads list.</p></div>
        </div>
      </section>
      <footer class="wrap"><div class="lib-foot"><span>Halden, Fieldstone, and Kestrel are fictional demo brands. Products, stats, and prizes are sample content.</span><span>Activate8 by Requisor AI</span></div></footer>
    </main>
    <div class="lib-toast-host" id="libToast"></div>`;
  },

  kitPreviewHTML() {
    const b = this.brand, isCustom = this.brandId === 'custom';
    return `<div class="kit-swatch"></div>
      <div class="kit-meta"><span class="label">Brand kit</span><div>${logoHTML(b, 'lg')}</div><span class="vert">${esc(b.vertical)}${isCustom ? '' : ' · demo brand'}</span></div>`;
  },
  kitHTML() {
    const b = this.brand, isCustom = this.brandId === 'custom';
    return `
      <div class="kit-preview" id="kitPreview">${this.kitPreviewHTML()}</div>
      <div class="kit-controls">
        <div class="seg" id="seg" role="tablist" aria-label="Brand kit">
          <span class="thumb"></span>
          ${BRAND_ORDER.map((id) => `<button role="tab" data-b="${id}" aria-selected="${this.brandId === id}">${esc(BRANDS[id].name)}</button>`).join('')}
          <button role="tab" data-b="custom" aria-selected="${isCustom}">Custom</button>
        </div>
        <div id="customFields" class="custom-wrap" ${isCustom ? '' : 'hidden'}>
          <div class="custom-fields">
            <input class="inline-input" id="customName" placeholder="Your brand name" maxlength="20" value="${esc(this.custom.name)}" aria-label="Brand name" autocomplete="off">
            <label class="btn btn-secondary upload">${icon('upload', 18, 2)}<span>${this.custom.logoImg ? 'Replace logo' : 'Upload logo'}</span><input type="file" id="customLogo" accept="image/png,image/jpeg,image/svg+xml,image/webp"></label>
          </div>
          <div class="swatches" id="swatches">${SWATCHES.map((col) => `<button type="button" style="--c:${col}" data-c="${col}" aria-label="Brand color ${col}" aria-pressed="${this.custom.color.toUpperCase() === col}"></button>`).join('')}<label class="swatch-pick" title="Pick any color"><input type="color" id="customColor" value="${esc(this.custom.color)}" aria-label="Pick any brand color"></label></div>
          <span class="kit-note">Custom kits reuse the ${esc(BRANDS[this.customBase].name)} questions with your name, color, and logo.${this.custom.logoImg ? ' <button type="button" class="linkish" id="clearLogo">Remove logo</button>' : ''}</span>
        </div>
        <label class="toggle-line" for="kioskToggle"><span class="t">Kiosk mode<small>Resets to the start screen after each player.</small></span><input type="checkbox" class="switch" id="kioskToggle" ${this.kiosk ? 'checked' : ''}></label>
      </div>`;
  },

  renderKit() {
    const kit = $('#kit'), focusId = document.activeElement && document.activeElement.id;
    kit.innerHTML = this.kitHTML();
    this.moveThumb(false);
    if (focusId === 'customName') { const i = $('#customName'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  },
  moveThumb(animate = true) {
    const seg = $('#seg'); if (!seg) return;
    const sel = $('[aria-selected="true"]', seg), thumb = $('.thumb', seg);
    if (!sel || !thumb) return;
    if (!animate) thumb.style.transition = 'none';
    thumb.style.width = `${sel.offsetWidth}px`;
    thumb.style.transform = `translateX(${sel.offsetLeft - 3}px)`;
    if (!animate) { void thumb.offsetWidth; thumb.style.transition = ''; }
  },
  renderBento() {
    const kit = this.kit(), brand = this.brand;
    $('#bento').innerHTML = GAME_ORDER.map((id) => {
      const t = GAMES[id].tile;
      return `<div class="tile t-${id}" role="button" tabindex="0" data-game="${id}" aria-label="Play ${esc(t.title)}">
        <span class="tile-play">${icon('play', 18, 2.4)}</span>
        <div class="tile-copy"><span class="tile-kind">${esc(t.kind)}</span><h3>${esc(t.title)}</h3><p>${esc(t.blurb)}</p>
          <div class="tile-chips">${t.chips.map(([ic, tx]) => `<span class="pill">${icon(ic, 15, 2)}${esc(tx)}</span>`).join('')}</div></div>
        <div class="tile-art">${TILE_ART[id](kit, brand)}</div>
      </div>`;
    }).join('');
  },
  applyBrand(opts = {}) {
    applyTheme(this.brand.color);
    if (opts.light) { const p = $('#kitPreview'); if (p) p.innerHTML = this.kitPreviewHTML(); }
    else this.renderKit();
    this.renderBento();
  },
  setBrand(id) {
    if (id === this.brandId) return;
    if (id !== 'custom') this.customBase = id;
    this.brandId = id;
    Sound.tap();
    // Move the thumb first so the segmented control animates, then rebuild.
    const seg = $('#seg');
    $$('[data-b]', seg).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.b === id)));
    this.moveThumb(true);
    setTimeout(() => { this.applyBrand(); this.persist(); }, 180);
  },

  bind() {
    const app = $('#app');
    app.addEventListener('click', (e) => {
      const seg = e.target.closest('[data-b]'); if (seg) { this.setBrand(seg.dataset.b); return; }
      const sw = e.target.closest('[data-c]'); if (sw) { this.custom.color = sw.dataset.c; Sound.tap(); this.applyBrand(); this.persist(); return; }
      if (e.target.closest('#clearLogo')) { this.custom.logoImg = null; this.applyBrand(); return; }
      if (e.target.closest('#leadsBtn')) { this.openLeads(); return; }
      const tile = e.target.closest('[data-game]'); if (tile) { this.play(tile.dataset.game); }
    });
    app.addEventListener('keydown', (e) => {
      const tile = e.target.closest && e.target.closest('[data-game]');
      if (tile && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.play(tile.dataset.game); }
    });
    app.addEventListener('input', (e) => {
      if (e.target.id === 'customName') { this.custom.name = e.target.value; clearTimeout(this._nameT); this._nameT = setTimeout(() => { this.applyBrand({ light: true }); this.persist(); }, 220); }
      if (e.target.id === 'customColor') { this.custom.color = e.target.value; clearTimeout(this._colT); this._colT = setTimeout(() => { this.applyBrand({ light: true }); this.persist(); }, 60); }
    });
    app.addEventListener('change', (e) => {
      if (e.target.id === 'kioskToggle') { this.kiosk = e.target.checked; Sound.tap(); this.persist(); }
      if (e.target.id === 'customLogo') {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        if (f.size > 2.5 * 1024 * 1024) { this.toast(`${icon('info', 20)}<span>That logo is over 2.5 MB. Try a smaller PNG or SVG.</span>`); return; }
        const r = new FileReader();
        r.onload = () => { this.custom.logoImg = r.result; this.applyBrand(); this.toast(`${icon('check', 20, 2.4)}<span>Logo added to every game.</span>`); };
        r.readAsDataURL(f);
      }
    });
  },

  play(id) {
    Sound.ensure(); Sound.select(); this.leadsAtOpen = Leads.list.length;
    const host = $('#libToast'); if (host) host.innerHTML = '';
    this.stage.open(id);
  },
  onStageClosed() {
    const n = Leads.list.length - this.leadsAtOpen;
    if (n > 0) this.toast(`${icon('users', 20, 2)}<span><b>${n} new lead${n > 1 ? 's' : ''}</b> saved. Open Leads to see the record.</span>`, 3400);
  },
  toast(html, ms = 2600) {
    const host = $('#libToast'); if (!host) return;
    host.innerHTML = `<div class="toast">${html}</div>`;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { const t = $('.toast', host); if (t) { t.classList.add('out'); setTimeout(() => t.remove(), 360); } }, ms);
  },
  updateLeadCount(pulse) {
    const el = $('#leadCount'); if (!el) return;
    el.textContent = Leads.list.length; el.classList.toggle('zero', Leads.list.length === 0);
    if (pulse) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  },

  csv() {
    const cols = ['ts', 'brand', 'game', 'firstName', 'lastName', 'email', 'zip', 'company', 'role', 'optIn', 'result', 'score', 'detail', 'code'];
    const head = ['timestamp', 'brand', 'game', 'first_name', 'last_name', 'email', 'zip', 'company', 'team', 'opt_in', 'result', 'score', 'answers', 'code'];
    const q = (v) => {
      let s = v === undefined || v === null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // keep spreadsheets from running cell text as a formula
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [head.join(','), ...Leads.list.map((l) => cols.map((c) => q(l[c])).join(','))].join('\n');
  },
  openLeads() {
    Sound.tap();
    const L = Leads.list;
    const time = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const score = (s) => (s === undefined || s === '' ? '' : typeof s === 'number' ? `${fmt(s)} pts` : s);
    const rows = L.map((l) => `
      <div class="lead-row">
        <span class="av">${esc(initials(`${l.firstName} ${l.lastName || ''}`))}</span>
        <div class="who"><b>${esc(l.firstName)} ${esc(l.lastName || '')}</b><span>${esc(l.email)}${l.company ? ` · ${esc(l.company)}` : ''}${l.zip ? ` · ${esc(l.zip)}` : ''}${l.role ? ` · ${esc(l.role)}` : ''}</span></div>
        <div class="what"><span class="pill brand">${esc(l.game)}</span><span>${esc(l.result || '')}${score(l.score) ? ` · ${esc(score(l.score))}` : ''}</span>${l.detail ? `<span class="ans" title="${esc(l.detail)}">${esc(l.detail)}</span>` : ''}</div>
        <div class="meta">${l.optIn ? `<span class="pill good">${icon('check', 14, 2.6)}Opted in</span>` : '<span class="pill">No opt-in</span>'}<span>${esc(l.brand)} · ${time(l.ts)}</span></div>
      </div>`).join('');
    const empty = `<div class="empty">${ptile('users', 'var(--brand)', 52)}<b>No leads yet</b><span>Play any game and finish its lead form. The record shows up here with the player’s score or result.</span></div>`;
    const sh = openSheet({
      cls: 'wide', label: 'Session leads',
      html: `<button class="icon-btn sheet-close" data-close aria-label="Close">${icon('x', 20)}</button>
        <div class="sheet-head"><h2>Session leads</h2><p>Players who finished a game in this preview. They’re kept in memory only and clear when this page reloads.</p></div>
        <div class="lead-list">${rows || empty}</div>
        <div class="result-actions">${L.length ? `<button class="btn btn-secondary" data-copy>${icon('copy', 18, 2)}Copy as CSV</button>` : ''}<button class="btn btn-ink" data-close>Done</button></div>
        <div class="csv-fallback" hidden><p class="t-foot">Copying isn’t available here. Select the text below and copy it.</p><textarea readonly rows="6" aria-label="Leads as CSV"></textarea></div>`,
    });
    $$('[data-close]', sh.el).forEach((b) => b.addEventListener('click', () => sh.close()));
    const copy = $('[data-copy]', sh.el);
    if (copy) copy.addEventListener('click', () => {
      const text = this.csv();
      const fallback = () => { const fb = $('.csv-fallback', sh.el); fb.hidden = false; const ta = $('textarea', fb); ta.value = text; ta.focus(); ta.select(); };
      try {
        navigator.clipboard.writeText(text).then(() => { copy.innerHTML = `${icon('check', 18, 2.4)}Copied ${L.length} lead${L.length > 1 ? 's' : ''}`; Sound.tap(); }, fallback);
      } catch (e) { fallback(); }
    });
  },
};

// Integration surface for the platform team: window.Activate8 exposes the brand kits,
// game registry and session leads; set window.A8_ON_LEAD = (lead) => {...} to receive
// each lead as it is captured.
window.Activate8 = { App, BRANDS, GAMES, Leads, Boards };

// Boot (keeps the brand kit and session leads across live updates of this page)
(function boot() {
  const hot = window.claude && window.claude.hot;
  const start = (data) => App.init(data || {});
  if (hot && typeof hot.snapshot === 'function') {
    try { hot.snapshot(() => ({ brandId: App.brandId, customBase: App.customBase, kiosk: App.kiosk, custom: App.custom, leads: Leads.list })); } catch (e) { /* optional */ }
  }
  if (hot && typeof hot.ready === 'function') hot.ready(start); else start(hot && hot.data);
})();
