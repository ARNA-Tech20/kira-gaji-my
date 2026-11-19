import React, { useEffect, useState } from 'react';
import { Animated, View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager, useAnimatedValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RELIEF_GROUPS, RELIEFS, catalogClaims } from '../calc/reliefs';
import { MoneyField, Stepper, ToggleRow, LockedField } from './components';
import { rm } from './theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function Chevron({ open, color }) {
  const r = useAnimatedValue(open ? 1 : 0);
  useEffect(() => {
    Animated.spring(r, { toValue: open ? 1 : 0, useNativeDriver: true, damping: 16, stiffness: 200 }).start();
  }, [open]);
  const rotate = r.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="chevron-down" size={18} color={color} />
    </Animated.View>
  );
}

// Senarai pelepasan dikumpul ikut kumpulan; setiap kumpulan boleh dibuka/ditutup
export default function ReliefAccordion({ values = {}, onChange, t, locked = {}, onOpenReceipts }) {
  const [open, setOpen] = useState(null);
  const { byGroup, total } = catalogClaims(values);
  const set = (key) => (v) => onChange({ ...values, [key]: v });

  const toggle = (g) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(240, 'easeInEaseOut', 'opacity'));
    setOpen((o) => (o === g ? null : g));
  };

  return (
    <View style={[st.wrap, { backgroundColor: t.card, borderColor: t.line }]}>
      <View style={st.headRow}>
        <Text style={{ color: t.text, fontSize: 16, fontWeight: '800', flex: 1 }}>Pelepasan tambahan</Text>
        <View style={[st.total, { backgroundColor: t.accentSoft }]}>
          <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>{rm(total)}</Text>
        </View>
      </View>
      <Text style={{ color: t.muted, fontSize: 12, marginBottom: 8 }}>Isi yang ada resit sahaja. Kategori yang ada resit dalam tab Resit diisi automatik.</Text>

      {RELIEF_GROUPS.map((g, i) => {
        const isOpen = open === g.key;
        const sub = byGroup[g.key] || 0;
        return (
          <View key={g.key} style={[i > 0 && { borderTopWidth: 1, borderTopColor: t.line }]}>
            <Pressable
              onPress={() => toggle(g.key)}
              style={st.groupHead}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${g.label}, dituntut ${rm(sub)}`}
            >
              <View style={[st.icon, { backgroundColor: sub > 0 ? t.accent : t.accentSoft }]}>
                <Ionicons name={g.icon} size={16} color={sub > 0 ? t.accentText : t.accent} />
              </View>
              <Text style={{ color: t.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{g.label}</Text>
              {sub > 0 && <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700', marginRight: 8 }}>{rm(sub)}</Text>}
              <Chevron open={isOpen} color={t.muted} />
            </Pressable>

            {isOpen && (
              <View style={{ paddingBottom: 8 }}>
                {RELIEFS.filter((r) => r.group === g.key).map((r) => (
                  <View key={r.key}>
                    {r.type === 'amount' && locked[r.key] && (
                      <LockedField label={r.label} total={locked[r.key].total} count={locked[r.key].count} onPress={() => onOpenReceipts?.(r.key)} t={t} />
                    )}
                    {r.type === 'amount' && !locked[r.key] && (
                      <MoneyField label={r.label} value={values[r.key] ?? ''} onChange={set(r.key)} placeholder="0" t={t} />
                    )}
                    {r.type === 'count' && (
                      <Stepper label={r.label} value={values[r.key] ?? '0'} onChange={set(r.key)} t={t} />
                    )}
                    {r.type === 'flag' && <ToggleRow label={r.label} value={!!values[r.key]} onChange={set(r.key)} t={t} />}
                    <Text style={[st.hint, { color: t.muted }]}>{r.hint}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingTop: 14, marginTop: 4, marginBottom: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  total: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 11, marginTop: -6, marginBottom: 12, marginLeft: 2, lineHeight: 16 },
});
