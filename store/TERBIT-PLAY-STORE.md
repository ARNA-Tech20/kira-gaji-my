# Senarai semak terbit ke Google Play: KIRA GAJI

Untuk sesiapa (atau ejen) yang menguruskan pelancaran. Kod sudah sedia; yang tinggal ialah binaan AAB dan tetapan Play Console.

## 1. Status

| Perkara | Status | Fail / lokasi |
|---|---|---|
| Kod v1.11.0 (gaji, cukai, resit, zakat, langganan) | Siap, CI lulus | `main` |
| APK ujian | Dibina automatik | Releases → `apk-terkini` (kunci debug, bukan untuk Play) |
| Ikon 512, grafik utama 1024×500, 3 tangkapan skrin | Siap | `store/` |
| Teks listing (tajuk, keterangan pendek dan penuh) | Siap | `store/listing.md` |
| Dasar privasi | Siap, belum hidup | `docs/privacy.html` → hidupkan GitHub Pages (main, /docs) → `https://arna-tech20.github.io/kira-gaji-my/privacy.html` |
| E-mel sokongan dalam dasar privasi | Tiada | ganti `[emel sokongan]` dalam `docs/privacy.html` dan `store/privacy.html` |
| ID AdMob sebenar | Tiada | `app.json` (androidAppId), `src/components/AdBanner.js` (PROD_BANNER_ID), `src/components/rewarded.js` (PROD_REWARDED_ID), `docs/` app-ads.txt jika perlu |
| AAB bertandatangan | Belum | lihat bahagian 2 |

## 2. Bina AAB

Pilih satu:

- **EAS:** tambah rahsia repo `EXPO_TOKEN`, kemudian tolak tag `v1.11.0`. `release.yml` membina AAB dan menghantar draf ke trek ujian tertutup (perlu kunci akaun perkhidmatan Google di EAS untuk hantar automatik).
- **GitHub Actions tanpa Expo:** jana kunci muat naik (`keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload -keystore upload.jks`), simpan sebagai rahsia (keystore base64, kata laluan store, alias, kata laluan kunci), kemudian buat aliran kerja `bundleRelease` berdasarkan `.github/workflows/apk.yml`. **Jangan sekali-kali commit fail .jks atau kata laluan.**

Play App Signing aktif secara lalai: Google menyimpan kunci tandatangan app; kunci muat naik boleh ditetapkan semula jika hilang.

## 3. Play Console

| Langkah | Nota |
|---|---|
| Cipta app | Nama `KIRA GAJI: KWSP PCB Zakat MY`, bahasa lalai Bahasa Melayu, Percuma, App |
| Akses app | Semua fungsi tersedia tanpa log masuk |
| Iklan | Ya, mengandungi iklan |
| Rating kandungan | Utiliti / produktiviti, tiada kandungan sensitif |
| Sasaran umur | 18 ke atas |
| Data safety | Tiada data dikumpul atau dikongsi oleh app (resit dan kiraan kekal dalam telefon). Isytihar ID peranti untuk iklan mengikut panduan AdMob. Pembelian diproses oleh Google Play |
| Kategori | Kewangan |
| Profil pembayaran | Wajib sebelum mencipta langganan |
| Langganan | Lihat README bahagian 12: `kiragaji_plus` dan `kiragaji_pro`, base plan `tahunan` dan `bulanan` |
| Ujian tertutup | Akaun peribadi baharu: sekurang-kurangnya 12 penguji selama 14 hari berturut-turut sebelum boleh mohon akses pengeluaran |
| License testing | Tambah e-mel penguji supaya boleh beli langganan tanpa dicaj |

## 4. Selepas terbit

- Pautkan app AdMob ke listing Play Store.
- Kemas kini butang Google Play di `docs/index.html` (sekarang `href="#"`).
- Semak kadar cukai setiap Jan, Mac, Jul, Okt (`src/calc/rates.js`).
