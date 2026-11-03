export const THEMES = {
  light: {
    bg: '#F2F5F3',
    card: '#FFFFFF',
    text: '#0E1A14',
    muted: '#5B6B62',
    line: '#E2E8E4',
    accent: '#0F6E56',
    accentText: '#FFFFFF',
    accentSoft: '#E1F5EE',
    hero: '#0B3D2E',
    heroText: '#ECF8F2',
    heroMuted: '#9FD4BE',
    heroTrack: 'rgba(255,255,255,0.14)',
    shadow: '#0B3D2E',
    goodBg: '#E3F6EC',
    goodFg: '#0B5A3C',
    warnBg: '#FDF0DC',
    warnFg: '#7A4A06',
  },
  dark: {
    bg: '#0A0F0D',
    card: '#131A17',
    text: '#E8EFEB',
    muted: '#93A39A',
    line: '#212B26',
    accent: '#3FBF8F',
    accentText: '#06140E',
    accentSoft: '#123528',
    hero: '#0F4A37',
    heroText: '#ECF8F2',
    heroMuted: '#9FD4BE',
    heroTrack: 'rgba(255,255,255,0.12)',
    shadow: '#000000',
    goodBg: '#123528',
    goodFg: '#9FE1CB',
    warnBg: '#3A2A10',
    warnFg: '#FAC775',
  },
};

// Warna kategori potongan (sama dalam mod cerah dan gelap)
export const SEG = {
  net: '#2BB673',
  epf: '#4C9AFF',
  perkeso: '#F2A93B',
  pcb: '#F0705A',
  other: '#9B8CFF',
};

export const rm = (n) =>
  'RM ' + (Number(n) || 0).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
// '2026-11-03' → '3 Nov 2026'
export const fmtDate = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return y && m && d ? `${d} ${BULAN[m - 1]} ${y}` : String(iso);
};

export const num = (s) => {
  const v = parseFloat(String(s).replace(/,/g, ''));
  return Number.isFinite(v) && v >= 0 ? v : 0;
};
