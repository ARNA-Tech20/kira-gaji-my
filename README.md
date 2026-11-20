# Kira Gaji MY

Kalkulator gaji bersih, cukai pendapatan dan zakat pendapatan untuk pekerja Malaysia. Offline, tanpa daftar akaun, BM.

## 1. Cara jalankan

```bash
git clone https://github.com/ARNA-Tech20/kira-gaji-my.git
cd kira-gaji-my
npm install
npx expo start
```

### v1.1: pakej tambahan

```bash
npx expo install @react-native-async-storage/async-storage react-native-view-shot expo-sharing react-native-safe-area-context expo-asset expo-font expo-splash-screen expo-system-ui react-native-google-mobile-ads expo-dev-client expo-image-picker expo-file-system expo-print expo-image-manipulator
# salin app.json dari pakej ini (atau gabungkan bahagian "plugins")
npx expo run:android   # AdMob perlukan development build; Expo Go akan sembunyikan iklan
```

- Profil (gaji, pelepasan, nisab) disimpan automatik dalam telefon.
- Butang "Kongsi sebagai gambar" menangkap kad gaji bersih dan buka WhatsApp/Telegram.
- Iklan guna **ID ujian Google** dalam mod dev. Sebelum terbit, ganti `PROD_BANNER_ID` dalam `src/components/AdBanner.js` dan `androidAppId` dalam `app.json` dengan ID AdMob anda sendiri.

Uji enjin kiraan (tanpa telefon):

```bash
node --test tests/calc.test.mjs
```

## 2. Struktur

| Fail | Fungsi |
|---|---|
| `src/calc/rates.js` | Semua kadar rasmi + tarikh semakan. **Satu-satunya fail yang perlu dikemas kini setiap tahun.** |
| `src/calc/payroll.js` | KWSP, PERKESO, SIP, LINDUNG 24 Jam, gaji bersih |
| `src/calc/tax.js` | Pelepasan, pendapatan bercukai, cukai progresif, rebat RM400, rebat zakat |
| `src/calc/zakat.js` | Zakat pendapatan (kaedah kasar/bersih, nisab dimasukkan pengguna) |
| `src/calc/receipts.js` | Folder resit ikut kategori, jumlah ikut tahun, had, gabung ke kiraan cukai |
| `src/receiptStore.js` | Simpan resit: metadata AsyncStorage, gambar `documentDirectory/resit/<kategori>/` |
| `src/pdf/receiptsHtml.js` · `receiptsPdf.js` | HTML A4 (ringkasan + 4 resit/halaman) → expo-print → kongsi |
| `src/ui/ReceiptsTab.js` | Tab Resit: folder, senarai, borang tambah, pemapar gambar |
| `App.js` | 4 tab: Gaji, Cukai, Resit, Zakat. Mod gelap automatik |
| `tests/calc.test.mjs` | 7 ujian berbanding jadual rasmi |

## 3. Kadar yang digunakan (disemak 3 Nov 2026)

| Item | Kadar |
|---|---|
| KWSP pekerja | 11% |
| KWSP majikan | 13% (gaji ≤ RM5,000), 12% (> RM5,000) |
| PERKESO pekerja | 0.5%, siling RM6,000 (maks RM29.75) |
| SIP pekerja | 0.2%, siling RM6,000 (maks RM11.90) |
| LINDUNG 24 Jam | 0.75% Fasa 1 hingga 31 Mei 2028, sukarela bagi warganegara (maks RM44.65) |
| Cukai | 0% hingga 30%, 10 jalur, rebat RM400 jika pendapatan bercukai ≤ RM35,000 |
| Pelepasan asas | Individu RM9,000, pasangan RM4,000, anak < 18 RM2,000, KWSP RM4,000, KWSP + insurans RM7,000, PERKESO + SIP RM350 |

## 4. Had yang diketahui (nyatakan dalam app & listing)

- PCB ialah **anggaran** (cukai tahunan ÷ 12). PCB sebenar majikan guna Kaedah Pengiraan Berkomputer LHDN.
- KWSP dibundar naik ke ringgit; jadual rasmi berjalur, beza mungkin RM1.
- Jalur PERKESO gaji sangat rendah (< RM100) mungkin berbeza sedikit daripada jadual.
- Zakat: nisab dan tolakan berbeza ikut negeri; pengguna masukkan nisab sendiri.
- Hanya pemastautin, warganegara bawah 60 tahun.

## 5. MVP vs fasa seterusnya

| Fasa | Ciri | Monetisasi |
|---|---|---|
| **MVP (sekarang)** | Gaji bersih, cukai tahunan, zakat, mod gelap, offline | Tiada (kumpul ulasan dahulu) |
| v1.1 | Simpan profil (AsyncStorage), kongsi keputusan sebagai gambar | Iklan banner di bawah (AdMob) |
| v1.2 | Senarai semak pelepasan LHDN penuh + simpan resit | **Pro sekali bayar RM9.90**: tiada iklan, resit tanpa had, eksport PDF |
| v1.3 | Nisab automatik 14 negeri, perbandingan tawaran kerja | Pro |
| v2 | Kadar pekerja 60+, bukan warganegara, PR | Pro |

## 6. Draf listing Play Store (ASO)

- **Tajuk (30 aksara):** `Kira Gaji: KWSP PCB Zakat MY`
- **Keterangan pendek (80):** `Kira gaji bersih, KWSP, PERKESO, PCB & zakat pendapatan. Offline, percuma, BM.`
- **Tangkapan skrin 1–3:** hasil gaji bersih besar, pecahan cukai, zakat. Teks atas setiap skrin dalam BM.
- **Penafian dalam keterangan:** "Aplikasi bebas. Tidak berkaitan dengan LHDN, KWSP atau PERKESO. Anggaran sahaja."

## 7. Senarai semak tahunan

| Bila | Semak |
|---|---|
| Okt (Bajet) | Jalur cukai, pelepasan baharu |
| Jan | Kadar KWSP, siling PERKESO/SIP |
| Mac | Senarai pelepasan rasmi LHDN untuk TT lepas |
| 1 Jun 2028 | LINDUNG 24 Jam naik ke 1.00% |

## 8. Ujian (disahkan dengan Expo SDK 58, RN 0.88)

| Ujian | Arahan | Keputusan terakhir |
|---|---|---|
| Logik kiraan + resit + PDF | `npm run test:logic` | 21/21 lulus |
| ESLint (eslint-config-expo) | `npx eslint App.js src` | 0 ralat, 0 amaran |
| Bundle Android | `npx expo export --platform android` | Berjaya |
| Render UI (jest-expo + RTL 14) | `npx jest tests/app.ui.test.js` | 19/19 lulus |
| Prebuild Android (ikon, splash, AdMob) | `npx expo prebuild --platform android --no-install` | Berjaya, tiada amaran |

Untuk ujian UI: `npm i -D jest jest-expo @testing-library/react-native` dan tambah `"jest": { "preset": "jest-expo" }` dalam package.json.

## 9. Ikon dan splash

| Fail | Kegunaan |
|---|---|
| `assets/icon.png` | Ikon utama 1024×1024 |
| `assets/android-icon-foreground.png` / `-background.png` | Ikon adaptif Android |
| `assets/android-icon-monochrome.png` | Ikon bertema Android 13+ |
| `assets/splash-icon.png` | Logo splash (latar `#0B3D2E`, lebar 180dp) |
| `store/icon-512.png` | Ikon Play Console |

Splash natif ditahan sehingga profil dimuat, kemudian `src/ui/Splash.js` memaparkan nama app sekejap dan pudar ke dalam app (~0.9 saat). Untuk tukar logo, ganti fail di atas dan kekalkan saiz yang sama.

## 10. Automasi

| Komponen | Bila berjalan | Apa dibuat |
|---|---|---|
| `.github/workflows/ci.yml` | Setiap push ke `main` dan pull request | Ujian logik, ESLint, ujian UI, bundle Android |
| `.github/workflows/release.yml` | Bila tag `v*` ditolak (cth. `v1.9.0`) | Ujian, semak tag = `app.json`, EAS build AAB, hantar draf ke ujian tertutup |

Persediaan sekali sahaja untuk `release.yml`:
1. Cipta token di expo.dev → Account settings → Access tokens, simpan sebagai rahsia repo `EXPO_TOKEN`.
2. Cipta akaun perkhidmatan Google dengan akses Play Console, muat naik kuncinya: `eas credentials` → Android → Google Service Account.
3. Keluaran pertama tetap dimuat naik secara manual di Play Console.

## 11. Resit (v1.10)

| Ciri | Cara |
|---|---|
| Tambah | Kamera atau galeri → kategori → tarikh → jumlah → catatan. Gambar dikecilkan ke 1200px JPEG |
| Folder | 13 pelepasan jenis amaun + insurans hayat + zakat. Bar kemajuan berbanding had |
| Kiraan cukai | Jumlah resit tahun dipilih mengatasi nilai manual; medan jadi "Dari N resit" (tekan untuk buka folder) |
| PDF | A4, halaman 1 ringkasan (resit, jumlah, had, dituntut), kemudian 4 resit/halaman ikut kategori. Semua atau satu folder |
| Privasi | Gambar dalam storan peribadi app sahaja. Kebenaran kamera/galeri diminta bila ditekan. Mikrofon disekat |

Had diketahui: resit hilang jika app dinyahpasang (pengguna dinasihatkan simpan PDF). Belum ada sandaran awan atau OCR.
