import { RATES } from './rates.js';
import { HAD_KIFAYAH } from './zakatStates.js';

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Zakat pendapatan (anggaran umum).
 * Kaedah dan nilai nisab berbeza mengikut negeri; pengguna perlu masukkan
 * nisab semasa daripada pusat zakat negeri masing-masing.
 *
 * @param {object} p
 * @param {number} p.annualIncome pendapatan setahun
 * @param {number} p.nisab nilai nisab setahun (dari pusat zakat negeri)
 * @param {'kasar'|'bersih'} [p.method='kasar']
 * @param {number} [p.allowableDeductions=0] tolakan dibenarkan (kaedah bersih)
 */
export function zakatPendapatan({ annualIncome, nisab, method = 'kasar', allowableDeductions = 0 }) {
  const income = Number(annualIncome) || 0;
  const n = Number(nisab) || 0;
  const base = method === 'bersih' ? Math.max(0, income - (Number(allowableDeductions) || 0)) : income;
  const eligible = n > 0 && base >= n;
  const annual = eligible ? round2(base * RATES.zakat.rate) : 0;
  return {
    method,
    base: round2(base),
    nisab: n,
    eligible,
    annual,
    monthly: round2(annual / 12),
  };
}

// Jumlah tolakan kaedah bersih: had kifayah diri + tanggungan + caruman KWSP setahun
export function hadKifayah(counts = {}, epfAnnual = 0) {
  const lines = [{ key: 'self', label: 'Diri sendiri', amount: HAD_KIFAYAH.self, count: 1 }];
  for (const it of HAD_KIFAYAH.items) {
    const c = Math.max(0, Math.floor(Number(counts[it.key]) || 0));
    if (c > 0) lines.push({ key: it.key, label: it.label, amount: it.amount * c, count: c });
  }
  const epf = Math.max(0, Number(epfAnnual) || 0);
  if (epf > 0) lines.push({ key: 'epf', label: 'Caruman KWSP', amount: epf, count: 1 });
  return { lines, total: round2(lines.reduce((a, b) => a + b.amount, 0)) };
}

// Kira kedua-dua kaedah sekali supaya pengguna boleh banding
export function zakatCompare({ annualIncome, nisab, counts = {}, epfAnnual = 0 }) {
  const deductions = hadKifayah(counts, epfAnnual);
  const kasar = zakatPendapatan({ annualIncome, nisab, method: 'kasar' });
  const bersih = zakatPendapatan({ annualIncome, nisab, method: 'bersih', allowableDeductions: deductions.total });
  return { kasar, bersih, deductions, diff: round2(kasar.annual - bersih.annual) };
}
