// Scroll motion for the story sections (increment 2).
//
// Motion only enhances. This file adds the class `is-live` to a section, and
// every rule that hides or moves something in app.css is scoped to it. If this
// script does not run, or the visitor prefers reduced motion, nothing is
// hidden and nothing moves: the copy and the scene show in their final state.
//
// The maths is plain scroll position, no library: each frame (throttled by
// requestAnimationFrame) it reads where the beats are relative to a reading
// line 60% of the way down the screen and toggles classes. CSS does the
// easing. Nothing here writes a layout property.

(function () {
  'use strict';

  var pain = document.getElementById('pain');
  var agitate = document.getElementById('agitate');
  var proto = document.getElementById('prototype');
  if (!pain || !agitate) return;

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var beats = [].slice.call(pain.querySelectorAll('.story__lines .story__beat'));
  var stops = [].slice.call(pain.querySelectorAll('[data-at]'));
  var neutral = pain.querySelector('[data-neutral]');
  var acts = [].slice.call(agitate.querySelectorAll('.story__act'));
  var end = agitate.querySelector('.story__end');
  var closing = agitate.querySelector('.story__closing');
  var climax = agitate.querySelector('.climax');
  var seenEls = [].slice.call(document.querySelectorAll('[data-seen]'));

  var live = false;
  var queued = false;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // Scene 1. `progress` is "which beat, and how far through it": 4.5 is halfway
  // through the fourth beat. Every marker, the bubble and the slot are pinned
  // to a progress value in the markup (data-at), so the picture follows the words.
  function updatePain(vh) {
    var line = vh * 0.6;
    var current = 0;
    var progress = 0;
    for (var i = 0; i < beats.length; i += 1) {
      var r = beats[i].getBoundingClientRect();
      if (r.top <= line) {
        current = i + 1;
        progress = current + clamp((line - r.top) / (r.height || 1), 0, 0.999);
      }
    }
    for (var b = 0; b < beats.length; b += 1) {
      beats[b].classList.toggle('is-current', b + 1 === current);
      beats[b].classList.toggle('is-past', b + 1 < current);
    }
    for (var s = 0; s < stops.length; s += 1) {
      stops[s].classList.toggle('is-on', progress >= parseFloat(stops[s].getAttribute('data-at')));
    }
    if (neutral) neutral.classList.toggle('is-neutral', progress >= parseFloat(neutral.getAttribute('data-neutral')));
  }

  // Scene 2. Acts stack in as they reach the lower part of the screen; the
  // count drives the frame and the warmth through data-n. The closing line
  // arrives on its own; the phone section lifts in after it, and the warmth
  // lets go as it does.
  function updateAgitate(vh) {
    var n = 0;
    for (var a = 0; a < acts.length; a += 1) {
      var on = acts[a].getBoundingClientRect().top < vh * 0.78;
      acts[a].classList.toggle('is-on', on);
      if (on) n += 1;
    }
    agitate.setAttribute('data-n', String(n));
    // The climax picture plays when it is actually on screen, not when its act begins.
    if (climax) climax.classList.toggle('is-seen', climax.getBoundingClientRect().top < vh * 0.82);
    var alone = closing && end ? end.getBoundingClientRect().top < vh * 0.55 : false;
    if (closing) closing.classList.toggle('is-on', alone);
    agitate.classList.toggle('is-alone', alone);
    var protoIn = proto ? proto.getBoundingClientRect().top < vh * 0.85 : false;
    if (proto) proto.classList.toggle('is-in', protoIn);
    agitate.classList.toggle('is-released', protoIn || agitate.getBoundingClientRect().bottom < 0);
  }

  function update() {
    queued = false;
    if (!live) return;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    updatePain(vh);
    updateAgitate(vh);
    // Anything marked data-seen plays when it is actually on screen.
    for (var q = 0; q < seenEls.length; q += 1) {
      seenEls[q].classList.toggle('is-seen', seenEls[q].getBoundingClientRect().top < vh * 0.85);
    }
  }

  function request() {
    if (queued || !live) return;
    queued = true;
    window.requestAnimationFrame(update);
  }

  function start() {
    if (live) return;
    live = true;
    pain.classList.add('is-live');
    agitate.classList.add('is-live');
    if (proto) proto.classList.add('is-live');
    update();
    // Arm the easing only after the first state has been painted, so nothing
    // animates at load.
    void pain.offsetWidth;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (!live) return;
        [pain, agitate, proto].forEach(function (el) {
          if (el) el.classList.add('is-armed');
        });
      });
    });
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
  }

  // Back to the static, final state (reduced motion switched on mid-visit).
  function stop() {
    if (!live) return;
    live = false;
    window.removeEventListener('scroll', request);
    window.removeEventListener('resize', request);
    [pain, agitate, proto].forEach(function (el) {
      if (el) el.classList.remove('is-live', 'is-armed', 'is-in', 'is-released', 'is-alone');
    });
    beats.forEach(function (el) { el.classList.remove('is-current', 'is-past'); });
    stops.forEach(function (el) { el.classList.remove('is-on'); });
    acts.forEach(function (el) { el.classList.remove('is-on'); });
    if (closing) closing.classList.remove('is-on');
    if (climax) climax.classList.remove('is-seen');
    seenEls.forEach(function (el) { el.classList.remove('is-seen'); });
    if (neutral) neutral.classList.add('is-neutral');
    agitate.removeAttribute('data-n');
  }

  function sync() {
    if (reduce.matches) stop();
    else start();
  }
  if (reduce.addEventListener) reduce.addEventListener('change', sync);
  else if (reduce.addListener) reduce.addListener(sync);
  sync();
})();
