import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Regression guard: both font families register a 400 and a 600 face. A
/// missing 600 makes bold text fall back to synthesised bold (looks heavier
/// than the HTML phone) or to the regular face (looks lighter).
void main() {
  final pubspec = File('pubspec.yaml').readAsStringSync();

  for (final family in ['PlexSans', 'PlexArabic']) {
    test('$family registers weights 400 and 600 with real files', () {
      final start = pubspec.indexOf('family: $family');
      expect(start, greaterThan(-1));
      final next = pubspec.indexOf('family:', start + 10);
      final block = pubspec.substring(start, next == -1 ? pubspec.length : next);
      for (final w in [400, 600]) {
        final m = RegExp('asset: (\\S+)\\s+weight: $w').firstMatch(block);
        expect(m, isNotNull, reason: '$family weight $w');
        expect(File(m!.group(1)!).existsSync(), true, reason: m.group(1));
      }
    });
  }
}
