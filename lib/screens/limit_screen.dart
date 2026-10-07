import 'package:flutter/widgets.dart';

import '../data.dart';
import '../rich.dart';
import '../tokens.dart';
import 'kit.dart';

/// Weeks from the block to its scheduled review, and how many have passed
/// as of [now]. Same arithmetic as weeksProgress() in the HTML phone.
({int done, int needed}) weeksProgress(Scenario s, DateTime now) {
  DateTime day(String iso) {
    final p = iso.split('-').map(int.parse).toList();
    return DateTime(p[0], p[1], p[2]);
  }

  const week = 7 * 86400000;
  final start = day(s.eventDateISO);
  final end = day(s.nextReviewISO);
  final needed = (end.difference(start).inMilliseconds / week).round().clamp(1, 1 << 30);
  final elapsed = (now.difference(start).inMilliseconds / week).floor();
  return (done: elapsed.clamp(0, needed), needed: needed);
}

/// "How your limit works": what happened, where you are, what changes it.
/// Self-contained: data in, callbacks out. Mirrors renderLimit().
class LimitScreen extends StatelessWidget {
  const LimitScreen({
    super.key,
    required this.data,
    required this.lang,
    required this.scenarioId,
    required this.now,
    required this.onBack,
    required this.onForward,
  });

  final PhoneData data;
  final String lang;
  final String scenarioId;
  final DateTime now;
  final VoidCallback onBack, onForward;

  @override
  Widget build(BuildContext context) {
    final s = data.scenario(scenarioId);
    String t(String k, [Map<String, Object?>? p]) => data.t(lang, k, p);
    final byTime = s.recoveryPath == 'time';
    final steps = byTime ? weeksProgress(s, now) : s.progress!;
    final progressKey = byTime ? 'limit.progressTime' : 'limit.progress';
    final progressText = t(progressKey, {'done': steps.done, 'needed': steps.needed});
    final reviewDate = data.formatDate(lang, s.nextReviewISO);
    final eventText = t(s.eventTextKey, {'date': data.formatDate(lang, s.eventDateISO)});
    final cause = t(s.eventCauseKey);
    final notFault = s.facts['overdue'] != true;
    final blocked = s.available == 0;
    final figure = blocked ? t('limit.blocked') : data.money(lang, s.available);

    final restoreLine = byTime
        ? t('limit.restoreTime', {'date': reviewDate})
        : t('limit.restore', {'amount': data.money(lang, s.restoreTo), 'needed': steps.needed});
    final restoreOr = byTime ? null : t('limit.restoreOr', {'date': reviewDate});
    final progressNote = t(byTime ? 'limit.progressTimeNote' : 'limit.progressNote');

    // Metrics read from the HTML phone's computed styles: line-height 1.55,
    // paragraphs 16px apart inside a card, headings 6.4px above their text.
    final lh = K.body(lang);
    final body = Tk.text(lang, 14.88, color: Tk.n600, height: lh);
    const para = SizedBox(height: 16);
    Widget title(String k) => Padding(
        padding: const EdgeInsets.only(bottom: 6.4),
        child: Text(t(k), style: Tk.text(lang, 14.4, weight: FontWeight.w600, height: K.heading(lang))));
    Widget card(List<Widget> kids) => WhiteCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: kids));

    return ScreenColumn(
      pinLast: true,
      children: [
        _Back(lang: lang, label: t('limit.back'), rtl: lang == 'ar', onTap: onBack),
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Text(t('limit.current'), style: Tk.text(lang, 14.4, color: Tk.n500, height: lh)),
        ),
        SemBlock(
          label: '${t('limit.current')}: $figure',
          child: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: blocked
                ? Text(figure, style: Tk.text(lang, 17.6, color: Tk.n500, height: lh))
                : RText(figure,
                    style: Tk.text(lang, 33.6, weight: FontWeight.w600, letterSpacing: -0.67, height: lh)),
          ),
        ),
        SemBlock(
          label: [t('limit.happened'), eventText, cause, if (notFault) t('limit.notYourFault')]
              .join('. '),
          child: card([
            title('limit.happened'),
            Text(eventText, style: body),
            para,
            Text(cause, style: body),
            if (notFault) ...[
              para,
              Text(t('limit.notYourFault'),
                  style: Tk.text(lang, 14.4, weight: FontWeight.w600, color: K.restoredInk, height: lh)),
            ],
          ]),
        ),
        SemBlock(
          label: '${t('limit.where')}: $progressText. $progressNote',
          child: card([
            title('limit.where'),
            Text(progressText,
                style: Tk.text(lang, 16.8, weight: FontWeight.w600, letterSpacing: -0.34, height: lh)),
            para,
            Row(children: [
              for (var i = 0; i < steps.needed; i++) ...[
                if (i > 0) const SizedBox(width: 5),
                Expanded(
                  child: Container(
                    key: ValueKey(i < steps.done ? 'progress-step-done' : 'progress-step'),
                    height: 8,
                    decoration: BoxDecoration(
                      color: i < steps.done ? Tk.restored : Tk.n100,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
              ],
            ]),
            const SizedBox(height: 8),
            Text(progressNote, style: body),
          ]),
        ),
        SemBlock(
          label: [t('limit.changes'), restoreLine, if (restoreOr != null) restoreOr, t('limit.cannot')]
              .join('. '),
          child: card([
            title('limit.changes'),
            RText(restoreLine, style: Tk.text(lang, 14.88, weight: FontWeight.w600, height: lh)),
            if (restoreOr != null) ...[
              para,
              Text(restoreOr, style: body),
            ],
            para,
            Text(t('limit.cannot'), style: body),
          ]),
        ),
        SemBlock(
          label: t('limit.bureau'),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(t('limit.bureau'), style: Tk.text(lang, 13.12, color: Tk.n400, height: 1.4)),
          ),
        ),
        LinkRow(lang: lang, label: t('limit.forward'), onTap: onForward),
      ],
    );
  }
}

class _Back extends StatelessWidget {
  const _Back({required this.lang, required this.label, required this.rtl, required this.onTap});
  final String lang, label;
  final bool rtl;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Align(
        alignment: AlignmentDirectional.centerStart,
        child: ExtendedHit(
          child: Semantics(
            button: true,
            label: label,
            onTap: onTap,
            child: ExcludeSemantics(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: onTap,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 44),
                  child: Text('${rtl ? '\u203a' : '\u2039'} $label',
                      style: Tk.text(lang, 14.4, color: Tk.n500, height: K.body(lang))),
                ),
              ),
            ),
          ),
        ),
      );
}
