import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../tokens.dart';

/// Colours the HTML phone uses that tokens.dart does not carry yet.
class K {
  /// The HTML phone's inherited line-height: 1.55, and 1.8 for body text in
  /// Arabic (app.css [dir=rtl] body); headings are 1.4 in Arabic.
  static double body(String lang) => lang == 'ar' ? 1.8 : 1.55;
  static double heading(String lang) => lang == 'ar' ? 1.4 : 1.55;

  /// Text-safe inks the HTML phone added (tokens.css): the brand tints fail
  /// 4.5:1 as text, these do not.
  static const restoredInk = Color(0xFF1E6B36);
  static const declinedInk = Color(0xFFA8402D);
  static const reviewInk = Color(0xFF8A4A10);
  static const n200 = Color(0xFFD6D3D0);
  static const pageN500 = Color(0xFF75726F); // n-500 on the page, outside the phone
  static const restoredBg = Color(0xFFDAF0DF); // --pos-100
  /// Active scenario chip, small text (bright theme: --chip-sub).
  static const chipSub = Color(0xFFBAB6B3);
}

/// One semantic node carrying "label: content"; the visual children are
/// hidden from the tree so a screen reader hears each block once, in order.
class SemBlock extends StatelessWidget {
  const SemBlock({super.key, required this.label, required this.child, this.header = false});
  final String label;
  final Widget child;
  final bool header;
  @override
  Widget build(BuildContext context) => Semantics(
      container: true, header: header, label: label, child: ExcludeSemantics(child: child));
}

/// White floating card: radius 20, padding .95rem 1.1rem (.block in app.css).
class WhiteCard extends StatelessWidget {
  const WhiteCard({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 17.6, vertical: 15.2),
        decoration: BoxDecoration(color: Tk.paper, borderRadius: BorderRadius.circular(20)),
        child: child,
      );
}

/// Column of screen children with the HTML phone's flex gap. When the parent
/// hands down a minimum height (the phone body), [pinLast] sticks the final
/// child to the bottom (margin-top:auto in the HTML) and [center] centres the
/// group; in an unconstrained scroll they simply follow each other.
/// (Done with a small render object rather than IntrinsicHeight + Spacer,
/// because the riyal glyph's baseline-aligned WidgetSpan cannot answer
/// intrinsic queries.)
class ScreenColumn extends StatelessWidget {
  const ScreenColumn({
    super.key,
    required this.children,
    this.gap = 18.4,
    this.pinLast = false,
    this.center = false,
  });
  final List<Widget> children;
  final double gap;
  final bool pinLast, center;

  Widget _stack(List<Widget> kids) {
    final out = <Widget>[];
    for (var i = 0; i < kids.length; i++) {
      if (i > 0) out.add(SizedBox(height: gap));
      out.add(kids[i]);
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: center ? CrossAxisAlignment.center : CrossAxisAlignment.stretch,
      children: out,
    );
  }

  @override
  Widget build(BuildContext context) => _VerticalFill(
        gap: gap,
        center: center,
        children: pinLast && children.length > 1
            ? [_stack(children.sublist(0, children.length - 1)), children.last]
            : [_stack(children)],
      );
}

class _VerticalFill extends MultiChildRenderObjectWidget {
  const _VerticalFill({required super.children, required this.gap, required this.center});
  final double gap;
  final bool center;
  @override
  RenderObject createRenderObject(BuildContext context) => _RenderVerticalFill(gap, center);
  @override
  void updateRenderObject(BuildContext context, _RenderVerticalFill r) {
    r
      ..gap = gap
      ..center = center;
  }
}

class _FillParentData extends ContainerBoxParentData<RenderBox> {}

class _RenderVerticalFill extends RenderBox
    with ContainerRenderObjectMixin<RenderBox, _FillParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _FillParentData> {
  _RenderVerticalFill(this._gap, this._center);
  double _gap;
  bool _center;
  set gap(double v) {
    if (v != _gap) {
      _gap = v;
      markNeedsLayout();
    }
  }

  set center(bool v) {
    if (v != _center) {
      _center = v;
      markNeedsLayout();
    }
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _FillParentData) child.parentData = _FillParentData();
  }

  @override
  void performLayout() {
    final w = constraints.maxWidth;
    final cc = _center
        ? BoxConstraints(maxWidth: w)
        : BoxConstraints.tightFor(width: w);
    final first = firstChild!;
    first.layout(cc, parentUsesSize: true);
    final second = childAfter(first);
    double total = first.size.height;
    if (second != null) {
      second.layout(cc, parentUsesSize: true);
      total += _gap + second.size.height;
    }
    final h = constraints.constrainHeight(total < constraints.minHeight ? constraints.minHeight : total);
    size = Size(w, h);
    double dx(RenderBox b) => _center ? (w - b.size.width) / 2 : 0;
    (first.parentData! as _FillParentData).offset =
        Offset(dx(first), _center ? (h - first.size.height) / 2 : 0);
    if (second != null) {
      (second.parentData! as _FillParentData).offset = Offset(dx(second), h - second.size.height);
    }
  }

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);
  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);
}

/// Pill button in the HTML phone's .btn style. 44px minimum height.
class PillButton extends StatelessWidget {
  const PillButton({super.key, required this.lang, required this.label, required this.onTap});
  final String lang, label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: label,
        onTap: onTap,
        child: ExcludeSemantics(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onTap,
            child: Container(
              constraints: const BoxConstraints(minHeight: 44),
              padding: const EdgeInsets.symmetric(vertical: 11.2, horizontal: 24),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Tk.paper,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: K.n200),
              ),
              child: Text(label, style: Tk.text(lang, 16, weight: FontWeight.w600, height: K.body(lang))),
            ),
          ),
        ),
      );
}

/// Underlined link row with a top rule (.screen__link).
class LinkRow extends StatelessWidget {
  const LinkRow({super.key, required this.lang, required this.label, required this.onTap});
  final String lang, label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: label,
        onTap: onTap,
        child: ExcludeSemantics(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onTap,
            child: Container(
              constraints: const BoxConstraints(minHeight: 44),
              padding: const EdgeInsets.only(top: 17.6),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: Tk.n100))),
              alignment: AlignmentDirectional.topStart,
              child: Text(label,
                  style: Tk.text(lang, 15.2,
                      weight: FontWeight.w600,
                      height: K.body(lang),
                      decoration: TextDecoration.underline,
                      decorationColor: Tk.n300)),
            ),
          ),
        ),
      );
}

/// Lets a small control (the 22px-tall "Back" text) accept taps in [below]
/// extra pixels under it, reaching a 40px target without moving the layout.
class ExtendedHit extends SingleChildRenderObjectWidget {
  const ExtendedHit({super.key, required super.child, this.below = 18});
  final double below;
  @override
  RenderObject createRenderObject(BuildContext context) => _RenderExtendedHit(below);
  @override
  void updateRenderObject(BuildContext context, _RenderExtendedHit r) => r.below = below;
}

class _RenderExtendedHit extends RenderProxyBox {
  _RenderExtendedHit(this.below);
  double below;
  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    if (position.dx < 0 || position.dx > size.width || position.dy < 0 || position.dy > size.height + below) {
      return false;
    }
    return child?.hitTest(result, position: Offset(position.dx, position.dy.clamp(0.0, size.height))) ?? false;
  }
}

TextStyle titleStyle(String lang) => Tk.text(lang, 28,
    weight: FontWeight.w600, height: lang == 'ar' ? 1.4 : 1.12, letterSpacing: -0.9);

/// CSS text-wrap: balance for a short heading: the narrowest width that keeps
/// the line count the full width would give, capped at [maxWidth] (15ch).
class BalancedText extends StatelessWidget {
  const BalancedText(this.text, {super.key, required this.style, this.maxWidth = 252, this.textAlign});
  final String text;
  final TextStyle style;
  final double maxWidth;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) {
    final dir = Directionality.of(context);
    return LayoutBuilder(builder: (context, c) {
      final full = c.maxWidth < maxWidth ? c.maxWidth : maxWidth;
      TextPainter tp(double w) => TextPainter(
          text: TextSpan(text: text, style: style), textDirection: dir)
        ..layout(maxWidth: w);
      final lines = tp(full).computeLineMetrics().length;
      var lo = 0.0, hi = full;
      for (var i = 0; i < 24; i++) {
        final mid = (lo + hi) / 2;
        if (tp(mid).computeLineMetrics().length <= lines) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      return SizedBox(
        width: (hi + 1).clamp(0, full).toDouble(),
        child: Text(text, style: style, textAlign: textAlign),
      );
    });
  }
}
