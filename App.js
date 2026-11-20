import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, useColorScheme, Linking } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { netSalary } from './src/calc/payroll';
import { annualTax } from './src/calc/tax';
import { zakatCompare } from './src/calc/zakat';
import { RATES } from './src/calc/rates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PROFILE, loadProfile, saveProfileDebounced, resetProfile } from './src/storage';
import { addSecondProfile, loadProfiles, saveProfiles, setActiveProfileId, usableProfiles } from './src/profiles';
import { cachedTier, listenPurchases, loadProducts, refreshTier } from './src/billing/billing';
import { TIER_LABEL, limitsFor } from './src/billing/plans';
import { showRewardedAd } from './src/components/rewarded';
import Paywall from './src/ui/Paywall';
import { loadReceipts } from './src/receiptStore';
import { mergeReceiptInputs } from './src/calc/receipts';
import { shareCard } from './src/share';
import AdBanner from './src/components/AdBanner';

import { THEMES, SEG, rm, num, fmtDate } from './src/ui/theme';
import { AnimatedNumber, FadeIn, PressableScale } from './src/ui/motion';
import {
  TabBar, MoneyField, LockedField, ToggleRow, Stepper, Segmented, Card, Row, BreakdownBar, Legend, HelpSheet, StatusBanner, SectionHeader,
} from './src/ui/components';
import { HELP } from './src/ui/help';
import ReliefAccordion from './src/ui/ReliefAccordion';
import ReceiptsTab from './src/ui/ReceiptsTab';
import AnimatedSplash from './src/ui/Splash';
import { StatePicker, StateSourceNote, MethodCompare, HadKifayahForm } from './src/ui/ZakatPanel';

const TABS = [
  { key: 'gaji', label: 'Gaji', icon: 'wallet-outline' },
  { key: 'cukai', label: 'Cukai', icon: 'calculator-outline' },
  { key: 'resit', label: 'Resit', icon: 'receipt-outline' },
  { key: 'zakat', label: 'Zakat', icon: 'leaf-outline' },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#0B3D2E' }}>
        <Main onReady={() => setReady(true)} />
        {!splashDone && <AnimatedSplash ready={ready} onDone={() => setSplashDone(true)} />}
      </View>
    </SafeAreaProvider>
  );
}

function Main({ onReady }) {
  const t = useColorScheme() === 'dark' ? THEMES.dark : THEMES.light;
  const [tab, setTab] = useState('gaji');
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [showReliefs, setShowReliefs] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [receiptYear, setReceiptYear] = useState(new Date().getFullYear());
  const [folder, setFolder] = useState(null);
  const [tier, setTier] = useState('free');
  const [products, setProducts] = useState({});
  const [paywall, setPaywall] = useState(null); // { reason, onUnlocked }
  const [profiles, setProfiles] = useState({ active: 'p1', list: [{ id: 'p1', name: 'Saya' }] });
  const [pdfRewards, setPdfRewards] = useState({});
  const shareRef = useRef(null);
  const scrollRef = useRef(null);
  const limits = limitsFor(tier);
  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  // Muat profil aktif dan resitnya
  const openProfile = async (id) => {
    setActiveProfileId(id);
    const [p, list] = await Promise.all([loadProfile(), loadReceipts()]);
    setProfile(p);
    setReceipts(list);
    setFolder(null);
  };

  // Tetapkan tier; jika Pro tamat semasa profil Pasangan dibuka, kembali ke profil pertama
  const applyTier = (tr) => {
    setTier(tr);
    const cur = profilesRef.current;
    const u = usableProfiles(cur, limitsFor(tr).profiles);
    if (u.active !== cur.active) {
      setProfiles({ ...cur, active: u.active });
      openProfile(u.active);
    }
  };

  useEffect(() => {
    (async () => {
      const [tr, ps, rw] = await Promise.all([cachedTier(), loadProfiles(), AsyncStorage.getItem(REWARD_KEY).catch(() => null)]);
      const u = usableProfiles(ps, limitsFor(tr).profiles);
      setTier(tr);
      setProfiles({ ...ps, active: u.active });
      try {
        setPdfRewards(JSON.parse(rw || '{}') || {});
      } catch {
        // abaikan
      }
      await openProfile(u.active);
      setLoaded(true);
      onReady && onReady();
      // Semak langganan sebenar selepas app dipaparkan
      refreshTier().then(applyTier);
      loadProducts().then(setProducts);
    })();
    return listenPurchases((tr) => {
      applyTier(tr);
      if (tr !== 'free') {
        setPaywall(null);
        flash(`Terima kasih! ${TIER_LABEL[tr]} kini aktif`);
      }
    });
  }, []);

  const switchProfile = async (id) => {
    if (id === profiles.active) return;
    const next = { ...profiles, active: id };
    setProfiles(next);
    saveProfiles(next);
    await openProfile(id);
  };
  const addSpouse = async () => {
    if (limits.profiles < 2) return openPaywall('profiles');
    const next = { ...addSecondProfile(profiles), active: 'p2' };
    setProfiles(next);
    saveProfiles(next);
    await openProfile('p2');
    flash('Profil Pasangan dibuka. Kiraan dan resit diasingkan.');
  };

  const openPaywall = (reason, onUnlocked) => setPaywall({ reason, onUnlocked });
  const grantPdfReward = async () => {
    const r = await showRewardedAd();
    if (r === 'closed') {
      flash('Tonton iklan hingga habis untuk membuka PDF');
      return;
    }
    // Jika iklan tidak tersedia (tiada liputan / internet), PDF tetap dibuka kali ini
    const next = { ...pdfRewards, [receiptYear]: (pdfRewards[receiptYear] || 0) + 1 };
    setPdfRewards(next);
    AsyncStorage.setItem(REWARD_KEY, JSON.stringify(next)).catch(() => {});
    const after = paywall?.onUnlocked;
    setPaywall(null);
    after && after();
  };
  useEffect(() => {
    if (loaded) saveProfileDebounced(profile);
  }, [profile, loaded]);

  const set = (key) => (value) => setProfile((p) => ({ ...p, [key]: value }));
  const P = profile;
  // Resit tahun dipilih mengatasi nilai manual bagi kategori yang sama
  const M = useMemo(() => mergeReceiptInputs(P, receipts, receiptYear), [P, receipts, receiptYear]);
  const locked = M.locked;
  const openFolder = (key) => {
    setFolder(key);
    setTab('resit');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  // Simpan pelepasan manual tanpa menimpa nilai asal dengan jumlah resit
  const setReliefs = (v) =>
    setProfile((p) => {
      const next = { ...v };
      for (const k of Object.keys(locked)) {
        if (p.reliefs && k in p.reliefs) next[k] = p.reliefs[k];
        else delete next[k];
      }
      return { ...p, reliefs: next };
    });

  const tax = useMemo(
    () =>
      annualTax({
        monthlyGross: num(P.gross),
        bonus: num(P.bonus),
        spouseNoIncome: P.spouse,
        childrenUnder18: num(P.children),
        lifeInsurance: num(M.life),
        reliefInputs: M.reliefs,
        zakatPaid: num(M.zakatPaid),
        age60: P.age60,
        pcbPaid: num(P.pcbPaid),
      }),
    [P.gross, P.bonus, P.spouse, P.children, M, P.age60, P.pcbPaid]
  );
  // Cukai tanpa pelepasan tambahan, untuk paparan "Jimat RMx"
  const saved = useMemo(() => {
    const base = annualTax({
      monthlyGross: num(P.gross),
      bonus: num(P.bonus),
      spouseNoIncome: P.spouse,
      childrenUnder18: num(P.children),
      lifeInsurance: num(M.life),
      zakatPaid: num(M.zakatPaid),
      age60: P.age60,
    });
    return Math.max(0, Math.round((base.taxPayable - tax.taxPayable) * 100) / 100);
  }, [P.gross, P.bonus, P.spouse, P.children, M, P.age60, tax.taxPayable]);

  const pay = useMemo(
    () => netSalary({ gross: num(P.gross), age60: P.age60, includeSkbbk: P.skbbk, pcb: tax.monthlyEstimate }),
    [P.gross, P.age60, P.skbbk, tax.monthlyEstimate]
  );
  const zc = useMemo(
    () =>
      zakatCompare({
        annualIncome: num(P.gross) * 12 + num(P.bonus),
        nisab: num(P.nisab),
        counts: P.hk || {},
        epfAnnual: pay.epf * 12,
      }),
    [P.gross, P.bonus, P.nisab, P.hk, pay.epf]
  );
  const zakat = P.zakatMethod === 'bersih' ? zc.bersih : zc.kasar;

  // Pilih negeri: isi nisab automatik jika nilai disahkan ada
  const pickState = (st) =>
    setProfile((p) => ({ ...p, zakatState: st.key, nisab: st.nisab ? String(st.nisab) : p.nisab }));

  const segments = [
    { key: 'net', label: 'Bersih', value: Math.max(0, pay.net), color: SEG.net },
    { key: 'epf', label: 'KWSP', value: pay.epf, color: SEG.epf },
    { key: 'perkeso', label: ['PERKESO', pay.eis > 0 && 'SIP', pay.skbbk > 0 && 'LINDUNG'].filter(Boolean).join(', '), value: pay.socso + pay.eis + pay.skbbk, color: SEG.perkeso },
    { key: 'pcb', label: 'PCB', value: pay.pcb, color: SEG.pcb },
  ];

  const onShare = async () => {
    const r = await shareCard(shareRef);
    if (!r.ok) flash('Tidak dapat berkongsi pada peranti ini');
  };
  const onReset = async () => {
    setProfile(await resetProfile());
    flash('Nilai asal dipulihkan');
  };
  const applyZakatRebate = () => {
    set('zakatPaid')(String(zakat.annual));
    setTab('cukai');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    flash(locked.zakat ? 'Rebat zakat ikut resit yang disimpan' : 'Zakat dimasukkan sebagai rebat cukai');
  };

  const s = makeStyles(t);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="auto" />
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>KIRA GAJI</Text>
          <Text style={s.subtitle} numberOfLines={1}>Disemak {fmtDate(RATES.lastVerified)}</Text>
        </View>
        <View style={s.badge}>
          <Text style={s.badgeText}>Tahun taksiran {receiptYear}</Text>
        </View>
        <PressableScale
          onPress={() => openPaywall(null)}
          style={[s.helpBtn, tier !== 'free' && { width: undefined, paddingHorizontal: 10 }]}
          hitSlop={6}
          accessibilityLabel={tier === 'free' ? 'Langganan' : `Langganan ${TIER_LABEL[tier]}`}
        >
          {tier === 'free' ? (
            <Ionicons name="diamond-outline" size={17} color={t.accent} />
          ) : (
            <Text style={{ color: t.accent, fontWeight: '800', fontSize: 12 }}>{TIER_LABEL[tier]}</Text>
          )}
        </PressableScale>
        <PressableScale onPress={() => setHelpOpen(true)} style={s.helpBtn} hitSlop={6} accessibilityLabel="Panduan">
          <Ionicons name="help" size={18} color={t.accent} />
        </PressableScale>
      </View>

      {limits.profiles > 1 && (
        <View style={s.profileRow} accessibilityRole="tablist">
          {profiles.list.slice(0, limits.profiles).map((p) => {
            const on = p.id === profiles.active;
            return (
              <Pressable
                key={p.id}
                onPress={() => switchProfile(p.id)}
                style={[s.profileChip, on && { backgroundColor: t.accent, borderColor: t.accent }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Profil ${p.name}`}
              >
                <Ionicons name={p.id === 'p1' ? 'person-outline' : 'heart-outline'} size={14} color={on ? t.accentText : t.accent} />
                <Text style={{ color: on ? t.accentText : t.text, fontWeight: '700', fontSize: 13 }}>{p.name}</Text>
              </Pressable>
            );
          })}
          {profiles.list.length < 2 && (
            <Pressable onPress={addSpouse} style={s.profileChip} accessibilityRole="button" accessibilityLabel="Tambah profil pasangan">
              <Ionicons name="add" size={14} color={t.accent} />
              <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>Pasangan</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={{ paddingHorizontal: 16 }}>
        <TabBar tabs={TABS} value={tab} onChange={(k) => { setFolder(null); setTab(k); }} t={t} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {/* key={tab} memaksa kandungan dipasang semula supaya animasi masuk berulang setiap kali tukar tab */}
        <View key={tab}>
          {tab !== 'resit' && (
            <FadeIn>
              <MoneyField label="Gaji kasar bulanan" value={P.gross} onChange={set('gross')} t={t} />
            </FadeIn>
          )}

          {tab === 'gaji' && (
            <>
              <FadeIn delay={60}>
                <View ref={shareRef} collapsable={false} style={{ backgroundColor: t.bg }}>
                  <View style={s.hero}>
                    <Text style={s.heroLabel}>Gaji bersih anggaran</Text>
                    <AnimatedNumber value={pay.net} format={rm} style={s.heroValue} />
                    <Text style={s.heroSub}>daripada {rm(pay.gross)} · {pay.gross > 0 ? Math.round((pay.net / pay.gross) * 100) : 0}% dibawa pulang</Text>
                    <BreakdownBar segments={segments} total={pay.gross} trackColor={t.heroTrack} />
                    <Legend segments={segments} color={t.heroText} mutedColor={t.heroMuted} />
                  </View>
                  <Text style={s.watermark}>KIRA GAJI MY · anggaran sahaja</Text>
                </View>
              </FadeIn>

              <FadeIn delay={120}>
                <SectionHeader icon="options-outline" title="Tetapan" t={t} first />
                <Segmented
                  options={[
                    { key: 'bawah', label: 'Bawah 60 tahun' },
                    { key: '60', label: '60 tahun ke atas' },
                  ]}
                  value={P.age60 ? '60' : 'bawah'}
                  onChange={(k) => set('age60')(k === '60')}
                  t={t}
                />
                <ToggleRow
                  icon="shield-checkmark-outline"
                  label="LINDUNG 24 Jam"
                  hint="0.75% · sukarela bagi warganegara"
                  value={P.skbbk}
                  onChange={set('skbbk')}
                  t={t}
                />
              </FadeIn>

              <FadeIn delay={180}>
                <Card title="Potongan bulanan" t={t}>
                  <Row k={P.age60 ? 'KWSP (0%)' : 'KWSP (11%)'} v={rm(pay.epf)} dot={SEG.epf} t={t} />
                  {!P.age60 && <Row k="PERKESO" v={rm(pay.socso)} dot={SEG.perkeso} t={t} />}
                  {!P.age60 && <Row k="SIP" v={rm(pay.eis)} dot={SEG.perkeso} t={t} />}
                  {P.skbbk && <Row k="LINDUNG 24 Jam" v={rm(pay.skbbk)} dot={SEG.perkeso} t={t} />}
                  <Row k="PCB (anggaran)" v={rm(pay.pcb)} dot={SEG.pcb} t={t} />
                  <Row k="Jumlah potongan" v={rm(pay.totalDeductions)} t={t} bold />
                </Card>
                <Card title="Caruman majikan (bukan potongan anda)" t={t}>
                  <Row k={P.age60 ? 'KWSP majikan (4%)' : 'KWSP majikan'} v={rm(pay.employer.epf)} t={t} />
                  {P.age60 && <Row k="PERKESO majikan (1.25%)" v={rm(pay.employer.socso)} t={t} />}
                </Card>
              </FadeIn>

              <FadeIn delay={240} style={s.actions}>
                <PressableScale onPress={onShare} wrapStyle={{ flex: 1 }} style={s.primaryBtn} accessibilityLabel="Kongsi sebagai gambar">
                  <Ionicons name="share-social-outline" size={18} color={t.accentText} />
                  <Text style={s.primaryText}>Kongsi gambar</Text>
                </PressableScale>
                <PressableScale onPress={onReset} style={s.ghostBtn} accessibilityLabel="Set semula">
                  <Ionicons name="refresh" size={18} color={t.text} />
                </PressableScale>
              </FadeIn>
            </>
          )}

          {tab === 'cukai' && (
            <>
              <FadeIn delay={60}>
                <View style={s.hero}>
                  <Text style={s.heroLabel}>Cukai setahun anggaran</Text>
                  <AnimatedNumber value={tax.taxPayable} format={rm} style={s.heroValue} />
                  <View style={s.heroChips}>
                    <View style={s.chip}>
                      <Text style={s.chipText}>
                        {tax.taxPayable > 0 && tax.monthlyEstimate === 0 ? 'PCB tidak dipotong (bawah RM10 sebulan)' : `≈ ${rm(tax.monthlyEstimate)}/bulan`}
                      </Text>
                    </View>
                    <View style={s.chip}>
                      <Text style={s.chipText}>Kadar efektif {tax.effectiveRate}%</Text>
                    </View>
                    {Object.keys(locked).length > 0 && (
                      <View style={s.chip}>
                        <Text style={s.chipText}>Resit {receiptYear}</Text>
                      </View>
                    )}
                    {saved > 0 && (
                      <View style={[s.chip, { backgroundColor: SEG.net }]}>
                        <Text style={[s.chipText, { color: '#04342C' }]}>Jimat {rm(saved)}</Text>
                      </View>
                    )}
                    {num(P.pcbPaid) > 0 && tax.balance !== 0 && (
                      <View style={[s.chip, { backgroundColor: tax.balance < 0 ? SEG.net : SEG.perkeso }]}>
                        <Text style={[s.chipText, { color: tax.balance < 0 ? '#04342C' : '#412402' }]}>
                          {tax.balance < 0 ? `Bayaran balik ${rm(-tax.balance)}` : `Perlu bayar ${rm(tax.balance)}`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </FadeIn>

              <FadeIn delay={100}>
                <SectionHeader icon="cash-outline" title="Pendapatan" t={t} first />
                <MoneyField label="Bonus / pendapatan lain setahun" value={P.bonus} onChange={set('bonus')} t={t} />

                <SectionHeader icon="pricetags-outline" title="Pelepasan" t={t} />
                <ToggleRow icon="people-outline" label="Pasangan tiada pendapatan" value={P.spouse} onChange={set('spouse')} t={t} />
                <Stepper label="Anak bawah 18 tahun" value={P.children} onChange={set('children')} t={t} />
                {locked.life ? (
                  <LockedField label="Insurans hayat / takaful setahun" total={locked.life.total} count={locked.life.count} onPress={() => openFolder('life')} t={t} />
                ) : (
                  <MoneyField label="Insurans hayat / takaful setahun" value={P.life} onChange={set('life')} t={t} />
                )}
                <ReliefAccordion values={M.reliefs} onChange={setReliefs} locked={locked} onOpenReceipts={openFolder} t={t} />

                <SectionHeader icon="receipt-outline" title="Rebat & PCB" t={t} />
                {locked.zakat ? (
                  <LockedField label="Zakat dibayar setahun" total={locked.zakat.total} count={locked.zakat.count} onPress={() => openFolder('zakat')} t={t} />
                ) : (
                  <MoneyField label="Zakat dibayar setahun" value={P.zakatPaid} onChange={set('zakatPaid')} t={t} />
                )}
                <MoneyField
                  label="PCB sudah dipotong tahun ini (Borang EA / e-Data PCB)"
                  value={P.pcbPaid}
                  onChange={set('pcbPaid')}
                  t={t}
                />
                {num(P.pcbPaid) > 0 &&
                  (tax.balance > 0 ? (
                    <StatusBanner
                      tone="warn"
                      icon="alert-circle-outline"
                      title="Anggaran perlu bayar lagi"
                      value={rm(tax.balance)}
                      hint="Bayar sebelum tarikh akhir e-Filing untuk elak penalti"
                      t={t}
                    />
                  ) : tax.balance < 0 ? (
                    <StatusBanner
                      tone="good"
                      icon="checkmark-circle-outline"
                      title="Anggaran bayaran balik"
                      value={rm(-tax.balance)}
                      hint="LHDN memulangkan lebihan selepas e-Filing diproses"
                      t={t}
                    />
                  ) : (
                    <StatusBanner tone="info" icon="checkmark-done-outline" title="PCB sepadan dengan cukai" value={rm(0)} t={t} />
                  ))}
              </FadeIn>

              <FadeIn delay={160}>
                <Card title="Ringkasan pengiraan" t={t}>
                  <Row k="Pendapatan kasar" v={rm(tax.annualGross)} t={t} />
                  <Pressable
                    onPress={() => setShowReliefs((v) => !v)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showReliefs }}
                  >
                    <Row k={showReliefs ? 'Jumlah pelepasan ▴' : 'Jumlah pelepasan ▾'} v={'− ' + rm(tax.totalReliefs)} t={t} />
                  </Pressable>
                  {showReliefs && (
                    <View style={s.subList}>
                      <Row sub k="Individu" v={rm(tax.reliefs.individual)} t={t} />
                      {tax.reliefs.spouse > 0 && <Row sub k="Pasangan" v={rm(tax.reliefs.spouse)} t={t} />}
                      {tax.reliefs.children > 0 && <Row sub k="Anak bawah 18" v={rm(tax.reliefs.children)} t={t} />}
                      <Row sub k="KWSP" v={rm(tax.reliefs.epf)} t={t} />
                      {tax.reliefs.lifeInsurance > 0 && <Row sub k="Insurans hayat" v={rm(tax.reliefs.lifeInsurance)} t={t} />}
                      <Row sub k="PERKESO + SIP" v={rm(tax.reliefs.socsoEis)} t={t} />
                      {tax.catalog.items
                        .filter((x) => x.claim > 0)
                        .map((x) => (
                          <Row sub key={x.key} k={x.label} v={rm(x.claim)} t={t} />
                        ))}
                    </View>
                  )}
                  <Row k="Pendapatan bercukai" v={rm(tax.chargeable)} t={t} />
                  <Row k="Cukai sebelum rebat" v={rm(tax.taxBeforeRebate)} t={t} />
                  {tax.rebate > 0 && <Row k="Rebat individu" v={'− ' + rm(tax.rebate)} t={t} />}
                  {tax.zakatRebate > 0 && <Row k="Rebat zakat" v={'− ' + rm(tax.zakatRebate)} t={t} />}
                  <Row k="Cukai perlu dibayar" v={rm(tax.taxPayable)} t={t} bold />
                  {num(P.pcbPaid) > 0 && (
                    <>
                      <Row k="PCB sudah dipotong" v={'− ' + rm(tax.pcbPaid)} t={t} />
                      <Row k={tax.balance < 0 ? 'Bayaran balik' : 'Baki perlu dibayar'} v={rm(Math.abs(tax.balance))} t={t} bold />
                    </>
                  )}
                </Card>
              </FadeIn>
            </>
          )}

          {tab === 'resit' && (
            <ReceiptsTab
              receipts={receipts}
              setReceipts={setReceipts}
              year={receiptYear}
              setYear={setReceiptYear}
              folder={folder}
              setFolder={setFolder}
              flash={flash}
              heroStyle={s}
              tier={tier}
              onPaywall={openPaywall}
              pdfRewards={pdfRewards}
              ownerName={P.ownerName || ''}
              setOwnerName={set('ownerName')}
              t={t}
            />
          )}

          {tab === 'zakat' && (
            <>
              <FadeIn delay={60}>
                <View style={s.hero}>
                  <Text style={s.heroLabel}>
                    {num(P.nisab) === 0 ? 'Pilih negeri atau isi nisab' : zakat.eligible ? 'Zakat setahun' : 'Belum mencapai nisab'}
                  </Text>
                  <AnimatedNumber value={zakat.annual} format={rm} style={s.heroValue} />
                  <View style={s.heroChips}>
                    <View style={s.chip}>
                      <Text style={s.chipText}>Asas {rm(zakat.base)}</Text>
                    </View>
                    {zakat.eligible && (
                      <View style={s.chip}>
                        <Text style={s.chipText}>≈ {rm(zakat.monthly)}/bulan</Text>
                      </View>
                    )}
                  </View>
                </View>
              </FadeIn>

              <FadeIn delay={120}>
                <SectionHeader icon="cash-outline" title="Pendapatan" t={t} first />
                <MoneyField label="Bonus / pendapatan lain setahun" value={P.bonus} onChange={set('bonus')} t={t} />
                <SectionHeader icon="location-outline" title="Negeri & nisab" t={t} />
                <StatePicker value={P.zakatState} onPick={pickState} t={t} />
                <MoneyField label="Nisab setahun" value={P.nisab} onChange={set('nisab')} placeholder="cth. 33,996" t={t} />
                <StateSourceNote stateKey={P.zakatState} t={t} />
                <SectionHeader icon="git-compare-outline" title="Kaedah" t={t} />
                <MethodCompare compare={zc} value={P.zakatMethod} onChange={set('zakatMethod')} t={t} />
                {P.zakatMethod === 'bersih' && (
                  <HadKifayahForm
                    counts={P.hk || {}}
                    onChange={set('hk')}
                    deductions={zc.deductions}
                    stateKey={P.zakatState}
                    t={t}
                  />
                )}
              </FadeIn>

              <FadeIn delay={180}>
                <PressableScale
                  onPress={applyZakatRebate}
                  disabled={!zakat.eligible}
                  style={s.primaryBtn}
                  accessibilityLabel="Guna sebagai rebat cukai"
                >
                  <Ionicons name="swap-horizontal" size={18} color={t.accentText} />
                  <Text style={s.primaryText}>Guna sebagai rebat cukai</Text>
                </PressableScale>
                <Text style={s.note}>
                  Bayar sebelum 31 Disember untuk dapat rebat cukai tahun ini. Untuk kepastian kaedah, rujuk pusat zakat negeri anda.
                </Text>
              </FadeIn>
            </>
          )}
        </View>

        <View style={s.disclaimer}>
          <Text style={s.note}>
            Anggaran sahaja. Bukan nasihat cukai atau kewangan dan tidak berkaitan dengan LHDN, KWSP, PERKESO atau mana-mana
            pusat zakat. PCB sebenar dikira oleh majikan menggunakan kaedah rasmi LHDN.
          </Text>
          {RATES.sources.map((src) => (
            <Text key={src.url} style={s.link} onPress={() => Linking.openURL(src.url)}>
              {src.label}
            </Text>
          ))}
        </View>
      </ScrollView>

      {!!toast && (
        <FadeIn key={toast} style={s.toast}>
          <Ionicons name="checkmark-circle" size={18} color={t.heroText} />
          <Text style={s.toastText}>{toast}</Text>
        </FadeIn>
      )}
      <HelpSheet visible={helpOpen} onClose={() => setHelpOpen(false)} content={HELP[tab]} t={t} />
      <Paywall
        visible={!!paywall}
        reason={paywall?.reason}
        tier={tier}
        products={products}
        onClose={() => setPaywall(null)}
        onTier={applyTier}
        onReward={grantPdfReward}
        flash={flash}
        t={t}
      />
      <AdBanner hidden={!limits.ads} />
    </SafeAreaView>
  );
}

const REWARD_KEY = 'kiragaji.pdfreward.v1';

const makeStyles = (t) =>
  StyleSheet.create({
    profileRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
    profileChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, borderRadius: 999, paddingHorizontal: 12, minHeight: 36 },
    screen: { flex: 1, backgroundColor: t.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
    title: { fontSize: 26, fontWeight: '800', color: t.text, letterSpacing: 0.6 },
    subtitle: { fontSize: 12, color: t.muted, marginTop: 2 },
    badge: { backgroundColor: t.accentSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    badgeText: { color: t.accent, fontSize: 12, fontWeight: '700' },
    subList: { paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: t.line, marginLeft: 4, marginBottom: 4 },
    helpBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    body: { padding: 16, paddingBottom: 96 },
    hero: {
      backgroundColor: t.hero,
      borderRadius: 24,
      padding: 20,
      marginBottom: 12,
      shadowColor: t.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    heroLabel: { color: t.heroMuted, fontSize: 13, fontWeight: '600' },
    heroValue: { color: t.heroText, fontSize: 38, fontWeight: '800', marginTop: 4, letterSpacing: -1, fontVariant: ['tabular-nums'] },
    heroSub: { color: t.heroMuted, fontSize: 13, marginTop: 4 },
    heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: { backgroundColor: t.heroTrack, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    chipText: { color: t.heroText, fontSize: 12, fontWeight: '600' },
    watermark: { color: t.muted, fontSize: 11, textAlign: 'center', marginBottom: 12 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    primaryBtn: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: t.accent,
      borderRadius: 16,
      paddingVertical: 15,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexGrow: 1,
    },
    primaryText: { color: t.accentText, fontWeight: '700', fontSize: 15 },
    ghostBtn: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' },
    note: { color: t.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
    disclaimer: { marginTop: 28, borderTopWidth: 1, borderTopColor: t.line, paddingTop: 12 },
    link: { color: t.accent, fontSize: 12, marginTop: 6 },
    toast: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 72,
      backgroundColor: t.hero,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    toastText: { color: t.heroText, fontWeight: '600' },
  });
