#  Panduan Menampilkan Mockup Apotek Bima Farma di Figma

Semua mockup telah dibuat **100% otentik persis seperti kode asli proyek** Anda:
- **Mobile (Android)**: Replikasi dari source code Jetpack Compose (`SplashScreen.kt`, `LoginScreen.kt`, `DashboardScreen.kt`, `PosKasirScreen.kt`, `StrukDialog.kt`).
- **Web Desktop**: Replikasi dari source code React JSX & CSS (`Landing.jsx`, `Toko.jsx`, `Kasir.jsx`, `Dashboard.jsx`).

Semua file gagal dan generator lama sudah dibersihkan total agar tidak memenuhi penyimpanan proyek Anda.

---

##  File Mockup Bersih yang Tersedia:

1. **`MOCKUP_MASTER_PRESENTASI.html`** (Sangat Direkomendasikan)
   - Berisi **LENGKAP** kedua aplikasi (5 layar Mobile iPhone 15 Pro + 4 layar Web MacBook Pro).
   - Dilengkapi kartu judul resmi, informasi proyek, dan palet warna token desain (*Design System*).
   - Sangat cocok untuk presentasi penilaian dosen/guru.

2. **`MOCKUP_MOBILE_APP.html`**
   - Khusus 5 layar aplikasi Mobile Android kasir (Bingkai iPhone 15 Pro, 390 × 844 px).

3. **`MOCKUP_WEB_DESKTOP.html`**
   - Khusus 4 layar aplikasi Web Desktop apotek (Bingkai MacBook Pro, 1200 × 750 px).

---

##  Cara Import ke Figma (Dalam 1 Menit):

### Cara A: Menggunakan Plugin `html.to.design` (Paling Rapi & Siap Edit)
1. Buka Figma di browser atau aplikasi Figma Desktop Anda.
2. Buat dokumen/file baru di Figma.
3. Klik kanan di kanvas Figma $\rightarrow$ **Plugins** $\rightarrow$ cari **"html.to.design"** dan jalankan.
4. Pilih tab **"Upload file"** atau **"HTML"**.
5. Drag & Drop file **`MOCKUP_MASTER_PRESENTASI.html`** (atau `MOCKUP_MOBILE_APP.html` / `MOCKUP_WEB_DESKTOP.html`) ke dalam kotak plugin.
6. Klik tombol **Import**.
7.  Semua frame device, teks, icon, dan warna akan langsung terkonversi menjadi frame dan layer Figma asli yang bisa diedit dan dipresentasikan!

### Cara B: Copy Langsung dari Browser
1. Buka file `MOCKUP_MASTER_PRESENTASI.html` di Google Chrome (cukup klik ganda file tersebut).
2. Jika plugin ekstensi Chrome `html.to.design` terpasang, klik icon ekstensi di pojok kanan atas Chrome $\rightarrow$ pilih **"Full page"** $\rightarrow$ kirim ke Figma.

---

##  Rincian Layar yang Ditampilkan:

### 1. Aplikasi Mobile Android (Jetpack Compose)
- **Layar 1 (Splash Screen)**: Background medis bersih `#FCFBFE`, elevasi box 92dp dengan logo 4-batang palang hijau-ungu resmi, teks Apotek Bima Farma, loading natural (tanpa navbar bawah, sesuai kode asli).
- **Layar 2 (Login Kasir)**: Input nama pengguna, sandi bersembunyi dengan toggle mata, tombol ungu "Masuk Kasir".
- **Layar 3 (Dashboard Kasir)**: Greeting dinamis "Selamat siang, Siti Rahma", lonceng notifikasi dengan titik merah, 4 kartu KPI 2x2, transaksi terbaru, dan stok menipis.
- **Layar 4 (Kasir POS)**: Pilihan tab pelanggan (multi-transaksi), pencarian obat dengan icon barcode, daftar keranjang obat dengan pengubah quantity (+/-), dan floating sticky total bayar.
- **Layar 5 (Struk Digital)**: Dialog struk termal transparan dengan header apotek, rincian obat, total harga, kembalian tunai, tombol cetak dan bagikan ke WhatsApp.

### 2. Aplikasi Web Desktop (React + Vite)
- **Layar 1 (Landing Page)**: Navbar sticky, hero banner "Apotek Bima Farma Tanimulya", tombol Toko & Lokasi, pilar layanan, dan katalog 4 produk unggulan.
- **Layar 2 (Toko Online)**: Header belanja dengan badge keranjang, filter kategori obat, grid produk, dan drawer keranjang slide-out kanan.
- **Layar 3 (Kasir POS Desktop)**: Sidebar menu lengkap, jam realtime, indikator online, multi-antrean transaksi, tabel keranjang obat, panel metode pembayaran (Tunai, QRIS, Transfer).
- **Layar 4 (Dashboard Admin)**: KPI produk terjual, stok menipis, obat mendekati kadaluwarsa, tabel riwayat transaksi terbaru, dan panel pengingat batch exp.
