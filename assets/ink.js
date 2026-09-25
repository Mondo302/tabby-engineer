// Desktop only (fine pointer, motion allowed): the cursor becomes a small dot, and two
// soft clouds of the page's own colours follow it with lag, like ink moving in water.
// Also reveals the sections below the story as they come into view. Transform and
// opacity only; without this file nothing is hidden and the normal cursor stays.
(function () {
  'use strict';
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
  var reduce = mq('(prefers-reduced-motion: reduce)');

  // reveals
  var reveal = [].slice.call(document.querySelectorAll('[data-reveal]'));
  if (reveal.length && 'IntersectionObserver' in window && !reduce.matches) {
    document.documentElement.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-seen'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    reveal.forEach(function (el) { io.observe(el); });
  }

  // ink cursor
  if (!mq('(hover: hover) and (pointer: fine)').matches || reduce.matches) return;
  var dot = document.createElement('div');
  dot.className = 'ink-dot';
  var c1 = document.createElement('div');
  c1.className = 'ink-cloud';
  var c2 = document.createElement('div');
  c2.className = 'ink-cloud ink-cloud--2';
  [c2, c1, dot].forEach(function (el) { el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); });
  var x = -999, y = -999, a = { x: x, y: y }, b = { x: x, y: y }, running = false;
  function frame() {
    a.x += (x - a.x) * 0.12; a.y += (y - a.y) * 0.12;
    b.x += (x - b.x) * 0.05; b.y += (y - b.y) * 0.05;
    dot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    c1.style.transform = 'translate(' + a.x + 'px,' + a.y + 'px)';
    c2.style.transform = 'translate(' + b.x + 'px,' + b.y + 'px) scale(' + (1 + Math.min(0.35, Math.hypot(x - b.x, y - b.y) / 900)) + ')';
    if (Math.abs(x - b.x) + Math.abs(y - b.y) > 0.5) window.requestAnimationFrame(frame);
    else running = false;
  }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (x === -999) { a.x = b.x = e.clientX; a.y = b.y = e.clientY; }
    x = e.clientX; y = e.clientY;
    document.documentElement.classList.add('ink-on');
    if (!running) { running = true; window.requestAnimationFrame(frame); }
  }, { passive: true });
  document.addEventListener('mouseleave', function () { document.documentElement.classList.remove('ink-on'); });
})();
