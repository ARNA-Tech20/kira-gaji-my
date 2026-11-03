// Kadar rasmi yang digunakan oleh enjin kiraan.
// SEMAK SEMULA setiap tahun (Bajet, Jan KWSP/PERKESO, Mac LHDN) dan kemas kini `lastVerified`.

export const RATES = {
  version: '2026.11',
  lastVerified: '2026-11-03',
  taxYearLabel: 'TT2025 / TT2026',

  // Kadar cukai pemastautin: [had atas pendapatan bercukai, kadar]
  taxBands: [
    [5000, 0],
    [20000, 0.01],
    [35000, 0.03],
    [50000, 0.06],
    [70000, 0.11],
    [100000, 0.19],
    [400000, 0.25],
    [600000, 0.26],
    [2000000, 0.28],
    [Infinity, 0.3],
  ],

  // Rebat individu jika pendapatan bercukai <= RM35,000
  rebate: { amount: 400, chargeableLimit: 35000 },

  reliefs: {
    individual: 9000,
    spouseNoIncome: 4000,
    childUnder18: 2000,
    epfMax: 4000, // sub-had KWSP dalam had gabungan RM7,000
    epfLifeCombinedMax: 7000,
    lifeInsuranceMax: 3000, // sub-had insurans hayat/takaful dalam had gabungan RM7,000
    socsoEisMax: 350,
  },

  epf: {
    employee: 0.11,
    employerLow: 0.13,
    employerHigh: 0.12,
    employerThreshold: 5000,
    // Pekerja 60 tahun ke atas (warganegara)
    employee60: 0,
    employer60: 0.04,
  },

  perkeso: {
    ceiling: 6000,
    socsoEmployee: 0.005, // Akta 4, kategori pertama (bawah 60)
    eisEmployee: 0.002, // Akta 800 (SIP)
    // 60 tahun ke atas: PERKESO kategori kedua (majikan sahaja 1.25%), SIP tidak terpakai
    employer60Socso: 0.0125,
    skbbkEmployee: 0.0075, // LINDUNG 24 Jam Fasa 1 (1 Jun 2026 - 31 Mei 2028), sukarela bagi warganegara
  },

  zakat: { rate: 0.025 },

  // PCB bawah RM10 sebulan tidak perlu dipotong (spesifikasi PCB LHDN)
  pcbMinimum: 10,

  sources: [
    { label: 'LHDN - Kadar cukai pendapatan individu', url: 'https://www.hasil.gov.my' },
    { label: 'KWSP - Kadar caruman', url: 'https://www.kwsp.gov.my' },
    { label: 'PERKESO - Jadual caruman Akta 4, Akta 800, LINDUNG 24 Jam', url: 'https://www.perkeso.gov.my' },
  ],
};
