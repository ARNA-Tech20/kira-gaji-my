// Ujian render UI. Jalankan dalam projek Expo:
//   npm i -D jest jest-expo @testing-library/react-native   (diuji dengan RTL 14, Expo SDK 58)
//   tambah "jest": { "preset": "jest-expo" } dalam package.json
//   npx jest tests/app.ui.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as SplashScreen from 'expo-splash-screen';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import App from '../App';
import { netSalary } from '../src/calc/payroll';
import { annualTax } from '../src/calc/tax';
import { rm } from '../src/ui/theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(() => Promise.resolve('file:///tmp/kad.png')) }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native-google-mobile-ads', () => ({
  BannerAd: () => require('react').createElement(require('react-native').Text, null, 'Iklan banner'),
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
  TestIds: { ADAPTIVE_BANNER: 'test-banner' },
}));

jest.mock('expo-image-picker', () => {
  const ok = () => Promise.resolve({ granted: true });
  const shot = () => Promise.resolve({ canceled: false, assets: [{ uri: 'file:///tmp/cam.jpg' }] });
  return { requestCameraPermissionsAsync: ok, requestMediaLibraryPermissionsAsync: ok, launchCameraAsync: shot, launchImageLibraryAsync: shot };
});
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize() {
        return this;
      },
      renderAsync: () => Promise.resolve({ saveAsync: () => Promise.resolve({ uri: 'file:///tmp/small.jpg' }) }),
    }),
  },
}));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  cacheDirectory: 'file:///cache/',
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  copyAsync: jest.fn(() => Promise.resolve()),
  moveAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('AAAA')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
}));
// Tier langganan dikawal oleh ujian melalui mockTier
let mockTier = 'free';
jest.mock('../src/billing/billing', () => ({
  billingAvailable: () => true,
  cachedTier: jest.fn(() => Promise.resolve(mockTier)),
  refreshTier: jest.fn(() => Promise.resolve(mockTier)),
  loadProducts: jest.fn(() => Promise.resolve({})),
  listenPurchases: () => () => {},
  subscribe: jest.fn(() => Promise.resolve()),
  currentSubscription: jest.fn(() => Promise.resolve(null)),
  manageSubscriptions: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('n1')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { MONTHLY: 'monthly' },
}));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn(() => Promise.resolve({ uri: 'file:///cache/print.pdf' })) }));

// Persekitaran Node tiada pemacu animasi natif: jadikan animasi selesai serta-merta.
// Ini hanya untuk ujian; di telefon animasi berjalan seperti biasa.
global.IS_REACT_ACT_ENVIRONMENT = true;
beforeAll(() => {
  const { Animated } = require('react-native');
  const instant = (value, config) => ({
    start: (cb) => {
      value.setValue(config.toValue);
      cb && cb({ finished: true });
    },
    stop: () => {},
    reset: () => {},
  });
  jest.spyOn(Animated, 'timing').mockImplementation(instant);
  jest.spyOn(Animated, 'spring').mockImplementation(instant);
});

const expectedNet = (gross, opts = {}) => {
  const tax = annualTax({ monthlyGross: gross, age60: !!opts.age60 });
  return netSalary({ gross, age60: !!opts.age60, includeSkbbk: opts.skbbk ?? true, pcb: tax.monthlyEstimate }).net;
};

async function renderApp() {
  await render(<App />);
  // tunggu profil dimuat dari storan
  await screen.findByText('Gaji bersih anggaran');
}

// biar pemasa simpan (debounce) dan notifikasi selesai supaya Jest boleh keluar bersih
afterAll(() => new Promise((r) => setTimeout(r, 2500)));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockTier = 'free';
});

describe('Splash screen', () => {
  test('splash natif disembunyikan selepas profil dimuat, lapisan animasi hilang', async () => {
    await render(<App />);
    await screen.findByText('Gaji bersih anggaran');
    await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByLabelText('KIRA GAJI sedang dibuka')).toBeNull(), { timeout: 2000 });
  });
});

describe('Tab Gaji', () => {
  test('memaparkan gaji bersih lalai yang betul', async () => {
    await renderApp();
    await waitFor(() => expect(screen.getByLabelText(rm(expectedNet(3500)))).toBeTruthy());
    expect(screen.getByText('Potongan bulanan')).toBeTruthy();
    expect(screen.getByText('Caruman majikan (bukan potongan anda)')).toBeTruthy();
  });

  test('mengemas kini bila gaji diubah', async () => {
    await renderApp();
    await fireEvent.changeText(screen.getByLabelText('Gaji kasar bulanan'), '5000');
    await waitFor(() => expect(screen.getByLabelText(rm(expectedNet(5000)))).toBeTruthy());
  });

  test('pilihan 60 tahun ke atas mengubah KWSP', async () => {
    await renderApp();
    await fireEvent.press(screen.getByText('60 tahun ke atas'));
    await waitFor(() => expect(screen.getByText('KWSP (0%)')).toBeTruthy());
    expect(screen.getByText('PERKESO majikan (1.25%)')).toBeTruthy();
    expect(screen.queryByText('SIP')).toBeNull();
  });

  test('LINDUNG 24 Jam boleh dimatikan', async () => {
    await renderApp();
    // muncul pada suis dan pada baris potongan
    expect(screen.getAllByText('LINDUNG 24 Jam')).toHaveLength(2);
    await fireEvent(screen.getByRole('switch'), 'valueChange', false);
    await waitFor(() => expect(screen.getByLabelText(rm(expectedNet(3500, { skbbk: false })))).toBeTruthy());
    // baris potongan hilang, hanya label suis tinggal
    expect(screen.getAllByText('LINDUNG 24 Jam')).toHaveLength(1);
  });

  test('butang kongsi membuka helaian kongsi', async () => {
    await renderApp();
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Kongsi sebagai gambar'));
    });
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/kad.png', expect.any(Object)));
  });

  test('profil disimpan ke storan', async () => {
    await renderApp();
    await fireEvent.changeText(screen.getByLabelText('Gaji kasar bulanan'), '4200');
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled(), { timeout: 2000 });
    const saved = JSON.parse(AsyncStorage.setItem.mock.calls.at(-1)[1]);
    expect(saved.gross).toBe('4200');
  });
});

describe('Tab Cukai', () => {
  test('susunan bahagian dan ringkasan', async () => {
    await renderApp();
    await fireEvent.press(screen.getByText('Cukai'));
    await screen.findByText('Cukai setahun anggaran');
    for (const h of ['PENDAPATAN', 'PELEPASAN', 'REBAT & PCB']) expect(screen.getByText(h)).toBeTruthy();
    expect(screen.getByText('Ringkasan pengiraan')).toBeTruthy();
  });

  test('PCB dipotong memaparkan bayaran balik', async () => {
    await renderApp();
    await fireEvent.press(screen.getByText('Cukai'));
    await fireEvent.changeText(await screen.findByLabelText('PCB sudah dipotong tahun ini (Borang EA / e-Data PCB)'), '500');
    await waitFor(() => expect(screen.getByText('Anggaran bayaran balik')).toBeTruthy());
  });

  test('katalog pelepasan mengurangkan cukai', async () => {
    await renderApp();
    await fireEvent.changeText(screen.getByLabelText('Gaji kasar bulanan'), '8000');
    await fireEvent.press(screen.getByText('Cukai'));
    const before = annualTax({ monthlyGross: 8000 }).taxPayable;
    await waitFor(() => expect(screen.getByLabelText(rm(before))).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Perubatan, dituntut RM 0.00'));
    await fireEvent.changeText(await screen.findByLabelText('Perubatan & penjagaan ibu bapa'), '8000');
    const after = annualTax({ monthlyGross: 8000, reliefInputs: { medicalParents: '8000' } }).taxPayable;
    await waitFor(() => expect(screen.getByLabelText(rm(after))).toBeTruthy());
    expect(screen.getByText(/^Jimat /)).toBeTruthy();
  });

  test('butiran pelepasan dalam ringkasan boleh dibuka', async () => {
    await renderApp();
    await fireEvent.press(screen.getByText('Cukai'));
    await fireEvent.press(await screen.findByText('Jumlah pelepasan ▾'));
    expect(screen.getByText('Jumlah pelepasan ▴')).toBeTruthy();
    expect(screen.getByText('Individu')).toBeTruthy();
  });

  test('panduan ? dibuka dan ditutup', async () => {
    await renderApp();
    await fireEvent.press(screen.getByText('Cukai'));
    await fireEvent.press(screen.getByLabelText('Panduan'));
    expect(await screen.findByText('Cara guna: Cukai tahunan')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Faham'));
    await waitFor(() => expect(screen.queryByText('Cara guna: Cukai tahunan')).toBeNull());
  });
});

describe('Teks yang jelas', () => {
  test('lencana tahun taksiran, petunjuk PERKESO dan PCB bawah RM10', async () => {
    await renderApp();
    expect(screen.getByText(new RegExp('Tahun taksiran ' + new Date().getFullYear()))).toBeTruthy();
    expect(screen.getByText('PERKESO, SIP, LINDUNG')).toBeTruthy();
    await fireEvent.press(screen.getByText('Cukai'));
    const tax = annualTax({ monthlyGross: 3500 });
    if (tax.taxPayable > 0 && tax.monthlyEstimate === 0) expect(await screen.findByText('PCB tidak dipotong (bawah RM10 sebulan)')).toBeTruthy();
  });

  test('zakat tanpa nisab meminta pilih negeri', async () => {
    await renderApp();
    await fireEvent.press(screen.getByText('Zakat'));
    expect(await screen.findByText('Pilih negeri atau isi nisab')).toBeTruthy();
  });
});

describe('Tab Zakat', () => {
  test('negeri WP mengisi nisab, kaedah bersih dan rebat ke tab Cukai', async () => {
    await renderApp();
    await fireEvent.changeText(screen.getByLabelText('Gaji kasar bulanan'), '6000');
    await fireEvent.press(screen.getByText('Zakat'));
    await fireEvent.press(await screen.findByLabelText('Wilayah Persekutuan'));
    await waitFor(() => expect(screen.getByLabelText('Nisab setahun').props.value).toBe('33996'));
    expect(screen.getByText(/PPZ-MAIWP/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Kaedah bersih'));
    expect(await screen.findByText('Had kifayah (tolakan)')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Kaedah kasar'));

    await fireEvent.press(screen.getByLabelText('Guna sebagai rebat cukai'));
    expect(await screen.findByText('Cukai setahun anggaran')).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText('Zakat dibayar setahun').props.value).toBe(String(72000 * 0.025)));
  });

  test('negeri tanpa nisab meminta pengguna isi sendiri', async () => {
    await renderApp();
    await fireEvent.press(screen.getByText('Zakat'));
    await fireEvent.press(await screen.findByLabelText('Negeri Sembilan'));
    expect(await screen.findByText(/Nisab Negeri Sembilan belum dimuatkan/)).toBeTruthy();
  });
});

describe('Tab Resit', () => {
  async function addLifestyleReceipt(amount) {
    await fireEvent.press(screen.getByLabelText('Tambah resit'));
    await fireEvent.press(await screen.findByLabelText('Ambil gambar'));
    await waitFor(() => expect(screen.getByLabelText('Pratonton resit')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Gaya hidup'));
    await fireEvent.changeText(screen.getByLabelText('Jumlah resit'), amount);
    await fireEvent.changeText(screen.getByLabelText('Catatan'), 'Telefon');
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Simpan resit'));
    });
    await waitFor(() => expect(screen.queryByText('Resit baharu')).toBeNull());
  }

  test('folder ikut kategori dipaparkan', async () => {
    await renderApp();
    await fireEvent.press(screen.getByText('Resit'));
    expect(await screen.findByText('Resit tahun ' + new Date().getFullYear())).toBeTruthy();
    // keadaan kosong: panduan ringkas, senarai penuh dilipat
    expect(screen.getByText('Belum ada resit untuk ' + new Date().getFullYear())).toBeTruthy();
    expect(screen.getByText('PDF boleh dijana selepas ada sekurang-kurangnya satu resit.')).toBeTruthy();
    expect(screen.queryByLabelText('Folder Gaya hidup, 0 resit, RM 0.00')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Semua kategori, 15'));
    expect(screen.getByLabelText('Folder Gaya hidup, 0 resit, RM 0.00')).toBeTruthy();
    expect(screen.getByLabelText('Folder Zakat (rebat cukai), 0 resit, RM 0.00')).toBeTruthy();
    expect(screen.queryByLabelText('Gaji kasar bulanan')).toBeNull();
  });

  test('borang menyemak kategori dan jumlah', async () => {
    await renderApp();
    await fireEvent.press(screen.getByText('Resit'));
    await fireEvent.press(await screen.findByLabelText('Tambah resit'));
    await fireEvent.press(await screen.findByLabelText('Simpan resit'));
    expect(await screen.findByText('Pilih kategori')).toBeTruthy();
    expect(screen.getByText('Masukkan jumlah lebih daripada 0')).toBeTruthy();
  });

  test('resit disimpan, gambar disalin ke folder kategori dan masuk kiraan cukai', async () => {
    await renderApp();
    await fireEvent.changeText(screen.getByLabelText('Gaji kasar bulanan'), '8000');
    await fireEvent.press(screen.getByText('Resit'));
    await addLifestyleReceipt('3000');

    expect(FileSystem.copyAsync).toHaveBeenCalledWith({ from: 'file:///tmp/small.jpg', to: expect.stringMatching(/^file:\/\/\/doc\/resit\/lifestyle\/.+\.jpg$/) });
    expect(await screen.findByLabelText('Folder Gaya hidup, 1 resit, RM 3,000.00')).toBeTruthy();
    expect(screen.getByText(/dikira automatik dalam tab Cukai/)).toBeTruthy();
    expect(screen.getByText('Melebihi had RM 2,500.00')).toBeTruthy();
    const stored = JSON.parse(await AsyncStorage.getItem('kiragaji.receipts.v1'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ category: 'lifestyle', amount: 3000, note: 'Telefon' });

    await fireEvent.press(screen.getByText('Cukai'));
    const expected = annualTax({ monthlyGross: 8000, reliefInputs: { lifestyle: '3000' } }).taxPayable;
    await waitFor(() => expect(screen.getByLabelText(rm(expected))).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Gaya hidup, dituntut RM 2,500.00'));
    expect(await screen.findByText('Dari 1 resit')).toBeTruthy();
  });

  test('PDF A4 dijana dan dikongsi', async () => {
    await renderApp();
    await fireEvent.press(screen.getByText('Resit'));
    await addLifestyleReceipt('120');
    await fireEvent.press(screen.getByLabelText('Jana PDF semua resit'));
    // pengguna percuma: tonton iklan untuk 1 PDF (iklan tiada dalam ujian, jadi PDF dibuka terus)
    expect(await screen.findByText('Pengguna percuma boleh jana 1 PDF setahun selepas menonton iklan.')).toBeTruthy();
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Tonton iklan untuk 1 PDF'));
    });
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
    const rewards = JSON.parse(await AsyncStorage.getItem('kiragaji.pdfreward.v1'));
    expect(rewards[new Date().getFullYear()]).toBe(1);
    const opts = Print.printToFileAsync.mock.calls[0][0];
    expect(opts).toMatchObject({ width: 595, height: 842 });
    expect(opts.html).toContain('Gaya hidup');
    expect(opts.html).toContain('data:image/jpeg;base64,AAAA');
    expect(Sharing.shareAsync.mock.calls[0][0]).toMatch(/Resit-\d{4}-semua\.pdf$/);
    expect(Sharing.shareAsync.mock.calls[0][1]).toMatchObject({ mimeType: 'application/pdf' });
  });

  test('resit boleh dipadam dari folder', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => buttons.find((b) => b.style === 'destructive').onPress());
    await renderApp();
    await fireEvent.press(screen.getByText('Resit'));
    await addLifestyleReceipt('50');
    await fireEvent.press(await screen.findByLabelText('Folder Gaya hidup, 1 resit, RM 50.00'));
    await act(async () => {
      await fireEvent.press(await screen.findByLabelText('Padam resit RM 50.00'));
    });
    await waitFor(() => expect(FileSystem.deleteAsync).toHaveBeenCalled());
    expect(await screen.findByText(/Belum ada resit/)).toBeTruthy();
  });
});

describe('Langganan', () => {
  const Y = new Date().getFullYear();
  const seed = (n, key = 'kiragaji.receipts.v1') =>
    AsyncStorage.setItem(
      key,
      JSON.stringify(Array.from({ length: n }, (_, i) => ({ id: 'r' + i, category: 'lifestyle', date: `${Y}-01-${String((i % 28) + 1).padStart(2, '0')}`, amount: 10, note: '', uri: null, createdAt: i }))),
    );

  test('percuma: iklan dipaparkan, resit ke-11 membuka skrin langganan', async () => {
    await seed(10);
    await renderApp();
    expect(screen.getByText('Iklan banner')).toBeTruthy();
    await fireEvent.press(screen.getByText('Resit'));
    expect(await screen.findByText('Had 10 resit percuma tahun ini sudah penuh.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Tambah resit'));
    expect(await screen.findByText('Had 10 resit percuma bagi tahun ini sudah penuh.')).toBeTruthy();
    expect(screen.getByLabelText(/Pelan Pro, RM39.90 setahun/)).toBeTruthy();
    expect(screen.queryByText('Resit baharu')).toBeNull();
  });

  test('skrin langganan: tukar bulanan dan langgan Plus', async () => {
    const billing = require('../src/billing/billing');
    await renderApp();
    await fireEvent.press(screen.getByLabelText('Langganan'));
    await fireEvent.press(await screen.findByLabelText('Bulanan'));
    await fireEvent.press(screen.getByLabelText('Pelan Plus, RM2.90 sebulan'));
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Langgan Plus'));
    });
    expect(billing.subscribe).toHaveBeenCalledWith('kiragaji_plus', null, null);
  });

  test('Plus: tiada iklan dan tiada had resit', async () => {
    mockTier = 'plus';
    await seed(10);
    await renderApp();
    await waitFor(() => expect(screen.queryByText('Iklan banner')).toBeNull());
    expect(screen.getByLabelText('Langganan Plus')).toBeTruthy();
    await fireEvent.press(screen.getByText('Resit'));
    await fireEvent.press(await screen.findByLabelText('Tambah resit'));
    expect(await screen.findByText('Resit baharu')).toBeTruthy();
  });

  test('Excel dikunci untuk Plus', async () => {
    mockTier = 'plus';
    await seed(2);
    await renderApp();
    await fireEvent.press(screen.getByText('Resit'));
    await fireEvent.press(await screen.findByLabelText('Eksport Excel'));
    expect(await screen.findByText('Eksport Excel tersedia dalam Pro.')).toBeTruthy();
  });

  test('Excel dijana untuk Pro', async () => {
    mockTier = 'pro';
    await seed(2);
    await renderApp();
    await fireEvent.press(screen.getByText('Resit'));
    await act(async () => {
      await fireEvent.press(await screen.findByLabelText('Eksport Excel'));
    });
    await waitFor(() => expect(FileSystem.writeAsStringAsync).toHaveBeenCalled());
    const [uri, b64, opts] = FileSystem.writeAsStringAsync.mock.calls[0];
    expect(uri).toMatch(/Resit-\d{4}-saya\.xlsx$/);
    expect(b64.startsWith('UEsD')).toBe(true); // tandatangan zip "PK"
    expect(opts).toEqual({ encoding: 'base64' });
    expect(Sharing.shareAsync.mock.calls[0][1].mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });

  test('Pro: profil Pasangan ada kiraan dan resit sendiri', async () => {
    mockTier = 'pro';
    await seed(3);
    await renderApp();
    await fireEvent.changeText(screen.getByLabelText('Gaji kasar bulanan'), '9000');
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Tambah profil pasangan'));
    });
    expect(await screen.findByLabelText('Profil Pasangan')).toBeTruthy();
    // profil baharu bermula dengan nilai asal
    await waitFor(() => expect(screen.getByLabelText('Gaji kasar bulanan').props.value).toBe('3500'));
    await fireEvent.press(screen.getByText('Resit'));
    expect(await screen.findByText('Belum ada resit untuk ' + Y)).toBeTruthy();
    // kembali ke profil Saya: 3 resit masih ada
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Profil Saya'));
    });
    await fireEvent.press(screen.getByText('Resit'));
    expect(await screen.findByText('3 resit')).toBeTruthy();
    const saved = JSON.parse(await AsyncStorage.getItem('kiragaji.profiles.v1'));
    expect(saved.list.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  test('percuma: profil pasangan tidak dipaparkan', async () => {
    await renderApp();
    expect(screen.queryByLabelText('Tambah profil pasangan')).toBeNull();
  });

  test('peringatan bulanan: dikunci untuk percuma', async () => {
    await renderApp();
    await fireEvent.press(screen.getByText('Resit'));
    expect(await screen.findByText('Tersedia dalam Plus dan Pro')).toBeTruthy();
  });

  test('peringatan bulanan: dihidupkan untuk Plus', async () => {
    mockTier = 'plus';
    const N = require('expo-notifications');
    await renderApp();
    await fireEvent.press(screen.getByText('Resit'));
    const sw = await screen.findByRole('switch');
    await act(async () => {
      await fireEvent(sw, 'valueChange', true);
    });
    await waitFor(() => expect(N.scheduleNotificationAsync).toHaveBeenCalled());
    expect(N.scheduleNotificationAsync.mock.calls[0][0].trigger).toMatchObject({ type: 'monthly', day: 1 });
  });
});
