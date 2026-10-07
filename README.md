# Tabby Imagine entry page

A single-page competition entry: a written story, then an interactive phone that
shows the same declined purchase told properly. Plain HTML, CSS and JavaScript.

> **This is prototype code.** It exists to make an argument in a competition, not
> to ship as a product. Amounts, causes and dates on the phone are illustrative.

## Run it

```
npx http-server . -p 8936 -c-1        # any static server works
node scripts/serve.mjs 8937           # same, with Brotli like a real host
```

Open `http://localhost:8936/`. `?lang=ar` opens the Arabic page. There is no build
step and no dependency to install for the page itself.

## Checks

```
node scripts/check.mjs                # structure, links, anonymity, phone/ integrity
node scripts/smoke.js                 # the HTML phone against a DOM stub
node scripts/browser.mjs [baseUrl]    # real Chromium (Playwright): themes, RTL,
                                      # contrast, overflow, the Flutter swap
node scripts/measure.mjs [baseUrl]    # cold-load bytes and timings
```

`browser.mjs` needs Playwright with a Chromium install (`PLAYWRIGHT_DIR` points to a
`node_modules` folder that contains it). It is a development tool; nothing in it ships.

## How the phone works

The page ships **two implementations of the same phone**.

- The **HTML phone** (`assets/prototype.js`) renders at once and is the whole entry on
  its own. It is the fallback and is never removed.
- The **Flutter phone** (`phone/`) is an enhancement. `assets/phone.js` loads it lazily
  (when the phone is within a viewport of the screen, or after `load` and idle, whichever
  is first) and lays it over the same box once it has painted its first frame.

The HTML phone stays when any of these hold: Save-Data, a 2g or slow-2g connection, or
`prefers-reduced-data`; no WebAssembly or WebGL; a screen 480px wide or narrower (there the
HTML phone drops its device frame and fills the screen, which the fixed 390px Flutter phone
cannot do); a load error; a load that takes longer than 12 seconds; or the visitor having
touched the HTML phone first (their state is never thrown away). Only one phone is exposed to
assistive technology at any time (the other is `inert` and `aria-hidden`), and the swap moves
nothing: the HTML phone keeps its place in the layout underneath.

The page drives the Flutter phone through `window.setPhoneLanguage('ar'|'en')` and
`window.setPhoneTheme('dark'|'bright')`. Scenario and Today/Proposed live inside the phone.

## Rebuilding the phone

The Flutter source lives in its own repository (`../tabby-phone-flutter`). To update:

```
cd ../tabby-phone-flutter
node scripts/build-deploy.mjs         # release wasm build into dist/
cd ../tabby-imagine
node scripts/sync-phone.mjs           # copies dist/ to phone/<hash>/, updates assets/phone-version.js
node scripts/check.mjs && node scripts/browser.mjs
```

`phone/` is **committed** on purpose, so a plain static deploy of this repository works with
no build step. The cost is about 20 MB of binary in git, and each rebuild adds another copy to
history, so commit `phone/` only when the phone actually changed. The folder is named by a hash
of its contents, which is why everything in it can be cached forever.

## Hosting

`vercel.json` sets long-lived immutable caching for `phone/<hash>/`, revalidation for the HTML
and `assets/`, and explicit MIME types for `.wasm` and `.mjs`. Any static host works if it serves
`.wasm` as `application/wasm` and `.mjs` as `text/javascript`, and compresses text and wasm
(Brotli is best; the Flutter engine is about 1.6 MB compressed).

Nothing is fetched from another origin: no CDN, no analytics, no web fonts. `check.mjs` and
`browser.mjs` both fail if that changes.

## Licence

Placeholder: no licence has been chosen. Until one is added, all rights are reserved.
The page and the phone bundle IBM Plex fonts (SIL Open Font License; the licence text
is not yet included next to the font files, add it before publishing) and the Flutter engine
(BSD-3-Clause; its notices are in `phone/<hash>/assets/NOTICES`).
