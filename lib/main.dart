import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'data.dart';
import 'screens/flow.dart';
import 'screens/mode_toggle.dart';

const _langs = {'en', 'ar'};

String _norm(String? l) => _langs.contains(l) ? l! : 'en';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final data = await PhoneData.load(rootBundle);
  final q = Uri.base.queryParameters;
  final lang = ValueNotifier<String>(_norm(q['lang']));
  final framed = q['frame'] != '0';
  final controls = q['controls'] != '0';
  // Deep links for review and tests:
  //   ?scenario=<id>&screen=tab|checkout|processing|decline|limit|recovery
  //   &tab=home|shop|payments|profile&mode=today|proposed&delay=<ms>
  final scenario = q['scenario'] ?? 'silent-block';
  final tab = 'nav.${q['tab'] ?? 'shop'}';
  final screen = flowScreenFromName(q['screen']);
  final mode = q['mode'] == 'today' ? PhoneMode.today : PhoneMode.proposed;
  final delay = Duration(milliseconds: int.tryParse(q['delay'] ?? '') ?? 1400);
  final controller = PhoneController();
  final dark = ValueNotifier<bool>(q['theme'] == 'dark');

  // Hooks for the HTML page: window.setPhoneLanguage('ar'|'en'),
  // window.setPhoneScenario(id), window.setPhoneMode('today'|'proposed'),
  // window.setPhoneScreen('tab'|'checkout'|'processing'|'decline'|'limit'|'recovery', tab?),
  // window.setPhoneControls(true|false). Set the mode before the screen.
  globalContext['setPhoneLanguage'] = ((JSString l) {
    lang.value = _norm(l.toDart);
  }).toJS;
  globalContext['setPhoneScreen'] = ((JSString s, JSAny? tab) {
    controller.setScreen(s.toDart, tab.isA<JSString>() ? (tab as JSString).toDart : null);
  }).toJS;
  globalContext['setPhoneControls'] = ((JSBoolean on) {
    controller.setControls(on.toDart);
  }).toJS;
  globalContext['setPhoneScenario'] = ((JSString id) {
    controller.setScenario(id.toDart);
  }).toJS;
  globalContext['setPhoneMode'] = ((JSString m) {
    controller.setMode(m.toDart == 'today' ? PhoneMode.today : PhoneMode.proposed);
  }).toJS;

  // window.setPhoneTheme('dark'|'bright'): the PAGE theme, which only the
  // picker and toggle follow (the phone is light in both). Default bright; the page
  // sends its own theme (?theme=dark or the hook) before the first paint.
  globalContext['setPhoneTheme'] = ((JSString m) {
    dark.value = m.toDart == 'dark';
  }).toJS;

  // Tells the host page the first frame is painted (it swaps the HTML phone
  // out only then): window event 'phone-flutter-ready'.
  WidgetsBinding.instance.addPostFrameCallback((_) {
    final ctor = globalContext['CustomEvent'] as JSFunction;
    globalContext.callMethod(
        'dispatchEvent'.toJS, ctor.callAsConstructor<JSObject>('phone-flutter-ready'.toJS));
  });

  runApp(
    ListenableBuilder(
      listenable: Listenable.merge([lang, dark]),
      builder: (context, _) => WidgetsApp(
        color: const Color(0xFFF5F4F2),
        debugShowCheckedModeBanner: false,
        locale: Locale(lang.value),
        supportedLocales: [Locale(lang.value)],
        localizationsDelegates: const [DefaultWidgetsLocalizations.delegate],
        pageRouteBuilder: <T>(settings, builder) =>
            PageRouteBuilder<T>(settings: settings, pageBuilder: (c, _, __) => builder(c)),
        home: Align(
          alignment: Alignment.topCenter,
          child: PhoneFlow(
            data: data,
            lang: lang.value,
            dark: dark.value,
            now: DateTime.now(),
            initialScenarioId: scenario,
            initialTab: tab,
            initialScreen: screen,
            initialMode: mode,
            processingDelay: delay,
            framed: framed,
            controls: controls,
            controller: controller,
          ),
        ),
      ),
    ),
  );
}
