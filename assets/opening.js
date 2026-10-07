// The opening's two small behaviours. Everything else about it is CSS.
//
// 1. The intro card draws its three empty rows when the intro scrolls into
//    view, not on load: .is-seen is added to #welcome once a quarter of the
//    card is visible. Without IntersectionObserver the class is added at once,
//    and without this file (no JavaScript) the CSS shows the card drawn.
// 2. In-page anchors ("Scroll down", "Read the story", "Go to the prototype")
//    scroll smoothly, and instantly when the visitor prefers reduced motion.
//    This is done here rather than with `scroll-behavior: smooth` so that the
//    page's own scroll code and every programmatic scrollTo stay instant.
(function () {
  'use strict';

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var intro = document.getElementById('welcome');
  var card = intro ? intro.querySelector('.wcard') : null;
  if (intro) {
    var seen = function () {
      intro.classList.add('is-seen');
    };
    if (!card || !('IntersectionObserver' in window)) {
      seen();
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i += 1) {
            if (entries[i].isIntersecting) {
              seen();
              io.disconnect();
              return;
            }
          }
        },
        { threshold: 0.25 }
      );
      io.observe(card);
    }
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var target = id ? document.getElementById(decodeURIComponent(id)) : null;
    if (!target || !target.scrollIntoView) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    try {
      window.history.pushState(null, '', '#' + id);
    } catch (err) {
      /* a sandboxed frame may refuse; the scroll still happened */
    }
    if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
    try {
      target.focus({ preventScroll: true });
    } catch (err) {
      /* focus is a courtesy to keyboard users, never required */
    }
  });
})();
