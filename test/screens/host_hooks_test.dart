import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phone_view/screens/flow.dart';
import 'package:phone_view/screens/mode_toggle.dart';
import 'package:phone_view/screens/scenario_picker.dart';

import '../support/support.dart';

/// The host page plays the story by scroll and calls window.setPhoneMode,
/// window.setPhoneScreen and window.setPhoneControls; those hooks call these
/// PhoneController methods. The order that matters: mode first, then screen.
void main() {
  final d = loadData();
  String t(String k) => d.t('en', k);

  // Ahem stands in for Plex in tests and overflows some rows; that is a
  // test-font artefact, every other framework error still fails.
  void ignoreOverflow() {
    final original = FlutterError.onError;
    FlutterError.onError = (details) {
      if (details.exceptionAsString().contains('overflowed by')) return;
      original?.call(details);
    };
    addTearDown(() => FlutterError.onError = original);
  }

  Widget flow(PhoneController c, {bool controls = false, bool framed = false}) => PhoneFlow(
        key: UniqueKey(),
        data: d,
        lang: 'en',
        now: DateTime(2026, 9, 25),
        framed: framed,
        controls: controls,
        controller: c,
      );

  group('host hooks', () {
    testWidgets('setScreen plays the whole story: shop, checkout, processing, Today, Proposed, limit, restored',
        (tr) async {
      ignoreOverflow();
      final c = PhoneController();
      await pumpPhone(tr, 'en', flow(c));

      // scene 1: Shop tab in Today mode (mode first, then the screen)
      c.setMode(PhoneMode.today);
      c.setScreen('tab', 'shop');
      await tr.pump();
      expect(find.text(t('product.buy')), findsOneWidget);

      c.setScreen('checkout');
      await tr.pump();
      expect(find.text(t('checkout.pay')), findsOneWidget);

      c.setScreen('processing');
      await tr.pump();
      expect(find.text(t('checkout.processing')), findsOneWidget);

      // the phone's own 1.4 s timer moves on to the decline, in Today mode
      await tr.pump(const Duration(milliseconds: 1401));
      expect(find.text(t('today.title')), findsOneWidget);

      c.setMode(PhoneMode.proposed);
      await tr.pump();
      expect(find.text(t('decline.title')), findsOneWidget);
      expect(find.text(t('today.title')), findsNothing);

      c.setScreen('limit');
      await tr.pump();
      expect(find.text(t('limit.forward')), findsOneWidget);

      c.setScreen('recovery');
      await tr.pump();
      expect(find.text(t('recovery.action')), findsOneWidget);
    });

    testWidgets('scrolling back up works: mode first, then the tab, lands on Shop in Today mode', (tr) async {
      ignoreOverflow();
      final c = PhoneController();
      await pumpPhone(tr, 'en', flow(c));
      c.setScreen('recovery');
      await tr.pump();
      c.setMode(PhoneMode.today);
      c.setScreen('tab', 'shop');
      await tr.pump();
      expect(find.text(t('product.buy')), findsOneWidget);
      expect(find.text(t('recovery.action')), findsNothing);
    });

    testWidgets('an unknown screen name is ignored, a tab accepts "home" and "nav.home"', (tr) async {
      ignoreOverflow();
      final c = PhoneController();
      await pumpPhone(tr, 'en', flow(c));
      c.setScreen('limit');
      await tr.pump();
      c.setScreen('nonsense');
      await tr.pump();
      expect(find.text(t('limit.forward')), findsOneWidget);

      c.setScreen('tab', 'home');
      await tr.pump();
      expect(find.text(t('home.storesForYou')), findsOneWidget);
      c.setScreen('tab', 'shop');
      await tr.pump();
      expect(find.text(t('home.storesForYou')), findsNothing);
      c.setScreen('tab', 'nav.home');
      await tr.pump();
      expect(find.text(t('home.storesForYou')), findsOneWidget);
    });

    testWidgets('setControls hides and restores the scenario picker and the toggle', (tr) async {
      ignoreOverflow();
      final c = PhoneController();
      await pumpPhone(tr, 'en', flow(c, controls: true, framed: true));
      expect(find.byType(ScenarioPicker), findsOneWidget);

      c.setControls(false);
      await tr.pump();
      expect(find.byType(ScenarioPicker), findsNothing);

      c.setControls(true);
      await tr.pump();
      expect(find.byType(ScenarioPicker), findsOneWidget);
    });
  });
}
