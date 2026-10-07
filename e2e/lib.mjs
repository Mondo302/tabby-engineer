// Shared Playwright launcher for the e2e scripts.
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
const pw = process.env.PLAYWRIGHT_DIR || (process.env.LOCALAPPDATA || '').replace(/\\/g, '/') + '/npm-cache/_npx/e41f203b7505f1fb/node_modules';
export const { chromium } = createRequire(pw + '/')('playwright');
const root = (process.env.LOCALAPPDATA || '').replace(/\\/g, '/') + '/ms-playwright';
export const exe = readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse()
  .map((d) => `${root}/${d}/chrome-headless-shell-win64/chrome-headless-shell.exe`).find(existsSync);

// The HTML phone as currently written has three cascade slips that make it
// look unlike its own CSS: the page rule `.section p { margin: 0 0 1rem }`
// leaks into the phone, `.btn` (later in the file) overrides `.btn--primary`,
// and the tab bar buttons keep the browser's button chrome. To compare with
// what the phone's own rules describe, this moves #prototype-root out of
// .section and adds three override rules. In the page only (nothing on
// disk changes).
export async function fixReference(page) {
  await page.evaluate(() => {
    const root = document.getElementById('prototype-root');
    const wrap = document.createElement('div');
    wrap.id = 'ref-wrap';
    document.body.appendChild(wrap);
    wrap.appendChild(root);
    const st = document.createElement('style');
    st.textContent = `
      #ref-wrap .btn--primary { background: var(--ink); color: var(--paper); border-color: var(--ink); }
      #ref-wrap .tabbar__item { border: 0; background: none; padding: 0; }
      #ref-wrap .tabbar__item.is-active { background: var(--n-100); }
      #ref-wrap { padding: 20px; }`;
    document.head.appendChild(st);
  });
}
