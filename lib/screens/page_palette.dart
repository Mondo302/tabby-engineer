import 'package:flutter/painting.dart';

import '../tokens.dart';

/// Colours for the two controls that sit on the HOST PAGE's ground (the
/// scenario picker and the Today/Proposed toggle). The phone itself is light
/// in both page themes; these two are not inside it, so they follow the
/// page: window.setPhoneTheme('dark'|'bright') or ?theme=dark|bright.
///
/// Every pair below is asserted in test/page_palette_test.dart: text >= 4.5:1
/// on what it sits on, control boundaries and state indicators >= 3:1
/// against the page ground (dark #1A1919, bright #F5F4F2).
class PagePalette {
  const PagePalette({
    required this.ground,
    required this.cardBg,
    required this.cardBorder,
    required this.name,
    required this.sub,
    required this.activeBg,
    required this.activeName,
    required this.activeSub,
    required this.trackBg,
    required this.trackBorder,
    required this.pillBg,
    required this.pillBorder,
    required this.pillText,
    required this.inactiveText,
  });

  final Color ground, cardBg, cardBorder, name, sub;
  final Color activeBg, activeName, activeSub;
  final Color trackBg, trackBorder, pillBg, pillBorder, pillText, inactiveText;

  static const bright = PagePalette(
    ground: Tk.appBg,
    cardBg: Tk.paper,
    cardBorder: Color(0xFF75726F), // n-500: 4.35:1 on the ground
    name: Tk.ink,
    sub: Color(0xFF75726F), // 4.78:1 on white
    activeBg: Tk.ink,
    activeName: Tk.paper,
    activeSub: Color(0xFFBAB6B3), // 8.7:1 on ink
    trackBg: Tk.n100,
    trackBorder: Color(0xFF75726F),
    pillBg: Tk.paper,
    pillBorder: Tk.n600, // the selected pill reads against the track at 5.9:1
    pillText: Tk.ink,
    inactiveText: Tk.n600,
  );

  static const dark = PagePalette(
    ground: Tk.ink,
    cardBg: Color(0xFF292826),
    cardBorder: Color(0xFF75726F), // 3.67:1 on the ground
    name: Color(0xFFF5F4F2),
    sub: Color(0xFFBAB6B3), // 7.3:1 on the card
    activeBg: Color(0xFFF5F4F2),
    activeName: Color(0xFF292826),
    activeSub: Tk.n600, // 6.5:1 on the light chip
    trackBg: Tk.n700,
    trackBorder: Color(0xFF75726F), // 3.67:1 on the ground
    pillBg: Color(0xFFF5F4F2), // 10:1 on the track
    pillBorder: Color(0xFFF5F4F2),
    pillText: Color(0xFF292826),
    inactiveText: Color(0xFFD6D3D0), // 7.5:1 on the track
  );

  static PagePalette of(bool dark) => dark ? PagePalette.dark : PagePalette.bright;
}
