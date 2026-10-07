import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import 'data.dart';
import 'rich.dart';
import 'screens/kit.dart' show BalancedText, K, titleStyle;
import 'tokens.dart';

/// The proposed decline screen: reason category, options, review date.
/// Mirrors renderDecline() in the HTML phone; every string comes from the
/// shared data, keyed exactly as the HTML phone keys it.
class DeclineScreen extends StatelessWidget {
  const DeclineScreen({
    super.key,
    required this.data,
    required this.lang,
    required this.scenarioId,
    required this.now,
    this.onLimit,
  });

  final PhoneData data;
  final String lang;
  final String scenarioId;
  final DateTime now;

  /// Tapped from the "how your limit works" link; the flow decides where it goes.
  final VoidCallback? onLimit;

  String t(String key, [Map<String, Object?>? p]) => data.t(lang, key, p);

  @override
  Widget build(BuildContext context) {
    final s = data.scenario(scenarioId);
    final dateText = data.formatDate(lang, s.nextReviewISO);
    final reviewText = t('decline.reviewValue', {
      'date': dateText,
      'days': data.daysUntil(s.nextReviewISO, now),
    });
    final remainder = s.requested - s.available;
    final options = [
      for (final alt in s.alternatives)
        t(alt['key'] as String, {
          'available': data.money(lang, s.available),
          'remainder': data.money(lang, remainder),
          'months': alt['months'],
          'date': dateText,
        }),
    ];
    const gap = 18.4; // 1.15rem
    final kids = <Widget>[
      Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Semantics(
          header: true,
          child: Align(
            alignment: AlignmentDirectional.centerStart,
            // text-wrap: balance, as the HTML title: both languages break evenly.
            child: BalancedText(t('decline.title'), style: titleStyle(lang), maxWidth: 235),
          ),
        ),
      ),
      _Schedule(lang: lang, label: t('schedule.label'), s: s, data: data),
      _Block(
        label: '${t('decline.why')}: ${t(s.reasonKey)}',
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 17.6, vertical: 15.2),
          decoration: BoxDecoration(color: Tk.negBg, borderRadius: BorderRadius.circular(20)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t('decline.why'),
                  style: Tk.text(lang, 13.6, weight: FontWeight.w600, color: K.declinedInk)),
              const SizedBox(height: 8),
              Text(t(s.reasonKey), style: Tk.text(lang, 15.5, height: lang == 'ar' ? 1.3 : 1.45)),
            ],
          ),
        ),
      ),
      _Block(
        label: [
          '${t('decline.requestedLabel')}: ${data.money(lang, s.requested)}',
          if (s.available > 0) '${t('decline.availableLabel')}: ${data.money(lang, s.available)}',
        ].join('. '),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 17.6, vertical: 17.2),
          decoration: BoxDecoration(color: Tk.paper, borderRadius: BorderRadius.circular(20)),
          child: Column(
            children: [
              _AmountRow(lang, t('decline.requestedLabel'), data.money(lang, s.requested),
                  Tk.n500, Tk.ink),
              if (s.available > 0) ...[
                const SizedBox(height: 4.8),
                _AmountRow(lang, t('decline.availableLabel'),
                    data.money(lang, s.available), Tk.n700, Tk.n700),
              ],
            ],
          ),
        ),
      ),
      if (options.isNotEmpty)
        _Block(
          label: '${t('decline.options')}: ${options.join('. ')}',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(17.6, 0, 17.6, 8),
                child: Text(t('decline.options'),
                    style: Tk.text(lang, 13.6, weight: FontWeight.w600, color: Tk.n600)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 17.6, vertical: 18.2),
                decoration:
                    BoxDecoration(color: Tk.paper, borderRadius: BorderRadius.circular(20)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < options.length; i++)
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 9.9),
                        decoration: i == 0
                            ? null
                            : const BoxDecoration(
                                border: Border(top: BorderSide(color: Tk.n100))),
                        child: RText(options[i], style: Tk.text(lang, 15.2)),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      _Block(
        label: '${t('decline.review')}: $reviewText',
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(t('decline.review'), style: Tk.text(lang, 14.7, color: Tk.n500)),
            const SizedBox(width: 16),
            Flexible(
              child: Text(reviewText,
                  style: Tk.text(lang, 14.7, weight: FontWeight.w600, color: K.reviewInk)),
            ),
          ],
        ),
      ),
      if (s.recoveryPath == 'time')
        Text(t('decline.nothingToDo'),
            style: Tk.text(lang, 14.4,
                weight: FontWeight.w600, color: K.restoredInk, height: lang == 'ar' ? 1.6 : 1.55)),
      Semantics(
        button: true,
        container: true,
        label: t('decline.limitLink'),
        onTap: onLimit,
        child: ExcludeSemantics(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onLimit,
            child: Container(
            padding: const EdgeInsets.only(top: 16, bottom: 4),
            decoration: const BoxDecoration(border: Border(top: BorderSide(color: Tk.n100))),
            child: Text(t('decline.limitLink'),
                style: Tk.text(lang, 15.2,
                    weight: FontWeight.w600,
                    decoration: TextDecoration.underline,
                    decorationColor: Tk.n300)),
            ),
          ),
        ),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < kids.length; i++) ...[
          if (i > 0) const SizedBox(height: gap),
          kids[i],
        ],
      ],
    );
  }
}

/// One semantic node carrying "label: content", with the visual children
/// hidden from the tree so a screen reader hears it once, in order.
class _Block extends StatelessWidget {
  const _Block({required this.label, required this.child});
  final String label;
  final Widget child;
  @override
  Widget build(BuildContext context) =>
      Semantics(container: true, label: label, child: ExcludeSemantics(child: child));
}

class _AmountRow extends StatelessWidget {
  const _AmountRow(this.lang, this.term, this.value, this.termColor, this.valueColor);
  final String lang, term, value;
  final Color termColor, valueColor;
  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(term, style: Tk.text(lang, 15.2, color: termColor)),
          RText(value, style: Tk.text(lang, 16, weight: FontWeight.w600, color: valueColor)),
        ],
      );
}

/// The instalment strip, drawn blocked: hatched cells, struck-through amounts.
class _Schedule extends StatelessWidget {
  const _Schedule({required this.lang, required this.label, required this.s, required this.data});
  final String lang, label;
  final Scenario s;
  final PhoneData data;

  @override
  Widget build(BuildContext context) {
    final each = (s.requested / s.planMonths).round();
    return _Block(
      label: label,
      child: Row(
        children: [
          for (var i = 0; i < s.planMonths; i++) ...[
            if (i > 0) const SizedBox(width: 6),
            Expanded(
              child: CustomPaint(
                painter: const _Hatch(),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 5.6, vertical: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      RText(
                        data.money(lang, each),
                        maxLines: 1,
                        style: Tk.text(lang, 13.1,
                            weight: FontWeight.w600,
                            color: Tk.n400,
                            height: 1.3,
                            decoration: TextDecoration.lineThrough,
                            decorationColor: Tk.n300),
                      ),
                      Text(data.t(lang, 'schedule.month', {'n': i + 1}),
                          maxLines: 1,
                          style: Tk.text(lang, 11.5, color: Tk.n400, height: 1.3)),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// repeating-linear-gradient(-45deg, paper 5px, n-100 5px 10px) as diagonal
/// stripes: period 10px along the axis is 10*sqrt2 horizontally.
class _Hatch extends CustomPainter {
  const _Hatch();
  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.clipRRect(RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(12)));
    canvas.drawRect(Offset.zero & size, Paint()..color = Tk.paper);
    final p = Paint()
      ..color = Tk.n100
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5;
    final step = 10 * math.sqrt2;
    for (var x = -size.height; x < size.width + size.height; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x + size.height, size.height), p);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}
