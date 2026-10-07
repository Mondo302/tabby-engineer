import 'dart:ui';

/// The official Saudi Riyal symbol (SAMA, Unicode U+20C1) as a vector.
/// The bundled IBM Plex fonts do not contain the character, so it is drawn,
/// never typeset: no font lookup, no fallback fetch. Traced from the
/// symbol's alpha mask and simplified to straight edges (tolerance about
/// 0.3 px on a 126 px mask); coordinates are normalised to its bounding box.
const riyalAspect = 111.08 / 124.04; // width / height

const _loops = <List<double>>[
  [0.4640, 0.0000, 0.4100, 0.0339, 0.3548, 0.0858, 0.3516, 0.5050, 0.0949, 0.5556, 0.0859, 0.5636, 0.0722, 0.5937, 0.0586, 0.6421, 0.0579, 0.6662, 0.0679, 0.6678, 0.3470, 0.6139, 0.3534, 0.6179, 0.3544, 0.6259, 0.3532, 0.7469, 0.3199, 0.7572, 0.0409, 0.8099, 0.0280, 0.8194, 0.0214, 0.8355, 0.0000, 0.9162, 0.0049, 0.9223, 0.0229, 0.9200, 0.3290, 0.8632, 0.3734, 0.8436, 0.4010, 0.8185, 0.4500, 0.7549, 0.4689, 0.7227, 0.4695, 0.5937, 0.5000, 0.5831, 0.5832, 0.5695, 0.5898, 0.5776, 0.5898, 0.7791, 0.5990, 0.7818, 0.6620, 0.7698, 0.9681, 0.7099, 0.9991, 0.6179, 0.9994, 0.6017, 0.9951, 0.5984, 0.7161, 0.6541, 0.7061, 0.6501, 0.7053, 0.5534, 0.7161, 0.5426, 0.9681, 0.4938, 0.9919, 0.4324, 1.0000, 0.3921, 0.9951, 0.3828, 0.7341, 0.4347, 0.7071, 0.4344, 0.7053, 0.0616, 0.6981, 0.0544, 0.6376, 0.0938, 0.5889, 0.1422, 0.5892, 0.4566, 0.5630, 0.4669, 0.4730, 0.4822, 0.4692, 0.4728, 0.4693, 0.0052],
  [0.9861, 0.8184, 0.6260, 0.8880, 0.6111, 0.9162, 0.5945, 0.9645, 0.5898, 0.9968, 0.5990, 1.0000, 0.9681, 0.9269, 0.9907, 0.8678, 1.0000, 0.8275, 0.9951, 0.8159],
];

/// The glyph filling [size] (pass a size with [riyalAspect] to keep its shape).
Path riyalPath(Size size) {
  final path = Path();
  for (final l in _loops) {
    path.moveTo(l[0] * size.width, l[1] * size.height);
    for (var i = 2; i < l.length; i += 2) {
      path.lineTo(l[i] * size.width, l[i + 1] * size.height);
    }
    path.close();
  }
  return path;
}
