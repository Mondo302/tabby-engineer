import 'package:flutter/widgets.dart';

import '../data.dart';
import '../tokens.dart';
import 'page_palette.dart';

enum PhoneMode { today, proposed }

/// Today / Proposed switch: the same decline, both ways, one tap apart.
/// Mirrors renderModeToggle(). Two deliberate differences from the HTML
/// phone, both from its own audit: every button is at least 44px tall, and
/// the inactive label is n-600 (about 5.9:1 on the track) instead of n-500
/// (3.89:1).
class ModeToggle extends StatelessWidget {
  const ModeToggle({
    super.key,
    required this.data,
    required this.lang,
    required this.mode,
    required this.onChanged,
    this.dark = false,
  });

  final PhoneData data;
  final String lang;
  final PhoneMode mode;
  final ValueChanged<PhoneMode> onChanged;

  /// Page theme: false = bright page (default), true = dark page.
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final pal = PagePalette.of(dark);
    return Semantics(
      container: true,
      label: data.t(lang, 'ctl.modeLabel'),
      child: DecoratedBox(
        key: const ValueKey('mode-track'),
        decoration: BoxDecoration(
          color: pal.trackBg,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: pal.trackBorder),
        ),
        child: Padding(
          padding: const EdgeInsets.all(2),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _Btn(this, PhoneMode.today, 'ctl.modeToday', 'mode-today'),
              const SizedBox(width: 3),
              _Btn(this, PhoneMode.proposed, 'ctl.modeProposed', 'mode-proposed'),
            ],
          ),
        ),
      ),
    );
  }
}

class _Btn extends StatelessWidget {
  const _Btn(this.owner, this.value, this.labelKey, this.id);
  final ModeToggle owner;
  final PhoneMode value;
  final String labelKey, id;

  @override
  Widget build(BuildContext context) {
    final on = owner.mode == value;
    final pal = PagePalette.of(owner.dark);
    final label = owner.data.t(owner.lang, labelKey);
    return Semantics(
      button: true,
      selected: on,
      label: label,
      onTap: () => owner.onChanged(value),
      child: ExcludeSemantics(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => owner.onChanged(value),
          child: ConstrainedBox(
            key: ValueKey(id),
            constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
            child: DecoratedBox(
              key: ValueKey('$id-bg'),
              decoration: BoxDecoration(
                color: on ? pal.pillBg : const Color(0x00000000),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: on ? pal.pillBorder : const Color(0x00000000)),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18.4),
                child: Center(
                  widthFactor: 1,
                  child: Text(label,
                      style: Tk.text(owner.lang, 14.4,
                          weight: FontWeight.w600,
                          color: on ? pal.pillText : pal.inactiveText)),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
