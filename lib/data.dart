import 'dart:convert';

import 'package:flutter/services.dart';

/// One scenario from the shared scenarios data.
class Scenario {
  Scenario(Map<String, dynamic> j)
      : id = j['id'] as String,
        reasonKey = j['reasonKey'] as String,
        requested = (j['requested'] as num).toInt(),
        available = (j['available'] as num).toInt(),
        planMonths = (j['planMonths'] as num?)?.toInt() ?? 4,
        facts = Map<String, dynamic>.from(j['facts'] as Map),
        recoveryPath = j['recoveryPath'] as String,
        nextReviewISO = j['nextReviewISO'] as String,
        sourceKey = j['sourceKey'] as String,
        eventDateISO = (j['event'] as Map)['dateISO'] as String,
        eventTextKey = (j['event'] as Map)['textKey'] as String,
        eventCauseKey = (j['event'] as Map)['causeKey'] as String,
        progress = j['progress'] == null
            ? null
            : (
                done: ((j['progress'] as Map)['done'] as num).toInt(),
                needed: ((j['progress'] as Map)['needed'] as num).toInt(),
              ),
        restoreTo = (j['restoreTo'] as num).toInt(),
        recoveryFrom = ((j['recovery'] as Map)['from'] as num).toInt(),
        recoveryTo = ((j['recovery'] as Map)['to'] as num).toInt(),
        alternatives = [
          for (final a in j['alternatives'] as List) Map<String, dynamic>.from(a as Map),
        ];

  final String id;
  final String reasonKey;
  final int requested;
  final int available;
  final int planMonths;
  final Map<String, dynamic> facts;
  final String recoveryPath;
  final String nextReviewISO;
  final String sourceKey;
  final String eventDateISO, eventTextKey, eventCauseKey;
  final ({int done, int needed})? progress;
  final int restoreTo, recoveryFrom, recoveryTo;
  final List<Map<String, dynamic>> alternatives;
}

class Merchant {
  const Merchant(this.name, this.tone);
  final String name;
  final String tone;
}

/// The app's invented content (merchants, categories, the product, the
/// settings rows), from app-data.js. No real merchant is named.
class AppData {
  AppData(Map<String, dynamic> j)
      : merchants = [
          for (final m in (j['merchants'] as List? ?? const []))
            Merchant((m as Map)['name'] as String, m['tone'] as String),
        ],
        categoryKeys = [
          for (final c in (j['categories'] as List? ?? const [])) (c as Map)['key'] as String,
        ],
        productKey = ((j['product'] as Map?)?['key'] as String?) ?? '',
        profileRows = [
          for (final r in (j['profileRows'] as List? ?? const [])) r as String,
        ];

  final List<Merchant> merchants;
  final List<String> categoryKeys;
  final String productKey;
  final List<String> profileRows;
}

/// Strings, scenarios and locale facts, all exported from the HTML phone's
/// own data files by scripts/export-data.mjs. Nothing is retyped in Dart.
class PhoneData {
  PhoneData._(this._strings, this.scenarios, this._format, this.app);

  factory PhoneData.fromJson({
    required Map<String, dynamic> strings,
    required List scenarios,
    required Map<String, dynamic> format,
    Map<String, dynamic> appData = const {},
  }) =>
      PhoneData._(
        {
          for (final e in strings.entries)
            e.key: Map<String, String>.from(e.value as Map),
        },
        [for (final s in scenarios) Scenario(Map<String, dynamic>.from(s as Map))],
        format,
        AppData(appData),
      );

  static Future<PhoneData> load(AssetBundle bundle) async {
    Future<dynamic> j(String n) async =>
        jsonDecode(await bundle.loadString('assets/data/$n.json'));
    return PhoneData.fromJson(
      strings: await j('strings') as Map<String, dynamic>,
      scenarios: await j('scenarios') as List,
      format: await j('format') as Map<String, dynamic>,
      appData: await j('app-data') as Map<String, dynamic>,
    );
  }

  final Map<String, Map<String, String>> _strings;
  final List<Scenario> scenarios;
  final Map<String, dynamic> _format;
  final AppData app;

  Scenario scenario(String id) =>
      scenarios.firstWhere((s) => s.id == id, orElse: () => scenarios.first);

  /// Same lookup rule as the HTML phone's t(): fall back to English, and
  /// show the key if missing (visible, not silent).
  String t(String lang, String key, [Map<String, Object?>? params]) {
    var text = _strings[lang]?[key] ?? _strings['en']![key] ?? key;
    params?.forEach((k, v) => text = text.split('{$k}').join('$v'));
    return text;
  }

  /// What a screen reader says for the riyal sign, from the shared strings
  /// ('unit.riyalName'); empty when the export has none, never invented.
  String riyalName(String lang) => _strings[lang]?['unit.riyalName'] ?? _strings['en']?['unit.riyalName'] ?? '';

  String money(String lang, int amount) {
    final group = (_format[lang] as Map)['group'] as String;
    final digits = amount.toString();
    final buf = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buf.write(group);
      buf.write(digits[i]);
    }
    return t(lang, 'unit.currency', {'amount': buf.toString()});
  }

  String formatDate(String lang, String iso) {
    final p = iso.split('-').map(int.parse).toList();
    final months = ((_format[lang] as Map)['months'] as List).cast<String>();
    return '${p[2]} ${months[p[1] - 1]}';
  }

  int daysUntil(String iso, DateTime now) {
    final p = iso.split('-').map(int.parse).toList();
    final ms = DateTime(p[0], p[1], p[2]).difference(now).inMilliseconds;
    final days = (ms / 86400000).round();
    return days < 0 ? 0 : days;
  }
}
