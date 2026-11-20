import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Modal, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RECEIPT_CATEGORIES, RECEIPT_GROUPS, categoryOf, groupOf, folderSummary, receiptYears, sortReceipts, toDisplayDate,
  todayISO, parseDate, validateReceipt, yearOf,
} from '../calc/receipts';
import { addReceipt, deleteReceipt, pickImage } from '../receiptStore';
import { exportReceiptsPdf } from '../pdf/receiptsPdf';
import { exportReceiptsXlsx } from '../export/exportXlsx';
import { canAddReceipt, limitsFor, pdfAccess, receiptsLeft } from '../billing/plans';
import { disableReminder, enableReminder, reminderEnabled } from '../reminders';
import { MoneyField, Segmented, SectionHeader, ToggleRow } from './components';
import { AnimatedNumber, FadeIn, PressableScale } from './motion';
import { rm } from './theme';

const iconFor = (c) => (c.key === 'life' ? 'heart-outline' : groupOf(c.group)?.icon || 'folder-outline');

export default function ReceiptsTab({
  receipts, setReceipts, year, setYear, folder, setFolder, t, flash, heroStyle,
  tier = 'free', onPaywall = () => {}, pdfRewards = {}, ownerName = '', setOwnerName = () => {},
}) {
  const limits = limitsFor(tier);
  const [reminder, setReminder] = useState(false);
  useEffect(() => {
    reminderEnabled().then(setReminder);
  }, []);
  const [adding, setAdding] = useState(null); // null | { category }
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const years = useMemo(() => receiptYears(receipts).slice(0, 4), [receipts]);
  const sum = useMemo(() => folderSummary(receipts, year), [receipts, year]);

  const runPdf = async (categories, label) => {
    setBusy(true);
    try {
      const r = await exportReceiptsPdf(receipts, { year, categories, fileLabel: label, ownerName: ownerName.trim() });
      if (!r.ok && r.reason === 'empty') flash('Tiada resit untuk dijana');
      else if (!r.ok) flash('Tidak dapat berkongsi pada peranti ini');
    } catch {
      flash('PDF gagal dijana. Cuba sekali lagi.');
    } finally {
      setBusy(false);
    }
  };

  const makePdf = (categories, label) => {
    if (pdfAccess(tier, year, pdfRewards) === 'allowed') return runPdf(categories, label);
    onPaywall('pdf', () => runPdf(categories, label));
  };

  const makeExcel = async () => {
    if (!limits.excel) return onPaywall('excel');
    setBusy(true);
    try {
      const r = await exportReceiptsXlsx(receipts, { year, profileName: ownerName.trim() });
      if (!r.ok && r.reason === 'empty') flash('Tiada resit untuk dieksport');
      else if (!r.ok) flash('Tidak dapat berkongsi pada peranti ini');
    } catch {
      flash('Excel gagal dijana. Cuba sekali lagi.');
    } finally {
      setBusy(false);
    }
  };

  const startAdd = () => {
    if (!canAddReceipt(tier, sum.count)) return onPaywall('receipts');
    setAdding({ category: folder || null });
  };

  const toggleReminder = async (on) => {
    if (!limits.reminders) return onPaywall('reminders');
    if (on) {
      const ok = await enableReminder();
      setReminder(ok);
      flash(ok ? 'Peringatan setiap 1 haribulan, 8:30 malam' : 'Benarkan notifikasi dalam Tetapan telefon');
    } else {
      await disableReminder();
      setReminder(false);
    }
  };

  const left = receiptsLeft(tier, sum.count);

  const remove = (r) =>
    Alert.alert('Padam resit?', `${toDisplayDate(r.date)} · ${rm(r.amount)}\nGambar juga akan dipadam dari telefon.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Padam',
        style: 'destructive',
        onPress: async () => {
          setReceipts(await deleteReceipt(receipts, r.id));
          flash('Resit dipadam');
        },
      },
    ]);

  const s = styles(t);
  const cat = folder && categoryOf(folder);
  const row = folder && sum.rows.find((x) => x.key === folder);
  const inFolder = folder ? sortReceipts(receipts.filter((r) => r.category === folder && yearOf(r) === year)) : [];
  const pdfDisabled = busy || (folder ? !inFolder.length : !sum.count);
  // 3 kategori terakhir digunakan, untuk borang
  const recent = useMemo(() => [...new Set(sortReceipts(receipts).map((r) => r.category))].slice(0, 3), [receipts]);

  const tile = (c) => {
    const r = sum.rows.find((x) => x.key === c.key);
    const pct = c.max ? Math.min(1, r.total / c.max) : 1;
    return (
      <PressableScale
        key={c.key}
        onPress={() => setFolder(c.key)}
        wrapStyle={s.tileWrap}
        style={s.tile}
        accessibilityLabel={`Folder ${c.label}, ${r.count} resit, ${rm(r.total)}`}
      >
        <View style={s.tileTop}>
          <Ionicons name={iconFor(c)} size={20} color={t.accent} />
          <View style={s.count}>
            <Text style={s.countText}>{r.count}</Text>
          </View>
        </View>
        <Text style={s.tileLabel} numberOfLines={2}>
          {c.label}
        </Text>
        <Text style={s.tileSum}>{rm(r.total)}</Text>
        <View style={[s.track, { backgroundColor: t.line }]}>
          <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: r.over ? t.warnFg : t.accent }]} />
        </View>
        <Text style={[s.tileCap, r.over && { color: t.warnFg, fontWeight: '700' }]}>
          {c.max ? (r.over ? `Melebihi had ${rm(c.max)}` : `Had ${rm(c.max)}`) : 'Rebat cukai'}
        </Text>
      </PressableScale>
    );
  };

  return (
    <>
      <FadeIn delay={60}>
        <View style={heroStyle.hero}>
          <Text style={heroStyle.heroLabel}>{cat ? cat.label : `Resit tahun ${year}`}</Text>
          <AnimatedNumber value={cat ? row.total : sum.total} format={rm} style={heroStyle.heroValue} />
          <View style={heroStyle.heroChips}>
            <View style={heroStyle.chip}>
              <Text style={heroStyle.chipText}>{cat ? row.count : sum.count} resit</Text>
            </View>
            <View style={heroStyle.chip}>
              <Text style={heroStyle.chipText}>
                {cat && cat.max == null ? 'Rebat' : 'Dituntut'} {rm(cat ? row.claim : sum.claim)}
                {cat && cat.max != null ? ` / had ${rm(cat.max)}` : ''}
              </Text>
            </View>
          </View>
        </View>
      </FadeIn>

      <FadeIn delay={100}>
        {years.length > 1 && (
          <Segmented options={years.map((y) => ({ key: String(y), label: String(y) }))} value={String(year)} onChange={(k) => setYear(Number(k))} t={t} />
        )}
        <View style={s.actions}>
          <PressableScale
            onPress={startAdd}
            wrapStyle={{ flex: 1 }}
            style={s.primaryBtn}
            accessibilityLabel="Tambah resit"
          >
            <Ionicons name="camera-outline" size={18} color={t.accentText} />
            <Text style={s.primaryText}>Tambah resit</Text>
          </PressableScale>
          <PressableScale
            onPress={() => makePdf(folder ? [folder] : null, folder || 'semua')}
            disabled={pdfDisabled}
            style={[s.ghostBtn, pdfDisabled && { opacity: 0.45 }]}
            accessibilityLabel={folder ? 'Jana PDF folder ini' : 'Jana PDF semua resit'}
          >
            {busy ? <ActivityIndicator color={t.accent} /> : <Ionicons name="document-text-outline" size={18} color={t.accent} />}
            <Text style={s.ghostText}>PDF A4</Text>
          </PressableScale>
        </View>
        {pdfDisabled && !busy && <Text style={s.hint}>PDF boleh dijana selepas ada sekurang-kurangnya satu resit.</Text>}
        {left !== Infinity && (
          <Text style={[s.hint, left === 0 && { color: t.warnFg, fontWeight: '700' }]}>
            {left === 0 ? 'Had 10 resit percuma tahun ini sudah penuh.' : `${sum.count}/10 resit percuma digunakan tahun ini.`}
          </Text>
        )}
      </FadeIn>

      {!folder && (
        <FadeIn delay={140}>
          {sum.count > 0 && (
            <View style={[s.info, { backgroundColor: t.goodBg }]}>
              <Ionicons name="sync-outline" size={16} color={t.goodFg} />
              <Text style={[s.infoText, { color: t.goodFg }]}>
                {sum.count} resit tahun {year} dikira automatik dalam tab Cukai.
              </Text>
            </View>
          )}
          {sum.count === 0 && (
            <View style={s.emptyCard}>
              <View style={s.emptyIcon}>
                <Ionicons name="receipt-outline" size={26} color={t.accent} />
              </View>
              <Text style={s.emptyTitle}>Belum ada resit untuk {year}</Text>
              {[
                ['camera-outline', 'Snap resit atau pilih dari galeri'],
                ['folder-open-outline', 'Pilih kategori, contohnya Perubatan atau Gaya hidup'],
                ['calculator-outline', 'Jumlahnya terus masuk kiraan di tab Cukai'],
              ].map(([icon, text], i) => (
                <View key={icon} style={s.step}>
                  <Text style={s.stepNo}>{i + 1}</Text>
                  <Ionicons name={icon} size={16} color={t.muted} />
                  <Text style={s.stepText}>{text}</Text>
                </View>
              ))}
            </View>
          )}
          {sum.count > 0 && (
            <>
              <SectionHeader icon="folder-outline" title="Folder anda" t={t} first />
              <View style={s.grid}>{sum.used.map((r) => tile(categoryOf(r.key)))}</View>
            </>
          )}
          <Pressable
            onPress={() => setShowAll((v) => !v)}
            style={s.allToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAll }}
            accessibilityLabel={`Semua kategori, ${RECEIPT_CATEGORIES.length}`}
          >
            <Ionicons name="albums-outline" size={18} color={t.accent} />
            <Text style={s.allText}>Semua kategori ({RECEIPT_CATEGORIES.length})</Text>
            <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={18} color={t.muted} />
          </Pressable>
          {showAll && (
            <View style={s.allList}>
              {RECEIPT_GROUPS.map((g) => {
                const cats = RECEIPT_CATEGORIES.filter((c) => c.group === g.key);
                if (!cats.length) return null;
                return (
                  <View key={g.key}>
                    <Text style={s.allGroup}>{g.label}</Text>
                    {cats.map((c) => {
                      const r = sum.rows.find((x) => x.key === c.key);
                      return (
                        <Pressable
                          key={c.key}
                          onPress={() => setFolder(c.key)}
                          style={s.allRow}
                          accessibilityRole="button"
                          accessibilityLabel={`Folder ${c.label}, ${r.count} resit, ${rm(r.total)}`}
                        >
                          <Ionicons name={iconFor(c)} size={16} color={t.accent} />
                          <Text style={s.allLabel} numberOfLines={1}>
                            {c.label}
                          </Text>
                          <Text style={[s.allSum, !r.count && { color: t.muted, fontWeight: '500' }]}>
                            {r.count ? `${r.count} · ${rm(r.total)}` : c.max ? `had ${rm(c.max)}` : 'rebat'}
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={t.muted} />
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}
          <SectionHeader icon="options-outline" title="Tetapan resit" t={t} />
          <Text style={s.label}>Nama pada PDF dan Excel (pilihan)</Text>
          <TextInput
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="cth. Ahmad bin Ali"
            placeholderTextColor={t.muted}
            style={s.input}
            maxLength={40}
            accessibilityLabel="Nama pada PDF dan Excel"
          />
          <View style={{ height: 10 }} />
          <PressableScale onPress={makeExcel} disabled={busy} style={s.excelRow} accessibilityLabel="Eksport Excel">
            <Ionicons name="grid-outline" size={18} color={t.accent} />
            <View style={{ flex: 1 }}>
              <Text style={s.excelTitle}>Eksport Excel</Text>
              <Text style={s.excelSub}>Ringkasan dan senarai resit {year} untuk ejen cukai</Text>
            </View>
            {!limits.excel ? (
              <View style={s.lock}>
                <Ionicons name="lock-closed" size={11} color={t.accent} />
                <Text style={s.lockText}>Pro</Text>
              </View>
            ) : (
              <Ionicons name="share-outline" size={18} color={t.muted} />
            )}
          </PressableScale>
          <ToggleRow
            icon="notifications-outline"
            label="Peringatan bulanan"
            hint={limits.reminders ? '1 haribulan setiap bulan, 8:30 malam' : 'Tersedia dalam Plus dan Pro'}
            value={reminder}
            onChange={toggleReminder}
            t={t}
          />
          <Text style={s.note}>
            Gambar resit disimpan dalam telefon anda sahaja, tidak dimuat naik ke mana-mana. Jana PDF sebagai salinan sandaran kerana
            data akan hilang jika app dipadam.
          </Text>
        </FadeIn>
      )}

      {!!folder && (
        <FadeIn delay={140}>
          <Pressable onPress={() => setFolder(null)} style={s.back} accessibilityRole="button" accessibilityLabel="Kembali ke semua folder">
            <Ionicons name="chevron-back" size={18} color={t.accent} />
            <Text style={{ color: t.accent, fontWeight: '700' }}>Semua folder</Text>
          </Pressable>
          {row.over && (
            <View style={[s.info, { backgroundColor: t.warnBg }]}>
              <Ionicons name="alert-circle-outline" size={16} color={t.warnFg} />
              <Text style={[s.infoText, { color: t.warnFg }]}>Melebihi had. Hanya {rm(row.claim)} dikira dalam cukai.</Text>
            </View>
          )}
          {inFolder.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="folder-open-outline" size={36} color={t.muted} />
              <Text style={{ color: t.muted, marginTop: 8, textAlign: 'center' }}>Belum ada resit untuk {year}. Tekan Tambah resit di atas.</Text>
            </View>
          )}
          {inFolder.map((r) => (
            <View key={r.id} style={s.item}>
              <Pressable onPress={() => r.uri && setViewer(r)} accessibilityRole="imagebutton" accessibilityLabel="Lihat gambar resit">
                {r.uri ? (
                  <Image source={{ uri: r.uri }} style={s.thumb} />
                ) : (
                  <View style={[s.thumb, s.noThumb]}>
                    <Ionicons name="image-outline" size={20} color={t.muted} />
                  </View>
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={s.itemAmt}>{rm(r.amount)}</Text>
                <Text style={s.itemSub}>{toDisplayDate(r.date)}</Text>
                {!!r.note && (
                  <Text style={s.itemSub} numberOfLines={1}>
                    {r.note}
                  </Text>
                )}
              </View>
              <PressableScale onPress={() => remove(r)} style={s.del} hitSlop={6} accessibilityLabel={`Padam resit ${rm(r.amount)}`}>
                <Ionicons name="trash-outline" size={18} color={t.muted} />
              </PressableScale>
            </View>
          ))}
        </FadeIn>
      )}

      <AddReceiptSheet
        visible={!!adding}
        initialCategory={adding?.category}
        defaultYear={year}
        recent={recent}
        onClose={() => setAdding(null)}
        onSave={async (data) => {
          const y0 = Number(data.date.slice(0, 4));
          const countY = receipts.filter((r) => yearOf(r) === y0).length;
          if (!canAddReceipt(tier, countY)) {
            setAdding(null);
            onPaywall('receipts');
            return;
          }
          const next = await addReceipt(receipts, data);
          setReceipts(next);
          setAdding(null);
          const y = Number(data.date.slice(0, 4));
          if (y !== year) setYear(y);
          flash('Resit disimpan dan dikira dalam cukai');
        }}
        t={t}
      />

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={s.viewer} onPress={() => setViewer(null)} accessibilityLabel="Tutup gambar">
          {!!viewer && <Image source={{ uri: viewer.uri }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
          {!!viewer && (
            <Text style={{ color: '#fff', marginTop: 12, fontWeight: '700' }}>
              {toDisplayDate(viewer.date)} · {rm(viewer.amount)}
            </Text>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

function AddReceiptSheet({ visible, initialCategory, defaultYear, recent = [], onClose, onSave, t }) {
  const [category, setCategory] = useState(null);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [openedFor, setOpenedFor] = useState(false);

  // Set semula borang setiap kali dibuka
  if (visible && !openedFor) {
    setOpenedFor(true);
    setCategory(initialCategory || null);
    const today = todayISO();
    setDate(toDisplayDate(Number(today.slice(0, 4)) === defaultYear ? today : `${defaultYear}-12-31`));
    setAmount('');
    setNote('');
    setImageUri(null);
    setErrors({});
  }
  if (!visible && openedFor) setOpenedFor(false);

  const s = styles(t);

  const chip = (c, prefix) => {
    if (!c) return null;
    const on = c.key === category;
    return (
      <Pressable
        key={(prefix || '') + c.key}
        onPress={() => setCategory(c.key)}
        style={[s.catChip, on && { backgroundColor: t.accent, borderColor: t.accent }]}
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        accessibilityLabel={prefix ? `Terakhir: ${c.label}` : c.label}
      >
        <Ionicons name={iconFor(c)} size={14} color={on ? t.accentText : t.accent} />
        <Text style={{ color: on ? t.accentText : t.text, fontSize: 13, fontWeight: '600' }}>{c.label}</Text>
      </Pressable>
    );
  };

  const grab = async (source) => {
    const r = await pickImage(source);
    if (r.ok) setImageUri(r.uri);
    else if (r.reason === 'permission')
      Alert.alert('Kebenaran diperlukan', source === 'camera' ? 'Benarkan akses kamera dalam Tetapan telefon.' : 'Benarkan akses gambar dalam Tetapan telefon.');
  };

  const save = async () => {
    const e = validateReceipt({ category, date, amount });
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await onSave({ category, date: parseDate(date), amount, note, imageUri });
    } catch {
      setErrors({ save: 'Gagal menyimpan. Cuba sekali lagi.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.sheetBack} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Tutup" />
        <View style={[s.sheet, { backgroundColor: t.bg }]}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>Resit baharu</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Batal">
              <Ionicons name="close" size={22} color={t.muted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={s.photoRow}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={s.preview} accessibilityLabel="Pratonton resit" />
              ) : (
                <View style={[s.preview, s.noThumb]}>
                  <Ionicons name="receipt-outline" size={28} color={t.muted} />
                </View>
              )}
              <View style={{ flex: 1, gap: 8 }}>
                <PressableScale onPress={() => grab('camera')} style={s.pickBtn} accessibilityLabel="Ambil gambar">
                  <Ionicons name="camera-outline" size={18} color={t.accent} />
                  <Text style={s.pickText}>Kamera</Text>
                </PressableScale>
                <PressableScale onPress={() => grab('library')} style={s.pickBtn} accessibilityLabel="Pilih dari galeri">
                  <Ionicons name="images-outline" size={18} color={t.accent} />
                  <Text style={s.pickText}>Galeri</Text>
                </PressableScale>
              </View>
            </View>

            <Text style={s.label}>Kategori</Text>
            {recent.length > 0 && (
              <>
                <Text style={s.chipGroup}>Terakhir digunakan</Text>
                <View style={s.chips}>{recent.map((k) => chip(categoryOf(k), 'recent'))}</View>
              </>
            )}
            {RECEIPT_GROUPS.map((g) => {
              const cats = RECEIPT_CATEGORIES.filter((c) => c.group === g.key);
              if (!cats.length) return null;
              return (
                <View key={g.key}>
                  <Text style={s.chipGroup}>{g.label}</Text>
                  <View style={s.chips}>{cats.map((c) => chip(c))}</View>
                </View>
              );
            })}
            {!!errors.category && <Text style={s.err}>{errors.category}</Text>}

            <Text style={[s.label, { marginTop: 12 }]}>Tarikh resit</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="HH/BB/TTTT"
                placeholderTextColor={t.muted}
                keyboardType="numbers-and-punctuation"
                style={[s.input, { flex: 1 }]}
                accessibilityLabel="Tarikh resit"
              />
              <Pressable onPress={() => setDate(toDisplayDate(todayISO()))} style={s.smallChip} accessibilityRole="button">
                <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>Hari ini</Text>
              </Pressable>
            </View>
            {!!errors.date && <Text style={s.err}>{errors.date}</Text>}

            <View style={{ height: 12 }} />
            <MoneyField label="Jumlah resit" value={amount} onChange={setAmount} placeholder="0.00" t={t} />
            {!!errors.amount && <Text style={[s.err, { marginTop: -8 }]}>{errors.amount}</Text>}

            <Text style={s.label}>Catatan (pilihan)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="cth. Klinik gigi, buku anak"
              placeholderTextColor={t.muted}
              style={s.input}
              maxLength={80}
              accessibilityLabel="Catatan"
            />
            {!!errors.save && <Text style={s.err}>{errors.save}</Text>}

            <PressableScale onPress={save} disabled={saving} style={[s.primaryBtn, { marginTop: 16 }]} accessibilityLabel="Simpan resit">
              {saving ? <ActivityIndicator color={t.accentText} /> : <Ionicons name="checkmark" size={18} color={t.accentText} />}
              <Text style={s.primaryText}>Simpan resit</Text>
            </PressableScale>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (t) =>
  StyleSheet.create({
    actions: { flexDirection: 'row', gap: 10, marginBottom: 4 },
    primaryBtn: { flexDirection: 'row', gap: 8, backgroundColor: t.accent, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
    primaryText: { color: t.accentText, fontWeight: '700', fontSize: 15 },
    ghostBtn: { flexDirection: 'row', gap: 6, height: 52, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' },
    ghostText: { color: t.accent, fontWeight: '700' },
    info: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 12, padding: 10, marginTop: 12 },
    infoText: { flex: 1, fontSize: 13, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
    tileWrap: { width: '50%', padding: 5 },
    tile: { backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 16, padding: 12, minHeight: 132 },
    tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    count: { backgroundColor: t.accent, borderRadius: 999, minWidth: 22, height: 22, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
    countText: { color: t.accentText, fontSize: 12, fontWeight: '800' },
    tileLabel: { color: t.text, fontSize: 13, fontWeight: '700', minHeight: 34, marginTop: 2 },
    tileSum: { color: t.text, fontSize: 15, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
    track: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 8 },
    fill: { height: 4, borderRadius: 2 },
    tileCap: { color: t.muted, fontSize: 11, marginTop: 4 },
    note: { color: t.muted, fontSize: 12, lineHeight: 18, marginTop: 14 },
    hint: { color: t.muted, fontSize: 12, marginTop: 6 },
    excelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 16, padding: 14, marginBottom: 10 },
    excelTitle: { color: t.text, fontSize: 15, fontWeight: '600' },
    excelSub: { color: t.muted, fontSize: 12, marginTop: 2 },
    lock: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.accentSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    lockText: { color: t.accent, fontSize: 11, fontWeight: '800' },
    emptyCard: { backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 18, padding: 16, marginTop: 14 },
    emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { color: t.text, fontSize: 17, fontWeight: '800', marginBottom: 10 },
    step: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    stepNo: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.accentSoft, color: t.accent, fontWeight: '800', fontSize: 12, textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
    stepText: { flex: 1, color: t.text, fontSize: 14 },
    allToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, marginTop: 14, paddingHorizontal: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 14 },
    allText: { flex: 1, color: t.text, fontWeight: '700', fontSize: 14 },
    allList: { backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 14, paddingHorizontal: 14, paddingBottom: 6, marginTop: 8 },
    allGroup: { color: t.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 12, marginBottom: 2 },
    allRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
    allLabel: { flex: 1, color: t.text, fontSize: 14 },
    allSum: { color: t.text, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
    chipGroup: { color: t.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, minHeight: 44 },
    empty: { alignItems: 'center', padding: 28, borderWidth: 1, borderStyle: 'dashed', borderColor: t.line, borderRadius: 16 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 16, padding: 10, marginBottom: 8 },
    thumb: { width: 56, height: 72, borderRadius: 10, backgroundColor: t.line },
    noThumb: { alignItems: 'center', justifyContent: 'center' },
    itemAmt: { color: t.text, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
    itemSub: { color: t.muted, fontSize: 12, marginTop: 2 },
    del: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    sheetBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: { maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16 },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sheetTitle: { color: t.text, fontSize: 20, fontWeight: '800' },
    photoRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    preview: { width: 96, height: 120, borderRadius: 12, backgroundColor: t.card, borderWidth: 1, borderColor: t.line },
    pickBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.line, backgroundColor: t.card, borderRadius: 14, height: 52 },
    pickText: { color: t.accent, fontWeight: '700' },
    label: { color: t.muted, fontSize: 13, fontWeight: '600', marginBottom: 6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, minHeight: 36 },
    smallChip: { backgroundColor: t.accentSoft, borderRadius: 12, paddingHorizontal: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
    input: { backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 14, paddingHorizontal: 14, height: 48, color: t.text, fontSize: 16 },
    err: { color: t.warnFg, fontSize: 12, marginTop: 4 },
  });
