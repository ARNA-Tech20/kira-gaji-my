import React, { useEffect, useState } from 'react';
import { Animated, View, Text, TextInput, Switch, Pressable, StyleSheet, Modal, ScrollView, useAnimatedValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale, BarSegment } from './motion';
import { rm } from './theme';

// Helaian panduan yang meluncur dari bawah
export function HelpSheet({ visible, onClose, content, t }) {
  if (!content) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Tutup panduan" />
      <View style={[st.sheet, { backgroundColor: t.card }]}>
        <View style={[st.grab, { backgroundColor: t.line }]} />
        <ScrollView>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', marginBottom: 12 }}>{content.title}</Text>
          {content.steps.map((x, i) => (
            <View key={i} style={st.stepRow}>
              <View style={[st.stepNum, { backgroundColor: t.accentSoft }]}>
                <Text style={{ color: t.accent, fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
              </View>
              <Text style={{ color: t.text, fontSize: 15, lineHeight: 22, flex: 1 }}>{x}</Text>
            </View>
          ))}
          <View style={[st.noteBox, { backgroundColor: t.bg, borderColor: t.line }]}>
            <Text style={{ color: t.text, fontWeight: '700', marginBottom: 6 }}>Perlu tahu</Text>
            {content.notes.map((x, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Ionicons name="information-circle-outline" size={16} color={t.accent} style={{ marginTop: 2 }} />
                <Text style={{ color: t.muted, fontSize: 13, lineHeight: 20, flex: 1 }}>{x}</Text>
              </View>
            ))}
          </View>
          <PressableScale onPress={onClose} style={[st.closeBtn, { backgroundColor: t.accent }]} accessibilityLabel="Faham">
            <Text style={{ color: t.accentText, fontWeight: '700', fontSize: 15 }}>Faham</Text>
          </PressableScale>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Jalur status untuk baki cukai (perlu bayar / bayaran balik)
export function StatusBanner({ tone, icon, title, value, hint, t }) {
  const palette =
    tone === 'good'
      ? { bg: t.goodBg, fg: t.goodFg }
      : tone === 'warn'
      ? { bg: t.warnBg, fg: t.warnFg }
      : { bg: t.accentSoft, fg: t.accent };
  return (
    <View style={[st.status, { backgroundColor: palette.bg }]}>
      <Ionicons name={icon} size={22} color={palette.fg} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.fg, fontSize: 13, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: palette.fg, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
        {!!hint && <Text style={{ color: palette.fg, fontSize: 12, marginTop: 2 }}>{hint}</Text>}
      </View>
    </View>
  );
}

// Tajuk bahagian supaya setiap tab tersusun dengan cara yang sama
export function SectionHeader({ icon, title, t, first }) {
  return (
    <View style={[st.section, first && { marginTop: 4 }]} accessibilityRole="header">
      {!!icon && <Ionicons name={icon} size={15} color={t.accent} />}
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 }}>{title.toUpperCase()}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: t.line, marginLeft: 6 }} />
    </View>
  );
}

// Bar tab dengan penunjuk yang meluncur (spring)
export function TabBar({ tabs, value, onChange, t }) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, tabs.findIndex((x) => x.key === value));
  const x = useAnimatedValue(0);
  const seg = w / tabs.length;
  useEffect(() => {
    Animated.spring(x, { toValue: idx * seg, useNativeDriver: true, damping: 18, stiffness: 190 }).start();
  }, [idx, seg]);

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width - 8)}
      style={[st.tabWrap, { backgroundColor: t.card, borderColor: t.line }]}
      accessibilityRole="tablist"
    >
      {w > 0 && (
        <Animated.View style={[st.tabInd, { width: seg, backgroundColor: t.accent, transform: [{ translateX: x }] }]} />
      )}
      {tabs.map((tab) => {
        const on = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            style={st.tab}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Ionicons name={tab.icon} size={16} color={on ? t.accentText : t.muted} />
            <Text style={[st.tabText, { color: on ? t.accentText : t.muted }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Medan wang dengan awalan RM dan bingkai bertukar warna bila fokus
export function MoneyField({ label, value, onChange, t, placeholder, prefix = 'RM' }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[st.label, { color: t.muted }]}>{label}</Text>
      <View style={[st.inputWrap, { backgroundColor: t.card, borderColor: focus ? t.accent : t.line }]}>
        {!!prefix && <Text style={[st.prefix, { color: t.muted }]}>{prefix}</Text>}
        <TextInput
          style={[st.input, { color: t.text }]}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={t.muted}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          selectTextOnFocus
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

// Medan yang diisi automatik daripada resit; tekan untuk buka folder resit
export function LockedField({ label, total, count, onPress, t }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[st.label, { color: t.muted }]}>{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${rm(total)} dari ${count} resit`}
        style={[st.inputWrap, { backgroundColor: t.accentSoft, borderColor: t.accentSoft, justifyContent: 'space-between' }]}
      >
        <Text style={[st.input, { color: t.text, flex: 0 }]}>{rm(total)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="receipt-outline" size={14} color={t.accent} />
          <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>Dari {count} resit</Text>
          <Ionicons name="chevron-forward" size={14} color={t.accent} />
        </View>
      </Pressable>
    </View>
  );
}

export function ToggleRow({ label, hint, value, onChange, t, icon }) {
  return (
    <View style={[st.toggle, { backgroundColor: t.card, borderColor: t.line }]}>
      {!!icon && (
        <View style={[st.iconBubble, { backgroundColor: t.accentSoft }]}>
          <Ionicons name={icon} size={16} color={t.accent} />
        </View>
      )}
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        {!!hint && <Text style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{hint}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.accent, false: t.line }} thumbColor="#FFFFFF" />
    </View>
  );
}

export function Stepper({ label, value, onChange, t, min = 0, max = 20 }) {
  const n = Math.max(min, Math.min(max, parseInt(value, 10) || 0));
  const btn = (icon, next, a11y) => (
    <PressableScale
      hitSlop={6}
      onPress={() => onChange(String(Math.max(min, Math.min(max, next))))}
      style={[st.stepBtn, { backgroundColor: t.accentSoft }]}
      accessibilityLabel={a11y}
    >
      <Ionicons name={icon} size={18} color={t.accent} />
    </PressableScale>
  );
  return (
    <View style={[st.toggle, { backgroundColor: t.card, borderColor: t.line }]}>
      <Text style={{ color: t.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{label}</Text>
      {btn('remove', n - 1, 'Kurang')}
      <Text style={{ color: t.text, fontSize: 18, fontWeight: '700', width: 36, textAlign: 'center' }}>{n}</Text>
      {btn('add', n + 1, 'Tambah')}
    </View>
  );
}

export function Segmented({ options, value, onChange, t }) {
  return (
    <View style={[st.tabWrap, { backgroundColor: t.card, borderColor: t.line, marginBottom: 12 }]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[st.tab, on && { backgroundColor: t.accentSoft, borderRadius: 10 }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <Text style={[st.tabText, { color: on ? t.accent : t.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ title, children, t, style }) {
  return (
    <View style={[st.card, { backgroundColor: t.card, borderColor: t.line }, style]}>
      {!!title && <Text style={[st.cardTitle, { color: t.text }]}>{title}</Text>}
      {children}
    </View>
  );
}

export function Row({ k, v, t, dot, bold, sub }) {
  const size = sub ? 13 : 15;
  return (
    <View style={[st.row, sub && { paddingVertical: 5 }, bold && { borderTopWidth: 1, borderTopColor: t.line, marginTop: 6, paddingTop: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
        {!!dot && <View style={[st.dot, { backgroundColor: dot }]} />}
        <Text style={{ color: bold ? t.text : t.muted, fontSize: size, fontWeight: bold ? '700' : '400', flexShrink: 1 }}>{k}</Text>
      </View>
      <Text style={{ color: t.text, fontSize: size, fontWeight: bold ? '700' : '500', fontVariant: ['tabular-nums'] }}>{v}</Text>
    </View>
  );
}

// Bar bertindan: ke mana gaji pergi
export function BreakdownBar({ segments, total, trackColor }) {
  const safe = total > 0 ? total : 1;
  return (
    <View style={[st.bar, { backgroundColor: trackColor }]}>
      {segments.map((s) => (
        <BarSegment key={s.key} pct={Math.max(0, (s.value / safe) * 100)} color={s.color} />
      ))}
    </View>
  );
}

export function Legend({ segments, color, mutedColor }) {
  return (
    <View style={st.legend}>
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <View key={s.key} style={st.legendItem}>
            <View style={[st.dot, { backgroundColor: s.color }]} />
            <Text style={{ color: mutedColor, fontSize: 12 }}>{s.label} </Text>
            <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{rm(s.value)}</Text>
          </View>
        ))}
    </View>
  );
}

const st = StyleSheet.create({
  section: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { maxHeight: '80%', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 32 },
  grab: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  noteBox: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 4 },
  closeBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
  status: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: 18, padding: 16, marginBottom: 12 },
  tabWrap: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4 },
  tabInd: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 10 },
  tab: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontWeight: '700', fontSize: 13 },
  label: { fontSize: 13, marginBottom: 6, fontWeight: '500' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14 },
  prefix: { fontSize: 16, fontWeight: '600', marginRight: 8 },
  input: { flex: 1, fontSize: 20, fontWeight: '600', paddingVertical: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, gap: 10 },
  iconBubble: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 12 },
  cardTitle: { fontWeight: '700', fontSize: 15, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', marginTop: 16 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
});
