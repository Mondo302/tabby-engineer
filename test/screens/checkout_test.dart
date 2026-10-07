import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phone_view/screens/checkout.dart';

import '../support/support.dart';

void main() {
  final d = loadData();
  final silentBlock = d.scenario('silent-block');
  String t(String lang, String k, [Map<String, Object?>? p]) => d.t(lang, k, p);

  group('Checkout', () {
    testWidgets('EN: order total, four cells of the requested amount, terms, pay button',
        (tr) async {
      await pumpPhone(tr, 'en', CheckoutScreen(data: d, lang: 'en', scenario: silentBlock, onPay: () {}));
      expect(find.text(t('en', 'checkout.merchant')), findsOneWidget);
      expect(find.text(t('en', 'checkout.item')), findsOneWidget);
      expect(txt(d.money('en', 900)), findsOneWidget);
      // 900 over 4 months = 225 on every cell (the terms line is a longer string)
      expect(txt(d.money('en', 225)), findsNWidgets(4));
      for (var n = 1; n <= 4; n++) {
        expect(find.text(t('en', 'schedule.month', {'n': n})), findsOneWidget);
      }
      expect(txt(t('en', 'checkout.each', {'amount': d.money('en', 225), 'n': 3})),
          findsOneWidget);
      expect(find.text(t('en', 'checkout.pay')), findsOneWidget);
    });

    testWidgets('the pay button is a labelled button and calls onPay', (tr) async {
      final h = tr.ensureSemantics();
      var paid = 0;
      await pumpPhone(
          tr, 'ar', CheckoutScreen(data: d, lang: 'ar', scenario: silentBlock, onPay: () => paid++));
      expect(find.bySemanticsLabel(t('ar', 'checkout.pay')), findsOneWidget);
      await tr.tap(find.text(t('ar', 'checkout.pay')));
      expect(paid, 1);
      h.dispose();
    });

    testWidgets('AR: Arabic copy, mirrored', (tr) async {
      await pumpPhone(tr, 'ar', CheckoutScreen(data: d, lang: 'ar', scenario: silentBlock, onPay: () {}));
      expect(find.text(t('ar', 'checkout.item')), findsOneWidget);
      expect(txt(t('ar', 'checkout.each', {'amount': d.money('ar', 225), 'n': 3})),
          findsOneWidget);
      expect(tr.getTopRight(find.text(t('ar', 'checkout.item'))).dx, greaterThan(300));
    });

    testWidgets('uses the scenario: 2400 over 4 months is 600 each', (tr) async {
      await pumpPhone(tr, 'en',
          CheckoutScreen(data: d, lang: 'en', scenario: d.scenario('new-account'), onPay: () {}));
      expect(txt(d.money('en', 2400)), findsOneWidget);
      expect(txt(d.money('en', 600)), findsNWidgets(4));
    });
  });

  group('Processing', () {
    testWidgets('waits 1.4 s, then calls onDone exactly once', (tr) async {
      var done = 0;
      await pumpPhone(tr, 'en', ProcessingScreen(data: d, lang: 'en', onDone: () => done++));
      expect(find.text(t('en', 'checkout.processing')), findsOneWidget);
      await tr.pump(const Duration(milliseconds: 1399));
      expect(done, 0);
      await tr.pump(const Duration(milliseconds: 2));
      expect(done, 1);
      await tr.pump(const Duration(seconds: 5));
      expect(done, 1);
    });

    testWidgets('the delay is injectable so tests do not wait', (tr) async {
      var done = 0;
      await pumpPhone(tr, 'en',
          ProcessingScreen(data: d, lang: 'en', delay: Duration.zero, onDone: () => done++));
      await tr.pump(const Duration(milliseconds: 1));
      expect(done, 1);
    });

    testWidgets('leaving before the timer ends cancels it', (tr) async {
      var done = 0;
      await pumpPhone(tr, 'en', ProcessingScreen(data: d, lang: 'en', onDone: () => done++));
      await tr.pump(const Duration(milliseconds: 500));
      await tr.pumpWidget(const SizedBox());
      await tr.pump(const Duration(seconds: 3));
      expect(done, 0);
    });

    testWidgets('spinner turns normally', (tr) async {
      await pumpPhone(tr, 'en', ProcessingScreen(data: d, lang: 'en', onDone: () {}));
      await tr.pump(const Duration(milliseconds: 100));
      expect(tr.hasRunningAnimations, true);
    });

    testWidgets('reduced motion: spinner is static, the message stays', (tr) async {
      await pumpPhone(tr, 'en', ProcessingScreen(data: d, lang: 'en', onDone: () {}),
          reducedMotion: true);
      expect(find.text(t('en', 'checkout.processing')), findsOneWidget);
      await tr.pump(const Duration(milliseconds: 300));
      expect(tr.hasRunningAnimations, false);
    });

    testWidgets('AR message and semantics', (tr) async {
      final h = tr.ensureSemantics();
      await pumpPhone(tr, 'ar', ProcessingScreen(data: d, lang: 'ar', onDone: () {}));
      expect(find.bySemanticsLabel(t('ar', 'checkout.processing')), findsOneWidget);
      h.dispose();
    });
  });
}
