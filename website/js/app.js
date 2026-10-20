/* FORM & FIELD — site behaviour. Plain JS, no build step, works from file:// */
(() => {
  'use strict';

  const D = window.FF_DATA;
  const html = document.documentElement;
  const page = document.body.dataset.page || '';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // localStorage with an in-memory fallback (private windows, blocked storage)
  const mem = {};
  const store = {
    get(k) {
      try { const v = localStorage.getItem(k); if (v !== null) return v; } catch (e) { /* unavailable */ }
      return k in mem ? mem[k] : null;
    },
    set(k, v) {
      mem[k] = v;
      try { localStorage.setItem(k, v); } catch (e) { /* unavailable */ }
    }
  };

  const hooks = { lang: [], quote: [] };

  /* ---------- Icons (Lucide-style outline, inlined as a sprite) ---------- */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'search-x': '<path d="m13.5 8.5-5 5M8.5 8.5l5 5"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
    'arrow-up': '<path d="m5 12 7-7 7 7M12 19V5"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>'
  };
  const icon = (name, cls = '') =>
    `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

  function injectSprite() {
    const symbols = Object.entries(ICONS)
      .map(([n, d]) => `<symbol id="i-${n}" viewBox="0 0 24 24">${d}</symbol>`).join('');
    document.body.insertAdjacentHTML('afterbegin',
      `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">${symbols}</svg>`);
  }

  /* ---------- Language ---------- */
  let lang = html.lang === 'en' ? 'en' : 'th';

  const t = (key, vars) => {
    let s = D.i18n[lang][key];
    if (s == null) s = D.i18n.th[key];
    if (s == null) return key;
    return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : '')) : s;
  };

  // Thai copy is authored in the HTML; it is cached on first run so switching back restores it.
  function applyI18n(scope = document) {
    $$('[data-i18n]', scope).forEach(el => {
      if (el.__th === undefined) el.__th = el.innerHTML;
      const val = D.i18n[lang][el.dataset.i18n];
      el.innerHTML = val != null ? val : el.__th;
    });
    $$('[data-i18n-attr]', scope).forEach(el => {
      el.__thAttr = el.__thAttr || {};
      el.dataset.i18nAttr.split(';').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (!(attr in el.__thAttr)) el.__thAttr[attr] = el.getAttribute(attr);
        const val = D.i18n[lang][key];
        const next = val != null ? val : el.__thAttr[attr];
        if (next != null) el.setAttribute(attr, next);
      });
    });
  }

  function setDescription(text) {
    const m = $('meta[name="description"]');
    if (m) m.setAttribute('content', text);
  }

  function applyMeta() {
    const m = D.meta[page];
    if (!m) return;
    document.title = m[lang][0];
    setDescription(m[lang][1]);
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    html.lang = next;
    store.set('ff-lang', next);
    applyI18n();
    applyMeta();
    syncChrome();
    hooks.lang.forEach(fn => fn());
  }

  /* ---------- Formatting ---------- */
  const fmt = n => new Intl.NumberFormat(lang === 'th' ? 'th-TH' : 'en-US').format(n);
  const priceText = n => `${fmt(n)} ${t('currency')}`;
  const priceHTML = n => `${fmt(n)}<small>${t('currency')}</small>`;
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = p => p[lang];
  const pad = n => String(n).padStart(2, '0');

  /* ---------- Theme ---------- */
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = () => html.dataset.theme || (darkQuery.matches ? 'dark' : 'light');

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    store.set('ff-theme', next);
    syncChrome();
  }

  /* ---------- Quote store ---------- */
  const QKEY = 'ff-quote';
  const byId = id => D.products.find(p => p.id === id);
  const clampQty = v => {
    const n = parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? Math.min(99, Math.max(1, n)) : 1;
  };

  function readQuote() {
    let raw;
    try { raw = JSON.parse(store.get(QKEY) || '[]'); } catch (e) { raw = []; }
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw
      .filter(r => r && byId(r.id) && !seen.has(r.id) && seen.add(r.id))
      .map(r => ({ id: r.id, qty: clampQty(r.qty) }));
  }

  function writeQuote(items) {
    store.set(QKEY, JSON.stringify(items));
    quoteChanged();
  }

  const quoteRows = () => readQuote().map(r => ({ ...r, p: byId(r.id) }));
  const qtyOf = id => (readQuote().find(r => r.id === id) || {}).qty || 0;

  function addToQuote(id, qty = 1) {
    const items = readQuote();
    let row = items.find(r => r.id === id);
    const capped = (row ? row.qty : 0) + qty > 99;
    if (row) row.qty = Math.min(99, row.qty + qty);
    else items.push(row = { id, qty: clampQty(qty) });
    writeQuote(items);
    return { qty: row.qty, capped };
  }

  function setQty(id, qty) {
    const items = readQuote();
    const row = items.find(r => r.id === id);
    if (!row) return;
    row.qty = clampQty(qty);
    writeQuote(items);
  }

  function quoteChanged(bump = true) {
    updateBadge(bump);
    hooks.quote.forEach(fn => fn());
  }

  window.addEventListener('storage', e => { if (e.key === QKEY) quoteChanged(false); });

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, action) {
    const region = $('.toast-region');
    clearTimeout(toastTimer);
    let actionHTML = '';
    if (action && action.href) actionHTML = `<a class="toast__action" href="${action.href}">${esc(action.label)}</a>`;
    else if (action && action.onClick) actionHTML = `<button type="button" class="toast__action">${esc(action.label)}</button>`;
    region.innerHTML = `<div class="toast">${icon((action && action.icon) || 'check')}<span class="toast__msg">${esc(msg)}</span>${actionHTML}<button type="button" class="toast__close" aria-label="${esc(t('toast.close'))}">${icon('x')}</button></div>`;
    const el = region.firstElementChild;
    const close = () => { clearTimeout(toastTimer); region.innerHTML = ''; };
    const arm = () => { clearTimeout(toastTimer); toastTimer = setTimeout(close, action && action.onClick ? 8000 : 5000); };
    $('.toast__close', el).addEventListener('click', close);
    if (action && action.onClick) {
      $('.toast__action', el).addEventListener('click', () => { close(); action.onClick(); });
    }
    el.addEventListener('mouseenter', () => clearTimeout(toastTimer));
    el.addEventListener('mouseleave', arm);
    el.addEventListener('focusin', () => clearTimeout(toastTimer));
    el.addEventListener('focusout', arm);
    arm();
  }

  /* ---------- Header, notice, footer ---------- */
  const NAV = [['home', 'index.html'], ['products', 'products.html'], ['about', 'about.html'], ['faq', 'faq.html'], ['contact', 'contact.html']];
  const NAV_ALL = [...NAV, ['quote', 'quote.html']];
  const activeNav = page === 'product' ? 'products' : page;
  const current = id => (id === activeNav ? ' aria-current="page"' : '');

  const langSwitch = () => `
    <div class="lang-switch" role="group" data-i18n-attr="aria-label:lang.label" aria-label="${esc(t('lang.label'))}">
      <button type="button" data-lang="th" lang="th" aria-pressed="${lang === 'th'}">ไทย</button>
      <button type="button" data-lang="en" lang="en" aria-pressed="${lang === 'en'}" aria-label="English">EN</button>
    </div>`;

  function renderChrome() {
    const notice = $('#site-notice');
    if (notice && store.get('ff-notice') !== 'hidden') {
      notice.innerHTML = `
        <div class="notice" role="region" data-i18n-attr="aria-label:notice.label" aria-label="${esc(t('notice.label'))}">
          <div class="container">
            ${icon('info')}
            <p data-i18n="notice.text">${t('notice.text')}</p>
            <button type="button" class="notice__close" data-i18n-attr="aria-label:notice.close" aria-label="${esc(t('notice.close'))}">${icon('x')}</button>
          </div>
        </div>`;
      $('.notice__close', notice).addEventListener('click', () => {
        notice.innerHTML = '';
        store.set('ff-notice', 'hidden');
        $('.brand').focus();
      });
    }

    const header = $('#site-header');
    header.innerHTML = `
      <div class="container header-bar">
        <a class="brand" href="index.html" data-i18n-attr="aria-label:brand.home" aria-label="${esc(t('brand.home'))}">
          <img class="logo-light" src="img/logo.svg" alt="" width="44" height="42">
          <img class="logo-dark" src="img/logo-dark.svg" alt="" width="44" height="42">
        </a>
        <nav class="nav" data-i18n-attr="aria-label:nav.label" aria-label="${esc(t('nav.label'))}">
          <ul>${NAV.map(([id, href]) => `<li><a href="${href}"${current(id)} data-i18n="nav.${id}">${t('nav.' + id)}</a></li>`).join('')}</ul>
        </nav>
        <div class="header-actions">
          ${langSwitch()}
          <button type="button" class="icon-btn theme-toggle">${icon('moon')}</button>
          <a class="btn btn--outline btn--sm quote-btn" href="quote.html"${current('quote')}>
            ${icon('clipboard')}<span class="quote-btn__label" data-i18n="nav.quote">${t('nav.quote')}</span>
            <span class="badge js-badge" aria-hidden="true">0</span><span class="visually-hidden js-badge-sr"></span>
          </a>
          <button type="button" class="icon-btn menu-toggle" aria-expanded="false" aria-controls="mobile-nav">${icon('menu')}</button>
        </div>
      </div>
      <div class="mobile-nav" id="mobile-nav" hidden>
        <div class="container">
          <nav data-i18n-attr="aria-label:nav.label" aria-label="${esc(t('nav.label'))}">
            <ul>${NAV_ALL.map(([id, href]) => `<li><a href="${href}"${current(id)}><span data-i18n="nav.${id}">${t('nav.' + id)}</span>${icon('chevron-right')}</a></li>`).join('')}</ul>
          </nav>
          <div class="mobile-nav__prefs">
            ${langSwitch()}
            <button type="button" class="btn btn--outline btn--sm theme-toggle theme-text">${icon('moon')}<span class="theme-text__label"></span></button>
          </div>
        </div>
      </div>`;

    const footer = $('#site-footer');
    footer.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a class="brand" href="index.html" data-i18n-attr="aria-label:brand.home" aria-label="${esc(t('brand.home'))}">
              <img src="img/logo-dark.svg" alt="" width="44" height="42">
            </a>
            <p class="footer-tagline" data-i18n="footer.tagline">${t('footer.tagline')}</p>
            <p class="footer-email">hello@formfield.example</p>
          </div>
          <nav aria-labelledby="footer-menu">
            <h2 id="footer-menu" data-i18n="footer.menu">${t('footer.menu')}</h2>
            <ul>${NAV_ALL.map(([id, href]) => `<li><a href="${href}" data-i18n="nav.${id}">${t('nav.' + id)}</a></li>`).join('')}</ul>
          </nav>
          <div>
            <h2 data-i18n="footer.notes">${t('footer.notes')}</h2>
            <div class="footer-notes">
              <p data-i18n="note.price">${t('note.price')}</p>
              <p data-i18n="note.ai">${t('note.ai')}</p>
              <p data-i18n="note.contact">${t('note.contact')}</p>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p><strong>FORM &amp; FIELD</strong> · <span data-i18n="notice.text">${t('notice.text')}</span></p>
          <a href="#top">${icon('arrow-up')}<span data-i18n="footer.top">${t('footer.top')}</span></a>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', '<div class="toast-region" role="status" aria-live="polite"></div>');
  }

  function syncChrome() {
    $$('.lang-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    const dark = currentTheme() === 'dark';
    $$('.theme-toggle').forEach(b => {
      b.setAttribute('aria-label', t(dark ? 'theme.toLight' : 'theme.toDark'));
      $('use', b).setAttribute('href', dark ? '#i-sun' : '#i-moon');
      const label = $('.theme-text__label', b);
      if (label) label.textContent = t(dark ? 'theme.light' : 'theme.dark');
    });
    const tc = $('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', dark ? '#2B1D16' : '#FFF6EC');
    const mt = $('.menu-toggle');
    if (mt) mt.setAttribute('aria-label', t(mt.getAttribute('aria-expanded') === 'true' ? 'menu.close' : 'menu.open'));
    updateBadge(false);
  }

  function updateBadge(bump) {
    const n = readQuote().reduce((s, r) => s + r.qty, 0);
    $$('.js-badge').forEach(b => {
      b.textContent = n;
      b.classList.toggle('is-empty', !n);
      if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    });
    $$('.js-badge-sr').forEach(s => { s.textContent = ', ' + t('quote.badge', { n }); });
  }

  function setMenu(open, returnFocus) {
    const btn = $('.menu-toggle');
    const panel = $('#mobile-nav');
    if (!btn || !panel) return;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', t(open ? 'menu.close' : 'menu.open'));
    $('use', btn).setAttribute('href', open ? '#i-x' : '#i-menu');
    panel.hidden = !open;
    $('#site-header').classList.toggle('is-open', open);
    if (open) $('a', panel).focus();
    else if (returnFocus) btn.focus();
  }

  /* ---------- Shared product UI ---------- */
  function cardHTML(p, tag = 'h3') {
    const l = L(p);
    return `
      <article class="p-card" data-id="${p.id}">
        <div class="p-card__media">
          <img src="${p.img}" alt="${esc(l.alt)}" width="1000" height="1000" loading="lazy" decoding="async">
          <span class="p-card__inquote" hidden></span>
        </div>
        <div class="p-card__body">
          <div class="p-card__meta"><span class="tag">${t('cat.' + p.cat)}</span><span class="code">${p.id}</span></div>
          <${tag} class="h3 p-card__title"><a href="product.html?id=${p.id}">${esc(l.name)}</a></${tag}>
          <p class="p-card__tagline">${esc(l.tagline)}</p>
          <div class="p-card__foot">
            <p class="price">${priceHTML(p.price)}</p>
            <span class="p-card__more" aria-hidden="true">${t('card.view')}${icon('arrow-right')}</span>
          </div>
          <button type="button" class="btn btn--outline btn--sm btn--block js-add" data-id="${p.id}">
            ${icon('plus')}<span class="js-add-label">${t('card.add')}</span><span class="visually-hidden"> — ${esc(l.name)}</span>
          </button>
        </div>
      </article>`;
  }

  function renderCards(container, list, tag) {
    container.innerHTML = list.map(p => cardHTML(p, tag)).join('');
    updateCardBadges();
  }

  function updateCardBadges() {
    const q = readQuote();
    $$('.p-card[data-id]').forEach(card => {
      const n = (q.find(r => r.id === card.dataset.id) || {}).qty || 0;
      const pill = $('.p-card__inquote', card);
      pill.hidden = !n;
      pill.innerHTML = n ? icon('check') + esc(t('card.inQuote', { n })) : '';
    });
  }

  function addFromButton(btn) {
    const p = byId(btn.dataset.id);
    if (!p) return;
    const res = addToQuote(p.id, 1);
    const label = $('.js-add-label', btn);
    btn.classList.add('is-added');
    label.textContent = t('card.added');
    $('use', btn).setAttribute('href', '#i-check');
    clearTimeout(btn.__timer);
    btn.__timer = setTimeout(() => {
      btn.classList.remove('is-added');
      label.textContent = t('card.add');
      $('use', btn).setAttribute('href', '#i-plus');
    }, 1600);
    toast(res.capped ? t('toast.max') : t('toast.added', { name: L(p).name }),
      { label: t('toast.view'), href: 'quote.html', icon: res.capped ? 'info' : 'check' });
  }

  const qtyStepper = (key, value, name) => `
    <div class="qty" data-qty="${key}">
      <button type="button" data-step="-1" data-fk="st-${key}--1" aria-label="${esc(t('pd.dec'))} — ${esc(name)}"${value <= 1 ? ' disabled' : ''}>${icon('minus')}</button>
      <input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${value}" data-fk="in-${key}" aria-label="${esc(t('q.qtyOf', { name }))}">
      <button type="button" data-step="1" data-fk="st-${key}-1" aria-label="${esc(t('pd.inc'))} — ${esc(name)}"${value >= 99 ? ' disabled' : ''}>${icon('plus')}</button>
    </div>`;

  // Commit a typed quantity on Enter as well as on blur
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('.qty input')) {
      e.preventDefault();
      e.target.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  const nextInline = (title, text, cta) => `
    <div class="next-inline">
      <div class="next-inline__body">
        <div class="step-bars" aria-hidden="true"><span></span><span></span><span></span></div>
        <div><p class="next-inline__title">${title}</p><p>${text}</p></div>
      </div>
      ${cta}
    </div>`;

  /* ---------- Page: home ---------- */
  function initHome() {
    const grid = $('#featured');
    const render = () => renderCards(grid, D.products, 'h3');
    render();
    hooks.lang.push(render);
    hooks.quote.push(updateCardBadges);
  }

  /* ---------- Page: products ---------- */
  function initProducts() {
    const grid = $('#product-grid');
    const input = $('#search');
    const clearBtn = $('#search-clear');
    const sortSel = $('#sort');
    const count = $('#result-count');
    const empty = $('#empty');
    const chips = $$('.chip[data-cat]');
    const CATS = ['all', 'seating', 'desks', 'lighting'];
    const SORTS = ['rec', 'asc', 'desc'];

    const params = new URLSearchParams(location.search);
    const state = {
      q: params.get('q') || '',
      cat: CATS.includes(params.get('cat')) ? params.get('cat') : 'all',
      sort: SORTS.includes(params.get('sort')) ? params.get('sort') : 'rec'
    };
    input.value = state.q;
    sortSel.value = state.sort;

    // Search both languages so a Thai or English term finds the same product
    const index = {};
    D.products.forEach(p => {
      index[p.id] = [p.id, ...['th', 'en'].flatMap(lg =>
        [p[lg].name, p[lg].tagline, p[lg].desc, ...p[lg].specs, D.i18n[lg]['cat.' + p.cat]])].join(' ').toLowerCase();
    });

    function render() {
      const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      let list = D.products.filter(p =>
        (state.cat === 'all' || p.cat === state.cat) && terms.every(term => index[p.id].includes(term)));
      if (state.sort === 'asc') list = [...list].sort((a, b) => a.price - b.price);
      if (state.sort === 'desc') list = [...list].sort((a, b) => b.price - a.price);

      renderCards(grid, list, 'h2');
      grid.hidden = !list.length;
      empty.hidden = !!list.length;
      count.textContent = list.length === 1 ? t('list.count1') : t('list.count', { n: list.length });
      chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.cat === state.cat)));
      clearBtn.hidden = !state.q;

      const qs = new URLSearchParams();
      if (state.q) qs.set('q', state.q);
      if (state.cat !== 'all') qs.set('cat', state.cat);
      if (state.sort !== 'rec') qs.set('sort', state.sort);
      try { history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '')); } catch (e) { /* file:// may refuse */ }
    }

    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { state.q = input.value.trim(); render(); }, 200);
    });
    input.closest('form').addEventListener('submit', e => {
      e.preventDefault();
      state.q = input.value.trim();
      render();
    });
    clearBtn.addEventListener('click', () => { input.value = ''; state.q = ''; render(); input.focus(); });
    chips.forEach(c => c.addEventListener('click', () => { state.cat = c.dataset.cat; render(); }));
    sortSel.addEventListener('change', () => { state.sort = sortSel.value; render(); });
    $('#reset-filters').addEventListener('click', () => {
      Object.assign(state, { q: '', cat: 'all', sort: 'rec' });
      input.value = '';
      sortSel.value = 'rec';
      render();
      input.focus();
    });

    render();
    hooks.lang.push(render);
    hooks.quote.push(updateCardBadges);
  }

  /* ---------- Page: product detail ---------- */
  function initProduct() {
    const root = $('#product-root');
    const p = byId(new URLSearchParams(location.search).get('id'));

    if (!p) {
      const renderMissing = () => {
        document.title = `${t('pd.notFound')} — FORM & FIELD`;
        root.innerHTML = `
          <div class="container section">
            <div class="empty">
              <div class="empty__icon">${icon('search-x', 'icon--lg')}</div>
              <h1 class="h2">${t('pd.notFound')}</h1>
              <p>${t('pd.notFoundText')}</p>
              <a class="btn btn--primary" href="products.html">${t('pd.back')}</a>
            </div>
          </div>`;
      };
      renderMissing();
      hooks.lang.push(renderMissing);
      return;
    }

    let qty = 1;
    const bar = document.createElement('div');
    bar.className = 'buybar';
    bar.setAttribute('inert', '');
    document.body.appendChild(bar);
    let observer;

    function statusHTML() {
      const n = qtyOf(p.id);
      return n ? `${icon('check')}<span>${esc(t('pd.inQuote', { n }))}</span><span aria-hidden="true">·</span><a href="quote.html">${t('pd.viewQuote')}</a>` : '';
    }

    function render() {
      const l = L(p);
      document.title = `${l.name} — FORM & FIELD`;
      setDescription(`${l.tagline} ${l.desc}`);
      root.innerHTML = `
        <div class="container">
          <nav class="breadcrumb" aria-label="${esc(t('pd.crumb'))}" style="padding-top:24px">
            <ol>
              <li><a href="index.html">${t('nav.home')}</a></li>
              <li><a href="products.html">${t('nav.products')}</a></li>
              <li aria-current="page">${esc(l.name)}</li>
            </ol>
          </nav>
          <div class="pd">
            <div class="pd__media">
              <div class="photo"><img src="${p.img}" alt="${esc(l.alt)}" width="1000" height="1000" fetchpriority="high"></div>
            </div>
            <div class="pd__info">
              <div class="pd__meta"><a class="tag" href="products.html?cat=${p.cat}">${t('cat.' + p.cat)}</a><span class="code">${p.id}</span></div>
              <h1>${esc(l.name)}</h1>
              <p class="lead">${esc(l.tagline)}</p>
              <p class="price pd__price">${priceHTML(p.price)}</p>
              <p class="small muted pd__price-note">${t('note.price')}</p>
              <div class="buybox">
                ${qtyStepper('pd', qty, l.name)}
                <button type="button" class="btn btn--primary" id="pd-add">${icon('plus')}<span>${t('card.add')}</span></button>
                <p class="buybox__status" id="pd-status" aria-live="polite">${statusHTML()}</p>
              </div>
              <section class="pd__section">
                <h2>${t('pd.desc')}</h2>
                <p>${esc(l.desc)}</p>
              </section>
              <section class="pd__section">
                <h2>${t('pd.specs')}</h2>
                <ul class="spec-list">${l.specs.map(s => `<li>${icon('check')}<span>${esc(s)}</span></li>`).join('')}</ul>
              </section>
              <div class="notes">
                <p class="note">${icon('info')}<span>${esc(l.note)}</span></p>
                <p class="note">${icon('info')}<span>${t('note.ai')}</span></p>
              </div>
            </div>
          </div>
          ${nextInline(t('pd.nextTitle'), t('pd.nextText'), `<a class="btn btn--secondary" href="quote.html">${t('pd.viewQuote')}</a>`)}
        </div>
        <section class="section" aria-labelledby="others-title">
          <div class="container">
            <div class="section-head">
              <h2 class="h2" id="others-title">${t('pd.others')}</h2>
              <a class="text-link" href="products.html">${t('link.allProducts')}${icon('arrow-right')}</a>
            </div>
            <div class="grid-products" id="others"></div>
          </div>
        </section>`;
      renderCards($('#others'), D.products.filter(o => o.id !== p.id), 'h3');

      bar.innerHTML = `
        <div class="buybar__info"><div class="buybar__name">${esc(l.name)}</div><div class="price">${priceHTML(p.price)}</div></div>
        <button type="button" class="btn btn--primary btn--sm js-bar-add">${icon('plus')}<span>${t('card.add')}</span></button>`;

      if (observer) observer.disconnect();
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(([entry]) => {
          const show = !entry.isIntersecting;
          bar.classList.toggle('is-visible', show);
          bar.toggleAttribute('inert', !show);
          document.body.classList.toggle('has-buybar', show && window.innerWidth < 900);
        });
        observer.observe($('#pd-add'));
      }
    }

    function syncQty() {
      const box = $('[data-qty="pd"]', root);
      $('input', box).value = qty;
      $('[data-step="-1"]', box).disabled = qty <= 1;
      $('[data-step="1"]', box).disabled = qty >= 99;
    }

    function doAdd() {
      const res = addToQuote(p.id, qty);
      toast(res.capped ? t('toast.max') : t('toast.added', { name: L(p).name }),
        { label: t('toast.view'), href: 'quote.html', icon: res.capped ? 'info' : 'check' });
    }

    root.addEventListener('click', e => {
      const step = e.target.closest('[data-qty="pd"] [data-step]');
      if (step) { qty = clampQty(qty + Number(step.dataset.step)); syncQty(); }
      if (e.target.closest('#pd-add')) doAdd();
    });
    root.addEventListener('change', e => {
      if (!e.target.matches('[data-qty="pd"] input')) return;
      if (parseInt(e.target.value, 10) > 99) toast(t('toast.max'), { icon: 'info' });
      qty = clampQty(e.target.value);
      syncQty();
    });
    bar.addEventListener('click', e => { if (e.target.closest('.js-bar-add')) doAdd(); });

    render();
    hooks.lang.push(render);
    hooks.quote.push(() => {
      const s = $('#pd-status');
      if (s) s.innerHTML = statusHTML();
      updateCardBadges();
    });
  }

  /* ---------- Page: quote ---------- */
  function initQuote() {
    const root = $('#quote-root');
    const live = $('#quote-live');
    let downloaded = false;
    let pendingFocus = null;

    const miniHTML = p => `
      <div class="mini">
        <a class="photo" href="product.html?id=${p.id}" tabindex="-1" aria-hidden="true"><img src="${p.img}" alt="" width="1000" height="1000" loading="lazy"></a>
        <div><a class="mini__name" href="product.html?id=${p.id}">${esc(L(p).name)}</a><p class="mini__price">${priceText(p.price)}</p></div>
        <button type="button" class="btn btn--outline btn--sm" data-add="${p.id}" data-fk="add-${p.id}">${icon('plus')}<span>${t('q.add')}</span><span class="visually-hidden"> ${esc(L(p).name)}</span></button>
      </div>`;

    function progressHTML(hasItems) {
      const done = [hasItems, downloaded, downloaded];
      const cur = [!hasItems, hasItems && !downloaded, false];
      return `<ol class="progress" aria-label="${esc(t('q.stepsLabel'))}">${[1, 2, 3].map(i => `
        <li class="${done[i - 1] ? 'is-done' : cur[i - 1] ? 'is-current' : ''}"${cur[i - 1] ? ' aria-current="step"' : ''}>
          <span class="progress__bar"></span>
          <span class="progress__label">${done[i - 1] ? icon('check') : ''}${i}. ${t('q.step' + i)}</span>
        </li>`).join('')}</ol>`;
    }

    function render(announce) {
      const rows = quoteRows();
      const total = rows.reduce((s, r) => s + r.p.price * r.qty, 0);
      const pieces = rows.reduce((s, r) => s + r.qty, 0);
      const notIn = D.products.filter(p => !rows.some(r => r.id === p.id));
      const focusKey = pendingFocus || (document.activeElement && root.contains(document.activeElement) && document.activeElement.dataset.fk);
      pendingFocus = null;

      let body;
      if (!rows.length) {
        body = `
          <div class="empty" style="margin-top:40px">
            <div class="empty__icon">${icon('clipboard', 'icon--lg')}</div>
            <p>${t('q.empty')}</p>
            <a class="btn btn--primary" href="products.html" data-fk="empty-cta">${t('q.browse')}</a>
          </div>
          <section style="margin-top:48px" aria-labelledby="more-title">
            <h2 class="h3" id="more-title" style="margin-bottom:16px">${t('q.all')}</h2>
            <div class="mini-list">${D.products.map(miniHTML).join('')}</div>
          </section>`;
      } else {
        body = `
          <div class="quote-layout">
            <section aria-labelledby="list-title">
              <h2 class="visually-hidden" id="list-title">${t('q.yourList')}</h2>
              <ul class="q-list">${rows.map(r => {
                const l = L(r.p);
                return `
                <li class="q-item">
                  <a class="q-item__img photo" href="product.html?id=${r.id}" tabindex="-1" aria-hidden="true"><img src="${r.p.img}" alt="" width="1000" height="1000"></a>
                  <div class="q-item__info">
                    <a class="q-item__name" href="product.html?id=${r.id}" data-fk="name-${r.id}">${esc(l.name)}</a>
                    <p class="q-item__meta">${r.id} · ${priceText(r.p.price)} ${t('q.each')}</p>
                  </div>
                  <div class="q-item__qty">${qtyStepper(r.id, r.qty, l.name)}</div>
                  <div class="q-item__end">
                    <p class="q-item__sub">${priceText(r.p.price * r.qty)}</p>
                    <button type="button" class="link-btn" data-remove="${r.id}">${icon('trash', 'icon--sm')}<span>${t('q.remove')}</span><span class="visually-hidden"> — ${esc(l.name)}</span></button>
                  </div>
                </li>`;
              }).join('')}</ul>
              ${notIn.length ? `
                <section style="margin-top:40px" aria-labelledby="more-title">
                  <h2 class="h3" id="more-title" style="margin-bottom:16px">${t('q.more')}</h2>
                  <div class="mini-list">${notIn.map(miniHTML).join('')}</div>
                </section>` : ''}
            </section>
            <aside class="summary" aria-labelledby="summary-title">
              <h2 id="summary-title">${t('q.summary')}</h2>
              <div class="summary__row"><span>${t('q.lines')}</span><span>${fmt(rows.length)}</span></div>
              <div class="summary__row"><span>${t('q.pieces')}</span><span>${t('q.pcs', { n: fmt(pieces) })}</span></div>
              <div class="summary__total">
                <p class="summary__total-label">${t('q.total')}</p>
                <p class="summary__total-value">${priceHTML(total)}</p>
              </div>
              <button type="button" class="btn btn--primary btn--block" id="q-download" data-fk="dl">${icon('download')}<span>${t('q.download')}</span></button>
              <div class="summary__actions">
                <button type="button" class="link-btn" id="q-clear">${icon('trash', 'icon--sm')}<span>${t('q.clear')}</span></button>
              </div>
              <div class="next-mini">
                <strong>${t('q.nextTitle')}</strong>
                ${t('q.nextText')} <a href="contact.html">${t('q.contact')}</a>
              </div>
              <div class="notes">
                <p class="note">${icon('info')}<span>${t('note.price')}</span></p>
                <p class="note">${icon('info')}<span>${t('notice.text')}</span></p>
              </div>
            </aside>
          </div>`;
      }
      root.innerHTML = progressHTML(rows.length > 0) + body;

      if (announce) live.textContent = rows.length ? t('q.live', { total: priceText(total) }) : t('q.empty');

      if (focusKey) {
        let el = $(`[data-fk="${focusKey}"]`, root);
        if (el && el.disabled) el = $(`[data-fk="in-${focusKey.replace(/^st-(.+?)--?1$/, '$1')}"]`, root);
        if (!el && focusKey.startsWith('add-')) el = $(`[data-fk="in-${focusKey.slice(4)}"]`, root);
        if (!el) el = $('[data-fk^="name-"]', root) || $('[data-fk="empty-cta"]', root);
        if (el) el.focus();
      }
    }

    function download() {
      const rows = quoteRows();
      if (!rows.length) return;
      const total = rows.reduce((s, r) => s + r.p.price * r.qty, 0);
      const now = new Date();
      const date = now.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
      const line = '-'.repeat(48);
      const out = [t('txt.title'), `${t('txt.date')}: ${date}`, line];
      rows.forEach(r => {
        out.push(`${r.id}  ${L(r.p).name}`);
        out.push(`        ${priceText(r.p.price)} × ${r.qty} = ${priceText(r.p.price * r.qty)}`);
      });
      out.push(line, `${t('q.total')}: ${priceText(total)}`, '', t('note.price'), t('notice.text'));
      const blob = new Blob(['﻿' + out.join('\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formfield-quote-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      downloaded = true;
      render(false);
      toast(t('toast.downloaded'));
    }

    function undoable(msg, snapshot) {
      toast(msg, {
        label: t('toast.undo'), icon: 'check',
        onClick: () => { pendingFocus = 'restore'; writeQuote(snapshot); }
      });
    }

    root.addEventListener('click', e => {
      const step = e.target.closest('.qty [data-step]');
      if (step) {
        const id = step.closest('.qty').dataset.qty;
        setQty(id, qtyOf(id) + Number(step.dataset.step));
        return;
      }
      const rm = e.target.closest('[data-remove]');
      if (rm) {
        const items = readQuote();
        const idx = items.findIndex(r => r.id === rm.dataset.remove);
        const neighbour = items[idx + 1] || items[idx - 1];
        pendingFocus = neighbour ? `name-${neighbour.id}` : 'empty-cta';
        const p = byId(rm.dataset.remove);
        writeQuote(items.filter(r => r.id !== p.id));
        undoable(t('toast.removed', { name: L(p).name }), items);
        return;
      }
      const add = e.target.closest('[data-add]');
      if (add) {
        const p = byId(add.dataset.add);
        const res = addToQuote(p.id, 1);
        toast(res.capped ? t('toast.max') : t('toast.added', { name: L(p).name }));
        return;
      }
      if (e.target.closest('#q-clear')) {
        const items = readQuote();
        pendingFocus = 'empty-cta';
        downloaded = false;
        writeQuote([]);
        undoable(t('toast.cleared'), items);
        return;
      }
      if (e.target.closest('#q-download')) download();
    });

    root.addEventListener('change', e => {
      if (!e.target.matches('.qty input')) return;
      const id = e.target.closest('.qty').dataset.qty;
      if (parseInt(e.target.value, 10) > 99) toast(t('toast.max'), { icon: 'info' });
      const next = clampQty(e.target.value);
      if (next === qtyOf(id)) e.target.value = next;
      else setQty(id, next);
    });

    render(false);
    hooks.lang.push(() => render(false));
    hooks.quote.push(() => render(true));
  }

  /* ---------- Page: contact ---------- */
  function initContact() {
    const form = $('#contact-form');
    const fields = { name: $('#f-name'), email: $('#f-email'), msg: $('#f-msg') };
    const attachWrap = $('#f-attach-wrap');
    const attach = $('#f-attach');
    const attachLabel = $('#f-attach-label');
    const success = $('#f-success');
    const preview = $('#f-preview');
    const nextBox = $('#contact-next');
    const rules = {
      name: v => (v.trim() ? '' : 'f.err.name'),
      email: v => (!v.trim() ? 'f.err.email' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'f.err.emailFormat'),
      msg: v => (v.trim() ? '' : 'f.err.msg')
    };
    const errors = {};
    let submitted = false;

    function check(name) {
      const el = fields[name];
      const key = rules[name](el.value);
      errors[name] = key;
      el.closest('.field').classList.toggle('is-invalid', !!key);
      el.setAttribute('aria-invalid', String(!!key));
      $(`#${el.id}-error`).innerHTML = key ? `${icon('alert')}<span>${esc(t(key))}</span>` : '';
      return !key;
    }

    function compose() {
      const lines = [
        t('msg.greeting'), '',
        `${t('msg.name')}: ${fields.name.value.trim()}`,
        `${t('msg.email')}: ${fields.email.value.trim()}`, '',
        `${t('msg.detail')}:`, fields.msg.value.trim()
      ];
      const rows = quoteRows();
      if (attach.checked && rows.length) {
        const total = rows.reduce((s, r) => s + r.p.price * r.qty, 0);
        lines.push('', `${t('msg.quote')}:`);
        rows.forEach(r => lines.push(`- ${L(r.p).name} (${r.id}) × ${r.qty} = ${priceText(r.p.price * r.qty)}`));
        lines.push(`${t('q.total')}: ${priceText(total)}`);
      }
      return lines.join('\n');
    }

    function syncQuoteUI() {
      const pieces = readQuote().reduce((s, r) => s + r.qty, 0);
      const wasHidden = attachWrap.hidden;
      attachWrap.hidden = !pieces;
      if (pieces && wasHidden) attach.checked = true;
      attachLabel.textContent = t('f.attach', { n: fmt(pieces) });
      nextBox.hidden = !!pieces;
      if (!success.hidden) preview.textContent = compose();
    }

    Object.keys(fields).forEach(name => {
      const el = fields[name];
      el.addEventListener('blur', () => { if (submitted || el.value.trim()) check(name); });
      el.addEventListener('input', () => { if (errors[name]) check(name); });
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      submitted = true;
      const ok = Object.keys(fields).map(check);
      const firstBad = Object.keys(fields)[ok.indexOf(false)];
      if (firstBad) { fields[firstBad].focus(); return; }
      preview.textContent = compose();
      success.hidden = false;
      success.focus();
    });

    $('#f-copy').addEventListener('click', () => {
      const text = preview.textContent;
      const fallback = () => {
        const range = document.createRange();
        range.selectNodeContents(preview);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        toast(ok ? t('toast.copied') : t('toast.copyFail'), { icon: ok ? 'check' : 'info' });
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => toast(t('toast.copied')), fallback);
      } else fallback();
    });

    $('#f-edit').addEventListener('click', () => {
      success.hidden = true;
      fields.name.focus();
    });

    attach.addEventListener('change', () => { if (!success.hidden) preview.textContent = compose(); });

    syncQuoteUI();
    hooks.quote.push(syncQuoteUI);
    hooks.lang.push(() => {
      Object.keys(fields).forEach(name => { if (errors[name]) check(name); });
      syncQuoteUI();
    });
  }

  /* ---------- Boot ---------- */
  injectSprite();
  renderChrome();
  applyI18n();
  applyMeta();
  syncChrome();
  html.classList.remove('i18n-pending');

  const pages = { home: initHome, products: initProducts, product: initProduct, quote: initQuote, contact: initContact };
  if (pages[page]) pages[page]();

  document.addEventListener('click', e => {
    const langBtn = e.target.closest('[data-lang]');
    if (langBtn) { setLang(langBtn.dataset.lang); return; }
    if (e.target.closest('.theme-toggle')) { toggleTheme(); return; }
    const menuBtn = e.target.closest('.menu-toggle');
    if (menuBtn) { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); return; }
    const add = e.target.closest('.js-add');
    if (add) addFromButton(add);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('.menu-toggle[aria-expanded="true"]')) setMenu(false, true);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1120 && $('.menu-toggle[aria-expanded="true"]')) setMenu(false);
  });

  const header = $('#site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  darkQuery.addEventListener('change', () => { if (!html.dataset.theme) syncChrome(); });
})();
