// Every user-facing string, English and Arabic, in one place.
// Nothing in the UI is written inline: full parity is a build requirement
// (spec criterion 10), and one file is what keeps the two languages honest.
//
// {placeholders} are filled by t() in prototype.js.

window.STRINGS = {
  en: {
    // --- checkout: the moment before the decline ---
    'checkout.merchant': 'Checkout',
    'checkout.item': 'Order total',
    'checkout.split': 'Split into {n} payments',
    'checkout.each': '{amount} today, then {n} monthly',
    // "installments" — the American spelling, matching the product's own
    // usage (checkout.tabby.ai/.../installments/).
    'checkout.pay': 'Pay in installments',

    // --- app chrome ---
    'nav.home': 'Home',
    'nav.shop': 'Shop',
    'nav.payments': 'Payments',
    'nav.profile': 'Profile',

    // --- home tab ---
    'home.search': 'Stores or products',
    'home.allStores': 'All stores',
    'home.allStoresSub': 'Shop and split',
    'home.deals': 'Deals',
    'home.dealsSub': 'Discounts up to 80%',
    'home.storesForYou': 'Stores for you',
    'home.viewAll': 'View all',
    'home.promo': 'Pay in up to 12 months on purchases from {min} up to {max}.',
    'home.promoAction': 'Shop now',

    // --- shop tab ---
    'shop.categories': 'Top categories',
    'cat.mobiles': 'Mobiles',
    'cat.electronics': 'Electronics',
    'cat.travel': 'Travel',
    'cat.clothing': 'Clothing',
    'cat.beauty': 'Beauty & Health',
    'cat.home': 'Home & Appliances',
    'shop.forYou': 'Picked for you',
    'product.phone': 'Smartphone, 256GB',
    'product.buy': 'Buy with installments',

    // --- payments tab ---
    'payments.title': 'Payments',
    'payments.due': 'Due in 30 days',
    'payments.total': 'Total due {amount}',
    'payments.history': 'View history',
    'payments.clear': "You're all caught up",
    'payments.clearBody':
      'When you make new purchases, you’ll be able to view them here. You can also manage your upcoming payments from this screen.',

    // --- profile tab ---
    'profile.complete': 'Complete your profile',
    'profile.invite': 'Invite friends',
    'profile.inviteSub': 'Earn up to {amount}',
    'profile.cashback': 'Cashback',
    'profile.personal': 'Personal details',
    'profile.contact': 'Contact us',
    'profile.ratings': 'Ratings & reviews',
    'profile.favourites': 'Favourites',
    'profile.privacy': 'Privacy & security',
    'profile.language': 'Language',
    'profile.business': 'For business',
    'profile.logout': 'Log out',

    // --- the row that does not exist today ---
    'profile.limit': 'Your spending limit',
    'profile.limitSub': 'Why it is what it is, and when it changes',
    'payments.limitCard': 'Available to spend',
    'payments.limitLink': 'Why this amount?',
    'checkout.processing': 'Checking your account',

    // --- today's experience (what the app actually shows now) ---
    'today.title': 'Something went wrong',
    'today.body': "We couldn't approve this purchase. Please try again later.",
    'today.action': 'Got it',
    'today.help': 'Visit Help Centre',

    // --- proposed: the decline screen ---
    'decline.title': "This purchase wasn't approved",
    'decline.why': 'Why',
    'decline.requestedLabel': 'Requested',
    'decline.availableLabel': 'Available now',
    'decline.options': 'What you can do',
    'decline.review': 'Next review',
    'decline.reviewValue': '{date}, in {days} days',
    'decline.nothingToDo': 'Nothing is needed from you. This lifts at the review, not through anything you do.',
    'decline.limitLink': 'See how your limit works',

    // --- the schedule motif ---
    'schedule.label': 'Your payment plan',
    'schedule.month': 'Month {n}',

    // --- limit detail ---
    // Three questions, in the order a blocked person actually asks them:
    // what happened, where am I now, what changes it.
    'limit.title': 'Your spending limit',
    'limit.current': 'Available to spend',
    'limit.blocked': 'Nothing available right now',

    'limit.happened': 'What happened',
    'limit.event': 'On {date}, an automatic review lowered your limit.',
    'limit.eventNew': 'On {date}, your account was opened with a starting limit.',
    'limit.eventPaused': 'On {date}, an automatic review paused spending on your account.',
    'cause.review': 'Cause: a scheduled risk review of your account, not a missed payment.',
    'cause.newAccount': 'Cause: new accounts start lower until there is a payment history.',
    'cause.usage': 'Cause: a change in how the account was being used.',
    'limit.notYourFault': 'You have missed no payments. This was not a penalty.',

    'limit.where': 'Where you are now',
    'limit.progress': '{done} of {needed} on-time payments since that review',
    'limit.progressNote': 'Each payment you make on time counts toward the next review.',
    'limit.progressTime': '{done} of {needed} weeks until your review',
    'limit.progressTimeNote': 'This runs on a schedule. Nothing you do speeds it up or holds it back.',

    'limit.changes': 'What changes it',
    'limit.restore': 'Your limit returns to {amount} after {needed} on-time payments.',
    'limit.restoreOr': 'Or at the next automatic review on {date}, whichever comes first.',
    'limit.restoreTime':
      'Your account is reviewed again on {date}. You’ll get a notification with the result either way.',
    'limit.cannot': 'Support cannot change this, so there is no call to make.',

    'limit.bureau':
      'Reviews can use credit data we receive from outside, which is why some details can’t be shown.',
    'limit.back': 'Back',
    'limit.forward': 'See what happens at the review',

    // --- recovery (the screen nobody currently gets) ---
    'recovery.title': 'Your limit has been reviewed',
    'recovery.change': '{from} to {to}',
    'recovery.because': 'Because you made {count} payments on time since the last review.',
    'recovery.becauseTime': 'Restored at your scheduled review on {date}. Nothing was needed from you.',
    'recovery.next': 'Next review {date}.',
    'recovery.action': 'Start again',

    // --- reason categories (never the exact rule: anti-gaming, research §4) ---
    'reason.newAccount':
      'Your account is still new, so your limit starts lower. This is not about missed payments.',
    'reason.amountOverLimit':
      'This amount is above your current limit. Your payment history is in good standing.',
    'reason.paused':
      'An automatic review has paused spending on your account for now. You have no missed payments.',
    'reason.recentReview':
      'A recent automatic review lowered your limit. Reviews use your payment history and credit bureau data.',

    // --- alternatives ---
    'alt.splitPayment': 'Pay {available} with us, {remainder} by card',
    'alt.longerPlan': 'Split {available} over {months} months',
    'alt.smallerCart': 'Remove {remainder} from your cart',
    'alt.remind': 'Remind me on {date}',

    // --- controls ---
    'ctl.modeToday': 'Today',
    'ctl.modeProposed': 'Proposed',
    'ctl.modeLabel': 'Compare the same decline',
    'ctl.scenarioLabel': 'Three real cases',

    // --- scenario picker: each case labelled with its real source ---
    'source.silentBlock': 'The never-late payer',
    'source.silentBlockSub': 'Declined for months. Support couldn’t explain why.',
    'source.newAccount': 'The new account',
    'source.newAccountSub': 'Fresh signup, cleared at a lower amount, no choice of plan length.',
    'source.limitCut': 'The limit cut',
    'source.limitCutSub': 'Long-standing account, reviewed, reduced without warning.',

    'nav.label': 'App sections',

    // --- units ---
    // The real app renders the new Saudi riyal glyph, never the letters
    // "SAR" (observed in-app, research §1b).
    'unit.currency': '{sar} {amount}',
    'unit.riyalName': 'Saudi riyal',

    // --- the written page around the prototype ---
    // Keys ending in "Html" may contain a small set of inline tags (a,
    // strong, em). They are author-written static text, never user input.
    'page.title': 'Why was I declined?',
    'page.description':
      'An improvement to how a buy-now-pay-later app explains a declined purchase or a changed spending limit.',
    // --- header controls ---
    'header.language': 'Language',
    'header.languageMenu': 'Choose language',
    'header.themeToBright': 'Switch to bright mode',
    'header.themeToDark': 'Switch to dark mode',
    // The header's label follows the story: it names the beat you are reading.
    'chapter.hook': 'She never paid late',
    'chapter.opening': 'A plane ticket',
    'chapter.rising': 'Months of declines',
    'chapter.climax': 'The number the app hides',
    'chapter.falling': 'The same decline, told properly',
    'chapter.conclusion': 'How it should end',

    // --- the welcome, the bridge into the phone, and the ending ---
    // Draft copy, to be rewritten first-person by the entrant. Facts only from
    // research section 6; the card and the ending are design claims, not Tabby
    // quotes.
    'hello.title': 'Welcome',
    'hello.lead': 'This is my project.',
    'hello.cue': 'Scroll down',
    'welcome.lead': 'It’s a design project.',
    'welcome.body':
      'I noticed something in buy-now-pay-later apps. They can decline a purchase and never say why. I redesigned that moment.',
    'welcome.note': 'It’s an independent concept of mine. It isn’t made by, or affiliated with, Tabby.',
    'welcome.start': 'Read the story',
    'welcome.skip': 'Go to the prototype',
    'welcome.card.status': 'Purchase declined',
    'welcome.card.reason': 'Reason',
    'welcome.card.review': 'Next review',
    'welcome.card.next': 'What to do next',
    's3.bridge': 'So I redesigned the one moment that failed her.',
    'end.h2': 'Now imagine the app had told her.',
    'end.l1': 'Why her payments were declined.',
    'end.l2': 'When it would be looked at again.',
    'end.l3': 'Your limit was reviewed and restored.',
    'end.name': 'This isn’t a decline problem. It’s a silence problem.',
    'end.fix': 'Say why. Say when it will be looked at again. Say when it’s over.',
    'welcome.fix': 'The fix in one sentence: when a purchase is declined, say why, say when it will be looked at again, and offer one thing the person can do.',
    'stream.today': 'Today',
    'stream.proposed': 'Proposed',
    'stream.declined': 'Purchase declined',
    'stream.t2': 'The app gives no reason, no date and no next step',
    'stream.t3': 'A generic help article: try again',
    'stream.t4': 'Guesswork, or a relative’s theory',
    'stream.tEnd': 'Trust drops. No way back to a higher limit.',
    'stream.p2': 'Same screen: the reason, the next review and one next step',
    'stream.p3': 'The person acts: a smaller amount, another plan, an instalment paid',
    'stream.p4': 'The purchase completes, or they wait knowing what comes next',
    'stream.pEnd': 'On-time payments build the history a higher limit needs.',
    'cases.h2': 'Three people, one gap',
    'cases.lede': 'Two are people I spoke to. The third is a pattern in public reviews. None of it is a Tabby statement.',
    'cases.fact': 'What happened',
    'cases.gap': 'What was missing',
    'cases.fix': 'What the screen says instead',
    'cases.c1.title': 'The never-late payer',
    'cases.c1.fact': 'Pays upfront, never late. Declined for months. Support couldn’t explain why.',
    'cases.c1.gap': 'No reason, no review date, and nobody told her when it was fixed.',
    'cases.c1.fix': 'It’s a review. Here’s the date. Nothing is needed from you. We’ll tell you when it lifts.',
    'cases.c2.title': 'The new account',
    'cases.c2.fact': 'Tried 2,000, 3,000, 4,000 and 5,000: all declined. 1,800 went through, for 3 months only.',
    'cases.c2.gap': 'The app never said the starting limit is low, and offered no choice of plan length.',
    'cases.c2.fix': 'Your account is new, so your limit starts lower. Here’s what fits: a smaller amount, or another plan length.',
    'cases.c3.title': 'The limit cut',
    'cases.c3.fact': 'A long-standing account, reviewed, and its limit reduced without warning.',
    'cases.c3.gap': 'No notice of the cut, no reason, and no date for the next review.',
    'cases.c3.fix': 'A review lowered your limit. The next one is on this date. Here’s what counts toward it.',
    'skip.h2': 'What I chose not to build',
    'skip.l1Html': '<strong>A real Tabby connection.</strong> This is a static demonstration with realistic mock data: no backend, no accounts, no database.',
    'skip.l2Html': '<strong>Fixes for cashback, cards, refunds or human support.</strong> Those complaints are real. I left them out to keep one idea sharp.',
    'skip.l3Html': '<strong>Exact decline rules, or a promise of a higher limit.</strong> The fix makes a decision legible. Saudi regulation caps how much a person can owe through buy-now-pay-later, so it can’t promise growth.',
    'page.metricsHow': 'How I’d run it: show the new decline screen to half of new and recently reviewed accounts, keep today’s screen for the other half, and compare these three numbers after a fixed period. I’m not predicting the results.',
    'ships.h2': 'What ships first',
    'ships.p1': 'One screen: the decline screen. Add a reason category, the date of the next review and one next step, and nothing else.',
    'ships.p2': 'The limit screen, the “restored” message and the plan-length alternatives come after, and each one has to earn its place against the three numbers above.',
    'sources.h2': 'Sources and limits',
    'sources.lede': 'What I used, and what it can’t tell you.',
    'sources.s1Html': 'Tabby’s own help article on declined purchases: <a href="https://tabby.ai/en-SA/help/help-declined-purchases/why-was-my-tabby-purchase-not-approved">Why was my Tabby purchase not approved?</a>',
    'sources.s2Html': 'The regulator’s rules for buy-now-pay-later companies: <a href="https://rulebook.sama.gov.sa/en/rules-regulating-buy-now-pay-later-bnpl-companies-0">SAMA rulebook</a>',
    'sources.s3Html': 'Public reviews of the app: <a href="https://www.trustpilot.com/review/tabby.ai">Trustpilot</a>',
    'sources.s4': 'Two conversations with people who use Tabby, and my own walkthrough of the app.',
    'sources.l1': 'The review count is a proxy. About 9 of the 28 reviews I could see (roughly 32%) were about a decline or an unexplained limit, out of 2,024 in total. People who write reviews skew angry.',
    'sources.l2': 'The two conversations are people’s own recollection, not screenshots or Tabby statements. One explanation came from a relative’s theory.',
    'sources.l3': 'I looked at the app on more than one account, most recently version 4.90.0.',
    'sources.l4': 'Nothing here was confirmed with Tabby. That reasons can be shown as categories without helping people game the system is my reasoning, not a tested fact.',
    'sources.l5': 'The amounts, causes and dates in the prototype are illustrative. Tabby’s Card help pages are left out on purpose, because they describe a card product that may not exist for Saudi users.',
    'lang.name.en': 'English',
    'lang.name.ar': 'العربية',

    // --- section 1: Pain (story-design.md section 5; draft in Alfred's voice) ---
    's1.h1': 'She never paid late. Tabby still shut her out for months.',
    's1.l1': 'Someone I know used Tabby for a SAR 1,000 plane ticket.',
    's1.l2': 'She paid it.',
    's1.l3': 'She isn’t the type to owe anyone. She pays upfront whenever she can, because she hates having a payment hanging over her.',
    's1.l4': 'Then her payments started getting declined.',
    's1.l5': 'Not once. For months.',
    's1.l6': 'She contacted support. They told her they didn’t know why either.',
    's1.l7': 'Tabby’s message to her: try again in a few months.',
    's1.l8': 'She did. One day it just worked again.',
    's1.l9': 'Nobody told her why it stopped.',
    's1.l10': 'Nobody told her it was fixed.',
    's1.small': 'As she described it to me. Her account, not a Tabby statement.',
    's1.viz.declined': 'Declined',
    's1.viz.bubble': 'Try again in a few months.',

    // --- section 2: Agitate (story-design.md section 6) ---
    // The two help-centre quotes flagged "verify before quoting" are NOT in
    // this table on purpose; see the <!-- VERIFY --> comments in index.html.
    's2.h2': 'It isn’t her account. It’s how it’s built.',
    's2.a1': 'I wanted to know if it was just her.',
    's2.a2': 'So I read Tabby’s own help centre.',
    's2.a3': 'About a decline, it says each order is reviewed on its own, your limit can vary by store, and support can’t change the decision. It recommends trying again.',
    's2.a4': 'Then I opened the app.',
    's2.a5': 'Four tabs. Home, Shop, Payments, Profile.',
    's2.a6': 'None of them shows your spending limit.',
    's2.a7': 'Payments tells you exactly what you owe.',
    's2.a8': 'Nothing tells you what you can spend.',
    's2.a9': 'I asked someone else.',
    's2.a10': 'He tried to buy a phone. 2,000, declined. 3,000, declined. 4,000, declined. 5,000, declined. 1,800 went through, for 3 months only.',
    's2.a11': 'The only explanation he got came from his uncle.',
    's2.a12': 'Not from the app.',
    's2.a13Html': 'Then I counted. About <strong>9 of the 28</strong> Trustpilot reviews I could see were about a decline or an unexplained limit. Roughly 32%. People who write reviews skew angry, so that’s a signal, not a headcount.',
    's2.closing': 'The number that decides whether your purchase goes through is the one number the app never shows you.',

    'page.protoH2': 'The same decline, told properly',
    'page.protoLede':
      'Same purchase, same decision engine, same regulatory limits. The only thing that changes is what the screen tells you. Amounts, causes and dates are illustrative: in the real product they would come from the decision engine itself.',

    'page.whyH2': 'Why Tabby probably hasn’t built this already',
    'page.whyLede': 'Five real reasons, not just an oversight:',
    'page.why1Html':
      '<strong>Anti-gaming.</strong> Exact rules exposed are exact rules gamed. This entry shows a <em>category</em>, never the underlying trigger.',
    'page.why2Html':
      '<strong>External data.</strong> Some declines draw on credit bureau reports Tabby doesn’t own outright, which limits exactly what it can say in-app.',
    'page.why3Html':
      '<strong>No regulatory push.</strong> SAMA’s BNPL rules don’t require a decline reason, so this has to earn its place against growth features on the roadmap — see the metrics below for how it would.',
    'page.why4Html':
      '<strong>Per-store variability.</strong> Limits can vary by store, so a single static “your limit is X” figure would sometimes be wrong. The fix shows up at the moment of decline instead, where the store and amount are already known.',
    'page.why5Html':
      '<strong>Support economics.</strong> A visible reason can invite “but why?” follow-ups. Pairing the reason with one concrete next action is what keeps that from becoming a new support load.',

    'page.whoH2': 'Who this helps, and roughly how many',
    'page.whoP1':
      'Anyone who hits an unexplained decline or limit cut — a new account still building history, and a long-standing account that just got reviewed. Not people with genuine missed payments; they already get told why.',
    'page.whoP2':
      'Using Tabby’s own review data as the brief’s suggested proxy: roughly a third of the most visible reviews cite this exact problem — the single largest complaint category found. With 2,024 reviews in total, that points to a real slice of Tabby’s users, not an edge case — though a 28-review sample can only indicate the size, not measure it.',

    'page.metricsH2': 'How you’d know it worked',
    'page.metricsLede':
      'Three numbers, measurable as an A/B test on new or recently-reviewed accounts — no figures promised in advance, just what to watch:',
    'page.metric1':
      'Fewer repeat attempts at the same declined amount within 24 hours — today’s own guidance is to retry blind.',
    'page.metric2':
      'More declines that end in a completed purchase, via the offered alternative amount or plan length.',
    'page.metric3':
      'Fewer support contacts asking why a purchase was declined or a limit changed.',
  },

  // Written as app Arabic, not translated English: short, direct, the
  // register a Saudi fintech actually uses. Help-centre wording is
  // paraphrased, never put in quotation marks — no Arabic source text was
  // checked word for word, so quoting it would be inventing a quote.
  ar: {
    'checkout.merchant': 'الدفع',
    'checkout.item': 'إجمالي الطلب',
    'checkout.split': 'قسّمها على {n} دفعات',
    'checkout.each': '{amount} اليوم، ثم {n} دفعات شهرية',
    'checkout.pay': 'ادفع بالأقساط',

    'nav.home': 'الرئيسية',
    'nav.shop': 'تسوّق',
    'nav.payments': 'المدفوعات',
    'nav.profile': 'حسابي',

    'home.search': 'متاجر أو منتجات',
    'home.allStores': 'كل المتاجر',
    'home.allStoresSub': 'تسوّق وقسّم',
    'home.deals': 'العروض',
    'home.dealsSub': 'خصومات تصل إلى 80%',
    'home.storesForYou': 'متاجر مختارة لك',
    'home.viewAll': 'عرض الكل',
    'home.promo': 'قسّم مشترياتك على 12 شهرًا، من {min} إلى {max}.',
    'home.promoAction': 'تسوّق الآن',

    'shop.categories': 'أبرز الفئات',
    'cat.mobiles': 'الجوالات',
    'cat.electronics': 'الإلكترونيات',
    'cat.travel': 'السفر',
    'cat.clothing': 'الأزياء',
    'cat.beauty': 'الجمال والصحة',
    'cat.home': 'المنزل والأجهزة',
    'shop.forYou': 'مختارة لك',
    'product.phone': 'هاتف ذكي، 256 جيجابايت',
    'product.buy': 'اشترِ بالأقساط',

    'payments.title': 'المدفوعات',
    'payments.due': 'المستحق خلال 30 يومًا',
    'payments.total': 'إجمالي المستحق {amount}',
    'payments.history': 'عرض السجل',
    'payments.clear': 'لا توجد دفعات مستحقة',
    'payments.clearBody':
      'عند قيامك بمشتريات جديدة ستظهر هنا، ويمكنك أيضًا إدارة دفعاتك القادمة من هذه الشاشة.',

    'profile.complete': 'أكمل ملفك الشخصي',
    'profile.invite': 'ادعُ أصدقاءك',
    'profile.inviteSub': 'اكسب حتى {amount}',
    'profile.cashback': 'استرداد نقدي',
    'profile.personal': 'البيانات الشخصية',
    'profile.contact': 'تواصل معنا',
    'profile.ratings': 'التقييمات والمراجعات',
    'profile.favourites': 'المفضلة',
    'profile.privacy': 'الخصوصية والأمان',
    'profile.language': 'اللغة',
    'profile.business': 'للأعمال',
    'profile.logout': 'تسجيل الخروج',

    'profile.limit': 'حد الإنفاق',
    'profile.limitSub': 'لماذا هو بهذا المبلغ، ومتى يتغيّر',
    'payments.limitCard': 'المتاح للإنفاق',
    'payments.limitLink': 'لماذا هذا المبلغ؟',
    'checkout.processing': 'جارٍ التحقق من حسابك',

    'today.title': 'حدث خطأ ما',
    'today.body': 'تعذّرت الموافقة على عملية الشراء. يرجى المحاولة لاحقًا.',
    'today.action': 'حسنًا',
    'today.help': 'زيارة مركز المساعدة',

    'decline.title': 'لم تتم الموافقة على عملية الشراء',
    'decline.why': 'السبب',
    'decline.requestedLabel': 'المبلغ المطلوب',
    'decline.availableLabel': 'المتاح الآن',
    'decline.options': 'ما يمكنك فعله',
    'decline.review': 'المراجعة القادمة',
    'decline.reviewValue': '{date}، بعد {days} يومًا',
    'decline.nothingToDo': 'لا يُطلب منك أي شيء. يُرفع هذا عند المراجعة، وليس بشيء تفعله.',
    'decline.limitLink': 'اعرف كيف يعمل حدّك',

    'schedule.label': 'خطة الدفع',
    'schedule.month': 'الشهر {n}',

    'limit.title': 'حد الإنفاق',
    'limit.current': 'المتاح للإنفاق',
    'limit.blocked': 'لا يوجد مبلغ متاح حاليًا',

    'limit.happened': 'ما الذي حدث',
    'limit.event': 'في {date}، خفّضت مراجعة تلقائية حدّك.',
    'limit.eventNew': 'في {date}، فُتح حسابك بحدّ مبدئي.',
    'limit.eventPaused': 'في {date}، أوقفت مراجعة تلقائية الإنفاق على حسابك مؤقتًا.',
    'cause.review': 'السبب: مراجعة مخاطر مجدولة لحسابك، وليس دفعة فائتة.',
    'cause.newAccount': 'السبب: الحسابات الجديدة تبدأ بحدّ أقل إلى أن يتكوّن سجل دفعات.',
    'cause.usage': 'السبب: تغيّر في طريقة استخدام الحساب.',
    'limit.notYourFault': 'لم تفوّت أي دفعة. هذا ليس عقوبة.',

    'limit.where': 'أين أنت الآن',
    'limit.progress': '{done} من {needed} دفعات في موعدها منذ تلك المراجعة',
    'limit.progressNote': 'كل دفعة تسددها في موعدها تُحتسب في المراجعة القادمة.',
    'limit.progressTime': 'مضى {done} من {needed} أسبوعًا حتى موعد مراجعتك',
    'limit.progressTimeNote': 'هذا يسير وفق جدول زمني. لا شيء تفعله يسرّعه أو يؤخره.',

    'limit.changes': 'ما الذي يغيّره',
    'limit.restore': 'يعود حدّك إلى {amount} بعد {needed} دفعات في موعدها.',
    'limit.restoreOr': 'أو عند المراجعة التلقائية القادمة في {date}، أيهما أقرب.',
    'limit.restoreTime': 'يُراجَع حسابك مجددًا في {date}، وسيصلك إشعار بالنتيجة في كل الأحوال.',
    'limit.cannot': 'خدمة العملاء لا تستطيع تغيير ذلك، فلا حاجة للاتصال.',

    'limit.bureau': 'قد تعتمد المراجعات على بيانات ائتمانية تصلنا من جهات خارجية، ولهذا لا يمكن عرض بعض التفاصيل.',
    'limit.back': 'رجوع',
    'limit.forward': 'شاهد ما يحدث عند المراجعة',

    'recovery.title': 'تمت مراجعة حدّك',
    'recovery.change': 'من {from} إلى {to}',
    'recovery.because': 'لأنك سددت {count} دفعات في موعدها منذ آخر مراجعة.',
    'recovery.becauseTime': 'أُعيد عند مراجعتك المجدولة في {date}. لم يُطلب منك أي شيء.',
    'recovery.next': 'المراجعة القادمة في {date}.',
    'recovery.action': 'ابدأ من جديد',

    'reason.newAccount': 'حسابك ما زال جديدًا، لذلك يبدأ حدّك أقل. الأمر لا يتعلق بدفعات فائتة.',
    'reason.amountOverLimit': 'هذا المبلغ أعلى من حدّك الحالي. سجل دفعاتك سليم.',
    'reason.paused': 'أوقفت مراجعة تلقائية الإنفاق على حسابك مؤقتًا. ليس لديك أي دفعات فائتة.',
    'reason.recentReview':
      'خفّضت مراجعة تلقائية حديثة حدّك. تعتمد المراجعات على سجل دفعاتك وبيانات الائتمان.',

    'alt.splitPayment': 'ادفع {available} معنا، و{remainder} بالبطاقة',
    'alt.longerPlan': 'قسّم {available} على {months} أشهر',
    'alt.smallerCart': 'احذف ما قيمته {remainder} من سلتك',
    'alt.remind': 'ذكّرني في {date}',

    'ctl.modeToday': 'اليوم',
    'ctl.modeProposed': 'المقترح',
    'ctl.modeLabel': 'قارن الرفض نفسه',
    'ctl.scenarioLabel': 'ثلاث حالات حقيقية',

    'source.silentBlock': 'التي لم تتأخر يومًا',
    'source.silentBlockSub': 'رُفضت لشهور، ولم تستطع خدمة العملاء تفسير السبب.',
    'source.newAccount': 'الحساب الجديد',
    'source.newAccountSub': 'تسجيل جديد، قُبل بمبلغ أقل، دون خيار لمدة التقسيط.',
    'source.limitCut': 'الحد المخفَّض',
    'source.limitCutSub': 'حساب قديم، روجع وخُفّض دون إنذار.',

    'nav.label': 'أقسام التطبيق',

    // Same glyph both ways: the riyal sign has no separate Arabic form.
    'unit.currency': '{sar} {amount}',
    'unit.riyalName': 'ريال سعودي',

    'page.title': 'لماذا رُفضت؟',
    'page.description':
      'تحسين لطريقة شرح تطبيق "اشترِ الآن وادفع لاحقًا" لعملية شراء مرفوضة أو حد إنفاق تغيّر.',
    // --- header controls ---
    'header.language': 'اللغة',
    'header.languageMenu': 'اختيار اللغة',
    'header.themeToBright': 'التبديل إلى الوضع الفاتح',
    'header.themeToDark': 'التبديل إلى الوضع الداكن',
    'chapter.hook': 'لم تتأخر يومًا',
    'chapter.opening': 'تذكرة سفر',
    'chapter.rising': 'شهور من الرفض',
    'chapter.climax': 'الرقم الذي يخفيه التطبيق',
    'chapter.falling': 'الرفض نفسه، لكن بشرح واضح',
    'chapter.conclusion': 'كيف كان ينبغي أن تنتهي',
    'hello.title': 'أهلًا بك',
    'hello.lead': 'هذا مشروعي.',
    'hello.cue': 'مرّر للأسفل',
    'welcome.lead': 'إنه مشروع تصميم.',
    'welcome.body': 'لاحظتُ شيئًا في تطبيقات «اشترِ الآن وادفع لاحقًا». قد يرفض التطبيق عملية شراء دون أن يقول لماذا. أعدتُ تصميم تلك اللحظة.',
    'welcome.note': 'هذا تصوّر مستقل من عندي، وليس من إعداد تابي ولا مرتبطًا بها.',
    'welcome.start': 'اقرأ القصة',
    'welcome.skip': 'انتقل إلى النموذج التجريبي',
    'welcome.card.status': 'رُفضت عملية الشراء',
    'welcome.card.reason': 'السبب',
    'welcome.card.review': 'المراجعة القادمة',
    'welcome.card.next': 'الخطوة التالية',
    's3.bridge': 'فأعدتُ تصميم اللحظة التي خذلتها.',
    'end.h2': 'تخيّل الآن لو أخبرها التطبيق.',
    'end.l1': 'لماذا رُفضت دفعاتها.',
    'end.l2': 'ومتى ستُراجَع مجددًا.',
    'end.l3': 'تمت مراجعة حدّك وإعادته.',
    'end.name': 'ليست مشكلة رفض. إنها مشكلة صمت.',
    'end.fix': 'قل لماذا. قل متى ستتم المراجعة مجددًا. قل متى انتهى الأمر.',
    'welcome.fix': 'الحل في جملة واحدة: عندما تُرفض عملية شراء، قل لماذا، وقل متى ستُراجَع مجددًا، واقترح شيئًا واحدًا يستطيع الشخص فعله.',
    'stream.today': 'اليوم',
    'stream.proposed': 'المقترح',
    'stream.declined': 'رُفضت عملية الشراء',
    'stream.t2': 'لا يقدّم التطبيق سببًا ولا موعدًا ولا خطوة تالية',
    'stream.t3': 'مقال مساعدة عام: أعد المحاولة',
    'stream.t4': 'تخمين، أو نظرية من أحد الأقارب',
    'stream.tEnd': 'تتراجع الثقة، ولا طريق للعودة إلى حدّ أعلى.',
    'stream.p2': 'الشاشة نفسها: السبب والمراجعة القادمة وخطوة واحدة',
    'stream.p3': 'يتصرّف الشخص: مبلغ أقل، أو خطة أخرى، أو سداد قسط',
    'stream.p4': 'تكتمل عملية الشراء، أو ينتظر وهو يعرف ما التالي',
    'stream.pEnd': 'السداد في موعده يبني السجل الذي يحتاجه الحد الأعلى.',
    'cases.h2': 'ثلاثة أشخاص، وفجوة واحدة',
    'cases.lede': 'اثنان منهم تحدثتُ إليهما. والثالث نمط في التقييمات العامة. ولا شيء منها بيان من تابي.',
    'cases.fact': 'ما حدث',
    'cases.gap': 'ما كان ناقصًا',
    'cases.fix': 'ما تقوله الشاشة بدلًا من ذلك',
    'cases.c1.title': 'التي لم تتأخر قط',
    'cases.c1.fact': 'تدفع مقدمًا ولم تتأخر قط. رُفضت دفعاتها لشهور، ولم تستطع خدمة العملاء تفسير السبب.',
    'cases.c1.gap': 'لا سبب، ولا موعد مراجعة، ولم يخبرها أحد متى عاد كل شيء إلى طبيعته.',
    'cases.c1.fix': 'إنها مراجعة. هذا هو موعدها. لا يُطلب منك شيء. سنخبرك حين يُرفع القيد.',
    'cases.c2.title': 'الحساب الجديد',
    'cases.c2.fact': 'جرّب 2,000 و3,000 و4,000 و5,000: رُفضت كلها. أما 1,800 فقُبلت، لكن لـ 3 أشهر فقط.',
    'cases.c2.gap': 'لم يقل التطبيق إن الحد المبدئي منخفض، ولم يعرض اختيارًا لمدة الخطة.',
    'cases.c2.fix': 'حسابك جديد، لذلك يبدأ حدّك أقل. هذا ما يناسبك: مبلغ أقل، أو مدة خطة أخرى.',
    'cases.c3.title': 'الحد المخفَّض',
    'cases.c3.fact': 'حساب قديم، روجع وخُفّض حدّه دون إنذار.',
    'cases.c3.gap': 'لا إشعار بالتخفيض، ولا سبب، ولا موعد للمراجعة القادمة.',
    'cases.c3.fix': 'خفّضت مراجعة حدّك. المراجعة القادمة في هذا التاريخ. وهذا ما يُحتسب فيها.',
    'skip.h2': 'ما اخترتُ ألا أبنيه',
    'skip.l1Html': '<strong>ربطًا حقيقيًا بتابي.</strong> هذا عرض ثابت ببيانات تجريبية واقعية: بلا خادم ولا حسابات ولا قاعدة بيانات.',
    'skip.l2Html': '<strong>حلولًا لاسترداد النقد أو البطاقات أو المبالغ المستردة أو الدعم البشري.</strong> هذه الشكاوى حقيقية. تركتها خارج المشروع لتبقى فكرة واحدة حادّة.',
    'skip.l3Html': '<strong>قواعد الرفض الدقيقة، أو وعدًا بحدّ أعلى.</strong> الحل يجعل القرار مفهومًا. والأنظمة السعودية تضع سقفًا لما يمكن للشخص أن يدين به عبر «اشترِ الآن وادفع لاحقًا»، فلا يمكنه أن يعد بالنمو.',
    'page.metricsHow': 'كيف كنتُ سأجري الاختبار: أعرض شاشة الرفض الجديدة على نصف الحسابات الجديدة أو التي روجعت حديثًا، وأُبقي الشاشة الحالية للنصف الآخر، ثم أقارن هذه الأرقام الثلاثة بعد مدة محددة. لا أتوقّع النتائج.',
    'ships.h2': 'ما الذي يُطلق أولًا',
    'ships.p1': 'شاشة واحدة: شاشة الرفض. أضف فئة السبب وموعد المراجعة القادمة وخطوة واحدة تالية، ولا شيء غير ذلك.',
    'ships.p2': 'أما شاشة الحد، ورسالة «أُعيد الحد»، وبدائل مدة الخطة فتأتي بعد ذلك، وعلى كل منها أن تستحق مكانها أمام الأرقام الثلاثة أعلاه.',
    'sources.h2': 'المصادر وحدودها',
    'sources.lede': 'ما استخدمتُه، وما لا يستطيع أن يخبرك به.',
    'sources.s1Html': 'مقال مساعدة تابي نفسه عن عمليات الشراء المرفوضة: <a href="https://tabby.ai/en-SA/help/help-declined-purchases/why-was-my-tabby-purchase-not-approved" lang="en" dir="ltr">Why was my Tabby purchase not approved?</a>',
    'sources.s2Html': 'قواعد البنك المركزي السعودي (ساما) لشركات «اشترِ الآن وادفع لاحقًا»: <a href="https://rulebook.sama.gov.sa/en/rules-regulating-buy-now-pay-later-bnpl-companies-0" lang="en" dir="ltr">SAMA rulebook</a>',
    'sources.s3Html': 'التقييمات العامة للتطبيق: <a href="https://www.trustpilot.com/review/tabby.ai" lang="en" dir="ltr">Trustpilot</a>',
    'sources.s4': 'محادثتان مع أشخاص يستخدمون تابي، وجولتي الخاصة في التطبيق.',
    'sources.l1': 'عدد التقييمات مؤشر تقريبي. نحو 9 من 28 تقييمًا استطعتُ رؤيتها (قرابة 32%) كانت عن رفض أو حدّ غير مفسَّر، من أصل 2,024 تقييمًا. ومن يكتبون التقييمات يميلون إلى الغضب.',
    'sources.l2': 'المحادثتان روايتان شخصيتان لأصحابهما، وليستا لقطات شاشة ولا بيانات من تابي. وأحد التفسيرات جاء من نظرية قريب.',
    'sources.l3': 'اطّلعتُ على التطبيق من أكثر من حساب، وآخرها الإصدار 4.90.0.',
    'sources.l4': 'لم يتأكد شيء هنا مع تابي. أما القول إن عرض الأسباب في فئات لا يساعد على التحايل على النظام فهو استنتاجي، وليس حقيقة مُختبَرة.',
    'sources.l5': 'المبالغ والأسباب والتواريخ في النموذج توضيحية. وتركتُ صفحات مساعدة «بطاقة تابي» عمدًا، لأنها تصف منتج بطاقة قد لا يتوفر للمستخدمين في السعودية.',
    'lang.name.en': 'English',
    'lang.name.ar': 'العربية',

    // --- sections 1 and 2: Arabic NOT written yet ---
    // TODO_AR is a marker, not copy: page.js shows the English (marked
    // lang="en") for any key whose Arabic is TODO_AR, and scripts/smoke.js
    // tolerates it only for the keys named in its ARABIC_TODO list.
    's1.h1': 'لم تتأخر يومًا عن السداد، ومع ذلك أغلقت تابي الباب في وجهها لشهور.',
    's1.l1': 'استخدمت إحدى معارفي تابي لشراء تذكرة طيران بـ 1,000 ريال.',
    's1.l2': 'وسدّدتها.',
    's1.l3': 'ليست من النوع الذي يدين لأحد. تدفع مقدمًا كلما استطاعت، لأنها تكره أن يبقى عليها قسط معلّق.',
    's1.l4': 'ثم بدأت دفعاتها تُرفض.',
    's1.l5': 'ليس مرة واحدة. بل لشهور.',
    's1.l6': 'تواصلت مع خدمة العملاء، فقالوا إنهم لا يعرفون السبب أيضًا.',
    's1.l7': 'رسالة تابي لها: أعيدي المحاولة بعد بضعة أشهر.',
    's1.l8': 'فحاولت. وذات يوم عادت تعمل من تلقاء نفسها.',
    's1.l9': 'لم يخبرها أحد لماذا توقفت.',
    's1.l10': 'ولم يخبرها أحد أنها عادت.',
    's1.small': 'كما وصفَتْه لي. هذه روايتها، وليست بيانًا من تابي.',
    's1.viz.declined': 'مرفوضة',
    's1.viz.bubble': 'أعيدي المحاولة بعد بضعة أشهر.',
    's2.h2': 'المشكلة ليست في حسابها، بل في طريقة بنائه.',
    's2.a1': 'أردتُ أن أعرف إن كانت هي وحدها.',
    's2.a2': 'فقرأتُ مركز المساعدة الخاص بتابي.',
    's2.a3': 'عن الرفض، يقول المركز إن كل طلب يُراجَع على حدة، وإن حدّك قد يختلف من متجر لآخر، وإن فريق الدعم لا يستطيع تغيير القرار. وينصح بإعادة المحاولة.',
    's2.a4': 'ثم فتحتُ التطبيق.',
    's2.a5': 'أربع علامات تبويب: الرئيسية، تسوّق، المدفوعات، حسابي.',
    's2.a6': 'ولا واحدة منها تعرض حدّ إنفاقك.',
    's2.a7': 'المدفوعات تخبرك بدقة بما عليك.',
    's2.a8': 'ولا شيء يخبرك بما يمكنك إنفاقه.',
    's2.a9': 'سألتُ شخصًا آخر.',
    's2.a10': 'حاول شراء هاتف. 2,000 رُفضت. 3,000 رُفضت. 4,000 رُفضت. 5,000 رُفضت. أما 1,800 فقُبلت، لكن لـ 3 أشهر فقط.',
    's2.a11': 'التفسير الوحيد الذي سمعه جاءه من أحد أقاربه.',
    's2.a12': 'لا من التطبيق.',
    's2.a13Html': 'ثم أحصيتُ. نحو <strong>9 من 28</strong> تقييمًا على Trustpilot استطعتُ رؤيتها كانت عن رفض أو حدّ غير مفسَّر. أي قرابة 32%. من يكتبون التقييمات يميلون إلى الغضب، فهذه إشارة وليست إحصاء للمستخدمين.',
    's2.closing': 'الرقم الذي يحدد قبول عملية شرائك أو رفضها هو الرقم الوحيد الذي لا يعرضه لك التطبيق.',

    'page.protoH2': 'الرفض نفسه، مشروحًا كما يجب',
    'page.protoLede':
      'الشراء نفسه، ومحرك القرار نفسه، والحدود التنظيمية نفسها. الشيء الوحيد الذي يتغيّر هو ما تخبرك به الشاشة. المبالغ والأسباب والتواريخ توضيحية: في المنتج الحقيقي تأتي من محرك القرار نفسه.',

    'page.whyH2': 'لماذا لم تبنِ تابي هذا على الأرجح حتى الآن',
    'page.whyLede': 'خمسة أسباب حقيقية، لا مجرد سهو:',
    'page.why1Html':
      '<strong>منع التحايل.</strong> القواعد الدقيقة المكشوفة تُستغل بدقة. لذلك يعرض هذا المقترح <em>فئة</em> السبب، لا المُحفّز الفعلي أبدًا.',
    'page.why2Html':
      '<strong>بيانات خارجية.</strong> بعض حالات الرفض تعتمد على تقارير ائتمانية لا تملكها تابي بالكامل، وهذا يحدّ مما يمكنها قوله داخل التطبيق.',
    'page.why3Html':
      '<strong>لا ضغط تنظيمي.</strong> قواعد ساما لخدمات "اشترِ الآن وادفع لاحقًا" لا تُلزم بذكر سبب الرفض، لذا على هذه الميزة أن تثبت جدواها أمام ميزات النمو في خطة العمل — والمقاييس أدناه توضح كيف.',
    'page.why4Html':
      '<strong>اختلاف الحد بين المتاجر.</strong> قد يختلف الحد من متجر لآخر، فرقم ثابت واحد يقول "حدّك كذا" سيكون خاطئًا أحيانًا. لذلك يظهر الحل في لحظة الرفض، حين يكون المتجر والمبلغ معروفين.',
    'page.why5Html':
      '<strong>كلفة خدمة العملاء.</strong> السبب المعلن قد يستدعي أسئلة من نوع "ولكن لماذا؟". وربط السبب بخطوة تالية واحدة واضحة هو ما يمنع ذلك من أن يصبح عبئًا جديدًا على الدعم.',

    'page.whoH2': 'من يستفيد، وكم عددهم تقريبًا',
    'page.whoP1':
      'كل من يواجه رفضًا أو تخفيضًا للحد دون تفسير — حساب جديد ما زال يبني سجله، وحساب قديم خضع للتو لمراجعة. لا يشمل ذلك من فاتته دفعات فعلًا؛ فهؤلاء يُخبَرون بالسبب أصلًا.',
    'page.whoP2':
      'باستخدام بيانات مراجعات تابي نفسها كمؤشر اقترحه موجز المسابقة: قرابة ثلث أبرز المراجعات تشكو من هذه المشكلة تحديدًا — وهي أكبر فئة شكاوى منفردة. ومع 2,024 مراجعة إجمالًا، يشير ذلك إلى شريحة حقيقية من مستخدمي تابي لا حالة هامشية — مع أن عيّنة من 28 مراجعة تدل على الحجم ولا تقيسه.',

    'page.metricsH2': 'كيف تعرف أنه نجح',
    'page.metricsLede':
      'ثلاثة أرقام، قابلة للقياس عبر اختبار A/B على الحسابات الجديدة أو التي روجعت مؤخرًا — دون وعود بأرقام مسبقًا، فقط ما يجب مراقبته:',
    'page.metric1':
      'محاولات أقل لتكرار المبلغ المرفوض نفسه خلال 24 ساعة — فالإرشاد الحالي هو إعادة المحاولة دون معرفة السبب.',
    'page.metric2':
      'عدد أكبر من حالات الرفض التي تنتهي بشراء مكتمل، عبر المبلغ البديل أو مدة التقسيط المقترحة.',
    'page.metric3': 'تواصل أقل مع خدمة العملاء للسؤال عن سبب رفض عملية شراء أو تغيّر الحد.',
  },
};
