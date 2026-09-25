// Phone frame, screen state machine, and the three controls:
// language, today/proposed, scenario. Built across increments 2-6.

(function () {
  'use strict';

  const root = document.getElementById('prototype-root');
  if (!root) return;

  const state = {
    lang: 'en',
    mode: 'proposed', // 'today' | 'proposed'
    scenarioId: 'silent-block', // strongest case loads first
    tab: 'nav.shop', // the app's four sections all work
    screen: 'tab', // 'tab' | checkout → processing → decline → limit → recovery
  };

  // --- helpers ---------------------------------------------------------------

  function t(key, params) {
    const table = window.STRINGS[state.lang] || {};
    const fallback = window.STRINGS.en[key];
    let text = table[key] !== undefined ? table[key] : fallback;
    if (text === undefined) return key; // visible, not silent
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.split('{' + name + '}').join(value);
      }
    }
    return text;
  }

  // Arabic uses the Gregorian calendar and Western digits. Plain 'ar-SA'
  // gives Hijri dates and Arabic-Indic digits, which would put two calendar
  // systems on one screen next to the Gregorian review dates. This is a
  // deliberate choice, not a copy of the real app's Arabic mode.
  function locale() {
    return state.lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB';
  }

  function money(amount) {
    const formatted = new Intl.NumberFormat(
      state.lang === 'ar' ? locale() : 'en-US'
    ).format(amount);
    return t('unit.currency', { amount: formatted });
  }

  function currentScenario() {
    return window.SCENARIOS.find((s) => s.id === state.scenarioId) || window.SCENARIOS[0];
  }

  function daysUntil(iso) {
    const ms = new Date(iso + 'T00:00:00') - new Date();
    return Math.max(0, Math.round(ms / 86400000));
  }

  function formatDate(iso) {
    return new Intl.DateTimeFormat(locale(), {
      day: 'numeric',
      month: 'long',
    }).format(new Date(iso + 'T00:00:00'));
  }

  // The Saudi riyal sign is a drawn glyph, not the Unicode character (U+20C1),
  // which the bundled fonts do not contain. Strings carry the {sar} token; el()
  // turns it into a masked span that keeps the text's colour and is named for
  // screen readers. textContent / text nodes only: never innerHTML.
  const SAR = '{sar}';

  function riyal() {
    const node = document.createElement('span');
    node.className = 'riyal';
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', t('unit.riyalName'));
    return node;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text === undefined) return node;
    if (text.indexOf(SAR) === -1) {
      node.textContent = text;
      return node;
    }
    text.split(SAR).forEach((part, i) => {
      if (i > 0) node.appendChild(riyal());
      if (part) node.appendChild(document.createTextNode(part));
    });
    return node;
  }

  // --- screens ---------------------------------------------------------------

  // What the app shows today: no reason, no date, no path forward.
  function renderToday() {
    const screen = el('div', 'screen screen--today');
    screen.appendChild(el('div', 'screen__glyph', '!'));
    screen.appendChild(el('h3', 'screen__title', t('today.title')));
    screen.appendChild(el('p', 'screen__body', t('today.body')));
    // Nothing sits behind this button in the prototype, so it is shown as in
    // today's app and marked as not usable, rather than silently doing nothing.
    const gotIt = el('button', 'btn btn--ghost', t('today.action'));
    gotIt.type = 'button';
    gotIt.setAttribute('aria-disabled', 'true');
    screen.appendChild(gotIt);
    screen.appendChild(el('p', 'screen__help', t('today.help')));
    return screen;
  }

  // --- tabs: a working copy of the app's four sections ----------------------
  //
  // Why these exist: a judge can tour the whole app and find no spending
  // limit anywhere — eleven settings rows, a payments screen that shows only
  // what you owe. The absence is the argument. In "proposed" mode the missing
  // pieces appear in place, which is a far better demonstration than a
  // before/after image.

  function chevronRow(label, sub, onClick) {
    const row = el(onClick ? 'button' : 'div', 'row');
    if (onClick) {
      row.type = 'button';
      row.addEventListener('click', onClick);
    }
    const text = el('span', 'row__text');
    text.appendChild(el('span', 'row__label', label));
    if (sub) text.appendChild(el('span', 'row__sub', sub));
    row.appendChild(text);
    row.appendChild(el('span', 'row__chevron', '›'));
    return row;
  }

  function renderHome() {
    const screen = el('div', 'screen screen--tab');
    screen.appendChild(el('div', 'searchbar', t('home.search')));

    const pair = el('div', 'tiles tiles--pair');
    for (const [title, sub] of [
      [t('home.allStores'), t('home.allStoresSub')],
      [t('home.deals'), t('home.dealsSub')],
    ]) {
      const tile = el('div', 'tile');
      tile.appendChild(el('p', 'tile__title', title));
      tile.appendChild(el('p', 'tile__sub', sub));
      pair.appendChild(tile);
    }
    screen.appendChild(pair);

    const promo = el('div', 'promo');
    promo.appendChild(
      el('p', 'promo__text', t('home.promo', { min: money(500), max: money(50000) }))
    );
    promo.appendChild(el('p', 'promo__action', t('home.promoAction')));
    screen.appendChild(promo);

    screen.appendChild(el('h4', 'tab__heading', t('home.storesForYou')));
    const grid = el('div', 'merchants');
    for (const m of window.APP_DATA.merchants) {
      const item = el('div', 'merchant');
      item.appendChild(el('span', 'merchant__mark merchant__mark--' + m.tone, m.name.charAt(0)));
      item.appendChild(el('span', 'merchant__name', m.name));
      grid.appendChild(item);
    }
    screen.appendChild(grid);
    return screen;
  }

  function renderShop(scenario) {
    const screen = el('div', 'screen screen--tab');
    screen.appendChild(el('div', 'searchbar', t('home.search')));
    screen.appendChild(el('h4', 'tab__heading', t('shop.categories')));

    const grid = el('div', 'tiles tiles--three');
    for (const category of window.APP_DATA.categories) {
      const tile = el('div', 'tile tile--category');
      tile.appendChild(el('p', 'tile__title', t(category.key)));
      grid.appendChild(tile);
    }
    screen.appendChild(grid);

    screen.appendChild(el('h4', 'tab__heading', t('shop.forYou')));
    const card = el('div', 'product');
    card.appendChild(el('div', 'product__image'));
    card.appendChild(el('p', 'product__name', t(window.APP_DATA.product.key)));
    card.appendChild(el('p', 'product__price', money(scenario.requested)));

    const buy = el('button', 'btn btn--primary', t('product.buy'));
    buy.type = 'button';
    buy.addEventListener('click', function () {
      state.screen = 'checkout';
      render();
    });
    card.appendChild(buy);
    screen.appendChild(card);
    return screen;
  }

  function renderPayments(scenario) {
    const screen = el('div', 'screen screen--tab');
    screen.appendChild(el('h3', 'tab__title', t('payments.title')));

    const due = el('div', 'due');
    due.appendChild(el('p', 'figure__label', t('payments.due')));
    due.appendChild(el('p', 'figure', money(0)));
    due.appendChild(el('p', 'due__total', t('payments.total', { amount: money(0) })));
    screen.appendChild(due);

    screen.appendChild(el('div', 'pill-button', t('payments.history')));

    // The proposed addition: the number that decides everything, on the
    // screen where money already lives.
    if (state.mode === 'proposed') {
      const limitCard = el('div', 'block');
      limitCard.appendChild(el('p', 'figure__label', t('payments.limitCard')));
      limitCard.appendChild(
        el(
          'p',
          'figure' + (scenario.available === 0 ? ' figure--none' : ''),
          scenario.available === 0 ? t('limit.blocked') : money(scenario.available)
        )
      );
      const why = el('button', 'linkish', t('payments.limitLink'));
      why.type = 'button';
      why.addEventListener('click', function () {
        state.screen = 'limit';
        render();
      });
      limitCard.appendChild(why);
      screen.appendChild(limitCard);
    }

    const empty = el('div', 'empty');
    empty.appendChild(el('p', 'empty__title', t('payments.clear')));
    empty.appendChild(el('p', 'empty__body', t('payments.clearBody')));
    screen.appendChild(empty);
    return screen;
  }

  function renderProfile() {
    const screen = el('div', 'screen screen--tab');
    screen.appendChild(el('div', 'avatar'));

    const top = el('div', 'block block--rows');
    top.appendChild(chevronRow(t('profile.complete')));
    top.appendChild(chevronRow(t('profile.invite'), t('profile.inviteSub', { amount: money(200) })));
    screen.appendChild(top);

    const cashback = el('div', 'block block--rows');
    cashback.appendChild(chevronRow(t('profile.cashback')));
    screen.appendChild(cashback);

    // In proposed mode the missing row appears here, where a user would
    // actually look for it.
    if (state.mode === 'proposed') {
      const limitBlock = el('div', 'block block--rows block--new');
      limitBlock.appendChild(
        chevronRow(t('profile.limit'), t('profile.limitSub'), function () {
          state.screen = 'limit';
          render();
        })
      );
      screen.appendChild(limitBlock);
    }

    const rows = el('div', 'block block--rows');
    for (const key of window.APP_DATA.profileRows) {
      rows.appendChild(chevronRow(t(key)));
    }
    screen.appendChild(rows);

    screen.appendChild(el('div', 'pill-button pill-button--quiet', t('profile.logout')));
    return screen;
  }

  // Screen 0: the checkout. The decline has to be earned, not displayed —
  // a judge who has just tapped "pay" feels the thing the entry is about.
  function renderCheckout(scenario) {
    const screen = el('div', 'screen screen--checkout');
    screen.appendChild(el('p', 'checkout__merchant', t('checkout.merchant')));

    const total = el('div', 'checkout__total');
    total.appendChild(el('p', 'figure__label', t('checkout.item')));
    total.appendChild(el('p', 'figure', money(scenario.requested)));
    screen.appendChild(total);

    const months = scenario.planMonths || 4;
    screen.appendChild(renderSchedule(scenario, null));
    screen.appendChild(
      el(
        'p',
        'checkout__terms',
        t('checkout.each', {
          amount: money(Math.round(scenario.requested / months)),
          n: months - 1,
        })
      )
    );

    const pay = el('button', 'btn btn--primary', t('checkout.pay'));
    pay.type = 'button';
    pay.addEventListener('click', function () {
      state.screen = 'processing';
      render();
      // A real beat. Instant rejection would read as a mock.
      window.setTimeout(function () {
        if (state.screen !== 'processing') return;
        state.screen = 'decline';
        render();
      }, 1400);
    });

    const footer = el('div', 'screen__footer');
    footer.appendChild(pay);
    screen.appendChild(footer);
    return screen;
  }

  function renderProcessing() {
    const screen = el('div', 'screen screen--processing');
    screen.appendChild(el('div', 'spinner'));
    screen.appendChild(el('p', 'screen__body', t('checkout.processing')));
    return screen;
  }

  // The motif: the instalment strip every BNPL user already reads. Blocked
  // here, under review on the limit screen, restored on recovery. One object,
  // three states, carrying the argument without prose.
  function renderSchedule(scenario, variant) {
    const list = el('ul', 'schedule');
    list.setAttribute('aria-label', t('schedule.label'));
    const months = scenario.planMonths || 4;
    // Checkout (no variant) and the decline both show what was ASKED for;
    // only the restored strip is built from an available amount.
    const total = variant === 'restored' ? scenario.available : scenario.requested;
    const each = Math.round(total / months);

    for (let i = 0; i < months; i += 1) {
      const cell = el('li', 'schedule__cell' + (variant ? ' schedule__cell--' + variant : ''));
      cell.appendChild(el('span', 'schedule__amount', money(each)));
      cell.appendChild(document.createTextNode(t('schedule.month', { n: i + 1 })));
      list.appendChild(cell);
    }
    return list;
  }

  // The proposed decline screen: reason category, options, review date.
  function renderDecline(scenario) {
    const screen = el('div', 'screen');
    screen.appendChild(el('h3', 'screen__title', t('decline.title')));
    screen.appendChild(renderSchedule(scenario, 'blocked'));

    const why = el('section', 'reason');
    why.appendChild(el('p', 'reason__label', t('decline.why')));
    why.appendChild(el('p', 'reason__text', t(scenario.reasonKey)));
    screen.appendChild(why);

    const amounts = el('dl', 'amounts');
    amounts.appendChild(el('dt', 'amounts__term', t('decline.requestedLabel')));
    amounts.appendChild(el('dd', 'amounts__value', money(scenario.requested)));
    if (scenario.available > 0) {
      amounts.appendChild(el('dt', 'amounts__term amounts__term--ok', t('decline.availableLabel')));
      amounts.appendChild(el('dd', 'amounts__value amounts__value--ok', money(scenario.available)));
    }
    screen.appendChild(amounts);

    if (scenario.alternatives.length) {
      const options = el('section', '');
      options.appendChild(el('p', 'options__label', t('decline.options')));
      const list = el('ul', 'options');
      const remainder = scenario.requested - scenario.available;
      for (const alt of scenario.alternatives) {
        list.appendChild(
          el(
            'li',
            'options__item',
            t(alt.key, {
              available: money(scenario.available),
              remainder: money(remainder),
              months: alt.months,
              date: formatDate(scenario.nextReviewISO),
            })
          )
        );
      }
      options.appendChild(list);
      screen.appendChild(options);
    }

    const review = el('section', 'review');
    review.appendChild(el('p', 'review__label', t('decline.review')));
    review.appendChild(
      el(
        'p',
        'review__value',
        t('decline.reviewValue', {
          date: formatDate(scenario.nextReviewISO),
          days: daysUntil(scenario.nextReviewISO),
        })
      )
    );
    // A block that lifts on a schedule needs one more sentence than a
    // limit you can pay your way back from: that nothing is asked of you.
    screen.appendChild(review);
    if (scenario.recoveryPath === 'time') {
      screen.appendChild(el('p', 'block__reassure', t('decline.nothingToDo')));
    }

    const link = el('button', 'screen__link', t('decline.limitLink'));
    link.type = 'button';
    link.addEventListener('click', function () {
      state.screen = 'limit';
      render();
    });
    screen.appendChild(link);
    return screen;
  }

  // Screen 2: why this limit is what it is, and what actually moves it.
  function renderLimit(scenario) {
    const screen = el('div', 'screen');

    const back = el('button', 'screen__back', t('limit.back'));
    back.type = 'button';
    back.addEventListener('click', function () {
      state.screen = 'decline';
      render();
    });
    screen.appendChild(back);

    screen.appendChild(el('p', 'figure__label', t('limit.current')));
    screen.appendChild(
      el(
        'p',
        'figure' + (scenario.available === 0 ? ' figure--none' : ''),
        scenario.available === 0 ? t('limit.blocked') : money(scenario.available)
      )
    );

    // 1. What happened — the dated event and its cause. This is the part
    // nobody currently gets, in the app or from support.
    const happened = el('section', 'block');
    happened.appendChild(el('h4', 'block__title', t('limit.happened')));
    happened.appendChild(
      el(
        'p',
        'block__text',
        t(scenario.event.textKey, { date: formatDate(scenario.event.dateISO) })
      )
    );
    happened.appendChild(el('p', 'block__text', t(scenario.event.causeKey)));
    if (!scenario.facts.overdue) {
      happened.appendChild(el('p', 'block__reassure', t('limit.notYourFault')));
    }
    screen.appendChild(happened);

    // 2. Where you are now — visible progress. This is what breaks the
    // catch-22: a path the user can watch themselves move along. Two kinds
    // of path, because limits come back two ways: through payments, or
    // through time. Today the app shows neither.
    const byTime = scenario.recoveryPath === 'time';
    const steps = byTime ? weeksProgress(scenario) : scenario.progress;
    const progressKey = byTime ? 'limit.progressTime' : 'limit.progress';

    const where = el('section', 'block');
    where.appendChild(el('h4', 'block__title', t('limit.where')));
    where.appendChild(el('p', 'progress__count', t(progressKey, steps)));

    const track = el('div', 'progress');
    track.setAttribute('role', 'img');
    track.setAttribute('aria-label', t(progressKey, steps));
    for (let i = 0; i < steps.needed; i += 1) {
      track.appendChild(el('span', 'progress__step' + (i < steps.done ? ' is-done' : '')));
    }
    where.appendChild(track);
    where.appendChild(el('p', 'block__text', t(byTime ? 'limit.progressTimeNote' : 'limit.progressNote')));
    screen.appendChild(where);

    // 3. What changes it — a conditional, not advice. The time path makes
    // no promise about the outcome of the review, only that it happens and
    // that she hears about it either way.
    const changes = el('section', 'block');
    changes.appendChild(el('h4', 'block__title', t('limit.changes')));
    const date = formatDate(scenario.nextReviewISO);
    if (byTime) {
      changes.appendChild(el('p', 'block__text block__text--strong', t('limit.restoreTime', { date })));
    } else {
      changes.appendChild(
        el(
          'p',
          'block__text block__text--strong',
          t('limit.restore', { amount: money(scenario.restoreTo), needed: steps.needed })
        )
      );
      changes.appendChild(el('p', 'block__text', t('limit.restoreOr', { date })));
    }
    changes.appendChild(el('p', 'block__text', t('limit.cannot')));
    screen.appendChild(changes);

    screen.appendChild(el('p', 'note', t('limit.bureau')));

    const forward = el('button', 'screen__link', t('limit.forward'));
    forward.type = 'button';
    forward.addEventListener('click', function () {
      state.screen = 'recovery';
      render();
    });
    screen.appendChild(forward);
    return screen;
  }

  // Screen 3: the one nobody currently gets. A block that ends silently is
  // still a block — this is the other half of the loop.
  function renderRecovery(scenario) {
    const screen = el('div', 'screen screen--recovery');
    screen.appendChild(el('h3', 'screen__title', t('recovery.title')));

    screen.appendChild(
      el(
        'p',
        'figure figure--restored',
        t('recovery.change', {
          from: money(scenario.recovery.from),
          to: money(scenario.recovery.to),
        })
      )
    );

    screen.appendChild(
      renderSchedule(
        { requested: scenario.recovery.to, available: scenario.recovery.to, planMonths: scenario.planMonths },
        'restored'
      )
    );

    screen.appendChild(
      el(
        'p',
        'screen__body',
        scenario.recoveryPath === 'time'
          ? t('recovery.becauseTime', { date: formatDate(scenario.nextReviewISO) })
          : t('recovery.because', { count: scenario.progress.needed })
      )
    );
    screen.appendChild(
      el('p', 'screen__body', t('recovery.next', { date: formatDate(nextReviewAfter(scenario.nextReviewISO)) }))
    );

    const again = el('button', 'btn', t('recovery.action'));
    again.type = 'button';
    again.addEventListener('click', function () {
      state.screen = 'decline';
      render();
    });
    const footer = el('div', 'screen__footer');
    footer.appendChild(again);
    screen.appendChild(footer);
    return screen;
  }

  // Weeks from the block to its scheduled review, and how many have
  // passed as of today. Computed live so the bar never goes stale.
  function weeksProgress(scenario) {
    const week = 7 * 86400000;
    const start = new Date(scenario.event.dateISO + 'T00:00:00');
    const end = new Date(scenario.nextReviewISO + 'T00:00:00');
    const needed = Math.max(1, Math.round((end - start) / week));
    const done = Math.min(needed, Math.max(0, Math.floor((new Date() - start) / week)));
    return { done, needed };
  }

  // The review after this one: three months on from the review that
  // restored the limit, so the recovery screen's dates follow each other.
  function nextReviewAfter(iso) {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + 3);
    return d.toISOString().slice(0, 10);
  }

  // --- device chrome ---------------------------------------------------------

  function svg(markup) {
    const wrap = document.createElement('span');
    wrap.className = 'statusbar__glyph';
    // Static, author-written markup only — never user or remote content.
    wrap.innerHTML = markup;
    return wrap;
  }

  // A real clock, so the frame never reads as a screenshot.
  function renderStatusBar() {
    const bar = el('div', 'statusbar');
    const now = new Date();
    const time = new Intl.DateTimeFormat(locale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
    bar.appendChild(el('span', 'statusbar__time', time));

    const icons = el('span', 'statusbar__icons');
    icons.appendChild(
      svg(
        '<svg class="statusbar__bars" width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">' +
          '<rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/>' +
          '<rect x="5" y="6" width="3" height="6" rx="1" fill="currentColor"/>' +
          '<rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/>' +
          '<rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>'
      )
    );
    icons.appendChild(
      svg(
        '<svg class="statusbar__wifi" width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">' +
          '<path d="M8 11.2 5.6 8.6a3.6 3.6 0 0 1 4.8 0L8 11.2Z" fill="currentColor"/>' +
          '<path d="M3.4 6.4a6.8 6.8 0 0 1 9.2 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
          '<path d="M1.2 4a10 10 0 0 1 13.6 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'
      )
    );
    icons.appendChild(
      svg(
        '<svg class="statusbar__battery" width="26" height="13" viewBox="0 0 26 13" aria-hidden="true">' +
          '<rect x="0.6" y="0.6" width="22" height="11.8" rx="3.4" stroke="currentColor" stroke-opacity="0.4" fill="none"/>' +
          '<rect x="2.4" y="2.4" width="15" height="8.2" rx="2.2" fill="currentColor"/>' +
          '<path d="M24.4 4.6v3.8a2 2 0 0 0 0-3.8Z" fill="currentColor" fill-opacity="0.4"/></svg>'
      )
    );
    bar.appendChild(icons);
    return bar;
  }

  // App chrome, matching the real product's shell: a light header with
  // notifications and support, and a floating pill tab bar. Their interface
  // language — never their logo or wordmark.
  function renderAppHeader() {
    const header = el('div', 'appbar');
    header.appendChild(
      svg(
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<path d="M12 3a6 6 0 0 0-6 6v3.6L4.6 15.4a1 1 0 0 0 .9 1.5h13a1 1 0 0 0 .9-1.5L18 12.6V9a6 6 0 0 0-6-6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
          '<path d="M9.6 19.4a2.6 2.6 0 0 0 4.8 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
      )
    );
    header.appendChild(
      svg(
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<path d="M4 13a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
          '<rect x="3" y="13" width="4" height="7" rx="2" fill="currentColor"/>' +
          '<rect x="17" y="13" width="4" height="7" rx="2" fill="currentColor"/></svg>'
      )
    );
    return header;
  }

  const TABS = [
    {
      key: 'nav.home',
      path: '<path d="M4 11.2 12 4.5l8 6.7V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" fill="none"/>',
    },
    {
      key: 'nav.shop',
      path: '<path d="M5 8h14l-1 12H6L5 8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" fill="none"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" stroke-width="1.7" fill="none"/>',
    },
    {
      key: 'nav.payments',
      path: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M12 4a8 8 0 0 1 8 8h-8V4Z" fill="currentColor"/>',
    },
    {
      key: 'nav.profile',
      path: '<circle cx="12" cy="9" r="3.4" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/>',
    },
  ];

  function renderTabBar() {
    const bar = el('nav', 'tabbar');
    bar.setAttribute('aria-label', t('nav.label'));

    for (const tab of TABS) {
      const item = el('button', 'tabbar__item' + (tab.key === state.tab ? ' is-active' : ''));
      item.type = 'button';
      item.setAttribute('aria-label', t(tab.key));
      item.setAttribute('aria-current', tab.key === state.tab ? 'page' : 'false');
      item.appendChild(
        svg('<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">' + tab.path + '</svg>')
      );
      item.addEventListener('click', function () {
        state.tab = tab.key;
        state.screen = 'tab'; // leaving the purchase flow returns to the app
        render();
      });
      bar.appendChild(item);
    }
    return bar;
  }

  // --- frame -----------------------------------------------------------------

  // The single most valuable control in the entry: the same decline, both
  // ways, one tap apart. It makes the argument without a paragraph.
  function renderModeToggle() {
    const wrap = el('div', 'toggle');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', t('ctl.modeLabel'));

    for (const mode of ['today', 'proposed']) {
      const button = el(
        'button',
        'toggle__btn',
        t(mode === 'today' ? 'ctl.modeToday' : 'ctl.modeProposed')
      );
      button.type = 'button';
      button.setAttribute('aria-pressed', String(state.mode === mode));
      button.addEventListener('click', function () {
        if (state.mode === mode) return;
        state.mode = mode;
        // Compare the decline itself: switching mid-flow should not send the
        // judge back to the checkout to tap through again.
        state.screen = state.screen === 'checkout' ? 'checkout' : 'decline';
        render();
        announce();
      });
      wrap.appendChild(button);
    }
    return wrap;
  }

  // The scenario picker: three real cases, each labelled with its own
  // source so a judge can see this wasn't invented for the demo. Picking
  // one jumps straight to the explanation screen — that's the comparison
  // the picker exists to make, not a detour back through checkout.
  function renderScenarioPicker() {
    const wrap = el('div', 'scenarios');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', t('ctl.scenarioLabel'));

    for (const scenario of window.SCENARIOS) {
      const card = el(
        'button',
        'scenarios__item' + (scenario.id === state.scenarioId ? ' is-active' : '')
      );
      card.type = 'button';
      card.setAttribute('aria-pressed', String(scenario.id === state.scenarioId));
      card.appendChild(el('span', 'scenarios__name', t(scenario.sourceKey)));
      card.appendChild(el('span', 'scenarios__sub', t(scenario.sourceKey + 'Sub')));
      card.addEventListener('click', function () {
        if (state.scenarioId === scenario.id) return;
        state.scenarioId = scenario.id;
        // Jump to the explanation screen in Proposed mode — comparing
        // cases is the point; re-running checkout each time is not.
        state.mode = 'proposed';
        if (state.screen === 'tab' || state.screen === 'checkout' || state.screen === 'processing') {
          state.screen = 'decline';
        }
        render();
        announce();
      });
      wrap.appendChild(card);
    }
    return wrap;
  }

  // A visitor's choice on the controls, told to anyone listening (cinema.js
  // forwards it to the Flutter phone, whose own controls are off in the story).
  function announce() {
    try {
      window.dispatchEvent(new CustomEvent('phone-control', { detail: { scenarioId: state.scenarioId, mode: state.mode } }));
    } catch (e) {
      /* old browsers: the HTML phone is still right */
    }
  }

  function render() {
    root.textContent = '';
    root.dataset.state = state.mode;

    // While the scroll story (cinema.js) is live, the case picker and the
    // Today/Proposed toggle live beside the phone, in the narration, and show
    // only in its last scene. Otherwise they sit above the phone, as always.
    const host = document.getElementById('cinema-controls');
    const controls = host && host.hasAttribute('data-live') ? host : root;
    if (host) host.textContent = '';
    controls.appendChild(renderScenarioPicker());
    controls.appendChild(renderModeToggle());

    const phone = el('div', 'phone');
    const screenShell = el('div', 'phone__screen');
    screenShell.appendChild(el('div', 'island'));
    screenShell.appendChild(renderStatusBar());

    screenShell.appendChild(renderAppHeader());

    const body = el('div', 'phone__body');
    const scenario = currentScenario();

    if (state.screen === 'tab') {
      if (state.tab === 'nav.home') body.appendChild(renderHome());
      else if (state.tab === 'nav.shop') body.appendChild(renderShop(scenario));
      else if (state.tab === 'nav.payments') body.appendChild(renderPayments(scenario));
      else body.appendChild(renderProfile());
    } else if (state.screen === 'checkout') {
      body.appendChild(renderCheckout(scenario)); // same start, both modes
    } else if (state.screen === 'processing') {
      body.appendChild(renderProcessing());
    } else if (state.mode === 'today' && state.screen === 'decline') {
      body.appendChild(renderToday()); // today's app has one screen: the dead end
    } else if (state.screen === 'limit') {
      body.appendChild(renderLimit(scenario));
    } else if (state.screen === 'recovery') {
      body.appendChild(renderRecovery(scenario));
    } else {
      body.appendChild(renderDecline(scenario));
    }

    screenShell.appendChild(body);
    screenShell.appendChild(renderTabBar());
    screenShell.appendChild(el('div', 'home-indicator'));
    phone.appendChild(screenShell);
    root.appendChild(phone);
  }

  render();

  // Exposed so later increments (and manual testing) can drive it.
  window.PROTOTYPE = {
    set(next) {
      Object.assign(state, next);
      render();
    },
    get state() {
      return Object.assign({}, state);
    },
  };
})();
