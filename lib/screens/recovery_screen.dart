import 'package:flutter/widgets.dart';

import '../data.dart';
import '../rich.dart';
import '../tokens.dart';
import 'kit.dart';

/// The review after this one: three months on from the review that restored
/// the limit (nextReviewAfter() in the HTML phone).
String nextReviewAfter(String iso) {
  final p = iso.split('-').map(int.parse).toList();
  final d = DateTime.utc(p[0], p[1] + 3, p[2]);
  String two(int n) => n.toString().padLeft(2, '0');
  return '${d.year}-${two(d.month)}-${two(d.day)}';
}

/// "Limit reviewed and restored": the other half of the loop. Self-contained
/// (data in, callback out). Mirrors renderRecovery().
class RecoveryScreen extends StatelessWidget {
  const RecoveryScreen({
    super.key,
    required this.data,
    required this.lang,
    required this.scenarioId,
    required this.now,
    required this.onAgain,
  });

  final PhoneData data;
  final String lang;
  final String scenarioId;
  final DateTime now;
  final VoidCallback onAgain;

  @override
  Widget build(BuildContext context) {
    final s = data.scenario(scenarioId);
    String t(String k, [Map<String, Object?>? p]) => data.t(lang, k, p);
    final change = t('recovery.change', {
      'from': data.money(lang, s.recoveryFrom),
      'to': data.money(lang, s.recoveryTo),
    });
    final because = s.recoveryPath == 'time'
        ? t('recovery.becauseTime', {'date': data.formatDate(lang, s.nextReviewISO)})
        : t('recovery.because', {'count': s.progress!.needed});
    final next =
        t('recovery.next', {'date': data.formatDate(lang, nextReviewAfter(s.nextReviewISO))});
    final each = (s.recoveryTo / s.planMonths).round();
    final lh = K.body(lang);
    final body = Tk.text(lang, 16, color: Tk.n500, height: lh);

    return ScreenColumn(
      gap: 14.4,
      pinLast: true,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Semantics(
            header: true,
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              child: BalancedText(t('recovery.title'), style: titleStyle(lang)),
            ),
          ),
        ),
        SemBlock(
          label: change,
          child: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: RText(change,
                style: Tk.text(lang, 24,
                    weight: FontWeight.w600, color: K.restoredInk, letterSpacing: -0.48, height: lh)),
          ),
        ),
        SemBlock(
          label: t('schedule.label'),
          child: Row(
            children: [
              for (var i = 0; i < s.planMonths; i++) ...[
                if (i > 0) const SizedBox(width: 6),
                Expanded(
                  child: Container(
                    key: const ValueKey('schedule-restored-cell'),
                    padding: const EdgeInsets.symmetric(horizontal: 5.6, vertical: 8),
                    decoration: BoxDecoration(
                      color: K.restoredBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        RText(data.money(lang, each),
                            maxLines: 1,
                            style: Tk.text(lang, 13.1, weight: FontWeight.w600, height: 1.3)),
                        Text(t('schedule.month', {'n': i + 1}),
                            maxLines: 1,
                            style: Tk.text(lang, 11.5, color: Tk.n600, height: 1.3)),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        SemBlock(
            label: because,
            child: Padding(padding: const EdgeInsets.only(bottom: 16), child: Text(because, style: body))),
        SemBlock(
            label: next,
            child: Padding(padding: const EdgeInsets.only(bottom: 16), child: Text(next, style: body))),
        Padding(
          padding: const EdgeInsets.only(top: 16),
          child: PillButton(lang: lang, label: t('recovery.action'), onTap: onAgain),
        ),
      ],
    );
  }
}
