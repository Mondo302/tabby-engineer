import 'package:flutter/widgets.dart';

import 'riyal_glyph.dart';

const riyal = '⃁';

/// The shared strings write the sign as the character above or, in newer
/// exports, as this token. Both draw the same vector.
const riyalToken = '{sar}';

/// The HTML phone's .riyal box: 0.78em wide, 0.88em tall, the 126 x 141
/// mask fitted inside it, lowered 0.1em, followed by a 0.12em margin.
const _boxW = 0.78, _boxH = 0.88, _drop = 0.10, _margin = 0.12;
const _maskW = 126.0, _maskH = 141.0;
const _glyphX = 7.46, _glyphY = 8.36, _glyphW = 111.08, _glyphH = 124.04;

/// Supplies the spoken name of the riyal sign to every [RText] below it, so
/// screens do not each thread the string through.
class RiyalScope extends InheritedWidget {
  const RiyalScope({super.key, required this.name, required super.child});
  final String name;
  static String of(BuildContext c) => c.dependOnInheritedWidgetOfExactType<RiyalScope>()?.name ?? '';
  @override
  bool updateShouldNotify(RiyalScope old) => old.name != name;
}

/// Text that draws the Saudi riyal sign as the official vector
/// (riyal_glyph.dart). The bundled Plex fonts do not contain U+20C1, and
/// without this the engine would try to fetch a fallback font from a
/// third-party host. The string itself stays the shared data's string; only
/// the sign's rendering is swapped. [riyalName] is what a screen reader says
/// for the sign (from the shared strings); empty means it stays silent.
class RText extends StatelessWidget {
  const RText(this.text, {super.key, required this.style, this.maxLines, this.riyalName = ''});
  final String text;
  final TextStyle style;
  final int? maxLines;
  final String riyalName;

  static bool hasSign(String s) => s.contains(riyal) || s.contains(riyalToken);

  @override
  Widget build(BuildContext context) {
    if (!hasSign(text)) return Text(text, style: style, maxLines: maxLines);
    final size = style.fontSize ?? 16;
    final name = riyalName.isEmpty ? RiyalScope.of(context) : riyalName;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final color = style.color ?? const Color(0xFF000000);
    final parts = text.replaceAll(riyalToken, riyal).split(riyal);
    final spans = <InlineSpan>[];
    for (var i = 0; i < parts.length; i++) {
      if (i > 0) {
        spans.add(WidgetSpan(
          alignment: PlaceholderAlignment.baseline,
          baseline: TextBaseline.alphabetic,
          child: ExcludeSemantics(
            child: Transform.translate(
              offset: Offset(0, _drop * size),
              child: SizedBox(
                width: (_boxW + _margin) * size,
                height: _boxH * size,
                child: CustomPaint(painter: _Riyal(color, size, rtl)),
              ),
            ),
          ),
        ));
      }
      if (parts[i].isNotEmpty) spans.add(TextSpan(text: parts[i]));
    }
    final spoken = parts.join(name).replaceAll(RegExp(r'\s+'), ' ').trim();
    return Text.rich(TextSpan(children: spans, style: style),
        maxLines: maxLines, semanticsLabel: spoken);
  }
}

class _Riyal extends CustomPainter {
  _Riyal(this.color, this.em, this.rtl);
  final Color color;
  final double em;
  final bool rtl;

  @override
  void paint(Canvas c, Size s) {
    final boxW = _boxW * em, boxH = _boxH * em;
    // mask fitted with `contain` inside the box, centred; the end margin
    // sits after the box in reading order.
    final k = (boxW / _maskW) < (boxH / _maskH) ? boxW / _maskW : boxH / _maskH;
    final left = (boxW - _maskW * k) / 2 + _glyphX * k;
    final top = (boxH - _maskH * k) / 2 + _glyphY * k;
    final gw = _glyphW * k, gh = _glyphH * k;
    c.save();
    // In RTL the margin is on the left, so the box sits at the right edge.
    c.translate(rtl ? s.width - boxW : 0, 0);
    c.translate(left, top);
    c.drawPath(riyalPath(Size(gw, gh)), Paint()..color = color);
    c.restore();
  }

  @override
  bool shouldRepaint(covariant _Riyal o) => o.color != color || o.em != em || o.rtl != rtl;
}
