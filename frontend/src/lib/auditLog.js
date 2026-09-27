/**
 * Utility Audit Log — Apotek Bima Farma
 * Setiap perubahan dikirim ke Laravel backend /api/audit-logs
 * (diproxy oleh Vercel ke api.apotekbimafarma.com)
 * sehingga log terpusat di MySQL, lintas perangkat.
 */
import { api } from "./api";

/**
 * Kirim satu entri log ke database via Laravel backend.
 * Fire-and-forget: tidak memblokir UI jika gagal.
 */
export async function tambahLogPerubahan({
  nama_akun,
  role_akun,
  kategori = "Umum",
  aksi = "Ubah",
  judul,
  item,
  sebelum,
  detailLama,
  sesudah,
  detailBaru,
  keterangan = "",
  oleh,
  petugas,
}) {
  const namaAkunFinal = nama_akun || oleh || petugas || "Admin";
  const itemFinal = judul || item || "-";
  const sebelumFinal =
    sebelum !== undefined && sebelum !== null
      ? String(sebelum)
      : detailLama !== undefined && detailLama !== null
      ? String(detailLama)
      : "-";
  const sesudahFinal =
    sesudah !== undefined && sesudah !== null
      ? String(sesudah)
      : detailBaru !== undefined && detailBaru !== null
      ? String(detailBaru)
      : "-";

  try {
    await api("/audit-logs", {
      method: "POST",
      body: JSON.stringify({
        waktu: new Date().toISOString(),
        nama_akun: namaAkunFinal,
        role_akun: role_akun || "kasir",
        kategori,
        aksi,
        judul: itemFinal,
        sebelum: sebelumFinal,
        sesudah: sesudahFinal,
        keterangan,
      }),
    });
  } catch (e) {
    console.warn("Gagal mencatat audit log:", e);
  }
}

/**
 * Ambil semua log dari database (admin only).
 * Returns array of log entries (sudah diurutkan dari terbaru ke terlama).
 */
export async function getRiwayatPerubahan() {
  try {
    const rows = await api("/audit-logs");
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn("Gagal mengambil audit log:", e);
    return [];
  }
}

/**
 * Hapus seluruh log dari database (admin only).
 */
export async function hapusSemuaLog() {
  try {
    await api("/audit-logs", { method: "DELETE" });
  } catch (e) {
    console.warn("Gagal menghapus audit log:", e);
  }
}
