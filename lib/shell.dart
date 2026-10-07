import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import 'data.dart';
import 'tokens.dart';

/// Device frame and app chrome around a screen: bezel, island, status bar,
/// app header, floating tab bar, home indicator. Mirrors the HTML phone's
/// .phone / .statusbar / .appbar / .tabbar (assets/app.css). Pure chrome:
/// [body] fills the app area and [tabBar] sits under it; the state machine
/// that decides what they show lives in screens/flow.dart.
class PhoneShell extends StatelessWidget {
  const PhoneShell({
    super.key,
    required this.lang,
    required this.now,
    required this.body,
    required this.tabBar,
    this.framed = true,
  });

  final String lang;
  final DateTime now;
  final bool framed;
  final Widget body;
  final Widget tabBar;

  @override
  Widget build(BuildContext context) {
    final rtl = lang == 'ar';
    final screen = _Screen(lang: lang, now: now, framed: framed, body: body, tabBar: tabBar);
    return Directionality(
      textDirection: rtl ? TextDirection.rtl : TextDirection.ltr,
      child: framed
          ? Container(
              width: 390,
              height: 802,
              padding: const EdgeInsets.all(9.5), // + 1.5 border = 11px bezel
              decoration: BoxDecoration(
                color: Tk.bezel,
                borderRadius: BorderRadius.circular(56),
                border: Border.all(color: const Color(0xFF2E2E2E), width: 1.5),
              ),
              child: ClipRRect(borderRadius: BorderRadius.circular(45), child: screen),
            )
          : screen,
    );
  }
}

class _Screen extends StatelessWidget {
  const _Screen(
      {required this.lang,
      required this.now,
      required this.framed,
      required this.body,
      required this.tabBar});
  final String lang;
  final DateTime now;
  final bool framed;
  final Widget body, tabBar;

  @override
  Widget build(BuildContext context) {
    final hh = now.hour.toString().padLeft(2, '0');
    final mm = now.minute.toString().padLeft(2, '0');
    return Container(
      color: Tk.appBg,
      child: Stack(
        children: [
          Column(
            children: [
              if (framed)
                SizedBox(
                  height: 52,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(30, 16, 30, 0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('$hh:$mm', style: Tk.text(lang, 13.6, weight: FontWeight.w600)),
                        const Row(children: [
                          _Glyph(_Icon.bars, 18, 12),
                          SizedBox(width: 5),
                          _Glyph(_Icon.wifi, 16, 12),
                          SizedBox(width: 5),
                          _Glyph(_Icon.battery, 26, 13),
                        ]),
                      ],
                    ),
                  ),
                ),
              const Padding(
                padding: EdgeInsets.fromLTRB(21.6, 8.8, 21.6, 3.2),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [_Glyph(_Icon.bell, 22, 22), _Glyph(_Icon.headset, 22, 22)],
                ),
              ),
              Expanded(child: body),
              Padding(padding: const EdgeInsets.only(top: 6.4), child: tabBar),
              if (framed)
                SizedBox(
                  height: 26,
                  child: Center(
                    child: Container(
                      width: 140,
                      height: 5,
                      decoration: BoxDecoration(
                        color: Tk.n700.withAlpha(217),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          if (framed)
            Positioned(
              top: 11,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  width: 118,
                  height: 34,
                  decoration: BoxDecoration(
                      color: Tk.bezel, borderRadius: BorderRadius.circular(999)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// The floating pill tab bar: four labelled buttons. Each is 46 x 44 to tap
/// while the pill stays the HTML phone's 52px tall (visible chip 46 x 38).
class PhoneTabBar extends StatelessWidget {
  const PhoneTabBar(
      {required this.lang, required this.data, required this.current, required this.onSelect});
  final String lang;
  final PhoneData data;
  final String current;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    const tabs = [
      ('nav.home', _Icon.home),
      ('nav.shop', _Icon.shop),
      ('nav.payments', _Icon.payments),
      ('nav.profile', _Icon.profile),
    ];
    return Semantics(
      container: true,
      label: data.t(lang, 'nav.label'),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
          color: Tk.paper,
          borderRadius: BorderRadius.circular(999),
          boxShadow: const [
            BoxShadow(color: Color(0x381A1919), blurRadius: 20, offset: Offset(0, 6), spreadRadius: -8),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < tabs.length; i++) ...[
              if (i > 0) const SizedBox(width: 5.6),
              Semantics(
                button: true,
                selected: tabs[i].$1 == current,
                label: data.t(lang, tabs[i].$1),
                onTap: () => onSelect(tabs[i].$1),
                child: ExcludeSemantics(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => onSelect(tabs[i].$1),
                    child: SizedBox(
                      width: 46,
                      height: 44,
                      child: Center(
                        child: Container(
                          width: 46,
                          height: 38,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: tabs[i].$1 == current ? Tk.n100 : null,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: _Glyph(tabs[i].$2, 24, 24,
                              color: tabs[i].$1 == current ? Tk.ink : Tk.n500),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

enum _Icon { bars, wifi, battery, bell, headset, home, shop, payments, profile }

class _Glyph extends StatelessWidget {
  const _Glyph(this.icon, this.w, this.h, {this.color = Tk.ink});
  final _Icon icon;
  final double w, h;
  final Color color;
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: SizedBox(width: w, height: h, child: CustomPaint(painter: _IconPainter(icon, color))),
      );
}

/// Hand-ported from the HTML phone's inline SVG (viewBox units = pixels
/// for the status icons, 24 for the rest). No icon font, no asset fetch.
class _IconPainter extends CustomPainter {
  _IconPainter(this.icon, this.color);
  final _Icon icon;
  final Color color;

  Paint get _stroke => Paint()
    ..color = color
    ..style = PaintingStyle.stroke
    ..strokeWidth = 1.7
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round;
  Paint get _fill => Paint()..color = color;

  void _rr(Canvas c, double x, double y, double w, double h, double r, Paint p) =>
      c.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(x, y, w, h), Radius.circular(r)), p);

  @override
  void paint(Canvas c, Size size) {
    switch (icon) {
      case _Icon.bars:
        for (final b in [(0.0, 8.0, 4.0), (5.0, 6.0, 6.0), (10.0, 3.0, 9.0), (15.0, 0.0, 12.0)]) {
          _rr(c, b.$1, b.$2, 3, b.$3, 1, _fill);
        }
      case _Icon.wifi:
        final p = Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.6
          ..strokeCap = StrokeCap.round;
        c.drawArc(Rect.fromCircle(center: const Offset(8, 11), radius: 6.6),
            -math.pi * 0.8, math.pi * 0.6, false, p);
        c.drawArc(Rect.fromCircle(center: const Offset(8, 11), radius: 10.6),
            -math.pi * 0.8, math.pi * 0.6, false, p);
        final tri = Path()
          ..moveTo(8, 11.2)
          ..lineTo(5.6, 8.6)
          ..quadraticBezierTo(8, 6.8, 10.4, 8.6)
          ..close();
        c.drawPath(tri, _fill);
      case _Icon.battery:
        _rr(c, 0.6, 0.6, 22, 11.8, 3.4,
            Paint()
              ..color = color.withAlpha(102)
              ..style = PaintingStyle.stroke
              ..strokeWidth = 1);
        _rr(c, 2.4, 2.4, 15, 8.2, 2.2, _fill);
        _rr(c, 24.4, 4.6, 1.4, 3.8, 0.7, Paint()..color = color.withAlpha(102));
      case _Icon.bell:
        c.save();
        c.scale(size.width / 24);
        final body = Path()
          ..moveTo(12, 3)
          ..arcToPoint(const Offset(6, 9), radius: const Radius.circular(6), clockwise: false)
          ..lineTo(6, 12.6)
          ..lineTo(4.6, 15.4)
          ..arcToPoint(const Offset(5.5, 16.9), radius: const Radius.circular(1))
          ..lineTo(18.5, 16.9)
          ..arcToPoint(const Offset(19.4, 15.4), radius: const Radius.circular(1))
          ..lineTo(18, 12.6)
          ..lineTo(18, 9)
          ..arcToPoint(const Offset(12, 3), radius: const Radius.circular(6), clockwise: false)
          ..close();
        c.drawPath(body, _stroke);
        c.drawArc(Rect.fromCircle(center: const Offset(12, 19.4), radius: 2.4), 0.2, math.pi - 0.4, false, _stroke);
        c.restore();
      case _Icon.headset:
        c.save();
        c.scale(size.width / 24);
        c.drawArc(Rect.fromCircle(center: const Offset(12, 13), radius: 8), math.pi, math.pi, false, _stroke);
        _rr(c, 3, 13, 4, 7, 2, _fill);
        _rr(c, 17, 13, 4, 7, 2, _fill);
        c.restore();
      case _Icon.home:
        c.save();
        c.scale(size.width / 24);
        final p = Path()
          ..moveTo(4, 11.2)
          ..lineTo(12, 4.5)
          ..lineTo(20, 11.2)
          ..lineTo(20, 20)
          ..lineTo(19, 21)
          ..lineTo(15, 21)
          ..lineTo(15, 15)
          ..lineTo(9, 15)
          ..lineTo(9, 21)
          ..lineTo(5, 21)
          ..lineTo(4, 20)
          ..close();
        c.drawPath(p, _stroke);
        c.restore();
      case _Icon.shop:
        c.save();
        c.scale(size.width / 24);
        c.drawPath(
            Path()
              ..moveTo(5, 8)
              ..lineTo(19, 8)
              ..lineTo(18, 20)
              ..lineTo(6, 20)
              ..close(),
            _stroke);
        c.drawPath(
            Path()
              ..moveTo(9, 8)
              ..lineTo(9, 6.5)
              ..arcToPoint(const Offset(15, 6.5), radius: const Radius.circular(3))
              ..lineTo(15, 8),
            _stroke);
        c.restore();
      case _Icon.payments:
        c.save();
        c.scale(size.width / 24);
        c.drawCircle(const Offset(12, 12), 8, _stroke);
        c.drawPath(
            Path()
              ..moveTo(12, 4)
              ..arcToPoint(const Offset(20, 12), radius: const Radius.circular(8))
              ..lineTo(12, 12)
              ..close(),
            _fill);
        c.restore();
      case _Icon.profile:
        c.save();
        c.scale(size.width / 24);
        c.drawCircle(const Offset(12, 9), 3.4, _stroke);
        c.drawArc(Rect.fromCircle(center: const Offset(12, 20), radius: 6.5), math.pi, math.pi, false, _stroke);
        c.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _IconPainter old) => old.icon != icon || old.color != color;
}
