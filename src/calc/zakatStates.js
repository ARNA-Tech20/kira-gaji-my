// Nisab zakat pendapatan setiap negeri. Hanya nilai yang disahkan untuk 2026 diisi;
// negeri lain `nisab: null` supaya pengguna masukkan nilai terkini dari pusat zakat negeri.
// Nisab berubah ikut harga emas (Selangor ditetapkan dua kali setahun). SEMAK setiap 6 bulan.
export const ZAKAT_STATES = [
  { key: 'wp', label: 'WP', name: 'Wilayah Persekutuan', nisab: 33996, period: '2026', body: 'PPZ-MAIWP', url: 'https://www.zakat.com.my' },
  { key: 'selangor', label: 'Selangor', name: 'Selangor', nisab: 38748, period: 'Jul–Dis 2026', body: 'Lembaga Zakat Selangor', url: 'https://www.zakatselangor.com.my' },
  { key: 'johor', label: 'Johor', name: 'Johor', nisab: null },
  { key: 'kedah', label: 'Kedah', name: 'Kedah', nisab: null },
  { key: 'kelantan', label: 'Kelantan', name: 'Kelantan', nisab: null },
  { key: 'melaka', label: 'Melaka', name: 'Melaka', nisab: null },
  { key: 'ns', label: 'N. Sembilan', name: 'Negeri Sembilan', nisab: null },
  { key: 'pahang', label: 'Pahang', name: 'Pahang', nisab: null },
  { key: 'penang', label: 'P. Pinang', name: 'Pulau Pinang', nisab: null },
  { key: 'perak', label: 'Perak', name: 'Perak', nisab: null },
  { key: 'perlis', label: 'Perlis', name: 'Perlis', nisab: null },
  { key: 'sabah', label: 'Sabah', name: 'Sabah', nisab: null },
  { key: 'sarawak', label: 'Sarawak', name: 'Sarawak', nisab: null },
  { key: 'terengganu', label: 'Terengganu', name: 'Terengganu', nisab: null },
];

// Had kifayah setahun bagi kaedah bersih, kadar Lembaga Zakat Selangor 2026.
// Negeri lain menggunakan kadar sendiri; app memaparkan amaran bila negeri lain dipilih.
export const HAD_KIFAYAH = {
  source: 'Lembaga Zakat Selangor 2026',
  self: 14580,
  items: [
    { key: 'adult', label: 'Tanggungan dewasa 18+', hint: 'Pasangan, ibu, bapa', amount: 4944 },
    { key: 'childIPT', label: 'Anak belajar di IPT', amount: 7356 },
    { key: 'child7', label: 'Anak 7–17 tahun', amount: 4896 },
    { key: 'child6', label: 'Anak 6 tahun ke bawah', amount: 2100 },
    { key: 'childOKU', label: 'Anak OKU', amount: 2964 },
    { key: 'childcare', label: 'Anak di taska / pusat asuhan', amount: 3960 },
    { key: 'chronic', label: 'Tanggungan pesakit kronik', amount: 2916 },
  ],
};
