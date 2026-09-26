import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import { cetakBukuBayarFaktur } from "../../utils/cetakLaporanPenerimaan";
import { exportExcel, exportWord, cetakSatuFakturA4, exportSatuFakturWord, exportSatuFakturExcel } from "../../utils/exportDokumen";
import KasirShell from "./KasirShell";
import DetailFakturModal from "./komponen/DetailFakturModal";
import TombolExportGroup from "./komponen/TombolExportGroup";
import RekapHutangModal from "./komponen/RekapHutangModal";

function getTglYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const now = new Date();
const awalBulanDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const hariIniDefault = getTglYmd(now);

export default function PembayaranPenerimaan() {
  const [daftar, setDaftar] = useState([]);
  const [dariTanggal, setDariTanggal] = useState(awalBulanDefault);
  const [sampaiTanggal, setSampaiTanggal] = useState(hariIniDefault);
  const [filterStatus, setFilterStatus] = useState("semua"); // "semua" | "belum" | "lunas"
  const [filterSupplier, setFilterSupplier] = useState("semua"); // "semua" | nama PT
  const [daftarSupplierList, setDaftarSupplierList] = useState([]);
  const [modalHutangSupplier, setModalHutangSupplier] = useState(null); // string nama PT atau null
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [modalCetakFaktur, setModalCetakFaktur] = useState(null);
  const [error, setError] = useState("");
  const [notif, setNotif] = useState("");

  const [konfirmasiBayar, setKonfirmasiBayar] = useState(null);
  const [loadingToggle, setLoadingToggle] = useState(false);

  // Ambil daftar supplier aktif
  useEffect(() => {
    api("/suppliers")
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setDaftarSupplierList(list);
      })
      .catch(() => {});
  }, []);

  // Ambil data faktur penerimaan
  useEffect(() => {
    muatData();
  }, [dariTanggal, sampaiTanggal, search, filterSupplier, filterStatus]);

  function muatData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (dariTanggal) params.set("dari_tanggal", dariTanggal);
    if (sampaiTanggal) params.set("sampai_tanggal", sampaiTanggal);
    if (search.trim()) params.set("search", search.trim());
    if (filterSupplier && filterSupplier !== "semua") params.set("nama_supplier", filterSupplier);
    if (filterStatus && filterStatus !== "semua") params.set("status_bayar", filterStatus);

    const timer = setTimeout(() => {
      api(`/penerimaan?${params}`)
        .then((d) => {
          setDaftar(d || []);
          setError("");
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }

  // Proses ubah status pembayaran faktur (Lunas <-> Belum Lunas)
  async function prosesToggleBayar() {
    if (!konfirmasiBayar) return;
    setLoadingToggle(true);
    try {
      const res = await api(`/penerimaan/${konfirmasiBayar.id}/toggle-bayar`, { method: "PUT" });
      setDaftar((prev) =>
        prev.map((it) =>
          it.id === konfirmasiBayar.id
            ? { ...it, status_bayar: res.penerimaan.status_bayar, tanggal_bayar: res.penerimaan.tanggal_bayar }
            : it
        )
      );
      setNotif(res.message);
      setTimeout(() => setNotif(""), 4000);
      setKonfirmasiBayar(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingToggle(false);
    }
  }

  // Daftar nama supplier unik
  const supplierOptions = Array.from(
    new Set([
      ...daftarSupplierList.map((s) => s.nama).filter(Boolean),
      ...daftar.map((p) => p.nama_supplier).filter(Boolean),
    ])
  ).sort((a, b) => a.localeCompare(b));

  // Filter daftar faktur
  const daftarTampil = daftar.filter((p) => {
    if (filterSupplier !== "semua" && p.nama_supplier !== filterSupplier) return false;
    if (filterStatus === "belum") return p.status_bayar === "belum";
    if (filterStatus === "lunas") return p.status_bayar === "lunas";
    return true;
  });

  // Hitung total ringkasan
  const totalTagihan = daftarTampil.reduce((s, p) => s + Number(p.total || 0), 0);
  const totalLunas = daftarTampil.filter((p) => p.status_bayar === "lunas").reduce((s, p) => s + Number(p.total || 0), 0);
  const totalBelumLunas = daftarTampil.filter((p) => p.status_bayar === "belum").reduce((s, p) => s + Number(p.total || 0), 0);

  // Grouping data faktur berdasarkan (Tanggal, Nama PBF) persis seperti Buku Register Foto 2
  // Kolom: NO, Tgl, Nama PBF, Nomor Faktur, Besar Uang, Jumlah, Tgl Bayar
  const grupMap = new Map();

  daftarTampil.forEach((p) => {
    const tgl = p.tanggal_terima || "—";
    const sup = p.nama_supplier || "—";
    const key = `${tgl}_${sup}`;

    if (!grupMap.has(key)) {
      grupMap.set(key, {
        key,
        tanggal: tgl,
        namaSupplier: sup,
        fakturs: [],
        totalJumlah: 0,
        totalLunas: 0,
        totalBelum: 0,
      });
    }

    const grup = grupMap.get(key);
    grup.fakturs.push(p);
    const nominal = Number(p.total || 0);
    grup.totalJumlah += nominal;
    if (p.status_bayar === "lunas") {
      grup.totalLunas += nominal;
    } else {
      grup.totalBelum += nominal;
    }
  });

  const grupList = Array.from(grupMap.values());

  // Format tanggal Indonesia ringkas (misal: 25-09-26 atau 25/09/2026)
  function formatTgl(tglStr) {
    if (!tglStr) return "—";
    const d = new Date(tglStr);
    if (isNaN(d.getTime())) return tglStr;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  function siapkanDataExportBayar() {
    const headers = [
      { label: "NO", align: "center", width: "40px" },
      { label: "Tgl", align: "center" },
      { label: "Nama PBF", align: "left" },
      { label: "Nomor Faktur", align: "left" },
      { label: "Besar Uang", align: "right" },
      { label: "Jumlah", align: "right" },
      { label: "Tgl Bayar", align: "center" },
    ];

    const rows = [];
    let grandTotal = 0;

    grupList.forEach((grup, gIdx) => {
      grup.fakturs.forEach((faktur, fIdx) => {
        grandTotal += Number(faktur.total || 0);
        const isLunas = faktur.status_bayar === "lunas";
        const tglBayarStr = isLunas
          ? (faktur.tanggal_bayar ? formatTgl(faktur.tanggal_bayar) : "Lunas")
          : (faktur.tanggal_jatuh_tempo ? `Tempo: ${formatTgl(faktur.tanggal_jatuh_tempo)}` : "Belum");

        rows.push([
          fIdx === 0 ? gIdx + 1 : "",
          fIdx === 0 ? formatTgl(grup.tanggal) : "",
          fIdx === 0 ? grup.namaSupplier : "",
          faktur.no_faktur || "—",
          rupiah(faktur.total),
          fIdx === 0 ? rupiah(grup.totalJumlah) : "",
          tglBayarStr,
        ]);
      });
    });

    const footers = [
      [
        { label: `TOTAL BESAR UANG (${daftarTampil.length} Faktur) :`, colspan: 4, align: "right" },
        { label: rupiah(grandTotal), align: "right" },
        { label: rupiah(grandTotal), align: "right" },
        { label: "-", align: "center" },
      ],
    ];

    const periodeTeks = dariTanggal && sampaiTanggal ? `${dariTanggal} s/d ${sampaiTanggal}` : "Semua Periode";

    return { headers, rows, footers, periodeTeks };
  }

  function handleExcel() {
    const { headers, rows, footers, periodeTeks } = siapkanDataExportBayar();
    exportExcel({
      filename: `buku-bayar-faktur-pbf`,
      judul: "BUKU REGISTER PEMBAYARAN FAKTUR PBF",
      periode: periodeTeks,
      keterangan: `Rekapitulasi Tagihan & Pembayaran Faktur PBF`,
      headers,
      rows,
      footers,
    });
  }

  function handleWord() {
    const { headers, rows, footers, periodeTeks } = siapkanDataExportBayar();
    exportWord({
      filename: `buku-bayar-faktur-pbf`,
      judul: "BUKU REGISTER PEMBAYARAN FAKTUR PBF",
      periode: periodeTeks,
      keterangan: `Rekapitulasi Tagihan & Pembayaran Faktur PBF`,
      headers,
      rows,
      footers,
      orientation: "portrait",
      namaUser: "Apoteker / Kasir",
    });
  }

  return (
    <KasirShell>
      {/* Switcher Tab Navigasi: Buku Barang Masuk & Buku Bayar Faktur */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Link
          to="/kasir/riwayat-penerimaan"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 700,
            background: "#fff",
            color: "var(--ink)",
            border: "1.5px solid var(--line)",
            textDecoration: "none",
            transition: "all 0.15s ease",
          }}
        >
          <span>📦</span>
          <span>Buku Barang Masuk (Per Item)</span>
        </Link>
        <Link
          to="/kasir/pembayaran-penerimaan"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 700,
            background: "var(--magenta)",
            color: "#fff",
            textDecoration: "none",
            boxShadow: "0 2px 5px rgba(147, 51, 234, 0.25)",
          }}
        >
          <span>💳</span>
          <span>Buku Bayar Faktur PBF</span>
        </Link>
      </div>

      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Buku Bayar Faktur PBF</h1>
          <p className="halaman-sub">
            {loading ? "Memuat…" : `${daftarTampil.length} faktur tercatat · Total Besar Uang: ${rupiah(totalTagihan)}`}
          </p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {notif && (
        <div
          style={{
            background: "#ECFDF5",
            color: "#065F46",
            padding: "10px 16px",
            borderRadius: 10,
            marginBottom: 14,
            fontWeight: 600,
            fontSize: 13.5,
            border: "1px solid #A7F3D0",
          }}
        >
          {notif}
        </div>
      )}

      {/* Ringkasan Besar Uang & Hutang */}
      <div className="kpi-grid-4" style={{ marginBottom: 16 }}>
        <div style={{ background: "#fff", padding: "14px 18px", borderRadius: 14, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Total Faktur Masuk</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--ink)", marginTop: 4 }}>
            {daftarTampil.length} Faktur
          </div>
        </div>
        <div style={{ background: "#fff", padding: "14px 18px", borderRadius: 14, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Total Besar Uang</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--magenta-dark)", marginTop: 4 }}>
            {rupiah(totalTagihan)}
          </div>
        </div>
        <div style={{ background: "#F0FDF4", padding: "14px 18px", borderRadius: 14, border: "1px solid #BBF7D0" }}>
          <div style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>✓ Sudah Dibayar (Lunas)</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#15803D", marginTop: 4 }}>
            {rupiah(totalLunas)}
          </div>
        </div>
        <div style={{ background: "#FEF2F2", padding: "14px 18px", borderRadius: 14, border: "1px solid #FECACA" }}>
          <div style={{ fontSize: 12, color: "#991B1B", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>○ {filterSupplier !== "semua" ? `Hutang ${filterSupplier}` : "Belum Dibayar (Tempo)"}</span>
            {filterSupplier !== "semua" && (
              <button
                type="button"
                onClick={() => setModalHutangSupplier(filterSupplier)}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#DC2626",
                  background: "#fff",
                  border: "1px solid #FCA5A5",
                  borderRadius: 6,
                  padding: "2px 7px",
                  cursor: "pointer",
                }}
              >
                Rincian ➔
              </button>
            )}
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#DC2626", marginTop: 4 }}>
            {rupiah(totalBelumLunas)}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          {/* Kotak Pencarian */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 240, maxWidth: 340, background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: 12, padding: "8px 14px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 17, height: 17, color: "var(--ink-soft)" }}>
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama PBF, no. faktur, obat…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13.5, width: "100%", color: "var(--ink)" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", padding: 0 }}>
                ✕
              </button>
            )}
          </div>

          {/* Filter Rentang Tanggal, Status, PT & Tombol Cetak */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="kalender-filter-group" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div className="kalender-item-wrap" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                <span>Dari:</span>
                <input
                  type="date"
                  value={dariTanggal}
                  onChange={(e) => setDariTanggal(e.target.value)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1.5px solid var(--line)",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div className="kalender-item-wrap" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                <span>Sampai:</span>
                <input
                  type="date"
                  value={sampaiTanggal}
                  onChange={(e) => setSampaiTanggal(e.target.value)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1.5px solid var(--line)",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Filter PT / Supplier */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              <span>PBF:</span>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: filterSupplier !== "semua" ? "1.5px solid var(--magenta)" : "1.5px solid var(--line)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  background: filterSupplier !== "semua" ? "#FAF5FF" : "#fff",
                  color: filterSupplier !== "semua" ? "var(--magenta-dark)" : "var(--ink)",
                  fontWeight: filterSupplier !== "semua" ? 700 : 500,
                  maxWidth: 180,
                  cursor: "pointer",
                }}
              >
                <option value="semua">Semua PBF / Supplier</option>
                {supplierOptions.map((sup) => (
                  <option key={sup} value={sup}>
                    {sup}
                  </option>
                ))}
              </select>
            </div>

            <div className="periode-chips" style={{ margin: 0 }}>
              <button
                type="button"
                className={`periode-chip ${filterStatus === "semua" ? "active" : ""}`}
                onClick={() => setFilterStatus("semua")}
              >
                Semua Status
              </button>
              <button
                type="button"
                className={`periode-chip ${filterStatus === "belum" ? "active" : ""}`}
                onClick={() => setFilterStatus("belum")}
              >
                ○ Belum Lunas
              </button>
              <button
                type="button"
                className={`periode-chip ${filterStatus === "lunas" ? "active" : ""}`}
                onClick={() => setFilterStatus("lunas")}
              >
                ✓ Lunas
              </button>
            </div>

            {/* Tombol Khusus Rekap Hutang per PT */}
            <button
              type="button"
              onClick={() => setModalHutangSupplier(filterSupplier !== "semua" ? filterSupplier : (supplierOptions[0] || ""))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 13px",
                borderRadius: 8,
                border: "1.5px solid #FCA5A5",
                background: "#FEF2F2",
                color: "#B91C1C",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Buka panel khusus rekapitulasi hutang per PT / Supplier berdasarkan rentang tanggal"
            >
              <span>🏢</span>
              <span>Rekap Hutang PT</span>
            </button>

            <TombolExportGroup
              onCetakPdf={() => cetakBukuBayarFaktur(grupList, { dariTanggal, sampaiTanggal })}
              onExportExcel={handleExcel}
              onExportWord={handleWord}
              disabled={grupList.length === 0}
            />
          </div>
        </div>

        {loading ? (
          <div className="panel-kosong">Memuat buku bayar faktur…</div>
        ) : grupList.length === 0 ? (
          <div className="panel-kosong">
            {search ? `Tidak ditemukan faktur untuk pencarian "${search}".` : "Belum ada faktur pada periode tanggal ini."}
          </div>
        ) : (
          <div className="obat-table-wrap">
            {/* Tabel 7 Kolom Sesuai Buku Catatan Pembayaran Foto 2 */}
            <table className="obat-table" style={{ minWidth: 880, fontSize: 13.5 }}>
              <thead>
                <tr>
                  <th style={{ width: 48, textAlign: "center" }}>NO</th>
                  <th style={{ width: 95, textAlign: "center" }}>Tgl</th>
                  <th style={{ width: 170 }}>Nama PBF</th>
                  <th style={{ width: 150 }}>Nomor Faktur</th>
                  <th style={{ width: 140, textAlign: "right" }}>Besar Uang</th>
                  <th style={{ width: 145, textAlign: "right" }}>Jumlah</th>
                  <th style={{ minWidth: 170, textAlign: "center" }}>Tgl Bayar</th>
                </tr>
              </thead>
              <tbody>
                {grupList.map((grup, gIdx) => {
                  const fakturs = grup.fakturs;
                  const rowSpan = fakturs.length;

                  return fakturs.map((faktur, fIdx) => {
                    const isLunas = faktur.status_bayar === "lunas";
                    const tglBayarStr = isLunas
                      ? (faktur.tanggal_bayar ? formatTgl(faktur.tanggal_bayar) : "Lunas")
                      : (faktur.tanggal_jatuh_tempo ? formatTgl(faktur.tanggal_jatuh_tempo) : "—");

                    return (
                      <tr
                        key={faktur.id}
                        className="baris-klik"
                        onClick={() => setDetail(faktur)}
                        style={{
                          background: fIdx % 2 === 0 ? "transparent" : "rgba(0, 0, 0, 0.015)",
                        }}
                      >
                        {/* 1. NO (rowspan grup) */}
                        {fIdx === 0 && (
                          <td
                            rowSpan={rowSpan}
                            style={{
                              textAlign: "center",
                              fontWeight: 800,
                              color: "var(--ink)",
                              verticalAlign: "middle",
                              borderRight: "1px solid var(--line)",
                              background: "#fff",
                            }}
                          >
                            {gIdx + 1}
                          </td>
                        )}

                        {/* 2. Tgl (rowspan grup) */}
                        {fIdx === 0 && (
                          <td
                            rowSpan={rowSpan}
                            style={{
                              textAlign: "center",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              verticalAlign: "middle",
                              borderRight: "1px solid var(--line)",
                              background: "#fff",
                            }}
                          >
                            {formatTgl(grup.tanggal)}
                          </td>
                        )}

                        {/* 3. Nama PBF (rowspan grup) */}
                        {fIdx === 0 && (
                          <td
                            rowSpan={rowSpan}
                            style={{
                              fontWeight: 800,
                              color: "var(--ink)",
                              verticalAlign: "middle",
                              borderRight: "1px solid var(--line)",
                              background: "#fff",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14 }}>{grup.namaSupplier}</span>
                              {grup.namaSupplier && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalHutangSupplier(grup.namaSupplier);
                                  }}
                                  title={`Lihat rekapitulasi semua hutang dari ${grup.namaSupplier}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    background: "#FEF2F2",
                                    color: "#DC2626",
                                    border: "1px solid #FECACA",
                                    cursor: "pointer",
                                  }}
                                >
                                  💳 Hutang
                                </button>
                              )}
                            </div>
                            {rowSpan > 1 && (
                              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                                {rowSpan} faktur sekaligus
                              </div>
                            )}
                          </td>
                        )}

                        {/* 4. Nomor Faktur */}
                        <td className="obat-batch-cell" style={{ fontWeight: 600 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                            <span>{faktur.no_faktur}</span>
                            <div style={{ display: "inline-flex", gap: 3 }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalCetakFaktur(faktur);
                                }}
                                title="Cetak faktur ini"
                                style={{
                                  padding: "2px 5px",
                                  borderRadius: 4,
                                  border: "1px solid var(--line)",
                                  background: "#FAF5FF",
                                  color: "var(--magenta-dark)",
                                  cursor: "pointer",
                                  fontSize: 10.5,
                                }}
                              >
                                🖨️
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 5. Besar Uang */}
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--ink)" }}>
                          {rupiah(faktur.total)}
                        </td>

                        {/* 6. Jumlah (Akumulasi per PBF pada tanggal tersebut, rowspan) */}
                        {fIdx === 0 && (
                          <td
                            rowSpan={rowSpan}
                            style={{
                              textAlign: "right",
                              fontWeight: 800,
                              color: "var(--magenta-dark)",
                              fontSize: 14,
                              verticalAlign: "middle",
                              borderLeft: "1px solid var(--line)",
                              borderRight: "1px solid var(--line)",
                              background: rowSpan > 1 ? "#FAF5FF" : "#fff",
                            }}
                          >
                            {rupiah(grup.totalJumlah)}
                          </td>
                        )}

                        {/* 7. Tgl Bayar & Status Toggle */}
                        <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                            <div style={{ textAlign: "left", minWidth: 65 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: isLunas ? "#15803D" : "#B91C1C" }}>
                                {isLunas ? "✓ Lunas" : "○ Tempo"}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                                {tglBayarStr}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setKonfirmasiBayar(faktur);
                              }}
                              title="Klik untuk mengubah status pembayaran"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 10px",
                                borderRadius: 16,
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                border: isLunas ? "1px solid #86EFAC" : "1px solid #FCA5A5",
                                background: isLunas ? "#DCFCE7" : "#FEF2F2",
                                color: isLunas ? "#15803D" : "#DC2626",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {isLunas ? "Lunas" : "Lunaskan"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#FAF5FF", fontWeight: 800, borderTop: "2px solid #E9D5FF" }}>
                  <td colSpan={4} style={{ textAlign: "right", padding: "11px 14px", color: "var(--ink)" }}>
                    TOTAL BESAR UANG ({daftarTampil.length} Faktur) :
                  </td>
                  <td style={{ textAlign: "right", padding: "11px 14px", color: "var(--magenta-dark)", fontSize: 14 }}>
                    {rupiah(totalTagihan)}
                  </td>
                  <td style={{ textAlign: "right", padding: "11px 14px", color: "var(--magenta-dark)", fontSize: 14 }}>
                    {rupiah(totalTagihan)}
                  </td>
                  <td style={{ textAlign: "center", padding: "11px 14px", fontSize: 12, color: "var(--ink-soft)" }}>
                    Lunas: {rupiah(totalLunas)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Pembayaran Faktur */}
      {konfirmasiBayar && (
        <div className="struk-overlay" onClick={() => !loadingToggle && setKonfirmasiBayar(null)}>
          <div className="struk-modal" style={{ maxWidth: 440, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>
              {konfirmasiBayar.status_bayar === "lunas" ? "↩️" : "✅"}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {konfirmasiBayar.status_bayar === "lunas"
                ? "Ubah Status Jadi Belum Lunas?"
                : "Tandai Faktur Sudah Lunas?"}
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5, marginBottom: 20 }}>
              Faktur <strong>{konfirmasiBayar.no_faktur}</strong> dari <strong>{konfirmasiBayar.nama_supplier}</strong> senilai <strong>{rupiah(konfirmasiBayar.total)}</strong> akan diubah statusnya menjadi{" "}
              <strong style={{ color: konfirmasiBayar.status_bayar === "lunas" ? "#DC2626" : "#15803D" }}>
                {konfirmasiBayar.status_bayar === "lunas" ? "○ Belum Lunas (Tempo)" : "✓ Lunas (Sudah Dibayar)"}
              </strong>.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={loadingToggle}
                onClick={() => setKonfirmasiBayar(null)}
                style={{ padding: "8px 18px", fontSize: 13.5 }}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={loadingToggle}
                onClick={prosesToggleBayar}
                style={{
                  padding: "8px 18px",
                  fontSize: 13.5,
                  background: konfirmasiBayar.status_bayar === "lunas" ? "#DC2626" : "#15803D",
                  borderColor: konfirmasiBayar.status_bayar === "lunas" ? "#DC2626" : "#15803D",
                }}
              >
                {loadingToggle ? "Menyimpan…" : konfirmasiBayar.status_bayar === "lunas" ? "Ya, Ubah Jadi Tempo" : "Ya, Tandai Sudah Lunas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Rincian Faktur */}
      {detail && (
        <DetailFakturModal
          data={detail}
          onClose={() => setDetail(null)}
          onLihatHutangSupplier={(sup) => {
            setDetail(null);
            setModalHutangSupplier(sup);
          }}
        />
      )}

      {/* Modal Rekapitulasi Hutang Per PT / Supplier */}
      {modalHutangSupplier !== null && (
        <RekapHutangModal
          supplierName={modalHutangSupplier}
          daftarSupplierList={supplierOptions}
          initialDariTanggal={dariTanggal}
          initialSampaiTanggal={sampaiTanggal}
          onClose={() => setModalHutangSupplier(null)}
          onLihatFaktur={(faktur) => {
            setModalHutangSupplier(null);
            setDetail(faktur);
          }}
          onStatusUpdated={() => {
            muatData();
          }}
        />
      )}

      {/* Modal Opsi Cetak & Unduh 1 Faktur */}
      {modalCetakFaktur && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setModalCetakFaktur(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              padding: 24,
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 6 }}>📄</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1E293B", margin: "0 0 6px" }}>
              Cetak / Ekspor Faktur
            </h3>
            <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 18px", lineHeight: 1.5 }}>
              Faktur <strong>{modalCetakFaktur.no_faktur}</strong> &middot; {modalCetakFaktur.nama_supplier}
              <br />
              Total Tagihan: <strong style={{ color: "#0F172A" }}>{rupiah(modalCetakFaktur.total)}</strong>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              <button
                type="button"
                onClick={() => {
                  cetakSatuFakturA4(modalCetakFaktur);
                  setModalCetakFaktur(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "11px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#FAF5FF",
                  color: "#6B21A8",
                  border: "1.5px solid #D8B4FE",
                  cursor: "pointer",
                }}
              >
                🖨️ Cetak / Simpan PDF (Format A4 Resmi)
              </button>

              <button
                type="button"
                onClick={() => {
                  exportSatuFakturExcel(modalCetakFaktur);
                  setModalCetakFaktur(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "11px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#ECFDF5",
                  color: "#065F46",
                  border: "1.5px solid #A7F3D0",
                  cursor: "pointer",
                }}
              >
                📊 Unduh Format Excel (.xls)
              </button>

              <button
                type="button"
                onClick={() => {
                  exportSatuFakturWord(modalCetakFaktur);
                  setModalCetakFaktur(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "11px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#EFF6FF",
                  color: "#1E40AF",
                  border: "1.5px solid #BFDBFE",
                  cursor: "pointer",
                }}
              >
                📝 Unduh Format Word (.doc)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setModalCetakFaktur(null)}
              style={{
                width: "100%",
                padding: "9px",
                borderRadius: 8,
                background: "#F1F5F9",
                border: "none",
                color: "#475569",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </KasirShell>
  );
}
