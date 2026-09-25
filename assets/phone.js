// Progressive enhancement of the phone: the HTML phone (prototype.js) is the
// entry. This file may swap it for the Flutter build of the same phone, and
// leaves the HTML phone in place whenever anything says it should.
//
// Rules, all of them one-way safe (every "no" keeps the HTML phone):
//   start   when the phone is within one viewport of the screen, or after
//           `load` + idle, whichever is sooner. Not on Save-Data, 2g or
//           slow-2g, `prefers-reduced-data`, without WebAssembly or WebGL,
//           or on a narrow screen (see NARROW).
//   swap    only once Flutter has painted its first frame, and only if the
//           visitor has not touched the HTML phone (pointer, key or focus)
//           and has not been navigating by keyboard (see below).
//           A visitor's state is never thrown away.
//   keys    the HTML phone is made of real <button>s a keyboard reaches one by
//           one. The Flutter phone is a single tab stop: its buttons are
//           reachable by a screen reader (its accessibility tree) and by
//           pointer, not by Tab. So a visitor who has pressed Tab before the
//           swap keeps the HTML phone.
//   give up on a load error, or after 12 s: the HTML phone stays.
//   layout  the HTML phone is never removed from the layout. It is hidden
//           (visibility, inert, aria-hidden) while Flutter, absolutely
//           positioned over the same box, is shown. The stage keeps the HTML
//           phone's height, so the swap cannot move anything.
//   a11y    exactly one phone is exposed: the other is inert + aria-hidden.
//   sync    language and page theme are pushed to Flutter through
//           window.setPhoneLanguage / window.setPhoneTheme.
//
// Status is written to #prototype-stage[data-phone-status] for tests:
//   idle | loading | flutter | kept-html:<reason>
// Options (tests): window.PHONE_OPTIONS = { timeoutMs }.

(function () {
  'use strict';

  var stage = document.getElementById('prototype-stage');
  var root = document.getElementById('prototype-root');
  var host = document.getElementById('phone-host');
  if (!stage || !root || !host) return;

  // Below this width the HTML phone drops its device frame and fills the
  // screen; the Flutter phone is a fixed 390px device, so it is not used there.
  var NARROW = '(max-width: 480px)';
  var narrow = window.matchMedia ? window.matchMedia(NARROW) : { matches: false };
  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var opts = window.PHONE_OPTIONS || {};
  var TIMEOUT = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 12000;

  var started = false;
  var settled = false; // ready, failed or timed out: nothing more to decide
  var interacted = false;
  var keyboardUser = false;
  var timer = 0;

  function status(s) {
    stage.setAttribute('data-phone-status', s);
  }
  status('idle');

  // --- what shows, and who can reach it -----------------------------------------

  function expose(el, on) {
    if (on) {
      el.removeAttribute('inert');
      el.removeAttribute('aria-hidden');
    } else {
      el.setAttribute('inert', '');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function show(engine) {
    stage.setAttribute('data-engine', engine);
    expose(root, engine === 'html');
    expose(host, engine === 'flutter');
  }
  show('html');

  // --- has the visitor touched the HTML phone? -------------------------------------

  function touched() {
    interacted = true;
  }
  ['pointerdown', 'touchstart', 'keydown', 'focusin', 'click'].forEach(function (type) {
    root.addEventListener(type, touched, true);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') keyboardUser = true;
  }, true);

  // --- gates --------------------------------------------------------------------------

  function refusal() {
    var c = navigator.connection;
    if (c && (c.saveData === true || c.effectiveType === 'slow-2g' || c.effectiveType === '2g')) return 'slow-connection';
    if (window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches) return 'reduced-data';
    if (typeof window.WebAssembly !== 'object') return 'no-webassembly';
    try {
      var canvas = document.createElement('canvas');
      if (!(canvas.getContext('webgl2') || canvas.getContext('webgl'))) return 'no-webgl';
    } catch (e) {
      return 'no-webgl';
    }
    if (narrow.matches) return 'narrow';
    return '';
  }

  // --- state sync ----------------------------------------------------------------------

  function pageTheme() {
    return document.documentElement.getAttribute('data-theme') === 'bright' ? 'bright' : 'dark';
  }

  function sync() {
    try {
      if (window.setPhoneLanguage && window.PAGE) window.setPhoneLanguage(window.PAGE.lang);
      if (window.setPhoneTheme) window.setPhoneTheme(pageTheme());
    } catch (e) {
      /* the HTML phone stays authoritative if the hooks misbehave */
    }
  }

  if (window.PAGE) window.PAGE.onChange(function () { if (started) sync(); });
  if (window.MutationObserver) {
    new MutationObserver(function () { if (started) sync(); }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  // --- swap --------------------------------------------------------------------------------

  function giveUp(reason) {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    status('kept-html:' + reason);
    // Flutter may still be running; it stays hidden and unreachable.
    show('html');
    var ph = placeholder();
    if (ph && ph.parentNode) ph.parentNode.removeChild(ph);
  }

  // Flutter puts a one-pixel "Enable accessibility" button on <body> (outside
  // the host). While the HTML phone is the one showing it would be a second
  // phone's control in the accessibility tree, so it is parked (aria-hidden, out
  // of the tab order) until the swap, and removed if the swap never happens.
  function placeholder() {
    return document.querySelector('flt-semantics-placeholder');
  }
  function park(ph) {
    if (!ph || stage.getAttribute('data-engine') === 'flutter') return;
    ph.setAttribute('aria-hidden', 'true');
    ph.setAttribute('tabindex', '-1');
  }
  function watchPlaceholder() {
    park(placeholder());
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(function () {
      var ph = placeholder();
      if (!ph) return;
      if (stage.getAttribute('data-engine') === 'flutter') return mo.disconnect();
      // Flutter can still finish after the HTML phone was kept: drop the button.
      if (settled) ph.parentNode.removeChild(ph);
      else park(ph);
    });
    mo.observe(document.body, { childList: true });
  }

  function enableSemantics(tries) {
    // Flutter builds its accessibility tree (real buttons a keyboard and a
    // screen reader can reach) once its placeholder is activated. Do it for
    // the phone the visitor is about to use. The engine adds the button a
    // little after its first frame, so this retries until the tree exists.
    tries = tries || 0;
    if (host.querySelector('flt-semantics') || tries > 20) return;
    var ph = placeholder();
    if (ph) {
      ph.removeAttribute('aria-hidden');
      ph.setAttribute('tabindex', '0');
      ph.click();
    }
    window.setTimeout(function () { enableSemantics(tries + 1); }, 250);
  }

  function onReady() {
    if (settled) return;
    sync();
    // Two frames so the language / theme just pushed is painted before the reveal.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (settled) return;
        if (interacted) return giveUp('interacted');
        if (keyboardUser) return giveUp('keyboard');
        if (narrow.matches) return giveUp('narrow');
        settled = true;
        window.clearTimeout(timer);
        show('flutter');
        enableSemantics();
        status('flutter');
      });
    });
  }

  // A window that becomes narrow after the swap goes back to the HTML phone,
  // which is the one built for that width.
  function onNarrowChange() {
    if (narrow.matches && stage.getAttribute('data-engine') === 'flutter') {
      show('html');
      status('kept-html:narrow');
    }
  }
  if (narrow.addEventListener) narrow.addEventListener('change', onNarrowChange);
  else if (narrow.addListener) narrow.addListener(onNarrowChange);

  // --- start ---------------------------------------------------------------------------------

  function start() {
    if (started) return;
    var why = refusal();
    if (why === 'narrow') {
      status('kept-html:narrow'); // may still start if the window widens
      return;
    }
    if (why) {
      started = true;
      settled = true;
      status('kept-html:' + why);
      return;
    }
    started = true;
    status('loading');
    watchPlaceholder();
    window.addEventListener('phone-flutter-ready', onReady);
    window.addEventListener('phone-flutter-failed', function () { giveUp('failed'); });

    function arm() {
      timer = window.setTimeout(function () {
        if (document.hidden) {
          // A background tab paints nothing; count the time from when it is seen.
          document.addEventListener('visibilitychange', function once() {
            document.removeEventListener('visibilitychange', once);
            arm();
          });
        } else {
          giveUp('timeout');
        }
      }, TIMEOUT);
    }
    arm();

    var s = document.createElement('script');
    s.src = window.PHONE_BASE + 'flutter_bootstrap.js';
    s.async = true;
    s.onerror = function () { giveUp('failed'); };
    document.body.appendChild(s);
  }

  // `narrow` may flip before the load starts (rotation): try again then.
  function maybeStart() {
    if (!started) start();
  }
  if (narrow.addEventListener) narrow.addEventListener('change', function () { if (!narrow.matches) maybeStart(); });

  function afterLoadIdle() {
    var go = function () { maybeStart(); };
    if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 2500 });
    else window.setTimeout(go, 1500);
  }
  if (document.readyState === 'complete') afterLoadIdle();
  else window.addEventListener('load', afterLoadIdle);

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          io.disconnect();
          maybeStart();
        }
      },
      { rootMargin: '100% 0px 100% 0px' }
    );
    io.observe(stage);
  }
})();
