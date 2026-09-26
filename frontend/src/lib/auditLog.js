// Utility Manajemen Riwayat Perubahan (Audit Trail Log) untuk Apotek Bima Farma
const STORAGE_KEY = "bima_audit_log_perubahan";

export function getRiwayatPerubahan() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultDummyLogs();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : getDefaultDummyLogs();
  } catch {
    return getDefaultDummyLogs();
  }
}

export function tambahLogPerubahan({
  kategori = "Umum", // "Ganti Harga Obat", "Faktur Penerimaan", "PPN & Pengaturan", "Stok Opname", "Pengeluaran", "Penjualan"
  aksi = "Ubah", // "Tambah", "Ubah", "Hapus", "Bayar", "Sesuaikan"
  judul = "",
  detailLama = null,
  detailBaru = null,
  keterangan = "",
  petugas = "Admin",
}) {
  try {
    const list = getRiwayatPerubahan();
    const itemBaru = {
      id: "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      waktu: new Date().toISOString(),
      kategori,
      aksi,
      judul,
      detailLama,
      detailBaru,
      keterangan,
      petugas,
    };

    const updated = [itemBaru, ...list].slice(0, 1000); // Simpan hingga 1000 log terbaru
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return itemBaru;
  } catch (e) {
    console.warn("Gagal mencatat log perubahan:", e);
    return null;
  }
}

export function hapusSemuaLog() {
  localStorage.removeItem(STORAGE_KEY);
}

function getDefaultDummyLogs() {
  return [
    {
      id: "LOG-INIT-1",
      waktu: new Date(Date.now() - 3600000 * 2).toISOString(),
      kategori: "PPN & Pengaturan",
      aksi: "Inisialisasi",
      judul: "Tarif Default PPN 11%",
      detailLama: null,
      detailBaru: "11%",
      keterangan: "Sistem menerapkan tarif standar PPN 11% untuk faktur supplier PKP",
      petugas: "Sistem Apotek",
    },
    {
      id: "LOG-INIT-2",
      waktu: new Date(Date.now() - 3600000 * 5).toISOString(),
      kategori: "Ganti Harga Obat",
      aksi: "Ubah",
      judul: "AMOXICILLIN 500MG (Strip)",
      detailLama: "Rp 6.000",
      detailBaru: "Rp 7.500",
      keterangan: "Penyesuaian margin laba mengikuti kenaikan harga beli distributor",
      petugas: "Admin Bima Farma",
    },
  ];
}
