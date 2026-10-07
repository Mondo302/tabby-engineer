import 'package:flutter/painting.dart';

/// Colour and type tokens, mirrored from the HTML phone's tokens.css.
class Tk {
  static const ink = Color(0xFF1A1919);
  static const paper = Color(0xFFFFFFFF);
  static const appBg = Color(0xFFF5F4F2); // n-50
  static const n100 = Color(0xFFEBE7E4);
  static const n300 = Color(0xFFBAB6B3);
  // Inside the phone the HTML tokens.css puts --n-400 and --n-500 on the
  // n-600 step (n-500 measured 4.35:1 and n-400 3.07:1 on the screen colour).
  // Outside the phone (scenario picker) the page's own n-500 is K.pageN500.
  static const n400 = Color(0xFF595754);
  static const n500 = Color(0xFF595754);
  static const n600 = Color(0xFF595754);
  static const n700 = Color(0xFF3D3B3A);
  static const negBg = Color(0xFFFFE1DE); // declined-bg
  static const declined = Color(0xFFE3715D);
  static const review = Color(0xFFEA883D);
  static const restored = Color(0xFF57C26E);
  static const bezel = Color(0xFF0D0D0D);

  /// Plex Sans for Latin, Plex Sans Arabic for Arabic; each falls back to
  /// the other so the riyal sign and digits resolve from bundled fonts.
  static String family(String lang) => lang == 'ar' ? 'PlexArabic' : 'PlexSans';
  static List<String> fallback(String lang) =>
      lang == 'ar' ? const ['PlexSans'] : const ['PlexArabic'];

  static TextStyle text(
    String lang,
    double size, {
    FontWeight weight = FontWeight.w400,
    Color color = ink,
    double? height,
    double letterSpacing = 0,
    TextDecoration? decoration,
    Color? decorationColor,
  }) =>
      TextStyle(
        fontFamily: family(lang),
        fontFamilyFallback: fallback(lang),
        fontSize: size,
        fontWeight: weight,
        color: color,
        height: height,
        letterSpacing: letterSpacing,
        decoration: decoration,
        decorationColor: decorationColor,
        fontFeatures: const [FontFeature.tabularFigures()],
      );
}
