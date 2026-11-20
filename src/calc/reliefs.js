// Katalog pelepasan cukai individu pemastautin TT2025.
// Sumber: hasil.gov.my/individu/pelepasan-cukai (disemak 2026-11-03).
// Pelepasan individu, pasangan, anak bawah 18, KWSP, insurans hayat dan
// PERKESO/SIP dikira berasingan dalam tax.js kerana ia automatik atau ada medan sendiri.
//
// type:
//   'amount': pengguna masukkan RM, dihadkan kepada `max`
//   'count':  pengguna masukkan bilangan, didarab `perUnit`
//   'flag':   ya/tidak, tuntutan tetap `max`

export const RELIEF_GROUPS = [
  { key: 'keluarga', label: 'Keluarga & anak', icon: 'people-outline' },
  { key: 'perubatan', label: 'Perubatan', icon: 'medkit-outline' },
  { key: 'gayahidup', label: 'Gaya hidup', icon: 'phone-portrait-outline' },
  { key: 'pendidikan', label: 'Pendidikan & simpanan', icon: 'school-outline' },
  { key: 'insurans', label: 'Insurans & persaraan', icon: 'umbrella-outline' },
  { key: 'oku', label: 'OKU', icon: 'accessibility-outline' },
  { key: 'rumah', label: 'Rumah & hijau', icon: 'home-outline' },
];

export const RELIEFS = [
  // Keluarga & anak
  { key: 'childPreU', group: 'keluarga', type: 'count', perUnit: 2000, label: 'Anak 18+ (pra-universiti)', hint: 'RM2,000 seorang · belum berkahwin, belajar sepenuh masa' },
  { key: 'childHigher', group: 'keluarga', type: 'count', perUnit: 8000, label: 'Anak 18+ (diploma ke atas)', hint: 'RM8,000 seorang · diploma ke atas di Malaysia atau ijazah di luar negara' },
  { key: 'childcare', group: 'keluarga', type: 'amount', max: 3000, label: 'Yuran taska / tadika', hint: 'Had RM3,000 · anak 6 tahun ke bawah, pusat berdaftar' },
  { key: 'breastfeeding', group: 'keluarga', type: 'amount', max: 1000, label: 'Peralatan penyusuan ibu', hint: 'Had RM1,000 · anak 2 tahun ke bawah, sekali setiap 2 tahun' },

  // Perubatan
  { key: 'medicalSelf', group: 'perubatan', type: 'amount', max: 10000, label: 'Perubatan diri, pasangan, anak', hint: 'Had RM10,000 · penyakit serius, kesuburan, vaksin, gigi, pemeriksaan, kesihatan mental' },
  { key: 'medicalParents', group: 'perubatan', type: 'amount', max: 8000, label: 'Perubatan & penjagaan ibu bapa', hint: 'Had RM8,000 · termasuk pemeriksaan penuh dan vaksin (sub-had RM1,000)' },

  // Gaya hidup
  { key: 'lifestyle', group: 'gayahidup', type: 'amount', max: 2500, label: 'Gaya hidup', hint: 'Had RM2,500 · buku, telefon, komputer, internet, kursus kemahiran' },
  { key: 'sports', group: 'gayahidup', type: 'amount', max: 1000, label: 'Sukan', hint: 'Had RM1,000 · peralatan, sewa fasiliti, yuran pertandingan, gim' },

  // Pendidikan & simpanan
  { key: 'education', group: 'pendidikan', type: 'amount', max: 7000, label: 'Yuran pendidikan diri', hint: 'Had RM7,000 · termasuk kursus peningkatan kemahiran (sub-had RM2,000)' },
  { key: 'sspn', group: 'pendidikan', type: 'amount', max: 8000, label: 'SSPN (simpanan bersih)', hint: 'Had RM8,000 · simpanan tahun ini tolak pengeluaran tahun ini' },

  // Insurans & persaraan
  { key: 'eduMedInsurance', group: 'insurans', type: 'amount', max: 4000, label: 'Insurans pendidikan & perubatan', hint: 'Had RM4,000 · premium diri, pasangan atau anak' },
  { key: 'prs', group: 'insurans', type: 'amount', max: 3000, label: 'PRS / anuiti tertangguh', hint: 'Had RM3,000' },

  // OKU
  { key: 'okuSelf', group: 'oku', type: 'flag', max: 7000, label: 'Individu OKU', hint: 'RM7,000 · berdaftar dengan JKM' },
  { key: 'okuSpouse', group: 'oku', type: 'flag', max: 6000, label: 'Pasangan OKU', hint: 'RM6,000 · tambahan kepada pelepasan pasangan' },
  { key: 'okuChild', group: 'oku', type: 'count', perUnit: 8000, label: 'Anak OKU belum berkahwin', hint: 'RM8,000 seorang' },
  { key: 'okuChildHigher', group: 'oku', type: 'count', perUnit: 8000, label: 'Anak OKU 18+ di pengajian tinggi', hint: 'Tambahan RM8,000 seorang' },
  { key: 'okuEquipment', group: 'oku', type: 'amount', max: 6000, label: 'Peralatan sokongan OKU', hint: 'Had RM6,000 · kerusi roda, alat bantu dengar, mesin dialisis' },

  // Rumah & hijau
  { key: 'homeLoan', group: 'rumah', type: 'amount', max: 7000, label: 'Faedah pinjaman rumah pertama', hint: 'Had RM7,000 (rumah ≤ RM500k) atau RM5,000 (RM500k–750k) · S&P 2025–2027' },
  { key: 'evCompost', group: 'rumah', type: 'amount', max: 2500, label: 'Pengecas EV / mesin kompos', hint: 'Had RM2,500 · kegunaan bukan perniagaan' },
];

// Kira tuntutan bagi setiap item mengikut jenisnya.
export function claimFor(item, raw) {
  if (item.type === 'flag') return raw ? item.max : 0;
  const v = Math.max(0, Number(raw) || 0);
  if (item.type === 'count') return Math.floor(v) * item.perUnit;
  return Math.min(v, item.max);
}

export function catalogClaims(inputs = {}) {
  const items = RELIEFS.map((r) => ({ key: r.key, group: r.group, label: r.label, claim: claimFor(r, inputs[r.key]) }));
  const byGroup = {};
  for (const it of items) byGroup[it.group] = (byGroup[it.group] || 0) + it.claim;
  const total = items.reduce((a, b) => a + b.claim, 0);
  return { items, byGroup, total };
}
