import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// The export drops the page's own copy; this fails if the phone's code (or
/// the scenario data) names a string key the export no longer carries.
void main() {
  test('every string key the phone names exists in both languages', () {
    final strings =
        jsonDecode(File('assets/data/strings.json').readAsStringSync()) as Map<String, dynamic>;
    final used = <String>{};
    final re = RegExp(r"'((?:[a-z][a-zA-Z0-9]*)\.[a-zA-Z0-9.]+)'");
    for (final f in Directory('lib').listSync(recursive: true).whereType<File>()) {
      if (!f.path.endsWith('.dart')) continue;
      for (final m in re.allMatches(f.readAsStringSync())) {
        used.add(m.group(1)!);
      }
    }
    final scenarios = jsonDecode(File('assets/data/scenarios.json').readAsStringSync()) as List;
    for (final s in scenarios) {
      for (final e in (s as Map<String, dynamic>).entries) {
        if (e.key.endsWith('Key') && e.value is String) used.add(e.value as String);
      }
    }
    // keys the code composes ('unit.currency' etc.) are named in full above;
    // ignore things that are not string keys (file names, versions).
    const prefixes = {'checkout', 'nav', 'home', 'shop', 'cat', 'product', 'payments', 'profile', 'today', 'decline', 'schedule', 'limit', 'cause', 'recovery', 'reason', 'ctl', 'source', 'unit'};
    final wanted = used.where((k) => !k.endsWith('.dart') && prefixes.contains(k.split('.').first)).toList();
    expect(wanted.length, greaterThan(50));
    for (final lang in ['en', 'ar']) {
      final missing = wanted.where((k) => !(strings[lang] as Map).containsKey(k)).toList();
      expect(missing.where((k) => !k.endsWith('.')), isEmpty, reason: lang);
    }
  });
}
