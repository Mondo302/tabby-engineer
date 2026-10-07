// Render smoke tests. Not a browser — a minimal DOM stub — but it proves
// every screen path executes and produces the text it is supposed to.
// Catches the failure this project exists to avoid: "it parses" mistaken
// for "it works".
//
// Usage: node scripts/smoke.js

global.window = global;

function makeNode(tag) {
  return {
    tag,
    className: '',
    children: [],
    dataset: {},
    _text: '',
    set textContent(v) {
      this._text = v;
      if (v === '') this.children = [];
    },
    get textContent() {
      return this._text + this.children.map((c) => c.textContent || '').join(' ');
    },
    appendChild(c) {
      this.children.push(c);
      return c;
    },
    setAttribute() {},
    addEventListener() {},
    set type(v) {},
    get type() {
      return '';
    },
  };
}

const root = makeNode('div');
global.document = {
  _byId: { 'prototype-root': root },
  getElementById(id) {
    return this._byId[id] || null;
  },
  createElement: makeNode,
  createTextNode(text) {
    return { nodeType: 3, textContent: text, _text: text };
  },
};

require('../assets/strings.js');
require('../assets/scenarios.js');
require('../assets/app-data.js');
require('../assets/prototype.js');

const P = global.PROTOTYPE;
let failures = 0;

function check(label, condition) {
  console.log((condition ? '  ok   ' : '  FAIL ') + label);
  if (!condition) failures += 1;
}

const has = (pattern) => pattern.test(root.textContent);

P.set({ mode: 'proposed', screen: 'decline', scenarioId: 'silent-block' });
check('decline: shows a reason category', has(/automatic review/i));

// --- the never-late payer, checked against her own account (research §6) ---
// She paid upfront, had nothing outstanding, and the block lifted on its
// own after months. So her proposed screens must give a DATE and say
// nothing is needed from her. A payment count would be a path she could
// not walk: that is the bug these checks exist to keep out.
check('her case: the proposed decline gives a review date', has(/in \d+ days/));
check('her case: says nothing is needed from her', has(/Nothing is needed from you/));
check('her case: one next action that fits her — a reminder', has(/Remind me on/));
P.set({ screen: 'limit' });
check('her case: limit screen counts weeks to the review', has(/weeks until your review/));
check('her case: says spending was paused, not that a limit was lowered', has(/paused spending/) && !has(/lowered your limit/));
check('her case: limit screen never asks her for payments', !has(/on-time payments/i) && !has(/returns to/i));
check('her case: no promised outcome, only that she will hear either way', has(/notification with the result either way/));
P.set({ screen: 'recovery' });
check('her case: recovery credits the review, not payments she never made', has(/scheduled review/) && !has(/payments on time/));
check('her case: the next review comes after the one that restored her', has(/on 14 November/) && has(/Next review 14 February/));

// The payment path, on the limit-cut case.
P.set({ scenarioId: 'limit-cut', screen: 'limit' });
// The limit screen must diagnose, not lecture. Three questions in order:
// what happened, where am I, what changes it.
check('limit: names a dated event', has(/an automatic review lowered your limit/i));
check('limit: gives the cause, not generic advice', has(/Cause:/));
check('limit: shows progress toward the next review', has(/on-time payments since that review/i));
check('limit: states the condition that restores it', has(/returns to/i));
check('limit: says support cannot change it', has(/Support cannot change this/i));
check('limit: no generic tips ("pay on time, use regularly")', !has(/Using your plan regularly/i));

P.set({ screen: 'recovery' });
// Currency renders as the Saudi riyal glyph, never "SAR" — matching the
// real app (research §1b). Assert the glyph so a silent regression fails here.
const glyphs = (n) => (n.className === 'riyal' ? 1 : 0) + (n.children || []).reduce((a, c) => a + glyphs(c), 0);
check('recovery: shows the change in the limit', glyphs(root) >= 2);
check('recovery: the riyal is drawn (.riyal), never the U+20C1 character', !has(/\u20C1/) && !has(/{sar}/));
check('currency uses the riyal glyph, not "SAR"', !has(/\bSAR\b/));

// Screen must be named explicitly now that the four tabs exist: "today"
// is a mode, not a place.
P.set({ mode: 'today', screen: 'decline' });
check('today: is the dead end users actually get', has(/try again later/i));

P.set({ mode: 'proposed', scenarioId: 'new-account', screen: 'decline' });
check('new account: offers a real alternative', has(/by card|over 3 months/i));
check('new account: shows a dated review', has(/in \d+ days/));

P.set({ mode: 'proposed', scenarioId: 'silent-block', screen: 'checkout' });
check('checkout: is the first screen, so the decline is earned', has(/Pay in installments/i));
check('spelling matches the product: "installments", not "instalments"', !has(/\binstalments?\b/i));
check('checkout: shows the payment plan before paying', has(/Month 1/));

P.set({ screen: 'processing' });
check('processing: gives a real beat before the decline', has(/Checking your account/i));

// --- the four tabs, and the absence they demonstrate ------------------------

P.set({ mode: 'today', screen: 'tab', tab: 'nav.home' });
check('home tab: renders stores', has(/Stores for you/i));
check('home tab: uses invented merchants, no real brands', !has(/amazon|noon|puma|sharaf/i));

P.set({ tab: 'nav.shop' });
check('shop tab: has something to buy', has(/Buy with installments/i));

P.set({ tab: 'nav.payments' });
check('payments tab: shows what you owe', has(/You’re all caught up|Total due/i));
check("payments tab today: shows no spending limit", !has(/Available to spend/i));

P.set({ tab: 'nav.profile' });
check('profile tab today: lists settings', has(/Ratings & reviews/));
check('profile tab today: has NO limit row — the absence is the argument', !has(/Your spending limit/i));

P.set({ mode: 'proposed' });
check('profile tab proposed: the missing row appears in place', has(/Your spending limit/i));

P.set({ tab: 'nav.payments' });
check('payments tab proposed: the limit appears where money lives', has(/Available to spend/i));

// --- scenario picker: three real cases, each with its own source ----------

check(
  'scenario picker: all three source labels are on screen',
  has(/never-late payer/i) && has(/new account/i) && has(/limit cut/i)
);

// Switching case must actually re-render with the new data, not just
// relabel the active button.
P.set({ mode: 'proposed', screen: 'decline', scenarioId: 'silent-block' });
check('silent-block: shows its own reassurance line', has(/Nothing is needed from you/));
P.set({ scenarioId: 'new-account' });
check('switching scenario changes the rendered content', has(/by card/) && !has(/Nothing is needed from you/));

// NOT covered here: clicking a scenario card from checkout jumping to the
// decline screen. That logic lives inside the click handler itself, and
// this stub's addEventListener() is a no-op, so it can't fire a real click.
// Confirm this by hand in the browser click-through, not assumed from here.

// --- Arabic parity (spec criterion 10) --------------------------------------

const en = global.STRINGS.en;
const ar = global.STRINGS.ar;

// Arabic is written for every key (2026-09-26). The TODO_AR marker mechanism
// still exists so new English copy can land before its Arabic: a key may hold
// the marker only if it is named here, and every named key must still be a
// marker, so the list cannot quietly outlive the work. Empty means none pending.
const ARABIC_TODO = [];
const stray = Object.keys(ar).filter((k) => ar[k] === 'TODO_AR' && !ARABIC_TODO.includes(k));
check('parity: TODO_AR appears only on the whitelisted keys' + (stray.length ? ' — ' + stray.join(', ') : ''), stray.length === 0);
const stale = ARABIC_TODO.filter((k) => ar[k] !== 'TODO_AR');
check('parity: every whitelisted key is still a TODO_AR marker (remove it from ARABIC_TODO once translated)' + (stale.length ? ' — ' + stale.join(', ') : ''), stale.length === 0);
const isTodo = (k) => ARABIC_TODO.includes(k);

const missing = Object.keys(en).filter((k) => ar[k] === undefined);
check('parity: every English key has an Arabic value' + (missing.length ? ' — missing: ' + missing.join(', ') : ''), missing.length === 0);

const extra = Object.keys(ar).filter((k) => en[k] === undefined);
check('parity: no Arabic key without an English original' + (extra.length ? ' — extra: ' + extra.join(', ') : ''), extra.length === 0);

// An Arabic value identical to the English one is an untranslated string,
// unless it is genuinely language-neutral.
const NEUTRAL = ['unit.currency', 'lang.name.en', 'lang.name.ar']; // a language is named in its own language in both tables
const copied = Object.keys(en).filter((k) => !NEUTRAL.includes(k) && ar[k] === en[k]);
check('parity: no English left in the Arabic table' + (copied.length ? ' — ' + copied.join(', ') : ''), copied.length === 0);

// Placeholders must survive translation, or t() leaves "{amount}" on screen.
const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
const broken = Object.keys(en).filter((k) => !isTodo(k) && ar[k] !== undefined && placeholders(en[k]) !== placeholders(ar[k]));
check('parity: every {placeholder} is kept in Arabic' + (broken.length ? ' — ' + broken.join(', ') : ''), broken.length === 0);

// Inline markup in page copy must match too: same links, same emphasis.
const tags = (s) => (s.match(/<\/?(a|strong|em)\b/g) || []).join();
const markup = Object.keys(en).filter((k) => !isTodo(k) && /Html$/.test(k) && tags(en[k]) !== tags(ar[k]));
check('parity: page copy keeps the same inline markup' + (markup.length ? ' — ' + markup.join(', ') : ''), markup.length === 0);

const ARABIC = /[؀-ۿ]/;
const LATIN_WORD = /\b(?!A\/B\b|Trustpilot\b)[A-Za-z]{3,}\b/;
const failuresBefore = failures;
for (const screen of ['tab', 'checkout', 'processing', 'decline', 'limit', 'recovery']) {
  for (const mode of ['today', 'proposed']) {
    for (const tab of ['nav.home', 'nav.shop', 'nav.payments', 'nav.profile']) {
      if (screen !== 'tab' && tab !== 'nav.shop') continue;
      for (const scenarioId of ['silent-block', 'new-account', 'limit-cut']) {
      P.set({ lang: 'ar', mode, screen, tab, scenarioId });
      // Merchant names are invented brand names, left in Latin on purpose.
      const text = root.textContent.replace(/\b(Rawaa|Najd Gold|Falcon|Mirqab|Sahel|Tamra|Oud House|Wasl Fit)\b/g, '');
      if (!ARABIC.test(text) || LATIN_WORD.test(text)) {
        check('arabic: ' + scenarioId + '/' + mode + '/' + screen + '/' + tab + ' renders in Arabic only — found "' + (text.match(LATIN_WORD) || [''])[0] + '"', false);
      }
      }
    }
  }
}
if (failures === failuresBefore) {
  check('arabic: every screen, both modes, renders with no English words left', true);
}

P.set({ lang: 'ar', mode: 'proposed', screen: 'decline', scenarioId: 'new-account' });
check('arabic: dates and amounts use Western digits, not Arabic-Indic', /\d/.test(root.textContent) && !/[٠-٩]/.test(root.textContent));
check('arabic: dates are Gregorian (a Gregorian month name is shown)', /أكتوبر|سبتمبر|نوفمبر/.test(root.textContent));
P.set({ lang: 'en' });

// --- page.js: the written page and the language switch ---------------------

function pageNode(key) {
  return {
    key,
    textContent: '',
    innerHTML: '',
    attrs: {},
    getAttribute(n) {
      return n === 'data-i18n' ? key : this.attrs[n] === undefined ? null : this.attrs[n];
    },
    setAttribute(n, v) {
      this.attrs[n] = v;
    },
    removeAttribute(n) {
      delete this.attrs[n];
    },
  };
}
const pageNodes = Object.keys(en)
  .filter((k) => k.startsWith('page.') && k !== 'page.title' && k !== 'page.description')
  .map(pageNode);
// The fallback mechanism must stay tested even when no real key is pending, so a
// fixture key that holds the marker stands in for one.
global.STRINGS.en['zz.fixture'] = 'Fixture English';
global.STRINGS.ar['zz.fixture'] = 'TODO_AR';
const todoNodes = ARABIC_TODO.concat(['zz.fixture']).map(pageNode);
const htmlEl = { lang: 'en', dir: 'ltr', attrs: {}, setAttribute() {}, getAttribute: () => null };
const savedStorage = {};
global.localStorage = {
  getItem: (k) => (k in savedStorage ? savedStorage[k] : null),
  setItem: (k, v) => { savedStorage[k] = String(v); },
};
global.document.documentElement = htmlEl;
global.document.querySelectorAll = () => pageNodes.concat(todoNodes);
global.document.querySelector = () => null;
global.location = { search: '?lang=ar', href: 'http://x/?lang=ar' };
global.history = { replaceState() {} };
require('../assets/page.js');

const filled = (n) => n.textContent || n.innerHTML;
check('page: ?lang=ar sets the document to right-to-left Arabic', htmlEl.dir === 'rtl' && htmlEl.lang === 'ar-SA');
check('page: every page section is filled', pageNodes.every((n) => filled(n) && filled(n) !== n.key));
check('page: filled in Arabic, not English', pageNodes.every((n) => ARABIC.test(filled(n))));
check('page: exposes the current language and the prototype follows it', global.PAGE.lang === 'ar' && P.state.lang === 'ar');
check('page: a TODO_AR key shows its English, marked lang="en", never the marker', todoNodes.every((n) => filled(n) && filled(n) !== 'TODO_AR' && filled(n) !== n.key && n.attrs.lang === 'en'));
check('page: switching to English drops the lang="en" fallback marker and restores dir', (global.PAGE.setLang('en'), todoNodes.every((n) => n.attrs.lang === undefined) && htmlEl.dir === 'ltr' && P.state.lang === 'en'));
check('page: a chosen language is remembered (ti-lang)', savedStorage['ti-lang'] === 'en');
global.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
let blocked = null;
try { global.PAGE.setLang('ar'); } catch (e) { blocked = e; }
check('page: blocked storage never breaks the language switch', blocked === null && htmlEl.dir === 'rtl');
check('page: the header controls have Arabic labels for both themes and both menu names', ['header.language', 'header.languageMenu', 'header.themeToBright', 'header.themeToDark'].every((k) => ARABIC.test(ar[k])));
check('page: the unverified help-centre quotes are not in either string table', !/make more transactions|regardless of whether or not you are overdue/i.test(JSON.stringify(en) + JSON.stringify(ar)));

console.log(failures ? '\n' + failures + ' smoke failure(s)\n' : '\nSmoke tests pass\n');
process.exit(failures ? 1 : 0);
