import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZAKAT_STATES, HAD_KIFAYAH } from '../calc/zakatStates';
import { PressableScale, FadeIn } from './motion';
import { Stepper, Row } from './components';
import { rm } from './theme';

// Cip negeri boleh diskrol; negeri dengan nisab disahkan ditanda titik hijau
export function StatePicker({ value, onPick, t }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }} style={{ marginBottom: 8 }}>
      {ZAKAT_STATES.map((s) => {
        const on = s.key === value;
        return (
          <Pressable
            key={s.key}
            onPress={() => onPick(s)}
            style={[st.chip, { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={s.name}
          >
            {!!s.nisab && <View style={[st.dot, { backgroundColor: on ? t.accentText : '#2BB673' }]} />}
            <Text style={{ color: on ? t.accentText : t.text, fontWeight: '700', fontSize: 13 }}>{s.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function StateSourceNote({ stateKey, t }) {
  const s = ZAKAT_STATES.find((x) => x.key === stateKey);
  if (!s) return <Text style={[st.note, { color: t.muted }]}>Pilih negeri anda. Titik hijau = nisab 2026 sudah disahkan.</Text>;
  if (!s.nisab)
    return (
      <Text style={[st.note, { color: t.muted }]}>
        Nisab {s.name} belum dimuatkan. Masukkan nilai terkini daripada pusat zakat {s.name}.
      </Text>
    );
  return (
    <Text style={[st.note, { color: t.muted }]}>
      Nisab {s.period} oleh {s.body}.{' '}
      <Text style={{ color: t.accent, fontWeight: '600' }} onPress={() => Linking.openURL(s.url)}>
        Semak laman rasmi
      </Text>
    </Text>
  );
}

// Dua kad kaedah sebelah-menyebelah; tekan untuk pilih
export function MethodCompare({ compare, value, onChange, t }) {
  const card = (key, title, res, sub) => {
    const on = value === key;
    return (
      <PressableScale wrapStyle={{ flex: 1 }} onPress={() => onChange(key)} accessibilityLabel={title}>
        <View style={[st.mcard, { backgroundColor: on ? t.accentSoft : t.card, borderColor: on ? t.accent : t.line }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={16} color={on ? t.accent : t.muted} />
            <Text style={{ color: on ? t.accent : t.text, fontWeight: '700', fontSize: 14 }}>{title}</Text>
          </View>
          <Text style={{ color: t.text, fontSize: 19, fontWeight: '800', marginTop: 8, fontVariant: ['tabular-nums'] }}>
            {res.eligible ? rm(res.annual) : 'Tiada'}
          </Text>
          <Text style={{ color: t.muted, fontSize: 11, marginTop: 2 }}>{res.eligible ? sub : 'Belum capai nisab'}</Text>
        </View>
      </PressableScale>
    );
  };
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {card('kasar', 'Kaedah kasar', compare.kasar, 'Tanpa tolakan')}
        {card('bersih', 'Kaedah bersih', compare.bersih, 'Selepas had kifayah')}
      </View>
      {compare.kasar.eligible && compare.diff > 0 && (
        <Text style={[st.note, { color: t.muted, textAlign: 'center' }]}>
          Kaedah bersih {rm(compare.diff)} lebih rendah setahun. Kedua-dua kaedah sah.
        </Text>
      )}
    </View>
  );
}

// Tanggungan untuk kaedah bersih
export function HadKifayahForm({ counts = {}, onChange, deductions, stateKey, t }) {
  const set = (k) => (v) => onChange({ ...counts, [k]: v });
  return (
    <FadeIn>
      <View style={[st.box, { backgroundColor: t.card, borderColor: t.line }]}>
        <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>Had kifayah (tolakan)</Text>
        <Text style={[st.note, { color: t.muted, marginTop: 2, marginBottom: 10 }]}>
          Diri sendiri RM{HAD_KIFAYAH.self.toLocaleString('ms-MY')} dan caruman KWSP ditolak automatik. Tambah tanggungan anda:
        </Text>
        {HAD_KIFAYAH.items.map((it) => (
          <View key={it.key}>
            <Stepper label={it.label} value={counts[it.key] ?? '0'} onChange={set(it.key)} t={t} max={15} />
            <Text style={[st.hint, { color: t.muted }]}>
              RM{it.amount.toLocaleString('ms-MY')} seorang{it.hint ? ` · ${it.hint}` : ''}
            </Text>
          </View>
        ))}
        <View style={{ marginTop: 4 }}>
          <Row k="Jumlah tolakan" v={rm(deductions.total)} t={t} bold />
        </View>
        {stateKey !== 'selangor' && (
          <View style={[st.warn, { backgroundColor: t.warnBg }]}>
            <Ionicons name="alert-circle-outline" size={16} color={t.warnFg} />
            <Text style={{ color: t.warnFg, fontSize: 12, flex: 1, lineHeight: 17 }}>
              Kadar di atas ialah kadar {HAD_KIFAYAH.source}. Negeri lain menggunakan kadar sendiri.
            </Text>
          </View>
        )}
      </View>
    </FadeIn>
  );
}

const st = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 10 },
  mcard: { borderWidth: 1.5, borderRadius: 18, padding: 14 },
  box: { borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 12, marginBottom: 12 },
  hint: { fontSize: 11, marginTop: -6, marginBottom: 12, marginLeft: 2 },
  warn: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 10, marginTop: 10, alignItems: 'flex-start' },
});
