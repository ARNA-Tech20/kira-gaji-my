import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_PLANS, FALLBACK_PRICES, FEATURES, PRODUCTS, TIER_LABEL, hasFreeTrial, introPrice, pickOffer, recurringPrice, tierRank } from '../billing/plans';
import { billingAvailable, currentSubscription, manageSubscriptions, refreshTier, subscribe } from '../billing/billing';
import { PressableScale } from './motion';

const REASONS = {
  receipts: 'Had 10 resit percuma bagi tahun ini sudah penuh.',
  pdf: 'Pengguna percuma boleh jana 1 PDF setahun selepas menonton iklan.',
  excel: 'Eksport Excel tersedia dalam Pro.',
  profiles: 'Profil pasangan tersedia dalam Pro.',
  reminders: 'Peringatan bulanan tersedia dalam Plus dan Pro.',
};

const PRIVACY_URL = 'https://arna-tech20.github.io/kira-gaji-my/privacy.html';

// Peratus jimat pelan tahunan berbanding 12 bulan
const saving = (plan) => {
  const y = parseFloat(FALLBACK_PRICES[plan].yearly.replace(/[^0-9.]/g, ''));
  const m = parseFloat(FALLBACK_PRICES[plan].monthly.replace(/[^0-9.]/g, ''));
  return Math.round((1 - y / (m * 12)) * 100);
};

export default function Paywall({ visible, reason, tier, products = {}, onClose, onTier, onReward, t, flash }) {
  const [period, setPeriod] = useState('yearly');
  const [plan, setPlan] = useState('pro');
  const [busy, setBusy] = useState(null); // 'buy' | 'restore' | 'ad'
  const s = styles(t);

  const offerFor = (p) => pickOffer(products[p], BASE_PLANS[period]);
  const priceFor = (p) => recurringPrice(offerFor(p), FALLBACK_PRICES[p][period]);
  const selOffer = offerFor(plan);
  const trial = hasFreeTrial(selOffer);
  const isCurrent = tier === plan;
  const isDowngrade = tierRank(tier) > tierRank(plan);

  const buy = async () => {
    if (!billingAvailable()) {
      flash('Langganan hanya tersedia dalam app yang dipasang dari Google Play');
      return;
    }
    setBusy('buy');
    try {
      const current = await currentSubscription();
      await subscribe(PRODUCTS[plan], selOffer, current);
      // Keputusan sebenar sampai melalui listenPurchases dalam App
    } catch (e) {
      if (!/cancel/i.test(String(e?.code || e?.message))) flash('Pembelian tidak selesai. Cuba sekali lagi.');
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      const tr = await refreshTier();
      onTier(tr);
      flash(tr === 'free' ? 'Tiada langganan aktif dijumpai untuk akaun Google ini' : `Langganan ${TIER_LABEL[tr]} dipulihkan`);
      if (tr !== 'free') onClose();
    } finally {
      setBusy(null);
    }
  };

  const watchAd = async () => {
    setBusy('ad');
    try {
      await onReward();
    } finally {
      setBusy(null);
    }
  };

  const cta = isCurrent
    ? 'Pelan semasa anda'
    : trial
      ? 'Cuba percuma 7 hari'
      : isDowngrade
        ? `Tukar ke ${TIER_LABEL[plan]}`
        : `Langgan ${TIER_LABEL[plan]}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.back}>
        <View style={[s.sheet, { backgroundColor: t.bg }]}>
          <View style={s.head}>
            <Text style={s.title}>Pilih pelan</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Tutup">
              <Ionicons name="close" size={22} color={t.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {!!REASONS[reason] && (
              <View style={[s.reason, { backgroundColor: t.accentSoft }]}>
                <Ionicons name="information-circle-outline" size={16} color={t.accent} />
                <Text style={[s.reasonText, { color: t.accent }]}>{REASONS[reason]}</Text>
              </View>
            )}

            <View style={s.toggle} accessibilityRole="radiogroup">
              {[
                ['yearly', 'Tahunan'],
                ['monthly', 'Bulanan'],
              ].map(([k, label]) => {
                const on = period === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setPeriod(k)}
                    style={[s.toggleItem, on && { backgroundColor: t.card, borderColor: t.line }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={label}
                  >
                    <Text style={[s.toggleText, on && { color: t.text }]}>{label}</Text>
                    {k === 'yearly' && <Text style={s.save}>Jimat {saving(plan)}%</Text>}
                  </Pressable>
                );
              })}
            </View>

            {['plus', 'pro'].map((p) => {
              const on = plan === p;
              const intro = period === 'yearly' ? introPrice(offerFor(p)) : null;
              const tr = hasFreeTrial(offerFor(p));
              return (
                <Pressable
                  key={p}
                  onPress={() => setPlan(p)}
                  style={[s.card, on && { borderColor: t.accent, borderWidth: 2 }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Pelan ${TIER_LABEL[p]}, ${priceFor(p)} ${period === 'yearly' ? 'setahun' : 'sebulan'}`}
                >
                  <View style={s.cardTop}>
                    <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? t.accent : t.muted} />
                    <Text style={s.cardName}>{TIER_LABEL[p]}</Text>
                    {p === 'pro' && (
                      <View style={s.best}>
                        <Text style={s.bestText}>Paling berbaloi</Text>
                      </View>
                    )}
                    {tier === p && (
                      <View style={[s.best, { backgroundColor: t.goodBg }]}>
                        <Text style={[s.bestText, { color: t.goodFg }]}>Aktif</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.price}>
                    {priceFor(p)}
                    <Text style={s.per}> / {period === 'yearly' ? 'tahun' : 'bulan'}</Text>
                  </Text>
                  <Text style={s.tag}>{p === 'plus' ? 'Tanpa iklan dan tanpa had' : 'Untuk anda dan pasangan, siap untuk ejen cukai'}</Text>
                  {(tr || intro) && (
                    <Text style={[s.tag, { color: t.accent, fontWeight: '700' }]}>
                      {[tr && '7 hari percuma', intro && `${intro} untuk tahun pertama`].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </Pressable>
              );
            })}

            <View style={s.features}>
              {FEATURES.map((f) => {
                const has = f[plan];
                return (
                  <View key={f.key} style={s.feat}>
                    <Ionicons name={has ? 'checkmark-circle' : 'remove-circle-outline'} size={18} color={has ? t.accent : t.line} />
                    <Text style={[s.featText, !has && { color: t.muted }]}>{f.label}</Text>
                    {f.soon && has && (
                      <View style={s.soon}>
                        <Text style={s.soonText}>Akan datang</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <PressableScale
              onPress={buy}
              disabled={isCurrent || !!busy}
              style={[s.cta, (isCurrent || busy) && { opacity: 0.55 }]}
              accessibilityLabel={cta}
            >
              {busy === 'buy' ? <ActivityIndicator color={t.accentText} /> : <Text style={s.ctaText}>{cta}</Text>}
            </PressableScale>
            {trial && !isCurrent && (
              <Text style={s.fine}>Selepas 7 hari, {priceFor(plan)} / {period === 'yearly' ? 'tahun' : 'bulan'}. Batal sebelum tamat percubaan untuk tidak dicaj.</Text>
            )}

            {reason === 'pdf' && tier === 'free' && (
              <PressableScale onPress={watchAd} disabled={!!busy} style={s.ghost} accessibilityLabel="Tonton iklan untuk 1 PDF">
                {busy === 'ad' ? <ActivityIndicator color={t.accent} /> : <Ionicons name="play-circle-outline" size={18} color={t.accent} />}
                <Text style={s.ghostText}>Tonton iklan untuk 1 PDF</Text>
              </PressableScale>
            )}

            <View style={s.links}>
              <Pressable onPress={restore} disabled={!!busy} accessibilityRole="button" style={s.link}>
                {busy === 'restore' ? <ActivityIndicator color={t.accent} size="small" /> : <Text style={s.linkText}>Pulihkan pembelian</Text>}
              </Pressable>
              <Text style={{ color: t.line }}>|</Text>
              <Pressable onPress={() => manageSubscriptions(tier !== 'free' ? PRODUCTS[tier] : null)} accessibilityRole="button" style={s.link}>
                <Text style={s.linkText}>Urus langganan</Text>
              </Pressable>
            </View>
            <Text style={s.fine}>
              Langganan diperbaharui secara automatik pada harga di atas sehingga dibatalkan. Batal bila-bila masa di Google Play ›
              Pembayaran & langganan; akses kekal hingga akhir tempoh yang sudah dibayar. Bayaran dikendalikan oleh Google Play.{' '}
              <Text style={{ color: t.accent }} onPress={() => Linking.openURL(PRIVACY_URL)}>
                Dasar privasi
              </Text>
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = (t) =>
  StyleSheet.create({
    back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { maxHeight: '94%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16 },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    title: { color: t.text, fontSize: 22, fontWeight: '800' },
    reason: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 12, padding: 10, marginBottom: 12 },
    reasonText: { flex: 1, fontSize: 13, fontWeight: '600' },
    toggle: { flexDirection: 'row', backgroundColor: t.line, borderRadius: 14, padding: 4, marginBottom: 12 },
    toggleItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 11, borderWidth: 1, borderColor: 'transparent', minHeight: 44, justifyContent: 'center' },
    toggleText: { color: t.muted, fontWeight: '700', fontSize: 14 },
    save: { color: t.accent, fontSize: 11, fontWeight: '700', marginTop: 1 },
    card: { backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 18, padding: 14, marginBottom: 10 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardName: { color: t.text, fontSize: 17, fontWeight: '800', flex: 1 },
    best: { backgroundColor: t.accent, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
    bestText: { color: t.accentText, fontSize: 11, fontWeight: '800' },
    price: { color: t.text, fontSize: 24, fontWeight: '800', marginTop: 6, fontVariant: ['tabular-nums'] },
    per: { color: t.muted, fontSize: 14, fontWeight: '600' },
    tag: { color: t.muted, fontSize: 13, marginTop: 2 },
    features: { backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
    feat: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
    featText: { flex: 1, color: t.text, fontSize: 14 },
    soon: { backgroundColor: t.warnBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    soonText: { color: t.warnFg, fontSize: 11, fontWeight: '700' },
    cta: { backgroundColor: t.accent, borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center' },
    ctaText: { color: t.accentText, fontWeight: '800', fontSize: 16 },
    ghost: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 16, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, marginTop: 10 },
    ghostText: { color: t.accent, fontWeight: '700' },
    links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
    link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
    linkText: { color: t.accent, fontWeight: '700', fontSize: 13 },
    fine: { color: t.muted, fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: 8 },
  });
