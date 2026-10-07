// Fills the written page from strings.js and owns the language state.
// The prototype has its own renderer; this file only tells it which
// language to use, so the page and the phone can never disagree.
// The header controls (menu, theme switch) live in header.js and talk to
// this file through window.PAGE.
//
// Which language: ?lang=ar|en (a judge can be sent a direct link to either),
// else the saved choice, else English. The browser's own language is never
// consulted, and nothing redirects. Storage is optional: every access is
// guarded, and the page works with it blocked. The head script in index.html
// makes the same decision before first paint, so nothing flashes.

(function () {
  'use strict';

  const LANGS = ['en', 'ar'];
  const KEY = 'ti-lang';
  const TODO = 'TODO_AR'; // marker for Arabic not written yet (see smoke.js)
  const listeners = [];

  function readSaved() {
    try {
      const v = window.localStorage.getItem(KEY);
      return LANGS.includes(v) ? v : null;
    } catch (e) {
      return null;
    }
  }

  function save(lang) {
    try {
      window.localStorage.setItem(KEY, lang);
    } catch (e) {
      /* storage blocked: the choice lasts for this visit only */
    }
  }

  function initialLang() {
    let requested = null;
    try {
      requested = new URLSearchParams(window.location.search).get('lang');
    } catch (e) {
      /* no URL, no deep link */
    }
    if (LANGS.includes(requested)) return requested;
    return readSaved() || 'en';
  }

  // Keys ending in "Html" hold author-written static text with a few
  // inline tags. Everything else is set as plain text.
  function fill(lang) {
    const table = window.STRINGS[lang];
    const fallback = window.STRINGS.en;

    for (const node of document.querySelectorAll('[data-i18n]')) {
      const key = node.getAttribute('data-i18n');
      const own = table[key];
      const missing = own === undefined || own === TODO;
      const text = missing ? fallback[key] : own;
      if (text === undefined) {
        node.textContent = key; // visible, not silent
      } else if (/Html$/.test(key)) {
        node.innerHTML = text; // static author copy from strings.js only
      } else {
        node.textContent = text;
      }
      // English shown inside the Arabic page is marked as English, so screen
      // readers pronounce it right and it lays out left to right.
      if (lang === 'ar' && missing && text !== undefined) {
        node.setAttribute('lang', 'en');
        node.setAttribute('dir', 'ltr');
      } else if (node.getAttribute('lang') === 'en' && node.getAttribute('dir') === 'ltr') {
        node.removeAttribute('lang');
        node.removeAttribute('dir');
      }
    }

    document.documentElement.lang = lang === 'ar' ? 'ar-SA' : 'en';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = table['page.title'] || fallback['page.title'];

    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', table['page.description'] || fallback['page.description']);

    if (window.PROTOTYPE) window.PROTOTYPE.set({ lang });
  }

  const PAGE = {
    lang: 'en',
    onChange(fn) {
      listeners.push(fn);
      fn(PAGE.lang);
    },
    // A deliberate choice: remembered, and reflected in the URL so the
    // address stays shareable and never contradicts what is on screen.
    setLang(next) {
      if (!LANGS.includes(next)) return;
      PAGE.lang = next;
      save(next);
      try {
        const url = new URL(window.location.href);
        if (next === 'en') url.searchParams.delete('lang');
        else url.searchParams.set('lang', next);
        window.history.replaceState(null, '', url);
      } catch (e) {
        /* the address bar is cosmetic */
      }
      fill(next);
      listeners.forEach((fn) => fn(next));
    },
  };
  window.PAGE = PAGE;

  PAGE.lang = initialLang();
  fill(PAGE.lang);
})();
