import 'package:flutter/widgets.dart';

import '../data.dart';
import '../tokens.dart';
import 'kit.dart';
import 'page_palette.dart';

/// Three real cases as cards, each carrying its own source label. Mirrors
/// renderScenarioPicker(): one column at phone width, three from 421px up.
/// Chip colours follow the page theme (see PagePalette); the phone is light in both.
class ScenarioPicker extends StatelessWidget {
  const ScenarioPicker({
    super.key,
    required this.data,
    required this.lang,
    required this.selectedId,
    required this.onSelect,
    this.dark = false,
  });

  final PhoneData data;
  final String lang;
  final String selectedId;
  final ValueChanged<String> onSelect;

  /// Page theme: false = bright page (default), true = dark page.
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: data.t(lang, 'ctl.scenarioLabel'),
      child: LayoutBuilder(builder: (context, c) {
        final cards = [for (final s in data.scenarios) _Card(this, s)];
        final wide = c.maxWidth > 420;
        if (!wide) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < cards.length; i++) ...[
                if (i > 0) const SizedBox(height: 8),
                cards[i],
              ],
            ],
          );
        }
        return ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < cards.length; i++) ...[
                  if (i > 0) const SizedBox(width: 8),
                  Expanded(child: cards[i]),
                ],
              ],
            ),
          ),
        );
      }),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card(this.owner, this.s);
  final ScenarioPicker owner;
  final Scenario s;

  @override
  Widget build(BuildContext context) {
    final lang = owner.lang;
    final on = s.id == owner.selectedId;
    final pal = PagePalette.of(owner.dark);
    final name = owner.data.t(lang, s.sourceKey);
    final sub = owner.data.t(lang, '${s.sourceKey}Sub');
    void tap() => owner.onSelect(s.id);
    return Semantics(
      button: true,
      selected: on,
      label: '$name. $sub',
      onTap: tap,
      child: ExcludeSemantics(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: tap,
          child: Container(
            key: ValueKey('scenario-${s.id}'),
            constraints: const BoxConstraints(minHeight: 44),
            padding: const EdgeInsets.symmetric(horizontal: 10.4, vertical: 9.6),
            decoration: BoxDecoration(
              color: on ? pal.activeBg : pal.cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: on ? pal.activeBg : pal.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: Tk.text(lang, 12.8,
                        weight: FontWeight.w600,
                        height: K.body(lang),
                        letterSpacing: -0.13,
                        color: on ? pal.activeName : pal.name)),
                const SizedBox(height: 3.2),
                Text(sub,
                    style: Tk.text(lang, 10.9, height: 1.35, color: on ? pal.activeSub : pal.sub)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
