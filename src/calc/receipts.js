// Logik tulen untuk resit: kategori (folder), jumlah ikut tahun, dan
// gabungan ke dalam input kiraan cukai. Tiada import native supaya boleh diuji dengan node.
import { RELIEF_GROUPS, RELIEFS } from './reliefs.js';
import { RATES } from './rates.js';

// Setiap pelepasan jenis 'amount' menjadi satu folder resit.
// Dua folder tambahan dipetakan ke medan sedia ada: insurans hayat dan zakat.
export const RECEIPT_CATEGORIES = [
  ...RELIEFS.filter((r) => r.type === 'amount').map((r) => ({
    key: r.key,
    group: r.group,
    label: r.label,
    max: r.max,
    target: 'relief',
  })),
  { key: 'life', group: 'insurans', label: 'Insurans hayat / takaful', max: RATES.reliefs.lifeInsuranceMax, target: 'life' },
  { key: 'zakat', group: 'zakat', label: 'Zakat (rebat cukai)', max: null, target: 'zakat' },
];

export const RECEIPT_GROUPS = [...RELIEF_GROUPS, { key: 'zakat', label: 'Zakat', icon: 'leaf-outline' }];

export const categoryOf = (key) => RECEIPT_CATEGORIES.find((c) => c.key === key);
export const groupOf = (key) => RECEIPT_GROUPS.find((g) => g.key === key);

const round2 = (n) => Math.round(n * 100) / 100;

// 'DD/MM/YYYY' atau 'YYYY-MM-DD' → 'YYYY-MM-DD'; null jika tidak sah
export function parseDate(text) {
  const s = String(text || '').trim();
  let d, m, y;
  let mt = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (mt) [, d, m, y] = mt;
  else if ((mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [, y, m, d] = mt;
  else return null;
  const dt = new Date(Date.UTC(+y, +m - 1, +d));
  if (dt.getUTCFullYear() !== +y || dt.getUTCMonth() !== +m - 1 || dt.getUTCDate() !== +d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const toDisplayDate = (iso) => {
  const [y, m, d] = String(iso).split('-');
  return d && m && y ? `${d}/${m}/${y}` : '';
};

export const todayISO = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export const yearOf = (r) => Number(String(r.date).slice(0, 4));

// Semak resit sebelum disimpan
export function validateReceipt({ category, date, amount }) {
  const errors = {};
  if (!categoryOf(category)) errors.category = 'Pilih kategori';
  if (!parseDate(date)) errors.date = 'Tarikh tidak sah (HH/BB/TTTT)';
  const a = Number(String(amount).replace(/,/g, ''));
  if (!(a > 0)) errors.amount = 'Masukkan jumlah lebih daripada 0';
  return errors;
}

// Tahun yang ada resit, sentiasa termasuk tahun semasa, terbaru dahulu
export function receiptYears(receipts, current = new Date().getFullYear()) {
  const set = new Set([current, ...receipts.map(yearOf).filter(Boolean)]);
  return [...set].sort((a, b) => b - a);
}

// Jumlah ikut kategori bagi satu tahun
export function totalsByCategory(receipts, year) {
  const out = {};
  for (const r of receipts) {
    if (yearOf(r) !== year) continue;
    const o = (out[r.category] ||= { count: 0, total: 0 });
    o.count += 1;
    o.total = round2(o.total + (Number(r.amount) || 0));
  }
  return out;
}

// Ringkasan untuk folder dan PDF: jumlah resit, had, dan amaun yang boleh dituntut
export function folderSummary(receipts, year) {
  const totals = totalsByCategory(receipts, year);
  const rows = RECEIPT_CATEGORIES.map((c) => {
    const t = totals[c.key] || { count: 0, total: 0 };
    const claim = c.max == null ? t.total : Math.min(t.total, c.max);
    return { ...c, count: t.count, total: t.total, claim: round2(claim), over: c.max != null && t.total > c.max };
  });
  const used = rows.filter((r) => r.count > 0);
  return {
    rows,
    used,
    count: used.reduce((a, r) => a + r.count, 0),
    total: round2(used.reduce((a, r) => a + r.total, 0)),
    claim: round2(used.reduce((a, r) => a + r.claim, 0)),
  };
}

// Gabung resit ke dalam profil: kategori yang ada resit mengatasi nilai manual.
// Pulangkan input untuk annualTax dan peta `locked` untuk UI.
export function mergeReceiptInputs(profile, receipts, year) {
  const totals = totalsByCategory(receipts, year);
  const reliefs = { ...(profile.reliefs || {}) };
  let life = profile.life;
  let zakatPaid = profile.zakatPaid;
  const locked = {};
  for (const [key, t] of Object.entries(totals)) {
    const c = categoryOf(key);
    if (!c) continue;
    locked[key] = t;
    if (c.target === 'relief') reliefs[key] = String(t.total);
    else if (c.target === 'life') life = String(t.total);
    else if (c.target === 'zakat') zakatPaid = String(t.total);
  }
  return { reliefs, life, zakatPaid, locked };
}

export function sortReceipts(list) {
  return [...list].sort((a, b) => (a.date === b.date ? (b.createdAt || 0) - (a.createdAt || 0) : a.date < b.date ? 1 : -1));
}
