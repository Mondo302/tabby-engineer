import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phone_view/data.dart';
import 'package:phone_view/screens/tabs.dart';

import '../support/support.dart';

void main() {
  final d = loadData();
  final silentBlock = d.scenario('silent-block');
  String t(String lang, String k, [Map<String, Object?>? p]) => d.t(lang, k, p);

  Widget _pick(String which, String lang, Scenario s, bool proposed, VoidCallback? onBuy, VoidCallback? onLimit) {
    return switch (which) {
      'home' => HomeTab(data: d, lang: lang),
      'shop' => ShopTab(data: d, lang: lang, scenario: s, onBuy: onBuy ?? () {}),
      'payments' =>
        PaymentsTab(data: d, lang: lang, scenario: s, proposed: proposed, onLimit: onLimit),
      _ => ProfileTab(data: d, lang: lang, proposed: proposed, onLimit: onLimit),
    };
  }

  Widget tab(String which, String lang,
      {String scenario = 'silent-block',
      bool proposed = false,
      VoidCallback? onBuy,
      VoidCallback? onLimit}) {
    final s = d.scenario(scenario);
    return SingleChildScrollView(child: _pick(which, lang, s, proposed, onBuy, onLimit));
  }

  group('Home', () {
    testWidgets('EN: search, tiles, promo with the amounts from data, all invented merchants',
        (tr) async {
      await pumpPhone(tr, 'en', tab('home', 'en'));
      for (final k in [
        'home.search',
        'home.allStores',
        'home.allStoresSub',
        'home.deals',
        'home.dealsSub',
        'home.promoAction',
        'home.storesForYou'
      ]) {
        expect(find.text(t('en', k)), findsOneWidget, reason: k);
      }
      expect(
          txt(t('en', 'home.promo',
              {'min': d.money('en', 500), 'max': d.money('en', 50000)})),
          findsOneWidget);
      expect(d.app.merchants, hasLength(8));
      for (final m in d.app.merchants) {
        expect(find.text(m.name), findsOneWidget, reason: m.name);
      }
    });

    testWidgets('AR: Arabic copy and the first tile sits on the right', (tr) async {
      await pumpPhone(tr, 'ar', tab('home', 'ar'));
      expect(find.text(t('ar', 'home.storesForYou')), findsOneWidget);
      expect(tr.getTopRight(find.text(t('ar', 'home.allStores'))).dx,
          greaterThan(tr.getTopRight(find.text(t('ar', 'home.deals'))).dx));
    });
  });

  group('Shop', () {
    testWidgets('categories and product come from data; price is the scenario amount',
        (tr) async {
      await pumpPhone(tr, 'en', tab('shop', 'en'));
      expect(d.app.categoryKeys, hasLength(6));
      for (final k in d.app.categoryKeys) {
        expect(find.text(t('en', k)), findsOneWidget, reason: k);
      }
      expect(find.text(t('en', d.app.productKey)), findsOneWidget);
      expect(txt(d.money('en', silentBlock.requested)), findsOneWidget);
    });

    testWidgets('the buy button is a labelled button and calls onBuy', (tr) async {
      final h = tr.ensureSemantics();
      var bought = 0;
      await pumpPhone(tr, 'ar', tab('shop', 'ar', onBuy: () => bought++));
      expect(find.bySemanticsLabel(t('ar', 'product.buy')), findsOneWidget);
      await tr.tap(find.text(t('ar', 'product.buy')));
      expect(bought, 1);
      h.dispose();
    });
  });

  group('Payments shows what is owed, not the limit', () {
    testWidgets('EN: due, total due, history and the all-clear state', (tr) async {
      await pumpPhone(tr, 'en', tab('payments', 'en'));
      expect(find.text(t('en', 'payments.title')), findsOneWidget);
      expect(find.text(t('en', 'payments.due')), findsOneWidget);
      expect(txt(t('en', 'payments.total', {'amount': d.money('en', 0)})), findsOneWidget);
      expect(find.text(t('en', 'payments.history')), findsOneWidget);
      expect(find.text(t('en', 'payments.clear')), findsOneWidget);
    });

    // The strongest fact in the entry: a user can tour the whole app and
    // never see the number that decides everything.
    for (final lang in ['en', 'ar']) {
      for (final sc in d.scenarios) {
        for (final which in ['home', 'shop', 'payments', 'profile']) {
          testWidgets('$lang / ${sc.id} / $which: no limit figure or limit copy',
              (tr) async {
            await pumpPhone(tr, lang, tab(which, lang, scenario: sc.id));
            final shown = allText(tr);
            final joined = shown.join(' | ');
            expect(shown.contains(t(lang, 'limit.blocked')), false, reason: joined);
            for (final k in [
              'payments.limitCard',
              'payments.limitLink',
              'profile.limit',
              'profile.limitSub'
            ]) {
              expect(shown.contains(t(lang, k)), false, reason: '$k in $joined');
            }
            if (sc.available > 0) {
              expect(shown.contains(d.money(lang, sc.available)), false, reason: joined);
            }
            expect(
                joined,
                isNot(matches(RegExp(lang == 'en' ? r'limit|available|spend' : r'حد|المتاح',
                    caseSensitive: false))));
          });
        }
      }
    }

    testWidgets('proposed mode adds the limit card (so the test above can fail)',
        (tr) async {
      var taps = 0;
      final s = d.scenario('new-account');
      await pumpPhone(tr, 'en',
          PaymentsTab(data: d, lang: 'en', scenario: s, proposed: true, onLimit: () => taps++));
      expect(find.text(t('en', 'payments.limitCard')), findsOneWidget);
      expect(txt(d.money('en', s.available)), findsOneWidget);
      await tr.tap(find.text(t('en', 'payments.limitLink')));
      expect(taps, 1);
    });

    testWidgets('proposed with a blocked account says blocked, not a number', (tr) async {
      await pumpPhone(tr, 'en', tab('payments', 'en', proposed: true));
      expect(find.text(t('en', 'limit.blocked')), findsOneWidget);
    });
  });

  group('Profile', () {
    testWidgets('EN: every row from data, invite subtitle with the amount, log out',
        (tr) async {
      await pumpPhone(tr, 'en', tab('profile', 'en'));
      expect(d.app.profileRows, hasLength(8));
      for (final k in [
        'profile.complete',
        'profile.invite',
        'profile.cashback',
        'profile.logout',
        ...d.app.profileRows
      ]) {
        // profile.invite is in both the top block and the settings list, as in the HTML
        expect(find.text(t('en', k)), k == 'profile.invite' ? findsNWidgets(2) : findsOneWidget, reason: k);
      }
      expect(txt(t('en', 'profile.inviteSub', {'amount': d.money('en', 200)})),
          findsOneWidget);
    });

    testWidgets('proposed mode adds the limit row, which calls onLimit', (tr) async {
      var taps = 0;
      await pumpPhone(tr, 'en', tab('profile', 'en', proposed: true, onLimit: () => taps++));
      expect(find.text(t('en', 'profile.limitSub')), findsOneWidget);
      await tr.ensureVisible(find.text(t('en', 'profile.limit')));
      await tr.pump();
      await tr.tap(find.text(t('en', 'profile.limit')));
      expect(taps, 1);
    });

    testWidgets('AR renders RTL with Arabic rows', (tr) async {
      await pumpPhone(tr, 'ar', tab('profile', 'ar'));
      expect(find.text(t('ar', 'profile.personal')), findsOneWidget);
      expect(tr.getTopRight(find.text(t('ar', 'profile.personal'))).dx, greaterThan(200));
    });
  });
}
