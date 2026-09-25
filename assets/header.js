// Header controls: a language menu and a theme switch.
//
// Language: a menu button (aria-haspopup="menu") that opens a list of
// menuitemradio entries, each named in its own language. Keyboard: Enter,
// Space or ArrowDown opens; arrows, Home and End move; Escape closes and
// returns focus to the button; Tab closes; a click outside closes.
//
// Theme: one toggle button, remembered in localStorage ("ti-theme"). The
// head script in index.html applies the saved theme before first paint;
// this file only handles changes. Storage is optional and always guarded.

(function () {
  'use strict';

  const langBtn = document.getElementById('lang-btn');
  const menu = document.getElementById('lang-menu');
  const themeBtn = document.getElementById('theme-btn');
  if (!langBtn || !menu || !themeBtn || !window.PAGE) return;

  const html = document.documentElement;
  const items = Array.prototype.slice.call(menu.querySelectorAll('[role="menuitemradio"]'));

  const str = (key) => {
    const table = window.STRINGS[window.PAGE.lang] || {};
    return table[key] !== undefined ? table[key] : window.STRINGS.en[key];
  };

  // --- language menu ---------------------------------------------------------

  function isOpen() {
    return !menu.hidden;
  }

  function open(focusIndex) {
    menu.hidden = false;
    langBtn.setAttribute('aria-expanded', 'true');
    const active = items.findIndex((el) => el.getAttribute('aria-checked') === 'true');
    const at = focusIndex === undefined ? Math.max(active, 0) : focusIndex;
    items[(at + items.length) % items.length].focus();
  }

  function close(returnFocus) {
    if (!isOpen()) return;
    menu.hidden = true;
    langBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) langBtn.focus();
  }

  langBtn.addEventListener('click', function () {
    if (isOpen()) close(true);
    else open();
  });

  langBtn.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      open(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      open(items.length - 1);
    } else if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      close(true);
    }
  });

  menu.addEventListener('keydown', function (e) {
    const at = items.indexOf(document.activeElement);
    let next = null;
    if (e.key === 'ArrowDown') next = at + 1;
    else if (e.key === 'ArrowUp') next = at - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next !== null) {
      e.preventDefault();
      items[(next + items.length) % items.length].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') {
      close(false); // focus moves on naturally
    }
  });

  items.forEach(function (item) {
    item.addEventListener('click', function () {
      window.PAGE.setLang(item.getAttribute('data-lang'));
      close(true);
    });
  });

  document.addEventListener('pointerdown', function (e) {
    if (isOpen() && !menu.contains(e.target) && !langBtn.contains(e.target)) close(false);
  });

  // --- theme -----------------------------------------------------------------

  function currentTheme() {
    return html.getAttribute('data-theme') === 'bright' ? 'bright' : 'dark';
  }

  function labelTheme() {
    themeBtn.setAttribute('aria-label', str(currentTheme() === 'dark' ? 'header.themeToBright' : 'header.themeToDark'));
  }

  themeBtn.addEventListener('click', function () {
    const next = currentTheme() === 'dark' ? 'bright' : 'dark';
    html.setAttribute('data-theme', next);
    try {
      window.localStorage.setItem('ti-theme', next);
    } catch (e) {
      /* storage blocked: the choice lasts for this visit only */
    }
    labelTheme();
  });

  // --- follow the page language ---------------------------------------------

  window.PAGE.onChange(function (lang) {
    items.forEach(function (item) {
      item.setAttribute('aria-checked', item.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    const name = window.STRINGS[lang]['lang.name.' + lang];
    const current = document.getElementById('lang-current');
    if (current) {
      current.textContent = name;
      current.setAttribute('lang', lang === 'ar' ? 'ar' : 'en');
    }
    langBtn.setAttribute('aria-label', str('header.language') + ': ' + name);
    menu.setAttribute('aria-label', str('header.languageMenu'));
    labelTheme();
  });
})();

// Header behaviour that follows the scroll: it frosts once the page moves, a
// hairline fills coral through the story and green once the phone is reached,
// and the label names the beat being read. Scroll position only; nothing here
// writes a layout property, and every part is decorative, so if this file does
// not run the header is simply a solid bar with the page title.
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var label = document.getElementById('hdr-label');
  var proto = document.getElementById('prototype');
  if (!header || !label) return;

  var chapters = [].slice.call(document.querySelectorAll('[data-chapter]'));
  var current = null; // null means the top of the page: the label is the title
  var queued = false;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // The Arabic for a beat may not be written yet (TODO_AR): show the English,
  // marked as English, the same way page.js does for the story copy.
  function text(key) {
    var lang = window.PAGE ? window.PAGE.lang : 'en';
    var table = (window.STRINGS && window.STRINGS[lang]) || {};
    var own = table[key];
    var missing = own === undefined || own === 'TODO_AR';
    var fallback = window.STRINGS ? window.STRINGS.en[key] : undefined;
    return { value: missing ? fallback : own, english: lang === 'ar' && missing };
  }

  function renderLabel(swap) {
    var t = text(current ? 'chapter.' + current : 'page.title');
    if (t.value === undefined) return;
    label.textContent = t.value;
    if (t.english) {
      label.setAttribute('lang', 'en');
      label.setAttribute('dir', 'ltr');
    } else {
      label.removeAttribute('lang');
      label.removeAttribute('dir');
    }
    if (swap) {
      label.classList.remove('is-swap');
      void label.offsetWidth;
      label.classList.add('is-swap');
    }
  }

  function update() {
    queued = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var docH = document.documentElement.scrollHeight;

    header.classList.toggle('is-scrolled', y > 8);

    var key = null;
    for (var i = 0; i < chapters.length; i += 1) {
      if (chapters[i].getBoundingClientRect().top <= vh * 0.4) key = chapters[i].getAttribute('data-chapter');
    }
    if (key !== current) {
      current = key;
      renderLabel(true);
    }

    // Coral fills from the top down to the phone; green fills from the phone
    // to the end. Together they show the page's turn from anywhere on it.
    var turn = proto ? proto.getBoundingClientRect().top + y - vh * 0.5 : docH;
    var story = clamp(y / Math.max(1, turn), 0, 1);
    var relief = proto ? clamp((y - turn) / Math.max(1, docH - vh - turn), 0, 1) : 0;
    header.style.setProperty('--p-story', story.toFixed(4));
    header.style.setProperty('--p-relief', relief.toFixed(4));

    cinemaMode(y);
  }

  // Cinema: while the phone story's stage is pinned (scenes 1-7) and the
  // visitor scrolls down, the header slides away and only the hairline stays.
  // It comes back on scroll-up past a small run, on keyboard focus inside it,
  // on Escape, in the last scene and anywhere outside the story. Transform and
  // opacity only (app.css); the header keeps its place in the layout.
  var cinema = document.getElementById('cinema');
  var lastBeat = cinema ? cinema.querySelector('.cinema__beat--last') : null;
  var lastY = window.pageYOffset || 0;
  var upRun = 0;
  var UP = 40; // px of scrolling up before it returns

  function setCinema(on) {
    header.classList.toggle('is-cinema', on);
  }

  function cinemaMode(y) {
    var dy = y - lastY;
    lastY = y;
    var pinned = false;
    if (cinema && lastBeat && cinema.classList.contains('is-scripted')) {
      pinned = cinema.getBoundingClientRect().top <= 1 && lastBeat.getBoundingClientRect().top > 1;
    }
    if (!pinned) {
      upRun = 0;
      setCinema(false);
    } else if (dy > 0) {
      upRun = 0;
      if (!header.contains(document.activeElement)) setCinema(true);
    } else if (dy < 0) {
      upRun -= dy;
      if (upRun > UP) setCinema(false);
    }
  }

  header.addEventListener('focusin', function () {
    setCinema(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setCinema(false);
  });

  function request() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }

  if (window.PAGE && window.PAGE.onChange) {
    window.PAGE.onChange(function () {
      renderLabel(false);
    });
  }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  window.addEventListener('load', request);
  // Fonts change line heights, and with them where the phone starts.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(request);
  update();
})();
