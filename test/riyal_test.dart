import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phone_view/riyal_glyph.dart';
import 'package:phone_view/rich.dart';

/// The official symbol sampled on a 24 x 28 grid from the reference mask
/// ('#' = ink). The vector must agree with it; an approximation would not.
const _mask = [
  '..........#.............',
  '.........##.............',
  '........###.....#.......',
  '........###...###.......',
  '........###...###.......',
  '........###...###.......',
  '........###...###.......',
  '........###...###.......',
  '........###...###.......',
  '........###...###.......',
  '........###...###.......',
  '........###...###....###',
  '........###...##########',
  '........###.###########.',
  '......##############....',
  '..###############.......',
  '..##########..###.......',
  '..#####.###...###....###',
  '.##.....###...##########',
  '........###...#########.',
  '........###...#######...',
  '......####....##........',
  '..########..............',
  '#########............###',
  '######..........########',
  '##.............########.',
  '..............#######...',
  '..............##........',
];

void main() {
  test('the vector matches the official mask cell for cell (>= 97%)', () {
    final path = riyalPath(const Size(240, 280)); // 10px per cell
    var total = 0, agree = 0;
    for (var j = 0; j < _mask.length; j++) {
      for (var i = 0; i < _mask[j].length; i++) {
        final inside = path.contains(Offset(i * 10 + 5, j * 10 + 5));
        total++;
        if (inside == (_mask[j][i] == '#')) agree++;
      }
    }
    expect(agree / total, greaterThanOrEqualTo(0.97), reason: '$agree of $total');
  });

  test('aspect ratio is the official 111:124', () {
    expect(riyalAspect, closeTo(111.08 / 124.04, 0.002));
  });

  testWidgets('RText paints the glyph for the sign and keeps the digits as text', (t) async {
    await t.pumpWidget(Directionality(
      textDirection: TextDirection.ltr,
      child: RText('$riyal 900', style: const TextStyle(fontSize: 16)),
    ));
    expect(find.byType(CustomPaint), findsWidgets);
    expect(find.textContaining('900', findRichText: true), findsOneWidget);
  });

  testWidgets('the {sar} token in the shared strings is the same glyph as U+20C1', (t) async {
    await t.pumpWidget(Directionality(
      textDirection: TextDirection.ltr,
      child: RText('{sar} 900', style: const TextStyle(fontSize: 16)),
    ));
    expect(find.byType(CustomPaint), findsWidgets);
    expect(find.textContaining('{sar}', findRichText: true), findsNothing);
  });

  testWidgets('the glyph box is the HTML .riyal box: 0.78em + 0.12em end margin', (t) async {
    for (final s in ['{sar}', riyal]) {
      await t.pumpWidget(Directionality(
        textDirection: TextDirection.ltr,
        child: Align(alignment: Alignment.topLeft, child: RText(s, style: const TextStyle(fontSize: 20))),
      ));
      expect(t.getSize(find.byType(RText)).width, closeTo(20 * 0.90, 0.01));
    }
  });

  testWidgets('screen readers hear the riyal name, never the raw token', (t) async {
    final h = t.ensureSemantics();
    await t.pumpWidget(Directionality(
      textDirection: TextDirection.ltr,
      child: RText('{sar} 900', style: const TextStyle(fontSize: 16), riyalName: 'Saudi riyals'),
    ));
    expect(find.bySemanticsLabel('Saudi riyals 900'), findsOneWidget);
    h.dispose();
  });
}
