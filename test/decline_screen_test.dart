import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phone_view/data.dart';
import 'package:phone_view/decline_screen.dart';

PhoneData loadData() {
  Map<String, dynamic> read(String n) =>
      jsonDecode(File('assets/data/$n.json').readAsStringSync()) as Map<String, dynamic>;
  final scenarios = jsonDecode(File('assets/data/scenarios.json').readAsStringSync()) as List;
  return PhoneData.fromJson(
    strings: read('strings'),
    scenarios: scenarios,
    format: read('format'),
  );
}

// Fixed clock so "in N days" is deterministic: 2026-09-25 -> 2026-11-14 = 50.
final today = DateTime(2026, 9, 25);

Future<void> pump(WidgetTester t, PhoneData d, String lang, {String scenario = 'silent-block'}) async {
  await t.binding.setSurfaceSize(const Size(390, 900));
  await t.pumpWidget(
    Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: MediaQuery(
        data: const MediaQueryData(size: Size(390, 900)),
        child: DeclineScreen(data: d, lang: lang, scenarioId: scenario, now: today),
      ),
    ),
  );
}

/// Text widgets whose plain text equals [s]; the riyal sign is a painted
/// widget, so its placeholder is mapped back to the sign for comparison.
Finder txt(String s) => find.byWidgetPredicate((w) =>
    w is Text &&
    (w.data ?? w.textSpan!.toPlainText()).replaceAll('￼', '⃁') == s);

void main() {
  final d = loadData();
  final silentBlock = d.scenario('silent-block');

  group("The silent-block scenario facts (from scenarios data, not retyped copy)", () {
    test('the data says what the research says', () {
      expect(silentBlock.facts['accountAgeMonths'], 14);
      expect(silentBlock.facts['completedPlans'], 1);
      expect(silentBlock.facts['overdue'], false);
      expect(silentBlock.recoveryPath, 'time');
      expect(silentBlock.requested, 900);
      expect(silentBlock.available, 0);
      expect(silentBlock.nextReviewISO, '2026-11-14');
      expect(silentBlock.reasonKey, 'reason.paused');
    });

    testWidgets('EN: reason, next review date and a next action are on screen', (t) async {
      await pump(t, d, 'en');
      expect(find.text(d.t('en', silentBlock.reasonKey)), findsOneWidget);
      expect(find.text('14 November, in 50 days'), findsOneWidget);
      expect(find.text('Remind me on 14 November'), findsOneWidget);
      // recovery is time, not payments: says so, shows no payment count
      expect(find.text(d.t('en', 'decline.nothingToDo')), findsOneWidget);
      expect(find.textContaining(RegExp(r'\d+ (of|out of) \d+')), findsNothing);
      // nothing is available: no "Available now" row
      expect(find.text(d.t('en', 'decline.availableLabel')), findsNothing);
      // requested amount with the riyal sign, never letters
      expect(txt('⃁ 900'), findsOneWidget);
      expect(find.textContaining('SAR'), findsNothing);
    });

    testWidgets('AR: same facts, Arabic copy, RTL, Western digits', (t) async {
      await pump(t, d, 'ar');
      expect(find.text(d.t('ar', silentBlock.reasonKey)), findsOneWidget);
      expect(find.text('14 نوفمبر، بعد 50 يومًا'), findsOneWidget);
      expect(find.text('ذكّرني في 14 نوفمبر'), findsOneWidget);
      expect(find.text(d.t('ar', 'decline.nothingToDo')), findsOneWidget);
      expect(txt('⃁ 900'), findsOneWidget);
      final dir = Directionality.of(t.element(find.byType(DeclineScreen)));
      expect(dir, TextDirection.rtl);
    });

    testWidgets('AR layout is mirrored: label sits to the right of the amount', (t) async {
      await pump(t, d, 'ar');
      final label = t.getTopRight(find.text(d.t('ar', 'decline.requestedLabel')));
      final value = t.getTopRight(txt('⃁ 900'));
      expect(label.dx, greaterThan(value.dx));
    });
  });

  group('other scenarios come from the same data', () {
    testWidgets('new-account shows available now and both alternatives', (t) async {
      await pump(t, d, 'en', scenario: 'new-account');
      expect(find.text(d.t('en', 'decline.availableLabel')), findsOneWidget);
      expect(txt('⃁ 1,800'), findsOneWidget);
      expect(txt('Pay ⃁ 1,800 with us, ⃁ 600 by card'), findsOneWidget);
      expect(txt('Split ⃁ 1,800 over 3 months'), findsOneWidget);
    });
  });

  group('semantics', () {
    testWidgets('a screen reader gets the reason, the date and the next step', (t) async {
      final h = t.ensureSemantics();
      await pump(t, d, 'en');
      expect(find.bySemanticsLabel(RegExp('Why.*automatic review')), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('Next review.*14 November, in 50 days')), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('What you can do.*Remind me on 14 November')), findsOneWidget);
      h.dispose();
    });

    testWidgets('Arabic semantics carry the Arabic reason', (t) async {
      final h = t.ensureSemantics();
      await pump(t, d, 'ar');
      expect(find.bySemanticsLabel(RegExp('السبب.*مراجعة تلقائية')), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('المراجعة القادمة.*14 نوفمبر')), findsOneWidget);
      h.dispose();
    });
  });
}
