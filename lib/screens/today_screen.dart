import 'package:flutter/widgets.dart';

import '../data.dart';
import '../tokens.dart';
import 'kit.dart';

/// "Today": what the app shows now for a declined purchase. One generic
/// dead end: no reason, no date, no path forward. Mirrors renderToday().
class TodayScreen extends StatelessWidget {
  const TodayScreen({super.key, required this.data, required this.lang, required this.onDismiss});
  final PhoneData data;
  final String lang;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    String t(String k) => data.t(lang, k);
    final lh = K.body(lang);
    return ScreenColumn(
      gap: 12,
      center: true,
      children: [
        ExcludeSemantics(
          child: Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: const BoxDecoration(color: Tk.n100, shape: BoxShape.circle),
            child: Text('!', style: Tk.text(lang, 28, weight: FontWeight.w600, color: Tk.n400)),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Semantics(
            header: true,
            child: Text(t('today.title'), textAlign: TextAlign.center, style: titleStyle(lang)),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Text(t('today.body'),
              textAlign: TextAlign.center, style: Tk.text(lang, 16, color: Tk.n500, height: lh)),
        ),
        IntrinsicWidth(
          child: PillButton(lang: lang, label: t('today.action'), onTap: onDismiss),
        ),
        Semantics(
          link: true,
          label: t('today.help'),
          child: ExcludeSemantics(
            child: Text(t('today.help'),
                style: Tk.text(lang, 14.4,
                    color: Tk.n400,
                    height: lh,
                    decoration: TextDecoration.underline,
                    decorationColor: Tk.n400)),
          ),
        ),
      ],
    );
  }
}
