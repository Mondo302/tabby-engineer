{{flutter_js}}
{{flutter_build_config}}

// Embeds the Flutter view into #phone-host when the page provides one
// (host.html, and later the real page); otherwise it fills the body.
// If anything fails, reveals #phone-fallback inside the host so the page
// can show its own HTML phone instead of an empty box.
(function () {
  var host = document.getElementById('phone-host');
  // A page that keeps the phone in a sub-folder sets window.PHONE_BASE
  // ('phone/<version>/') before loading this file; every fetch (main.dart.*,
  // canvaskit, assets) is then resolved under it. Unset = next to the page.
  var base = typeof window.PHONE_BASE === 'string' ? window.PHONE_BASE : '';
  function fail(err) {
    if (window.console) console.info('phone: flutter load failed', err && err.message);
    var fb = document.getElementById('phone-fallback');
    if (fb) fb.hidden = false;
    window.dispatchEvent(new CustomEvent('phone-flutter-failed'));
  }
  // The loader injects main.dart.js as a <script> and does not surface a
  // failed fetch; watch for that script's error event ourselves.
  new MutationObserver(function (muts, obs) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.tagName === 'SCRIPT' && /main\.dart\.js/.test(n.src || '')) {
          n.addEventListener('error', function () { fail(new Error('main.dart.js failed')); });
          obs.disconnect();
        }
      });
    });
  }).observe(document, { childList: true, subtree: true });
  try {
    _flutter.loader.load({
      // The multithreading warning only says a page could be cross-origin isolated
      // for a faster renderer; the single-threaded path is what ships (see the
      // entry repo's README), so the message is noise.
      config: Object.assign(
        { suppressMultithreadingWarning: true },
        base ? { entrypointBaseUrl: base, canvasKitBaseUrl: base + 'canvaskit/' } : {}
      ),
      onEntrypointLoaded: async function (engineInitializer) {
        try {
          var opts = host ? { hostElement: host } : {};
          if (base) opts.assetBase = base;
          var app = await engineInitializer.initializeEngine(opts);
          await app.runApp();
        } catch (e) { fail(e); }
      },
    }).catch(fail);
  } catch (e) { fail(e); }
})();
