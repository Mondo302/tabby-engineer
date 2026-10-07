import 'dart:math' as math;

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phone_view/screens/mode_toggle.dart';
import 'package:phone_view/screens/page_palette.dart';
import 'package:phone_view/screens/scenario_picker.dart';

import 'support/support.dart';

double _lum(Color c) {
  double ch(double v) => v <= 0.03928 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

double contrast(Color a, Color b) {
  final l1 = _lum(a), l2 = _lum(b);
  return (math.max(l1, l2) + 0.05) / (math.min(l1, l2) + 0.05);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final d = loadData();

  for (final entry in {'bright': PagePalette.bright, 'dark': PagePalette.dark}.entries) {
    final p = entry.value;
    group('page palette (${entry.key} page): contrast', () {
      test('ground is the page colour', () {
        expect(p.ground, entry.key == 'dark' ? const Color(0xFF1A1919) : const Color(0xFFF5F4F2));
      });
      test('text on cards and chips >= 4.5:1', () {
        expect(contrast(p.name, p.cardBg), greaterThanOrEqualTo(4.5));
        expect(contrast(p.sub, p.cardBg), greaterThanOrEqualTo(4.5));
        expect(contrast(p.activeName, p.activeBg), greaterThanOrEqualTo(4.5));
        expect(contrast(p.activeSub, p.activeBg), greaterThanOrEqualTo(4.5));
      });
      test('toggle text >= 4.5:1 (active pill, inactive on the track)', () {
        expect(contrast(p.pillText, p.pillBg), greaterThanOrEqualTo(4.5));
        expect(contrast(p.inactiveText, p.trackBg), greaterThanOrEqualTo(4.5));
      });
      test('control boundaries and the selected state >= 3:1 against what they sit on', () {
        expect(contrast(p.cardBorder, p.ground), greaterThanOrEqualTo(3));
        expect(contrast(p.activeBg, p.ground), greaterThanOrEqualTo(3)); // selected chip vs page
        expect(contrast(p.activeBg, p.cardBg), greaterThanOrEqualTo(3)); // selected vs unselected
        expect(contrast(p.trackBorder, p.ground), greaterThanOrEqualTo(3));
        expect(contrast(p.pillBorder, p.trackBg), greaterThanOrEqualTo(3)); // selected pill vs track
      });
    });
  }

  group('page palette: the widgets use it', () {
    testWidgets('picker chips: dark page vs bright page differ, and active is the light chip in dark',
        (t) async {
      Future<Color> chipColour(bool dark, String id) async {
        await pumpPhone(t, 'en', Directionality(
          textDirection: TextDirection.ltr,
          child: ScenarioPicker(
              data: d, lang: 'en', selectedId: 'silent-block', onSelect: (_) {}, dark: dark),
        ));
        final box = t.widget<Container>(find.byKey(ValueKey('scenario-$id')));
        return (box.decoration as BoxDecoration).color!;
      }

      expect(await chipColour(true, 'new-account'), PagePalette.dark.cardBg);
      expect(await chipColour(false, 'new-account'), PagePalette.bright.cardBg);
      expect(await chipColour(true, 'silent-block'), PagePalette.dark.activeBg);
      expect(await chipColour(false, 'silent-block'), PagePalette.bright.activeBg);
    });

    testWidgets('toggle: dark track and pill come from the dark palette', (t) async {
      await pumpPhone(t, 'en', Directionality(
        textDirection: TextDirection.ltr,
        child: ModeToggle(
            data: d, lang: 'en', mode: PhoneMode.proposed, onChanged: (_) {}, dark: true),
      ));
      final track = t.widget<DecoratedBox>(find.byKey(const ValueKey('mode-track')));
      expect((track.decoration as BoxDecoration).color, PagePalette.dark.trackBg);
      final pill = t.widget<DecoratedBox>(find.byKey(const ValueKey('mode-proposed-bg')));
      expect((pill.decoration as BoxDecoration).color, PagePalette.dark.pillBg);
      final txt = t.widget<Text>(find.text('Today'));
      expect(txt.style!.color, PagePalette.dark.inactiveText);
    });
  });
}
