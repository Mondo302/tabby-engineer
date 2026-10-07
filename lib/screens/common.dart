import 'package:flutter/widgets.dart';

import '../tokens.dart';

/// Body text as the HTML phone sets it: line-height 1.55 unless a rule
/// says otherwise (the decline screen predates this and sets its own).
TextStyle bt(String lang, double size,
        {FontWeight weight = FontWeight.w400,
        Color color = Tk.ink,
        double height = 1.55,
        double letterSpacing = 0,
        TextDecoration? decoration}) =>
    Tk.text(lang, size,
        weight: weight, color: color, height: height, letterSpacing: letterSpacing, decoration: decoration);

/// The HTML phone's .btn--primary: full width, ink pill, white 600 label.
/// One labelled button node; the visual label is hidden from the tree.
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({super.key, required this.lang, required this.label, required this.onTap, this.spans});
  final String lang, label;
  final VoidCallback onTap;

  /// Optional rich label (e.g. with the riyal glyph); [label] stays the
  /// semantic text.
  final Widget? spans;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        container: true,
        label: label,
        onTap: onTap,
        child: ExcludeSemantics(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onTap,
            child: Container(
              constraints: const BoxConstraints(minHeight: 44),
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 11.2),
              decoration: BoxDecoration(
                color: Tk.ink,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Tk.ink),
              ),
              child: Text(label, style: bt(lang, 16, weight: FontWeight.w600, color: Tk.paper)),
            ),
          ),
        ),
      );
}

/// A chevron drawn as a path (the sign is not in the bundled fonts, and a
/// text glyph would risk a fallback font fetch). Points inline-end.
class Chevron extends StatelessWidget {
  const Chevron({super.key, this.color = Tk.n300});
  final Color color;
  @override
  Widget build(BuildContext context) {
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return ExcludeSemantics(
      child: SizedBox(
        width: 5,
        height: 10,
        child: CustomPaint(painter: _ChevronPainter(color, rtl)),
      ),
    );
  }
}

class _ChevronPainter extends CustomPainter {
  _ChevronPainter(this.color, this.rtl);
  final Color color;
  final bool rtl;
  @override
  void paint(Canvas c, Size s) {
    final p = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.3
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final x0 = rtl ? s.width - 0.8 : 0.8, x1 = rtl ? 0.8 : s.width - 0.8;
    c.drawPath(
        Path()
          ..moveTo(x0, 0.8)
          ..lineTo(x1, s.height / 2)
          ..lineTo(x0, s.height - 0.8),
        p);
  }

  @override
  bool shouldRepaint(covariant _ChevronPainter o) => o.color != color || o.rtl != rtl;
}
