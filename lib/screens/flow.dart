import 'package:flutter/widgets.dart';

import '../data.dart';
import '../decline_screen.dart';
import '../rich.dart';
import '../shell.dart';
import 'checkout.dart';
import 'limit_screen.dart';
import 'mode_toggle.dart';
import 'recovery_screen.dart';
import 'scenario_picker.dart';
import 'tabs.dart';
import 'today_screen.dart';

/// Where the phone is: one of the four tabs, or a step of the purchase.
enum FlowScreen { tab, checkout, processing, decline, limit, recovery }

FlowScreen flowScreenFromName(String? n) =>
    FlowScreen.values.firstWhere((s) => s.name == n, orElse: () => FlowScreen.tab);

const tabKeys = ['nav.home', 'nav.shop', 'nav.payments', 'nav.profile'];

/// Lets the host page (window.setPhoneScenario / setPhoneMode) drive the flow
/// exactly as the on-screen controls do.
class PhoneController {
  _PhoneFlowState? _state;
  void setScenario(String id) => _state?.pickScenario(id);
  void setMode(PhoneMode m) => _state?.pickMode(m);

  /// window.setPhoneScreen(screen, tab): shows one of the purchase steps
  /// (checkout, processing, decline, limit, recovery) or the tab [tab]
  /// ('shop' or 'nav.shop'). Unknown names are ignored. Set the mode BEFORE
  /// the screen: changing the mode jumps to the decline unless on checkout.
  void setScreen(String name, [String? tab]) => _state?.showScreen(name, tab);

  /// window.setPhoneControls(bool): the scenario picker and the Today/Proposed
  /// toggle above the phone. The host page hides them while it plays the story.
  void setControls(bool on) => _state?.setControls(on);
}

/// The single state machine for the whole demo, mirroring prototype.js:
///
///   Shop -> Buy -> checkout -> Pay -> processing (1.4s) -> decline
///        -> limit -> recovery -> (again) decline
///
/// * any tab tap leaves the purchase flow and shows that tab;
/// * picking a scenario switches to Proposed and jumps to the decline when
///   on a tab / checkout / processing, and stays put on decline, limit and
///   recovery;
/// * toggling Today/Proposed shows the decline (Today = the dead-end help
///   article) except from checkout, which stays where it is;
/// * Today mode replaces only the decline screen; tabs hide the limit card.
class PhoneFlow extends StatefulWidget {
  const PhoneFlow({
    super.key,
    required this.data,
    required this.lang,
    required this.now,
    this.initialScenarioId = 'silent-block',
    this.initialTab = 'nav.shop',
    this.initialScreen = FlowScreen.tab,
    this.initialMode = PhoneMode.proposed,
    this.processingDelay = const Duration(milliseconds: 1400),
    this.framed = true,
    this.controls = true,
    this.controller,
    this.dark = false,
  });

  final PhoneData data;
  final String lang;
  final DateTime now;
  final String initialScenarioId;
  final String initialTab;
  final FlowScreen initialScreen;
  final PhoneMode initialMode;
  final Duration processingDelay;
  final bool framed, controls;
  final PhoneController? controller;

  /// Page theme for the picker and toggle (the phone itself is light always).
  final bool dark;

  @override
  State<PhoneFlow> createState() => _PhoneFlowState();
}

class _PhoneFlowState extends State<PhoneFlow> {
  late String _scenarioId = widget.initialScenarioId;
  late PhoneMode _mode = widget.initialMode;
  late String _tab = widget.initialTab;
  late FlowScreen _screen = widget.initialScreen;
  late bool _controls = widget.controls;

  @override
  void initState() {
    super.initState();
    widget.controller?._state = this;
  }

  @override
  void dispose() {
    if (widget.controller?._state == this) widget.controller!._state = null;
    super.dispose();
  }

  void _go(FlowScreen s) => setState(() => _screen = s);

  void showScreen(String name, String? tab) {
    final known = FlowScreen.values.where((s) => s.name == name);
    if (known.isEmpty) return;
    final key = tab == null ? null : (tab.startsWith('nav.') ? tab : 'nav.$tab');
    setState(() {
      _screen = known.first;
      if (key != null && tabKeys.contains(key)) _tab = key;
    });
  }

  void setControls(bool on) {
    if (on == _controls) return;
    setState(() => _controls = on);
  }

  void pickScenario(String id) {
    if (id == _scenarioId) return;
    setState(() {
      _scenarioId = id;
      _mode = PhoneMode.proposed;
      if (_screen == FlowScreen.tab ||
          _screen == FlowScreen.checkout ||
          _screen == FlowScreen.processing) {
        _screen = FlowScreen.decline;
      }
    });
  }

  void pickMode(PhoneMode m) {
    if (m == _mode) return;
    setState(() {
      _mode = m;
      if (_screen != FlowScreen.checkout) _screen = FlowScreen.decline;
    });
  }

  bool get _fills => _screen == FlowScreen.checkout || _screen == FlowScreen.processing;
  bool get _proposed => _mode == PhoneMode.proposed;

  Widget _body(Scenario sc) {
    final d = widget.data, l = widget.lang;
    switch (_screen) {
      case FlowScreen.checkout:
        return CheckoutScreen(data: d, lang: l, scenario: sc, onPay: () => _go(FlowScreen.processing));
      case FlowScreen.processing:
        return ProcessingScreen(
          key: const ValueKey('processing'),
          data: d,
          lang: l,
          delay: widget.processingDelay,
          onDone: () => _go(FlowScreen.decline),
        );
      case FlowScreen.decline:
        if (_mode == PhoneMode.today) {
          return TodayScreen(data: d, lang: l, onDismiss: () {});
        }
        return DeclineScreen(
            data: d,
            lang: l,
            scenarioId: _scenarioId,
            now: widget.now,
            onLimit: () => _go(FlowScreen.limit));
      case FlowScreen.limit:
        return LimitScreen(
          data: d,
          lang: l,
          scenarioId: _scenarioId,
          now: widget.now,
          onBack: () => _go(FlowScreen.decline),
          onForward: () => _go(FlowScreen.recovery),
        );
      case FlowScreen.recovery:
        return RecoveryScreen(
          data: d,
          lang: l,
          scenarioId: _scenarioId,
          now: widget.now,
          onAgain: () => _go(FlowScreen.decline),
        );
      case FlowScreen.tab:
        void toLimit() => _go(FlowScreen.limit);
        return switch (_tab) {
          'nav.home' => HomeTab(data: d, lang: l),
          'nav.payments' => PaymentsTab(
              data: d, lang: l, scenario: sc, proposed: _proposed, onLimit: toLimit),
          'nav.profile' => ProfileTab(data: d, lang: l, proposed: _proposed, onLimit: toLimit),
          _ => ShopTab(data: d, lang: l, scenario: sc, onBuy: () => _go(FlowScreen.checkout)),
        };
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.data, l = widget.lang;
    final sc = d.scenario(_scenarioId);
    final phone = RiyalScope(
      name: d.riyalName(l),
      child: PhoneShell(
        lang: l,
        now: widget.now,
        framed: widget.framed,
        body: LayoutBuilder(
          builder: (context, box) => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18.4, 5.6, 18.4, 0),
            // Checkout and processing fill the viewport so the pay button
            // sits at the bottom and the spinner is centred; every other
            // screen is at least the viewport tall and scrolls when longer.
            child: _fills
                ? SizedBox(height: box.maxHeight - 5.6, child: _body(sc))
                : ConstrainedBox(
                    constraints: BoxConstraints(minHeight: box.maxHeight - 5.6),
                    child: _body(sc)),
          ),
        ),
        tabBar: PhoneTabBar(
          lang: l,
          data: d,
          current: _tab,
          // leaving the purchase flow returns to the app
          onSelect: (key) => setState(() {
            _tab = key;
            _screen = FlowScreen.tab;
          }),
        ),
      ),
    );
    if (!_controls) return phone;

    return Directionality(
      textDirection: l == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            ScenarioPicker(
                data: d, lang: l, selectedId: _scenarioId, onSelect: pickScenario, dark: widget.dark),
            const SizedBox(height: 24),
            ModeToggle(data: d, lang: l, mode: _mode, onChanged: pickMode, dark: widget.dark),
            const SizedBox(height: 24),
            phone,
          ],
        ),
      ),
    );
  }
}
