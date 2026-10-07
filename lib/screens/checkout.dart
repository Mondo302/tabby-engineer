import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../data.dart';
import '../rich.dart';
import '../tokens.dart';
import 'common.dart';

/// Screen 0, the checkout. Mirrors renderCheckout() in the HTML phone: the
/// decline has to be earned, so the buyer sees a normal split-payment offer
/// first. Every string comes from the shared data.
///
/// Note on the schedule strip: the HTML phone passes no variant here and so
/// divides the *available* amount (0 for a blocked account), which prints
/// four "0" cells beside a terms line that says 225. This port divides the
/// requested amount, matching the terms line and the offer being made.
class CheckoutScreen extends StatelessWidget {
  const CheckoutScreen({
    super.key,
    required this.data,
    required this.lang,
    required this.scenario,
    required this.onPay,
  });

  final PhoneData data;
  final String lang;
  final Scenario scenario;
  final VoidCallback onPay;

  String t(String key, [Map<String, Object?>? p]) => data.t(lang, key, p);

  @override
  Widget build(BuildContext context) {
    final months = scenario.planMonths;
    final each = (scenario.requested / months).round();
    final amount = data.money(lang, scenario.requested);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 6.4),
          child: Text(t('checkout.merchant'), style: bt(lang, 13.6, color: Tk.n400)),
        ),
        const SizedBox(height: 16),
        Semantics(
          container: true,
          label: '${t('checkout.item')}: $amount',
          child: ExcludeSemantics(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 12, bottom: 1.6),
                  child: Text(t('checkout.item'), style: bt(lang, 14.4, color: Tk.n500)),
                ),
                RText(amount,
                    style: bt(lang, 38.4, weight: FontWeight.w600, letterSpacing: -0.77)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Semantics(
          container: true,
          label: t('schedule.label'),
          child: ExcludeSemantics(
            child: Row(
              children: [
                for (var i = 0; i < months; i++) ...[
                  if (i > 0) const SizedBox(width: 6),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5.6, vertical: 8),
                      decoration:
                          BoxDecoration(color: Tk.paper, borderRadius: BorderRadius.circular(12)),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          RText(data.money(lang, each),
                              maxLines: 1,
                              style: bt(lang, 13.1, weight: FontWeight.w600, height: 1.3)),
                          Text(t('schedule.month', {'n': i + 1}),
                              maxLines: 1,
                              style: bt(lang, 11.5, color: Tk.n500, height: 1.3)),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        RText(t('checkout.each', {'amount': data.money(lang, each), 'n': months - 1}),
            style: bt(lang, 13.6, color: Tk.n500)),
        const Spacer(),
        Padding(
          padding: const EdgeInsets.only(top: 16),
          child: PrimaryButton(lang: lang, label: t('checkout.pay'), onTap: onPay),
        ),
      ],
    );
  }
}

/// The 'checking' beat between paying and the decline. A real pause, since
/// an instant rejection would read as a mock. [delay] is injectable so tests
/// do not wait; under reduced motion the ring is drawn still.
class ProcessingScreen extends StatefulWidget {
  const ProcessingScreen({
    super.key,
    required this.data,
    required this.lang,
    required this.onDone,
    this.delay = const Duration(milliseconds: 1400),
  });

  final PhoneData data;
  final String lang;
  final VoidCallback onDone;
  final Duration delay;

  @override
  State<ProcessingScreen> createState() => _ProcessingScreenState();
}

class _ProcessingScreenState extends State<ProcessingScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _spin =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 720));
  Timer? _timer;
  bool _reduced = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer(widget.delay, widget.onDone);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (_reduced) {
      _spin.stop();
    } else if (!_spin.isAnimating) {
      _spin.repeat();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _spin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final label = widget.data.t(widget.lang, 'checkout.processing');
    return Semantics(
      container: true,
      liveRegion: true,
      label: label,
      child: ExcludeSemantics(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedBuilder(
              animation: _spin,
              builder: (_, __) => Transform.rotate(
                angle: _reduced ? 0 : _spin.value * 2 * math.pi,
                child: const SizedBox(width: 30, height: 30, child: CustomPaint(painter: _Ring())),
              ),
            ),
            const SizedBox(height: 16),
            Text(label, style: bt(widget.lang, 16, color: Tk.n500)),
          ],
        ),
      ),
    );
  }
}

/// 30px ring, 2.5px stroke: n-200 track with an ink quarter on top.
class _Ring extends CustomPainter {
  const _Ring();
  @override
  void paint(Canvas c, Size s) {
    final r = Rect.fromLTWH(1.25, 1.25, s.width - 2.5, s.height - 2.5);
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..color = const Color(0xFFD6D3D0);
    c.drawArc(r, 0, math.pi * 2, false, p);
    c.drawArc(r, -math.pi * 0.75, math.pi / 2, false, p..color = Tk.ink);
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}
