// The cinema: her case, played on the phone as the page scrolls.
//
// Progressive enhancement, the same rule as scroll.js. This file adds
// `is-scripted` to #cinema, and every rule that pins, hides or moves anything
// in app.css is scoped to it. Without it (no JavaScript, reduced motion, or
// this file failing) the block is a plain section: the phone with its controls
// beside the scenes as an ordered list.
//
// How it plays: the block is tall; its stage is `position: sticky`, so the
// browser pins it and scrolling stays the browser's own (no wheel or touch
// handling, no scroll-snap, nothing is ever cancelled). Each scene has a beat
// in the block; the scene is the last beat whose top has reached the top of
// the screen. On a scene change this file drives the phone:
//   HTML phone     window.PROTOTYPE.set({ mode, screen, tab, scenarioId })
//   Flutter phone  setPhoneScenario, setPhoneMode, then setPhoneScreen(screen,
//                  tab) and setPhoneControls(bool), only when setPhoneScreen
//                  exists. Mode goes first: in the Flutter phone a mode change
//                  jumps to the decline unless the screen is the checkout.
// Scene 3 is the processing screen. Both phones move on to the decline by
// themselves after 1.4 s; that is left alone (scene 4 is that decline).
//
// During scenes 1-7 the phone is inert, hidden from assistive technology (the
// narration carries the story) and not clickable, and the case picker and the
// Today/Proposed toggle are hidden. Scene 8 unlocks them. Classes, attributes
// and CSS variables only; the scaling variable (--fit) is written on resize,
// never during scrolling.

(function () {
  'use strict';

  var cinema = document.getElementById('cinema');
  var stage = document.getElementById('prototype-stage');
  var controls = document.getElementById('cinema-controls');
  if (!cinema || !stage || !controls || !window.PROTOTYPE) return;

  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var wide = mq('(min-width: 60rem)');
  var narrow = mq('(max-width: 480px)'); // the HTML phone drops its frame here

  var beats = [].slice.call(cinema.querySelectorAll('.cinema__beat'));
  var scenes = [].slice.call(cinema.querySelectorAll('.cinema__scene'));
  var dots = [].slice.call(cinema.querySelectorAll('.cinema__dots i'));
  var caption = cinema.querySelector('.cinema__caption');
  var header = document.querySelector('.site-header');

  var CASE = 'silent-block'; // her case
  var SCENES = [
    { mode: 'today', screen: 'tab', tab: 'nav.shop' },
    { mode: 'today', screen: 'checkout' },
    { mode: 'today', screen: 'processing' },
    { mode: 'today', screen: 'decline' },
    { mode: 'proposed', screen: 'decline' },
    { mode: 'proposed', screen: 'limit' },
    { mode: 'proposed', screen: 'recovery' },
    { mode: 'proposed', screen: 'tab', tab: 'nav.shop' }, // your turn
  ];
  var FREE = SCENES.length;

  var live = false;
  var queued = false;
  var current = 0;

  function sceneAt() {
    var n = 1;
    for (var i = 0; i < beats.length; i += 1) {
      if (beats[i].getBoundingClientRect().top <= 1) n = i + 1;
    }
    return Math.min(n, FREE);
  }

  function lock(on) {
    if (on) {
      stage.setAttribute('inert', '');
      stage.setAttribute('aria-hidden', 'true');
    } else {
      stage.removeAttribute('inert');
      stage.removeAttribute('aria-hidden');
    }
  }

  function flutter(s, free) {
    if (typeof window.setPhoneScreen !== 'function') return;
    try {
      if (typeof window.setPhoneScenario === 'function') window.setPhoneScenario(CASE);
      if (typeof window.setPhoneMode === 'function') window.setPhoneMode(s.mode);
      window.setPhoneScreen(s.screen, s.tab || 'nav.shop');
      if (typeof window.setPhoneControls === 'function') window.setPhoneControls(free);
    } catch (e) {
      /* the HTML phone underneath is still driven */
    }
  }

  function apply(n, force) {
    if (n === current && !force) return;
    current = n;
    var s = SCENES[n - 1];
    cinema.setAttribute('data-scene', String(n));
    cinema.setAttribute('data-mode', s.mode);
    for (var i = 0; i < scenes.length; i += 1) {
      if (i + 1 === n) scenes[i].setAttribute('aria-current', 'step');
      else scenes[i].removeAttribute('aria-current');
    }
    for (var d = 0; d < dots.length; d += 1) dots[d].classList.toggle('is-on', d < n);
    lock(n !== FREE);
    var next = { mode: s.mode, screen: s.screen, scenarioId: CASE };
    if (s.tab) next.tab = s.tab;
    window.PROTOTYPE.set(next);
    // On a narrow screen the frameless phone shows the top of each screen; in
    // the first scene the thing she taps (Buy) is at the bottom of the Shop tab.
    if (n === 1 && narrow.matches) {
      var body = stage.querySelector('.phone__body');
      if (body) body.scrollTop = body.scrollHeight;
    }
    // Flutter's own picker never shows inside the story's box (no room for it);
    // in the last scene the caption's controls drive it instead (onControl).
    flutter(s, false);
  }

  function onControl(e) {
    if (!live || typeof window.setPhoneScreen !== 'function' || !e.detail) return;
    try {
      if (typeof window.setPhoneScenario === 'function') window.setPhoneScenario(e.detail.scenarioId);
      if (typeof window.setPhoneMode === 'function') window.setPhoneMode(e.detail.mode);
    } catch (err) {
      /* the HTML phone underneath already changed */
    }
  }

  // Fit the whole device into the screen under the header's height (kept free
  // so the header never covers the phone when it comes back). The wrapper is
  // scaled, never the phone's insides; the box around it takes the scaled size.
  function fit() {
    if (!live) return;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var vw = document.documentElement.clientWidth;
    var band = header ? header.offsetHeight : 60;
    cinema.style.setProperty('--band', band + 'px');
    var pw = 390;
    var f;
    var ph;
    if (narrow.matches) {
      // Frameless: as wide as the screen allows, and as tall as the space left
      // under it, so the text stays readable and the screen shows its top part.
      f = Math.min(1, (vw - 32) / pw);
      var room = vh - band - caption.offsetHeight - 40; // two row gaps and the bottom padding
      ph = Math.max(280, Math.floor(room / f));
      cinema.style.setProperty('--screen-h', ph + 'px');
    } else {
      cinema.style.removeProperty('--screen-h');
      ph = stage.offsetHeight || 802;
      var availH = wide.matches ? vh - band - 24 : vh - band - caption.offsetHeight - 40;
      var availW = wide.matches ? Math.min(vw, 1152) * 0.46 : vw - 32;
      f = Math.min(1, availH / ph, availW / pw);
    }
    f = Math.max(0.3, f);
    cinema.style.setProperty('--fit', f.toFixed(4));
    cinema.style.setProperty('--pw', pw + 'px');
    cinema.style.setProperty('--ph', ph + 'px');
  }

  function update() {
    queued = false;
    if (live) apply(sceneAt());
  }

  function request() {
    if (queued || !live) return;
    queued = true;
    window.requestAnimationFrame(update);
  }

  function resized() {
    fit();
    request();
  }

  function onFlutterReady() {
    if (live) flutter(SCENES[current - 1], false);
  }

  function start() {
    if (live) return;
    live = true;
    cinema.classList.add('is-scripted');
    controls.setAttribute('data-live', '');
    apply(sceneAt(), true); // renders the controls into the narration
    fit();
    apply(sceneAt(), true); // the block's height depends on the fit
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (live) cinema.classList.add('is-armed');
      });
    });
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', resized);
    window.addEventListener('phone-flutter-ready', onFlutterReady);
    window.addEventListener('phone-control', onControl);
  }

  // Back to the plain section (reduced motion switched on mid-visit).
  function stop() {
    if (!live) return;
    live = false;
    window.removeEventListener('scroll', request);
    window.removeEventListener('resize', resized);
    window.removeEventListener('phone-flutter-ready', onFlutterReady);
    window.removeEventListener('phone-control', onControl);
    cinema.classList.remove('is-scripted', 'is-armed');
    cinema.removeAttribute('data-scene');
    cinema.removeAttribute('data-mode');
    ['--fit', '--pw', '--ph', '--band', '--screen-h'].forEach(function (v) { cinema.style.removeProperty(v); });
    controls.removeAttribute('data-live');
    scenes.forEach(function (li) { li.removeAttribute('aria-current'); });
    lock(false);
    current = 0;
    window.PROTOTYPE.set({ mode: 'proposed', screen: 'tab', tab: 'nav.shop', scenarioId: CASE });
    flutter(SCENES[FREE - 1], true);
  }

  if (window.PAGE && window.PAGE.onChange) window.PAGE.onChange(function () { if (live) fit(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (live) resized(); });
  window.addEventListener('load', function () { if (live) resized(); });

  function sync() {
    if (reduce.matches) stop();
    else start();
  }
  if (reduce.addEventListener) reduce.addEventListener('change', sync);
  else if (reduce.addListener) reduce.addListener(sync);
  sync();
})();
