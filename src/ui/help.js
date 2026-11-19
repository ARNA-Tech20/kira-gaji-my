// Kandungan panduan "?" bagi setiap tab. Kemas kini bersama rates.js setiap tahun.
export const HELP = {
  gaji: {
    title: 'Cara guna: Gaji bersih',
    steps: [
      'Masukkan gaji kasar bulanan seperti dalam slip gaji (gaji pokok + elaun tetap).',
      'Pilih "60 tahun ke atas" jika berkenaan. KWSP pekerja jadi 0% dan tiada potongan PERKESO atau SIP.',
      'Matikan LINDUNG 24 Jam jika anda sudah memilih keluar (opt-out) melalui portal PERKESO.',
      'Bandingkan dengan slip gaji. Beza beberapa ringgit adalah normal kerana jadual rasmi berjalur.',
    ],
    notes: [
      'PCB sebenar dikira oleh majikan menggunakan kaedah berkomputer LHDN. Angka di sini anggaran.',
      'Bulan anda terima bonus atau tunggakan, PCB bulan itu akan lebih tinggi.',
      'PCB di bawah RM10 sebulan tidak perlu dipotong.',
    ],
  },
  resit: {
    title: 'Cara guna: Resit',
    steps: [
      'Tekan "Tambah resit", ambil gambar dengan kamera atau pilih dari galeri.',
      'Pilih kategori pelepasan, masukkan tarikh dan jumlah. Resit disimpan dalam folder kategori itu.',
      'Jumlah resit bagi tahun dipilih terus masuk ke tab Cukai dan menggantikan nilai yang ditaip sendiri.',
      'Tekan "PDF A4" untuk jana semua resit (atau satu folder) sebagai PDF, 4 resit setiap halaman, dengan ringkasan di halaman pertama.',
    ],
    notes: [
      'Gambar disimpan dalam telefon anda sahaja dan tidak dimuat naik. Jika app dipadam, resit juga hilang, jadi simpan PDF di Google Drive atau e-mel.',
      'Had pelepasan dikenakan automatik. Folder yang melebihi had ditanda.',
      'LHDN boleh meminta resit asal sehingga 7 tahun selepas tahun taksiran.',
    ],
  },
  cukai: {
    title: 'Cara guna: Cukai tahunan',
    steps: [
      'Isi pelepasan yang anda ada resit atau bukti sahaja.',
      'Masukkan zakat yang sudah dibayar. Ia ditolak terus daripada cukai (rebat), bukan daripada pendapatan.',
      'Masukkan jumlah PCB yang sudah dipotong tahun ini. Semak di Borang EA atau e-Data PCB dalam MyTax.',
      'App akan tunjuk sama ada anda dijangka dapat bayaran balik atau perlu bayar lagi.',
    ],
    notes: [
      'Majikan wajib beri Borang EA sebelum 28 Februari.',
      'e-Filing Borang BE dibuka sehingga 15 Mei. Lewat memfail boleh dikenakan penalti sehingga 45%.',
      'Simpan resit pelepasan sekurang-kurangnya 7 tahun.',
    ],
  },
  zakat: {
    title: 'Cara guna: Zakat pendapatan',
    steps: [
      'Pilih negeri anda. Bagi WP dan Selangor, nisab 2026 diisi automatik; negeri lain masukkan nilai daripada pusat zakat negeri.',
      'Kaedah kasar: 2.5% daripada pendapatan penuh. Lebih mudah dan biasanya lebih tinggi.',
      'Kaedah bersih: tambah tanggungan anda; had kifayah diri dan KWSP ditolak automatik. Kadar tolakan ialah kadar Selangor 2026.',
      'Bandingkan dua kad keputusan dan pilih kaedah yang anda amalkan. Kedua-dua kaedah sah.',
      'Tekan "Guna sebagai rebat cukai" untuk lihat kesannya pada cukai anda.',
    ],
    notes: [
      'Bayar sebelum 31 Disember untuk dapat rebat cukai bagi tahun tersebut.',
      'Ramai majikan menawarkan potongan zakat terus melalui gaji.',
      'Untuk kepastian hukum dan kaedah, rujuk pusat zakat negeri anda.',
    ],
  },
};
