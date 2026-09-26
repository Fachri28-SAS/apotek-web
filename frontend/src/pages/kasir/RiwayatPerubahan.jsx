import { useState, useEffect, useMemo } from "react";
import KasirShell from "./KasirShell";
import { useAuth } from "../../context/useAuth";
import { api } from "../../lib/api";
import { getRiwayatPerubahan, hapusSemuaLog, tambahLogPerubahan } from "../../lib/auditLog";
import TombolExportGroup from "./komponen/TombolExportGroup";
import { cetakDokumenA4, exportExcel, exportWord } from "../../utils/exportDokumen";
import "./Kasir.css";

const KATEGORI_LIST = [
  "Semua Kategori",
  "Ganti Harga Obat",
  "Faktur Penerimaan",
  "PPN & Pengaturan",
  "Stok Opname",
  "Pengeluaran",
  "Penjualan",
];

export default function RiwayatPerubahan() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKategori, setFilterKategori] = useState("Semua Kategori");
  const [filterRentang, setFilterRentang] = useState("semua"); // "hari_ini", "7_hari", "bulan_ini", "semua"
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Ambil log riwayat murni dari sistem tanpa mock/dummy data secara realtime
  useEffect(() => {
    muatLog();

    // 1. Dengarkan event internal tab yang sama
    function onUpdated() {
      muatLog();
    }
    window.addEventListener("bima_audit_log_updated", onUpdated);

    // 2. Dengarkan perubahan storage dari tab/jendela lain
    function onStorage(e) {
      if (e.key === "bima_audit_log_perubahan" || !e.key) {
        muatLog();
      }
    }
    window.addEventListener("storage", onStorage);

    // 3. Dengarkan broadcast channel jika didukung browser
    let channel = null;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel("bima_audit_log_channel");
        channel.onmessage = () => muatLog();
      }
    } catch {}

    // 4. Dengarkan saat user kembali ke tab ini (focus / visibility)
    window.addEventListener("focus", onUpdated);
    document.addEventListener("visibilitychange", onUpdated);

    // 5. Polling halus tiap 2 detik untuk memastikan sinkronisasi sempurna
    const interval = setInterval(muatLog, 2000);

    return () => {
      window.removeEventListener("bima_audit_log_updated", onUpdated);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onUpdated);
      document.removeEventListener("visibilitychange", onUpdated);
      clearInterval(interval);
      try {
        channel?.close();
      } catch {}
    };
  }, []);

  function muatLog() {
    try {
      const realLogs = getRiwayatPerubahan();
      const sorted = [...realLogs].sort(
        (a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime()
      );
      setLogs(sorted);
    } catch (e) {
      console.error("Gagal memuat audit log:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleBersihkanLog() {
    if (!window.confirm("Bersihkan seluruh catatan riwayat perubahan saat ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    hapusSemuaLog();
    setLogs([]);
  }

  // Filter logs
  const logsFiltered = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return logs.filter((log) => {
      // 1. Filter Kategori
      if (filterKategori !== "Semua Kategori" && log.kategori !== filterKategori) {
        return false;
      }

      // 2. Filter Rentang Waktu
      if (filterRentang !== "semua") {
        const logDate = new Date(log.waktu);
        const logDateStr = logDate.toISOString().slice(0, 10);
        if (filterRentang === "hari_ini" && logDateStr !== todayStr) {
          return false;
        }
        if (filterRentang === "7_hari") {
          const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        }
        if (filterRentang === "bulan_ini") {
          if (
            logDate.getMonth() !== now.getMonth() ||
            logDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        }
      }

      // 3. Filter Search
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchJudul = log.judul?.toLowerCase().includes(s);
        const matchKet = log.keterangan?.toLowerCase().includes(s);
        const matchAkun = (log.nama_akun || log.petugas)?.toLowerCase().includes(s);
        const matchKategori = log.kategori?.toLowerCase().includes(s);
        if (!matchJudul && !matchKet && !matchAkun && !matchKategori) {
          return false;
        }
      }

      return true;
    });
  }, [logs, filterKategori, filterRentang, search]);

  // Pagination
  const totalData = logsFiltered.length;
  const totalPages = perPage === "semua" ? 1 : Math.ceil(totalData / perPage) || 1;
  const startIndex = perPage === "semua" ? 0 : (currentPage - 1) * perPage;
  const endIndex = perPage === "semua" ? totalData : startIndex + perPage;
  const logsHalaman = perPage === "semua" ? logsFiltered : logsFiltered.slice(startIndex, endIndex);

  // Hitung ringkasan
  const jmlGantiHarga = logs.filter((l) => l.kategori === "Ganti Harga Obat").length;
  const jmlFaktur = logs.filter((l) => l.kategori === "Faktur Penerimaan").length;
  const jmlPpn = logs.filter((l) => l.kategori === "PPN & Pengaturan").length;
  const jmlStok = logs.filter((l) => l.kategori === "Stok Opname").length;

  // Siapkan Data Cetak & Export
  function siapkanDataExport() {
    const headers = [
      { label: "NO", align: "center", width: "40px" },
      { label: "WAKTU", align: "center", width: "130px" },
      { label: "NAMA AKUN", align: "left", width: "120px" },
      { label: "KATEGORI", align: "left", width: "120px" },
      { label: "AKSI", align: "center", width: "80px" },
      { label: "JUDUL / OBJEK", align: "left" },
      { label: "SEBELUM", align: "left", width: "100px" },
      { label: "SESUDAH", align: "left", width: "100px" },
      { label: "KETERANGAN", align: "left" },
    ];

    const rows = logsFiltered.map((log, idx) => {
      const tgl = new Date(log.waktu).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return [
        idx + 1,
        tgl,
        log.nama_akun || log.petugas || "-",
        log.kategori || "-",
        log.aksi || "-",
        log.judul || "-",
        log.detailLama || "-",
        log.detailBaru || "-",
        log.keterangan || "-",
      ];
    });

    const footers = [
      [
        {
          label: `Total Riwayat Perubahan: ${rows.length} catatan aktivitas audit`,
          colspan: headers.length,
          align: "right",
        },
      ],
    ];

    const keterangan = `Filter: ${filterKategori} · Periode: ${filterRentang.replace("_", " ").toUpperCase()}${search ? ` · Cari: "${search}"` : ""}`;

    return { headers, rows, footers, keterangan };
  }

  function handleCetak() {
    const { headers, rows, footers, keterangan } = siapkanDataExport();
    cetakDokumenA4({
      judul: "AUDIT LOG RIWAYAT PERUBAHAN SISTEM",
      periode: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      keterangan,
      headers,
      rows,
      footers,
      orientation: "landscape",
      namaUser: user?.nama || "Admin",
    });
  }

  function handleExportExcel() {
    const { headers, rows, footers, keterangan } = siapkanDataExport();
    exportExcel({
      filename: `riwayat-perubahan-apotek-bima-${new Date().toISOString().slice(0, 10)}`,
      judul: "AUDIT LOG RIWAYAT PERUBAHAN SISTEM",
      periode: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      keterangan,
      headers,
      rows,
      footers,
    });
  }

  function handleExportWord() {
    const { headers, rows, footers, keterangan } = siapkanDataExport();
    exportWord({
      filename: `riwayat-perubahan-apotek-bima-${new Date().toISOString().slice(0, 10)}`,
      judul: "AUDIT LOG RIWAYAT PERUBAHAN SISTEM",
      periode: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      keterangan,
      headers,
      rows,
      footers,
    });
  }

  function formatWaktu(isoString) {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function getBadgeKategoriColor(kategori) {
    switch (kategori) {
      case "Ganti Harga Obat":
        return { bg: "#FAF5FF", border: "#E9D5FF", text: "#7E22CE" };
      case "Faktur Penerimaan":
        return { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" };
      case "PPN & Pengaturan":
        return { bg: "#ECFDF5", border: "#A7F3D0", text: "#047857" };
      case "Stok Opname":
        return { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" };
      case "Pengeluaran":
        return { bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" };
      default:
        return { bg: "#F1F5F9", border: "#CBD5E1", text: "#334155" };
    }
  }

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Riwayat Perubahan</h1>
          <p className="halaman-sub">
            Audit Trail & Log Aktivitas Sistem Khusus Admin · Mencatat perubahan harga obat, faktur, PPN, dan operasional apotek
          </p>
        </div>

        <div className="halaman-header-aksi" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={muatLog}
            style={{
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1.5px solid var(--line)",
              borderRadius: 8,
              padding: "7px 12px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            🔄 Segarkan Log
          </button>

          {isAdmin && logs.length > 0 && (
            <button
              type="button"
              onClick={handleBersihkanLog}
              style={{
                background: "#FEF2F2",
                color: "#DC2626",
                border: "1.5px solid #FECACA",
                borderRadius: 8,
                padding: "7px 12px",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
              title="Bersihkan riwayat log perubahan"
            >
              🗑️ Bersihkan Riwayat
            </button>
          )}

          <TombolExportGroup
            onCetakPdf={handleCetak}
            onExportExcel={handleExportExcel}
            onExportWord={handleExportWord}
            disabled={logsFiltered.length === 0}
          />
        </div>
      </div>

      {/* Ringkasan Kartu Audit */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px" }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 700 }}>Total Aktivitas Audit</span>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", marginTop: 2 }}>
            {logs.length} <small style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-soft)" }}>catatan</small>
          </div>
        </div>

        <div style={{ background: "#FAF5FF", border: "1px solid #E9D5FF", borderRadius: 12, padding: "12px 16px" }}>
          <span style={{ fontSize: 11.5, color: "#7E22CE", fontWeight: 700 }}>Perubahan Harga Obat</span>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#6B21A8", marginTop: 2 }}>
            {jmlGantiHarga} <small style={{ fontSize: 12, fontWeight: 500, color: "#9333EA" }}>kali</small>
          </div>
        </div>

        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "12px 16px" }}>
          <span style={{ fontSize: 11.5, color: "#1D4ED8", fontWeight: 700 }}>Input Faktur Penerimaan</span>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#1E40AF", marginTop: 2 }}>
            {jmlFaktur} <small style={{ fontSize: 12, fontWeight: 500, color: "#3B82F6" }}>faktur</small>
          </div>
        </div>

        <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 12, padding: "12px 16px" }}>
          <span style={{ fontSize: 11.5, color: "#047857", fontWeight: 700 }}>Tarif PPN & Pengaturan</span>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#065F46", marginTop: 2 }}>
            {jmlPpn} <small style={{ fontSize: 12, fontWeight: 500, color: "#10B981" }}>perubahan</small>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Filter Kategori */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>Kategori:</span>
            <select
              value={filterKategori}
              onChange={(e) => {
                setFilterKategori(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1.5px solid var(--line)",
                fontSize: 12.5,
                fontWeight: 700,
                background: "#fff",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {KATEGORI_LIST.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Filter Rentang Waktu */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>Waktu:</span>
            <select
              value={filterRentang}
              onChange={(e) => {
                setFilterRentang(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1.5px solid var(--line)",
                fontSize: 12.5,
                fontWeight: 700,
                background: "#fff",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="semua">Semua Waktu</option>
              <option value="hari_ini">Hari Ini</option>
              <option value="7_hari">7 Hari Terakhir</option>
              <option value="bulan_ini">Bulan Ini</option>
            </select>
          </div>
        </div>

        {/* Input Pencarian */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 240px", maxWidth: 360 }}>
          <div className="search-obat-input" style={{ width: "100%", margin: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Cari obat, no faktur, nama akun…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", padding: 0 }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabel Riwayat Perubahan */}
      <div
        className="obat-table-wrap desktop-only"
        style={{
          borderRadius: 14,
          border: "1px solid var(--line)",
          background: "#fff",
          marginBottom: 16,
          overflowX: "auto",
        }}
      >
        <table className="obat-table" style={{ minWidth: 1050, width: "100%", fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: "center", padding: "8px 5px" }}>NO</th>
              <th style={{ width: 140, textAlign: "center", padding: "8px 6px" }}>Waktu & Tanggal</th>
              <th style={{ width: 130, padding: "8px 8px" }}>Nama Akun</th>
              <th style={{ width: 130, padding: "8px 8px" }}>Kategori</th>
              <th style={{ width: 85, textAlign: "center", padding: "8px 6px" }}>Aksi</th>
              <th style={{ minWidth: 180, padding: "8px 8px" }}>Judul / Objek</th>
              <th style={{ width: 105, padding: "8px 8px" }}>Sebelum</th>
              <th style={{ width: 105, padding: "8px 8px" }}>Sesudah</th>
              <th style={{ minWidth: 200, padding: "8px 8px" }}>Keterangan Rinci</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="obat-table-info" style={{ padding: "32px 16px" }}>
                  <div style={{ fontWeight: 700, color: "var(--magenta-dark)" }}>
                    Sedang memuat data riwayat perubahan…
                  </div>
                </td>
              </tr>
            ) : logsHalaman.length === 0 ? (
              <tr>
                <td colSpan={9} className="obat-table-info" style={{ padding: "36px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 4 }}>
                    {search ? `Tidak ada log yang cocok dengan "${search}"` : "Belum Ada Riwayat Perubahan"}
                  </div>
                  <div style={{ color: "var(--ink-soft)", fontSize: 12, maxWidth: 500, margin: "0 auto" }}>
                    {search
                      ? "Silakan coba kata kunci pencarian yang lain."
                      : "Semua perubahan seperti edit harga jual obat (oleh kasir/admin), input faktur supplier, atau penyesuaian stok opname akan otomatis tercatat di sini secara real-time."}
                  </div>
                </td>
              </tr>
            ) : (
              logsHalaman.map((log, idx) => {
                const noUrut = startIndex + idx + 1;
                const badgeKat = getBadgeKategoriColor(log.kategori);

                return (
                  <tr key={log.id}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--ink-soft)", padding: "7px 5px" }}>
                      {noUrut}
                    </td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap", padding: "7px 6px", fontSize: 12 }}>
                      {formatWaktu(log.waktu)}
                    </td>
                    <td style={{ padding: "7px 8px" }}>
                      <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 12.5 }}>
                        {log.nama_akun || log.petugas || "Admin"}
                      </div>
                      {log.role_akun && (
                        <div style={{ fontSize: 10.5, color: "var(--ink-soft)", textTransform: "capitalize", fontWeight: 600 }}>
                          {log.role_akun === "admin" ? "🛡️ Admin" : "👤 Kasir"}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "7px 8px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          background: badgeKat.bg,
                          border: `1px solid ${badgeKat.border}`,
                          color: badgeKat.text,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.kategori}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", padding: "7px 6px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background:
                            log.aksi === "Tambah" || log.aksi === "Faktur Masuk"
                              ? "#ECFDF5"
                              : log.aksi === "Lunas"
                              ? "#EFF6FF"
                              : log.aksi === "Hapus"
                              ? "#FEF2F2"
                              : "#F1F5F9",
                          color:
                            log.aksi === "Tambah" || log.aksi === "Faktur Masuk"
                              ? "#047857"
                              : log.aksi === "Lunas"
                              ? "#1D4ED8"
                              : log.aksi === "Hapus"
                              ? "#B91C1C"
                              : "#334155",
                        }}
                      >
                        {log.aksi}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--ink)", padding: "7px 8px" }}>
                      {log.judul}
                    </td>
                    <td style={{ color: "var(--ink-soft)", fontSize: 12, padding: "7px 8px" }}>
                      {log.detailLama ? (
                        <span style={{ textDecoration: "line-through", color: "#DC2626" }}>
                          {log.detailLama}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ fontWeight: 800, color: "#16A34A", fontSize: 12, padding: "7px 8px" }}>
                      {log.detailBaru || "-"}
                    </td>
                    <td style={{ color: "var(--ink-soft)", fontSize: 12, padding: "7px 8px" }}>
                      {log.keterangan || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 18px",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid var(--line)",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--ink-soft)" }}>
          <span>Tampilkan per halaman:</span>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(e.target.value === "semua" ? "semua" : Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1.5px solid var(--line)",
              fontSize: 12.5,
              fontWeight: 700,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value="semua">Semua</option>
          </select>
          <span>
            Total: <strong>{totalData}</strong> catatan log
          </span>
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="pagination-btn"
            >
              Sebelumnya
            </button>
            <span style={{ fontSize: 12.5, fontWeight: 700, padding: "0 8px" }}>
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="pagination-btn"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>
    </KasirShell>
  );
}
