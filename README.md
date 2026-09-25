# Why was I declined? A design project

A single-page design project: a written story, then an interactive phone that shows the
same declined purchase told properly. Plain HTML, CSS and JavaScript, in English and Arabic.

> **This is prototype code.** It exists to make an argument, not to ship as a product.
> Amounts, causes and dates on the phone are illustrative. It is an independent concept:
> not made by, or affiliated with, Tabby.

## Run it

Any static server works, for example `npx http-server . -p 8936 -c-1`, then open
`http://localhost:8936/`. `?lang=ar` opens the Arabic page. There is no build step and no
dependency to install. `node scripts/serve.mjs 8937` does the same with Brotli, like a real
host.

## Working on it

This repository is the source of truth. Edit here, run the checks, commit, push: the site
at GitHub Pages rebuilds from `main` within a minute or two.

```
git pull
node scripts/check.mjs                # structure, links, anonymity, phone/ integrity
node scripts/smoke.js                 # the HTML phone against a DOM stub
node scripts/browser.mjs [baseUrl]    # real Chromium (Playwright): themes, RTL, contrast,
                                      # overflow, motion, the Flutter swap
node scripts/measure.mjs [baseUrl]    # cold-load bytes and timings
git add -A && git commit -m "..." && git push
```

`browser.mjs` needs Playwright with a Chromium install (`PLAYWRIGHT_DIR` points to a
`node_modules` folder that contains it). The anonymity check reads its forbidden terms from
an untracked `.identity-terms` file (one regular expression per line), because listing them
in a public repository would publish them. Without it, only the generic patterns run.
Commit as a neutral author (`git config user.name` and `user.email`, set per repository).

## How the phone works

The page ships **two implementations of the same phone**.

- The **HTML phone** (`assets/prototype.js`) renders at once and is the whole entry on its
  own. It is the fallback and is never removed.
- The **Flutter phone** (`phone/`) is an enhancement. `assets/phone.js` loads it lazily
  and lays it over the same box once it has painted its first frame.

The HTML phone stays when any of these hold: Save-Data, a 2g or slow-2g connection, or
`prefers-reduced-data`; no WebAssembly or WebGL; a screen 480px wide or narrower; a load
error; a load that takes longer than 12 seconds; or the visitor having touched the HTML
phone first. Only one phone is exposed to assistive technology at any time.

## Hosting

Any static host works if it serves `.wasm` as `application/wasm` and `.mjs` as
`text/javascript`. `vercel.json` sets long-lived caching for `phone/<hash>/`. Nothing is
fetched from another origin: no CDN, no analytics, no web fonts.

## Licence and credits

No licence has been chosen yet, so all rights are reserved for now.

- Fonts: IBM Plex Sans and IBM Plex Sans Arabic, under the SIL Open Font License 1.1. The
  licence text is in `assets/fonts/OFL-IBM-Plex.txt`.
- The phone bundle includes the Flutter engine (BSD-3-Clause); its notices are in
  `phone/<hash>/assets/NOTICES`.
