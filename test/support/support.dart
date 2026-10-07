import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phone_view/data.dart';

/// Loads the exported JSON exactly as the app does (no retyped copy).
PhoneData loadData() {
  Map<String, dynamic> read(String n) =>
      jsonDecode(File('assets/data/$n.json').readAsStringSync()) as Map<String, dynamic>;
  return PhoneData.fromJson(
    strings: read('strings'),
    scenarios: jsonDecode(File('assets/data/scenarios.json').readAsStringSync()) as List,
    format: read('format'),
    appData: read('app-data'),
  );
}

Future<void> pumpPhone(WidgetTester t, String lang, Widget child,
    {bool reducedMotion = false}) async {
  await t.binding.setSurfaceSize(const Size(390, 800));
  await t.pumpWidget(
    Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: MediaQuery(
        data: MediaQueryData(size: const Size(390, 800), disableAnimations: reducedMotion),
        child: child,
      ),
    ),
  );
}

/// Text (or rich text) whose plain form equals [s]; the painted riyal
/// placeholder is mapped back to the sign for comparison.
Finder txt(String s) => find.byWidgetPredicate((w) =>
    w is Text && (w.data ?? w.textSpan!.toPlainText()).replaceAll('￼', '⃁') == s.replaceAll('{sar}', '⃁'));

/// Every string on screen, riyal placeholders mapped back to the sign.
List<String> allText(WidgetTester t) => [
      for (final w in t.widgetList<Text>(find.byType(Text)))
        (w.data ?? w.textSpan!.toPlainText()).replaceAll('￼', '⃁'),
    ];

/// The data as a newer export would ship it: the sign written as the {sar}
/// token, and a spoken name for it.
PhoneData loadDataWithSarToken() {
  Map<String, dynamic> read(String n) =>
      jsonDecode(File('assets/data/$n.json').readAsStringSync()) as Map<String, dynamic>;
  final strings = read('strings');
  for (final lang in strings.values) {
    (lang as Map<String, dynamic>).updateAll((k, v) => (v as String).replaceAll('⃁', '{sar}'));
  }
  (strings['en'] as Map<String, dynamic>)['unit.riyalName'] = 'Saudi riyals';
  (strings['ar'] as Map<String, dynamic>)['unit.riyalName'] = 'ريال سعودي';
  return PhoneData.fromJson(
    strings: strings,
    scenarios: jsonDecode(File('assets/data/scenarios.json').readAsStringSync()) as List,
    format: read('format'),
    appData: read('app-data'),
  );
}
