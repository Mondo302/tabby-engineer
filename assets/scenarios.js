// The three real cases the prototype demonstrates, as data.
//
// Every scenario traces to sourced research (see research.md §3 and §6).
// People are described by situation, never named.
//
// IMPORTANT: the amounts are EXAMPLES. The published tier figures could not
// be sourced — 1,500 turned out to be one merchant's own 18-21 invoice cap,
// 3,500 has no source, and 50,000 belongs to a different licensed product
// (research.md §1). The entry therefore never claims these as real limits.
// What it does cite: the regulator's SAR 10,000 per-consumer BNPL cap, and
// the company's own published position that it does not disclose limits.

window.SCENARIOS = [
  {
    id: 'silent-block',
    // Default on load: the strongest case we have.
    //
    // Checked against her own account (research.md §6): she pays upfront,
    // had nothing outstanding, was blocked for months, was told to "try
    // again in a few months", and it lifted on its own. So her way back is
    // TIME, not payments — she had no payments to make. The proposed
    // screens give her the date and say plainly that nothing is needed
    // from her; they must never show her a payment count.
    sourceKey: 'source.silentBlock',
    reasonKey: 'reason.paused',
    requested: 900,
    available: 0,
    planMonths: 4,
    // One plan (the flight), paid in full.
    facts: { accountAgeMonths: 14, completedPlans: 1, overdue: false },
    recoveryPath: 'time',
    // "A few months", made into a date.
    nextReviewISO: '2026-11-14',
    alternatives: [{ key: 'alt.remind' }],
    // The cause is illustrative: nobody, including support, knew hers. In
    // the real product it would come from the decision engine.
    event: { dateISO: '2026-08-14', textKey: 'limit.eventPaused', causeKey: 'cause.review' },
    progress: null,
    restoreTo: 3000,
    recovery: { from: 0, to: 3000 },
  },
  {
    id: 'new-account',
    sourceKey: 'source.newAccount',
    recoveryPath: 'payments',
    reasonKey: 'reason.newAccount',
    requested: 2400,
    available: 1800,
    planMonths: 4,
    facts: { accountAgeMonths: 2, onTimePayments: 4, overdue: false },
    nextReviewISO: '2026-10-14',
    alternatives: [
      { key: 'alt.splitPayment' },
      { key: 'alt.longerPlan', months: 3 },
    ],
    event: { dateISO: '2026-07-22', textKey: 'limit.eventNew', causeKey: 'cause.newAccount' },
    progress: { done: 4, needed: 6 },
    restoreTo: 3000,
    recovery: { from: 1800, to: 3000 },
  },
  {
    id: 'limit-cut',
    sourceKey: 'source.limitCut',
    recoveryPath: 'payments',
    reasonKey: 'reason.recentReview',
    requested: 1200,
    available: 400,
    planMonths: 4,
    facts: { accountAgeMonths: 14, onTimePayments: 19, overdue: false },
    nextReviewISO: '2026-10-02',
    alternatives: [{ key: 'alt.smallerCart' }],
    event: { dateISO: '2026-09-02', textKey: 'limit.event', causeKey: 'cause.usage' },
    progress: { done: 1, needed: 4 },
    restoreTo: 1600,
    recovery: { from: 400, to: 1600 },
  },
];
