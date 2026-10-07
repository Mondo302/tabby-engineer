import 'package:flutter/widgets.dart';

import '../data.dart';
import '../rich.dart';
import '../tokens.dart';
import 'common.dart';

/// The app's four sections. Mirrors renderHome/Shop/Payments/Profile in the
/// HTML phone, with copy and invented merchants from the shared data.
///
/// Why they exist: a person can tour the whole app and find no spending
/// limit anywhere; Payments shows only what is owed. The absence is the
/// argument. With [proposed] true the missing pieces appear in place
/// (Payments limit card, Profile limit row); the default is today's app.

const _gap = 12.0; // 0.75rem, .screen--tab

class _TabColumn extends StatelessWidget {
  const _TabColumn(this.children);
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < children.length; i++) ...[
              if (i > 0) const SizedBox(height: _gap),
              children[i],
            ],
          ],
        ),
      );
}

class _Heading extends StatelessWidget {
  const _Heading(this.lang, this.text);
  final String lang, text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 6.4),
        child: Semantics(
          header: true,
          child: Text(text, style: bt(lang, 16.8, weight: FontWeight.w600, letterSpacing: -0.34)),
        ),
      );
}

class _SearchBar extends StatelessWidget {
  const _SearchBar(this.lang, this.text);
  final String lang, text;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9.9),
        decoration: BoxDecoration(
          color: Tk.paper,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: const Color(0xFFD6D3D0)),
        ),
        child: Text(text, style: bt(lang, 14.7, color: Tk.n400)),
      );
}

class _Card extends StatelessWidget {
  const _Card({required this.child, this.radius = 20, this.padding, this.ring});
  final Widget child;
  final double radius;
  final EdgeInsetsGeometry? padding;
  final Color? ring;
  @override
  Widget build(BuildContext context) => Container(
        padding: padding ?? const EdgeInsets.symmetric(horizontal: 17.6, vertical: 15.2),
        decoration: BoxDecoration(
          color: Tk.paper,
          borderRadius: BorderRadius.circular(radius),
          boxShadow: ring == null ? null : [BoxShadow(color: ring!, spreadRadius: 2)],
        ),
        child: child,
      );
}

class HomeTab extends StatelessWidget {
  const HomeTab({super.key, required this.data, required this.lang});
  final PhoneData data;
  final String lang;

  String t(String key, [Map<String, Object?>? p]) => data.t(lang, key, p);

  @override
  Widget build(BuildContext context) {
    Widget tile(String title, String sub) => Expanded(
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 74),
            child: _Card(
              radius: 18,
              padding: const EdgeInsets.symmetric(horizontal: 13.6, vertical: 12.8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: bt(lang, 15.2, weight: FontWeight.w600, letterSpacing: -0.15)),
                  Padding(
                    padding: const EdgeInsets.only(top: 3.2),
                    child: Text(sub, style: bt(lang, 13.1, color: Tk.n500)),
                  ),
                ],
              ),
            ),
          ),
        );

    final merchants = data.app.merchants;
    return _TabColumn([
      _SearchBar(lang, t('home.search')),
      IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            tile(t('home.allStores'), t('home.allStoresSub')),
            const SizedBox(width: 9.6),
            tile(t('home.deals'), t('home.dealsSub')),
          ],
        ),
      ),
      _Card(
        radius: 20,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14.4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            RText(t('home.promo', {'min': data.money(lang, 500), 'max': data.money(lang, 50000)}),
                style: bt(lang, 14.7)),
            Padding(
              padding: const EdgeInsets.only(top: 5.6),
              child: Text(t('home.promoAction'), style: bt(lang, 14.7, weight: FontWeight.w600)),
            ),
          ],
        ),
      ),
      _Heading(lang, t('home.storesForYou')),
      Column(
        children: [
          for (var r = 0; r * 4 < merchants.length; r++) ...[
            if (r > 0) const SizedBox(height: 9.6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var c = 0; c < 4; c++) ...[
                  if (c > 0) const SizedBox(width: 6.4),
                  Expanded(
                    child: r * 4 + c < merchants.length
                        ? _MerchantItem(lang, merchants[r * 4 + c])
                        : const SizedBox(),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
    ]);
  }
}

class _MerchantItem extends StatelessWidget {
  const _MerchantItem(this.lang, this.m);
  final String lang;
  final Merchant m;

  static const _tones = {
    'a': Color(0xFFDAF0DF),
    'b': Color(0xFFFCEDB8),
    'c': Color(0xFFE8EEFC),
    'd': Color(0xFFFFE1DE),
    'e': Color(0xFFF0E8FB),
    'f': Tk.n100,
  };

  @override
  Widget build(BuildContext context) => Semantics(
        container: true,
        label: m.name,
        child: ExcludeSemantics(
          child: Column(
            children: [
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: _tones[m.tone] ?? Tk.paper, shape: BoxShape.circle),
                child: Text(m.name.substring(0, 1),
                    style: bt(lang, 16.8, weight: FontWeight.w600, color: Tk.n600)),
              ),
              const SizedBox(height: 4.8),
              Text(m.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: bt(lang, 11.5, color: Tk.n600)),
            ],
          ),
        ),
      );
}

class ShopTab extends StatelessWidget {
  const ShopTab({
    super.key,
    required this.data,
    required this.lang,
    required this.scenario,
    required this.onBuy,
  });
  final PhoneData data;
  final String lang;
  final Scenario scenario;
  final VoidCallback onBuy;

  String t(String key, [Map<String, Object?>? p]) => data.t(lang, key, p);

  @override
  Widget build(BuildContext context) {
    final keys = data.app.categoryKeys;
    return _TabColumn([
      _SearchBar(lang, t('home.search')),
      _Heading(lang, t('shop.categories')),
      Column(
        children: [
          for (var r = 0; r * 3 < keys.length; r++) ...[
            if (r > 0) const SizedBox(height: 9.6),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (var c = 0; c < 3; c++) ...[
                    if (c > 0) const SizedBox(width: 9.6),
                    Expanded(
                      child: r * 3 + c < keys.length
                          ? ConstrainedBox(
                              constraints: const BoxConstraints(minHeight: 62),
                              child: _Card(
                                radius: 18,
                                padding: const EdgeInsets.symmetric(horizontal: 13.6, vertical: 12.8),
                                child: Align(
                                  alignment: AlignmentDirectional.bottomStart,
                                  child: Text(t(keys[r * 3 + c]),
                                      style: bt(lang, 15.2, weight: FontWeight.w600, letterSpacing: -0.15)),
                                ),
                              ),
                            )
                          : const SizedBox(),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
      _Heading(lang, t('shop.forYou')),
      _Card(
        padding: const EdgeInsets.fromLTRB(16, 14.4, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              height: 108,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  begin: Alignment(-0.49, -2.06),
                  end: Alignment(0.49, 2.06),
                  colors: [Tk.n100, Color(0xFFD6D3D0)],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 10.4),
              child: Text(t(data.app.productKey), style: bt(lang, 16, weight: FontWeight.w600)),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 5.6, bottom: 13.6),
              child: RText(data.money(lang, scenario.requested), style: bt(lang, 16, color: Tk.n600)),
            ),
            PrimaryButton(lang: lang, label: t('product.buy'), onTap: onBuy),
          ],
        ),
      ),
    ]);
  }
}

class _Figure extends StatelessWidget {
  const _Figure(this.lang, this.label, this.value, {this.none = false});
  final String lang, label, value;
  final bool none;
  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 1.6),
            child: Text(label, style: bt(lang, 14.4, color: Tk.n500)),
          ),
          RText(value,
              style: none
                  ? bt(lang, 17.6, color: Tk.n500)
                  : bt(lang, 33.6, weight: FontWeight.w600, letterSpacing: -0.67)),
        ],
      );
}

class _LinkText extends StatelessWidget {
  const _LinkText(this.lang, this.text, this.onTap);
  final String lang, text;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        container: true,
        label: text,
        onTap: onTap,
        child: ExcludeSemantics(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onTap,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 44),
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Text(text,
                    style: bt(lang, 14.4,
                        weight: FontWeight.w600, decoration: TextDecoration.underline)),
              ),
            ),
          ),
        ),
      );
}

class PaymentsTab extends StatelessWidget {
  const PaymentsTab({
    super.key,
    required this.data,
    required this.lang,
    required this.scenario,
    this.proposed = false,
    this.onLimit,
  });
  final PhoneData data;
  final String lang;
  final Scenario scenario;

  /// Proposed mode adds the limit card. Today's app has none.
  final bool proposed;
  final VoidCallback? onLimit;

  String t(String key, [Map<String, Object?>? p]) => data.t(lang, key, p);

  @override
  Widget build(BuildContext context) {
    return _TabColumn([
      Padding(
        padding: const EdgeInsets.only(top: 3.2, bottom: 3.2),
        child: Semantics(
          header: true,
          child: Text(t('payments.title'),
              style: bt(lang, 33.6, weight: FontWeight.w600, letterSpacing: -1.18)),
        ),
      ),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Figure(lang, t('payments.due'), data.money(lang, 0)),
          Padding(
            padding: const EdgeInsets.only(top: 2.4),
            child: RText(t('payments.total', {'amount': data.money(lang, 0)}),
                style: bt(lang, 14.7, color: Tk.n500)),
          ),
        ],
      ),
      Container(
        padding: const EdgeInsets.all(12),
        alignment: Alignment.center,
        decoration: BoxDecoration(color: Tk.n100, borderRadius: BorderRadius.circular(16)),
        child: Text(t('payments.history'), style: bt(lang, 14.7, weight: FontWeight.w600)),
      ),
      if (proposed)
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Figure(
                lang,
                t('payments.limitCard'),
                scenario.available == 0 ? t('limit.blocked') : data.money(lang, scenario.available),
                none: scenario.available == 0,
              ),
              _LinkText(lang, t('payments.limitLink'), onLimit),
            ],
          ),
        ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 25.6),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 6.4),
              child: Text(t('payments.clear'),
                  textAlign: TextAlign.center,
                  style: bt(lang, 18.4, weight: FontWeight.w600, letterSpacing: -0.37)),
            ),
            Text(t('payments.clearBody'),
                textAlign: TextAlign.center, style: bt(lang, 14.4, color: Tk.n500)),
          ],
        ),
      ),
    ]);
  }
}

class _Row extends StatelessWidget {
  const _Row(this.lang, this.label, {this.sub, this.onTap, this.first = false});
  final String lang, label;
  final String? sub;
  final VoidCallback? onTap;
  final bool first;

  @override
  Widget build(BuildContext context) {
    final body = Container(
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.symmetric(vertical: 11.5),
      decoration: first ? null : const BoxDecoration(border: Border(top: BorderSide(color: Tk.n100))),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 24.8),
        child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RText(label, style: bt(lang, 15.2)),
                if (sub != null) RText(sub!, style: bt(lang, 12.8, color: Tk.n500)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          const Chevron(),
        ],
      )),
    );
    return Semantics(
      container: true,
      button: onTap != null,
      label: sub == null ? label : '$label. $sub',
      onTap: onTap,
      child: ExcludeSemantics(
        child: onTap == null
            ? body
            : GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap, child: body),
      ),
    );
  }
}

class ProfileTab extends StatelessWidget {
  const ProfileTab({
    super.key,
    required this.data,
    required this.lang,
    this.proposed = false,
    this.onLimit,
  });
  final PhoneData data;
  final String lang;

  /// Proposed mode adds the limit row. Today's app has none.
  final bool proposed;
  final VoidCallback? onLimit;

  String t(String key, [Map<String, Object?>? p]) => data.t(lang, key, p);

  Widget _rows(List<_Row> rows, {Color? ring}) => _Card(
        padding: const EdgeInsets.symmetric(horizontal: 17.6, vertical: 15.2),
        ring: ring,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: rows),
      );

  @override
  Widget build(BuildContext context) {
    return _TabColumn([
      Padding(
        padding: const EdgeInsets.only(top: 6.4, bottom: 3.2),
        child: Center(
          child: Container(
            width: 84,
            height: 84,
            decoration: const BoxDecoration(color: Tk.paper, shape: BoxShape.circle),
          ),
        ),
      ),
      _rows([
        _Row(lang, t('profile.complete'), first: true),
        _Row(lang, t('profile.invite'), sub: t('profile.inviteSub', {'amount': data.money(lang, 200)})),
      ]),
      _rows([_Row(lang, t('profile.cashback'), first: true)]),
      if (proposed)
        _rows([
          _Row(lang, t('profile.limit'), sub: t('profile.limitSub'), onTap: onLimit, first: true),
        ], ring: Tk.restored),
      _rows([
        for (var i = 0; i < data.app.profileRows.length; i++)
          _Row(lang, t(data.app.profileRows[i]), first: i == 0),
      ]),
      Padding(
        padding: const EdgeInsets.only(top: 6.4),
        child: Container(
          padding: const EdgeInsets.all(12),
          alignment: Alignment.center,
          child: Text(t('profile.logout'), style: bt(lang, 14.7, weight: FontWeight.w600, color: Tk.n600)),
        ),
      ),
    ]);
  }
}
