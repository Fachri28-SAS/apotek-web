// Utility Manajemen Riwayat Perubahan (Audit Trail Log) untuk Apotek Bima Farma
const STORAGE_KEY = "bima_audit_log_perubahan";

let channel = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    channel = new BroadcastChannel("bima_audit_log_channel");
  }
} catch {
  // ignore
}

function notifyLogChanged() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("bima_audit_log_updated"));
    } catch {}
    try {
      channel?.postMessage({ type: "AUDIT_LOG_UPDATED", time: Date.now() });
    } catch {}
  }
}

export function getRiwayatPerubahan() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter otomatis: bersihkan data mock lama
    const realLogs = parsed.filter(
      (item) =>
        item &&
        !String(item.id).startsWith("LOG-INIT") &&
        !String(item.id).startsWith("SRV-PEN") &&
        item.petugas !== "Sistem Apotek" &&
        item.nama_akun !== "Sistem Apotek" &&
        item.petugas !== "Petugas Gudang" &&
        item.nama_akun !== "Petugas Gudang"
    );

    if (realLogs.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(realLogs));
    }

    return realLogs;
  } catch {
    return [];
  }
}

export function tambahLogPerubahan({
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
  try {
    const list = getRiwayatPerubahan();
    const namaAkunFinal = nama_akun || oleh || petugas || "Admin";
    const itemFinal = judul || item || "-";
    const sebelumFinal = sebelum !== undefined && sebelum !== null ? String(sebelum) : (detailLama !== undefined && detailLama !== null ? String(detailLama) : "-");
    const sesudahFinal = sesudah !== undefined && sesudah !== null ? String(sesudah) : (detailBaru !== undefined && detailBaru !== null ? String(detailBaru) : "-");

    const itemBaru = {
      id: "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      waktu: new Date().toISOString(),
      nama_akun: namaAkunFinal,
      role_akun: role_akun || "kasir",
      kategori,
      aksi,
      judul: itemFinal,
      detailLama: sebelumFinal,
      detailBaru: sesudahFinal,
      keterangan,
    };

    const updated = [itemBaru, ...list].slice(0, 1000); // Simpan hingga 1000 log riwayat terbaru
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyLogChanged();
    return itemBaru;
  } catch (e) {
    console.warn("Gagal mencatat log perubahan:", e);
    return null;
  }
}

export function hapusSemuaLog() {
  localStorage.removeItem(STORAGE_KEY);
  notifyLogChanged();
}
