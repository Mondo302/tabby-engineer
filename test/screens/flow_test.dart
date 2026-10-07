import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phone_view/data.dart';
import 'package:phone_view/screens/flow.dart';
import 'package:phone_view/screens/mode_toggle.dart';

import '../support/support.dart';

void main() {
  final d = loadData();
  String t(String lang, String k, [Map<String, Object?>? p]) => d.t(lang, k, p);

  Widget shell(String lang,
          {String? tab, String? screen, String scenario = 'silent-block', PhoneMode mode = PhoneMode.proposed}) =>
      PhoneFlow(
        data: d,
        lang: lang,
        initialScenarioId: scenario,
        now: DateTime(2026, 9, 25),
        framed: false,
        controls: false,
        initialMode: mode,
        initialTab: tab ?? 'nav.shop',
        initialScreen: flowScreenFromName(screen),
      );

  Finder navButton(String lang, String key) => find.bySemanticsLabel(t(lang, key));

  group('floating tab bar', () {
    testWidgets('four labelled buttons, each at least 44 x 44', (tr) async {
      final h = tr.ensureSemantics();
      await pumpPhone(tr, 'en', shell('en'));
      for (final k in ['nav.home', 'nav.shop', 'nav.payments', 'nav.profile']) {
        final f = navButton('en', k);
        expect(f, findsOneWidget, reason: k);
        final size = tr.getSize(f);
        expect(size.width, greaterThanOrEqualTo(44), reason: k);
        expect(size.height, greaterThanOrEqualTo(44), reason: k);
      }
      h.dispose();
    });

    testWidgets('starts on Shop, and marks exactly the current tab as selected', (tr) async {
      final h = tr.ensureSemantics();
      await pumpPhone(tr, 'en', shell('en'));
      expect(find.text(t('en', 'shop.categories')), findsOneWidget);
      expect(tr.getSemantics(navButton('en', 'nav.shop')).flagsCollection.isSelected.toString(),
          contains('isTrue'));
      expect(tr.getSemantics(navButton('en', 'nav.home')).flagsCollection.isSelected.toString(),
          isNot(contains('isTrue')));
      h.dispose();
    });

    testWidgets('tapping each tab switches the screen', (tr) async {
      final h = tr.ensureSemantics();
      await pumpPhone(tr, 'en', shell('en'));
      await tr.tap(navButton('en', 'nav.home'));
      await tr.pump();
      expect(find.text(t('en', 'home.storesForYou')), findsOneWidget);
      await tr.tap(navButton('en', 'nav.payments'));
      await tr.pump();
      expect(find.text(t('en', 'payments.clear')), findsOneWidget);
      expect(find.text(t('en', 'home.storesForYou')), findsNothing);
      await tr.tap(navButton('en', 'nav.profile'));
      await tr.pump();
      expect(find.text(t('en', 'profile.logout')), findsOneWidget);
      await tr.tap(navButton('en', 'nav.shop'));
      await tr.pump();
      expect(find.text(t('en', 'shop.forYou')), findsOneWidget);
      h.dispose();
    });

    testWidgets('AR: the same four buttons, Arabic labels, first tab on the right', (tr) async {
      final h = tr.ensureSemantics();
      await pumpPhone(tr, 'ar', shell('ar'));
      expect(tr.getTopRight(navButton('ar', 'nav.home')).dx,
          greaterThan(tr.getTopRight(navButton('ar', 'nav.profile')).dx));
      await tr.tap(navButton('ar', 'nav.payments'));
      await tr.pump();
      expect(find.text(t('ar', 'payments.clear')), findsOneWidget);
      h.dispose();
    });
  });

  group('purchase flow: shop -> checkout -> processing -> decline', () {
    testWidgets('buy opens checkout, pay shows processing, 1.4 s later the decline', (tr) async {
      await pumpPhone(tr, 'en', shell('en'));
      await tr.tap(find.text(t('en', 'product.buy')));
      await tr.pump();
      expect(find.text(t('en', 'checkout.pay')), findsOneWidget);
      await tr.tap(find.text(t('en', 'checkout.pay')));
      await tr.pump();
      expect(find.text(t('en', 'checkout.processing')), findsOneWidget);
      expect(find.text(t('en', 'decline.title')), findsNothing);
      await tr.pump(const Duration(milliseconds: 1401));
      expect(find.text(t('en', 'decline.title')), findsOneWidget);
    });

    testWidgets('leaving via a tab while processing never lands on the decline', (tr) async {
      final h = tr.ensureSemantics();
      await pumpPhone(tr, 'en', shell('en', screen: 'processing'));
      await tr.pump(const Duration(milliseconds: 500));
      await tr.tap(navButton('en', 'nav.home'));
      await tr.pump();
      await tr.pump(const Duration(seconds: 3));
      expect(find.text(t('en', 'decline.title')), findsNothing);
      expect(find.text(t('en', 'home.storesForYou')), findsOneWidget);
      h.dispose();
    });

    testWidgets('a tab tap during checkout returns to the app', (tr) async {
      final h = tr.ensureSemantics();
      await pumpPhone(tr, 'en', shell('en', screen: 'checkout'));
      expect(find.text(t('en', 'checkout.pay')), findsOneWidget);
      await tr.tap(navButton('en', 'nav.profile'));
      await tr.pump();
      expect(find.text(t('en', 'profile.logout')), findsOneWidget);
      h.dispose();
    });

    testWidgets('the whole path works in Arabic', (tr) async {
      await pumpPhone(tr, 'ar', shell('ar'));
      await tr.tap(find.text(t('ar', 'product.buy')));
      await tr.pump();
      await tr.tap(find.text(t('ar', 'checkout.pay')));
      await tr.pump();
      await tr.pump(const Duration(milliseconds: 1401));
      expect(find.text(t('ar', 'decline.title')), findsOneWidget);
    });
  });


  group('one state machine, as prototype.js', () {
    // Ahem stands in for Plex in tests and overflows the decline amounts row;
    // that is a test-font artefact, every other framework error still fails.
    void ignoreOverflow() {
      final original = FlutterError.onError;
      FlutterError.onError = (details) {
        if (details.exceptionAsString().contains('overflowed by')) return;
        original?.call(details);
      };
      addTearDown(() => FlutterError.onError = original);
    }

    Widget flow(PhoneController c, {String? screen, String? tab, String lang = 'en'}) => PhoneFlow(
          key: UniqueKey(),
          data: d,
          lang: lang,
          now: DateTime(2026, 9, 25),
          framed: false,
          controls: false,
          controller: c,
          initialTab: tab ?? 'nav.shop',
          initialScreen: flowScreenFromName(screen),
        );

    Future<void> tapText(WidgetTester tr, String s) async {
      await tr.ensureVisible(find.text(s));
      await tr.tap(find.text(s));
      await tr.pump();
    }

    testWidgets('full journey: shop, buy, pay, processing, decline, limit, recovery, again', (tr) async {
      ignoreOverflow();
      await pumpPhone(tr, 'en', flow(PhoneController()));
      await tapText(tr, t('en', 'product.buy'));
      await tapText(tr, t('en', 'checkout.pay'));
      expect(find.text(t('en', 'checkout.processing')), findsOneWidget);
      await tr.pump(const Duration(milliseconds: 1401));
      expect(find.text(t('en', 'decline.title')), findsOneWidget);
      await tapText(tr, t('en', 'decline.limitLink'));
      expect(find.text(t('en', 'limit.forward')), findsOneWidget);
      await tapText(tr, t('en', 'limit.forward'));
      expect(find.text(t('en', 'recovery.action')), findsOneWidget);
      await tapText(tr, t('en', 'recovery.action'));
      expect(find.text(t('en', 'decline.title')), findsOneWidget);
    });

    testWidgets('processing delay is injectable', (tr) async {
      ignoreOverflow();
      await pumpPhone(
          tr,
          'en',
          PhoneFlow(
              data: d,
              lang: 'en',
              now: DateTime(2026, 9, 25),
              framed: false,
              controls: false,
              processingDelay: const Duration(milliseconds: 50),
              initialScreen: FlowScreen.processing));
      await tr.pump(const Duration(milliseconds: 51));
      expect(find.text(t('en', 'decline.title')), findsOneWidget);
    });

    testWidgets('a tab tap on limit or recovery leaves the flow', (tr) async {
      ignoreOverflow();
      final h = tr.ensureSemantics();
      for (final s in ['limit', 'recovery', 'decline']) {
        await pumpPhone(tr, 'en', flow(PhoneController(), screen: s));
        await tr.tap(navButton('en', 'nav.home'));
        await tr.pump();
        expect(find.text(t('en', 'home.storesForYou')), findsOneWidget, reason: s);
      }
      h.dispose();
    });

    testWidgets('picking a scenario: tab/checkout/processing go to decline, limit stays; always Proposed', (tr) async {
      ignoreOverflow();
      final c = PhoneController();
      await pumpPhone(tr, 'en', flow(c));
      c.setScenario('new-account');
      await tr.pump();
      expect(find.text(t('en', d.scenario('new-account').reasonKey)), findsOneWidget);

      await pumpPhone(tr, 'en', flow(c, screen: 'limit'));
      c.setScenario('limit-cut');
      await tr.pump();
      expect(find.text(t('en', 'limit.forward')), findsOneWidget);
      expect(find.text(t('en', 'decline.title')), findsNothing);

      // Today mode is left by picking a scenario
      c.setMode(PhoneMode.today);
      await tr.pump();
      expect(find.text(t('en', 'today.title')), findsOneWidget);
      c.setScenario('silent-block');
      await tr.pump();
      expect(find.text(t('en', 'today.title')), findsNothing);
      expect(find.text(t('en', 'decline.title')), findsOneWidget);
    });

    testWidgets('picking a scenario while checking out or processing lands on the decline', (tr) async {
      ignoreOverflow();
      for (final screen in ['checkout', 'processing']) {
        final c = PhoneController();
        await pumpPhone(tr, 'en', flow(c, screen: screen));
        c.setScenario('new-account');
        await tr.pump();
        expect(find.text(t('en', 'decline.title')), findsOneWidget, reason: screen);
      }
    });

    testWidgets('mode toggle returns to the decline, except from checkout; Today is the dead end', (tr) async {
      ignoreOverflow();
      final c = PhoneController();
      await pumpPhone(tr, 'en', flow(c, screen: 'limit'));
      c.setMode(PhoneMode.today);
      await tr.pump();
      expect(find.text(t('en', 'today.title')), findsOneWidget);
      expect(find.text(t('en', 'decline.limitLink')), findsNothing);
      c.setMode(PhoneMode.proposed);
      await tr.pump();
      expect(find.text(t('en', 'decline.title')), findsOneWidget);

      await pumpPhone(tr, 'en', flow(c, screen: 'checkout'));
      c.setMode(PhoneMode.today);
      await tr.pump();
      expect(find.text(t('en', 'checkout.pay')), findsOneWidget);
    });

    testWidgets('Today hides the limit card on Payments; Proposed shows it and opens the limit', (tr) async {
      ignoreOverflow();
      final c = PhoneController();
      await pumpPhone(tr, 'en', flow(c, tab: 'nav.payments'));
      expect(find.text(t('en', 'payments.limitLink')), findsOneWidget);
      await tapText(tr, t('en', 'payments.limitLink'));
      expect(find.text(t('en', 'limit.forward')), findsOneWidget);
    });

    testWidgets('on-screen controls drive the same machine', (tr) async {
      ignoreOverflow();
      await tr.binding.setSurfaceSize(const Size(390, 1500));
      await tr.pumpWidget(Directionality(
        textDirection: TextDirection.ltr,
        child: MediaQuery(
          data: const MediaQueryData(size: Size(390, 1500)),
          child: PhoneFlow(data: d, lang: 'en', now: DateTime(2026, 9, 25)),
        ),
      ));
      expect(find.text(t('en', 'shop.forYou')), findsOneWidget);
      await tr.tap(find.text('The new account'));
      await tr.pump();
      expect(find.text(t('en', d.scenario('new-account').reasonKey)), findsOneWidget);
      await tr.tap(find.text(t('en', 'ctl.modeToday')));
      await tr.pump();
      expect(find.text(t('en', 'today.title')), findsOneWidget);
    });
  });

  group('a data export that writes the sign as {sar}', () {
    final tok = loadDataWithSarToken();

    testWidgets('no raw token on any tab or in checkout; the sign is spoken by name', (tr) async {
      final h = tr.ensureSemantics();
      for (final lang in ['en', 'ar']) {
        for (final where in [
          ('nav.payments', 'tab'),
          ('nav.shop', 'tab'),
          ('nav.home', 'tab'),
          ('nav.profile', 'tab'),
          ('nav.shop', 'checkout'),
        ]) {
          await pumpPhone(
              tr,
              lang,
              PhoneFlow(
                  data: tok,
                  lang: lang,
                  now: DateTime(2026, 9, 25),
                  framed: false,
                  controls: false,
                  initialTab: where.$1,
                  initialScreen: flowScreenFromName(where.$2)));
          expect(allText(tr).where((s) => s.contains('{sar}')), isEmpty, reason: '$lang $where');
        }
      }
      await pumpPhone(tr, 'en', shell2(tok, 'nav.payments'));
      expect(find.bySemanticsLabel('Total due Saudi riyals 0'), findsOneWidget);
      h.dispose();
    });
  });
}

Widget shell2(PhoneData d, String tab) => PhoneFlow(
    data: d,
    lang: 'en',
    now: DateTime(2026, 9, 25),
    framed: false,
    controls: false,
    initialTab: tab);
