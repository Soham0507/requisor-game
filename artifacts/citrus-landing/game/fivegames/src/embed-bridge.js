/* =====================================================================
   Platform embed bridge: runs ONE Activate8 game per page (chosen by the
   /game-previews/<slug>/ path or ?game=), implements the CDH_BRAND_READY /
   CDH_BRAND_UPDATE contract (game/BRANDING_CONTRACT.md), and forwards each
   captured lead to /api/player-submissions. Loaded after the library code,
   only in the staged platform build (see scripts/stage-fivegames-preview.mjs).
   ===================================================================== */
(function () {
  var SLUG_TO_GAME = {
    'a8-match': 'match',
    'a8-trivia-rush': 'trivia',
    'a8-the-number': 'number',
    'a8-spin-to-win': 'spin',
    'a8-recall': 'recall',
  };
  var A = window.Activate8;
  if (!A) return;
  var App = A.App;
  var params = new URLSearchParams(window.location.search);

  var gameId = params.get('game');
  if (!gameId) {
    for (var s in SLUG_TO_GAME) if (window.location.pathname.indexOf(s) !== -1) gameId = SLUG_TO_GAME[s];
  }
  if (!gameId || !A.GAMES[gameId]) return; // no game picked: leave the library page as is

  var slug = '';
  for (var k in SLUG_TO_GAME) if (SLUG_TO_GAME[k] === gameId) slug = k;
  var orderId = params.get('orderId');
  var HEX = /^#[0-9a-fA-F]{6}$/;
  // The customizer's "Game title" field defaults to the game's name; only a title
  // the customer actually changed should replace the start-screen headline.
  var DEFAULT_HEADING = { match: 'Match', trivia: 'Trivia Rush', number: 'The Number', spin: 'Spin to Win', recall: 'Memory' };
  var copy = A.BRANDS.halden.games[gameId];
  var original = { title: copy.title, subtitle: copy.subtitle };
  var questionApi = window.CDH_QUIZ_CONTENT;
  var originalContent = JSON.parse(JSON.stringify(copy));
  var customContent = null;
  var contentReady = !params.has('contentId');
  var logoStyle = document.createElement('style');
  document.head.appendChild(logoStyle);
  // Logo size, title size and title color from the customizer, applied as one stylesheet.
  var brandStyle = { logo: 0, scale: 1, color: null };
  function applyBrandStyle() {
    var css = '';
    if (brandStyle.logo) {
      // !important: the single-game page sets a fixed 48px logo that would otherwise win.
      css += 'body .stage .topbar .logo img{height:' + brandStyle.logo + 'px!important;max-width:' + (brandStyle.logo * 4) + 'px!important}';
      // A tall logo makes the top bar taller on desktop; phones keep their two-row bar.
      css += '@media (min-width:641px){.stage .topbar{height:calc(max(68px,' + (brandStyle.logo + 20) + 'px) + env(safe-area-inset-top,0px))}}';
      css += '@media (max-width:640px){.stage .topbar{grid-template-rows:' + Math.max(60, brandStyle.logo + 8) + 'px auto}}';
    }
    if (brandStyle.scale !== 1) css += '.stage .t-hero{font-size:min(calc(clamp(40px,min(6.2vw,9.6vh),92px)*' + brandStyle.scale + '),16vw)}';
    if (brandStyle.color) css += '.stage .t-hero{color:' + brandStyle.color + '}';
    logoStyle.textContent = css;
  }

  document.body.classList.add('a8-single');

  // Generic "Your Brand" kit until the host sends a theme; the library's demo
  // brands (Halden etc.) never show.
  App.brandId = 'custom';
  App.customBase = 'halden';
  App.custom = { name: '', color: '#0A84FF', logoImg: null, productImg: null };

  // The kit renders the logo URL straight into an <img src>, so only accept
  // image data URIs, http(s) URLs or same-origin paths, and drop characters
  // that could break out of the attribute.
  function safeLogo(url) {
    if (!url || typeof url !== 'string') return null;
    if (!/^(data:image\/|https?:\/\/|\/)/i.test(url)) return null;
    return url.replace(/["'<>\s]/g, '');
  }

  function merge(theme) {
    if (!theme) return;
    var c = App.custom;
    if (Object.prototype.hasOwnProperty.call(theme, 'gameContent') && questionApi) {
      var nextContent = theme.gameContent;
      if (nextContent !== null) {
        var validated = questionApi.validateGameContent(nextContent, slug);
        if (!validated.ok) {
          submissionStatus('Custom questions are invalid: ' + validated.error);
          return;
        }
        nextContent = validated.content;
      }
      customContent = nextContent;
      ['questions', 'rounds', 'pairs', 'meta'].forEach(function (key) {
        if (originalContent[key] !== undefined) copy[key] = JSON.parse(JSON.stringify(originalContent[key]));
      });
      if (customContent) {
        Object.assign(copy, questionApi.adaptFiveGameContent(customContent, A.BRANDS.halden.products));
        copy.meta = (copy.meta || []).map(function (item) {
          return Object.assign({}, item, { text: item.text.replace(/\d+\s+(questions|rounds)/i, customContent.questions.length + ' $1') });
        });
      }
    }
    // No brand name: the customizer only offers a logo and a game title.
    if (theme.primaryColor && HEX.test(theme.primaryColor)) c.color = theme.primaryColor;
    if (theme.logoUrl !== undefined) c.logoImg = safeLogo(theme.logoUrl);
    // The customizer's image upload (bgUrl) is the Recall product image: shown
    // on the face-down cards of the start screen. Video is not accepted.
    if (theme.bgUrl !== undefined) c.productImg = /^data:video/i.test(theme.bgUrl || '') ? null : safeLogo(theme.bgUrl);
    if (typeof theme.heading === 'string') copy.title = theme.heading.trim() && theme.heading.trim() !== DEFAULT_HEADING[gameId] ? theme.heading.trim().slice(0, 160) : original.title;
    if (typeof theme.tagline === 'string') copy.subtitle = theme.tagline.trim().slice(0, 500) || original.subtitle;
    var size = Number(theme.logoSize);
    if (isFinite(size) && size > 0) brandStyle.logo = Math.min(size, 100);
    // Title size is relative to the customizer's default (28px), so the default changes nothing.
    var titleSize = Number(theme.headingSize);
    if (isFinite(titleSize) && titleSize > 0) brandStyle.scale = Math.min(2.5, Math.max(0.4, titleSize / 28));
    // White is the customizer's default title color for dark games, so here it means "unchanged".
    if (typeof theme.headingColor === 'string') {
      brandStyle.color = HEX.test(theme.headingColor) && !/^#f{3}(f{3})?$/i.test(theme.headingColor) ? theme.headingColor : null;
    }
    applyBrandStyle();
  }

  function signature() {
    var c = App.custom;
    return [c.name, c.color, c.logoImg, c.productImg, copy.title, copy.subtitle, JSON.stringify(customContent)].join('|');
  }

  function setTitle() {
    var name = App.custom.name.trim();
    document.title = name ? name + ' — ' + A.GAMES[gameId].name : A.GAMES[gameId].name;
  }

  function openGame() {
    if (contentReady && !App.stage.el) App.play(gameId);
  }

  // Leaving the stage (the X is hidden, but Esc still closes it) just reopens
  // the same game: a platform page is never the library.
  var originalClosed = App.onStageClosed.bind(App);
  App.onStageClosed = function () {
    originalClosed();
    setTimeout(openGame, 150);
  };

  var applied = signature();
  var timer = null;
  function onTheme(theme) {
    merge(theme);
    clearTimeout(timer);
    timer = setTimeout(function () {
      var next = signature();
      if (next === applied) return;
      applied = next;
      setTitle();
      App.applyBrand();
      // The open stage keeps the brand it started with: closing it reopens the
      // game (via onStageClosed above) with the new brand. Resets any round in
      // progress, like every other game's live preview.
      if (App.stage.el) App.stage.close(); else openGame();
    }, 300);
  }

  // Leads: name + email go in the shared player_submissions columns, the rest
  // (game, result, score, answers, code, ...) in `extra`.
  function submissionStatus(message, retry) {
    var status = document.querySelector('.a8-save-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'a8-save-status';
      status.setAttribute('role', 'status');
      document.body.appendChild(status);
    }
    status.replaceChildren(document.createTextNode(message));
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = retry ? 'Retry' : 'Dismiss';
    button.addEventListener('click', retry || function () { status.remove(); });
    status.appendChild(button);
  }
  window.A8_ON_LEAD = function (lead) {
    if (!lead || !lead.email) return;
    // Catalog/customizer previews are demos, not live campaigns. Do not send
    // their personal details to persistent storage or promise real prizes.
    if (!orderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      submissionStatus('Saved in this preview session only. Demo prizes; no emails are sent.');
      return;
    }
    var name = ((lead.firstName || '') + ' ' + (lead.lastName || '')).trim() || 'Player';
    var extra = {};
    ['game', 'result', 'score', 'timeSeconds', 'moves', 'code', 'optIn'].forEach(function (key) {
      if (lead[key] !== undefined) extra[key] = lead[key];
    });
    function save() {
      submissionStatus('Saving your entry…');
      fetch('/api/player-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameSlug: slug, orderId: orderId || null, name: name, email: lead.email, extra: extra }),
      }).then(function (response) {
        if (!response.ok) throw new Error('Submission failed');
        submissionStatus('Your entry has been saved.');
      }).catch(function () {
        submissionStatus('Your entry could not be saved. Please retry before leaving this page.', save);
      });
    }
    save();
  };

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    if (event.data && event.data.type === 'CDH_BRAND_UPDATE' &&
        event.data.theme && typeof event.data.theme === 'object') onTheme(event.data.theme);
  });

  // Standalone / live-link load: same fields as query params.
  var initial = {};
  if (params.has('primaryColor')) initial.primaryColor = params.get('primaryColor');
  if (params.has('logo')) initial.logoUrl = params.get('logo');
  if (params.has('bg')) initial.bgUrl = params.get('bg');
  if (params.has('heading')) initial.heading = params.get('heading');
  if (params.has('tagline')) initial.tagline = params.get('tagline');
  if (params.has('logoSize')) initial.logoSize = params.get('logoSize');
  if (params.has('headingSize')) initial.headingSize = params.get('headingSize');
  if (params.has('headingColor')) initial.headingColor = params.get('headingColor');
  merge(initial);
  applied = signature();
  setTitle();
  App.applyBrand();
  function loadSavedQuestions() {
    var id = params.get('contentId');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) {
      submissionStatus('This custom-question link is invalid. Please request a new game link.');
      return;
    }
    submissionStatus('Loading custom questions…');
    fetch('/api/branding-drafts/' + encodeURIComponent(id) + '/content', { cache: 'no-store' })
      .then(function (response) { if (!response.ok) throw new Error('load'); return response.json(); })
      .then(function (saved) {
        if (saved.gameSlug !== slug || !saved.gameContent) throw new Error('wrong game');
        var result = questionApi.validateGameContent(saved.gameContent, slug);
        if (!result.ok) throw new Error('invalid content');
        merge({ gameContent: result.content });
        applied = signature();
        contentReady = true;
        var status = document.querySelector('.a8-save-status');
        if (status) status.remove();
        App.applyBrand();
        openGame();
      })
      .catch(function () { submissionStatus('Custom questions could not be loaded. No sample questions have been substituted.', loadSavedQuestions); });
  }
  if (!contentReady) loadSavedQuestions(); else openGame();

  if (window.parent !== window) window.parent.postMessage({ type: 'CDH_BRAND_READY' }, '*');
})();
