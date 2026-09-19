import React, { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { rupiah } from "../../../utils/format";
import { cetakDokumenA4, exportExcel, exportWord } from "../../../utils/exportDokumen";
import TombolExportGroup from "./TombolExportGroup";

function getTglYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTglIndo(tglStr) {
  if (!tglStr) return "—";
  const d = new Date(tglStr);
  if (isNaN(d.getTime())) return tglStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function hitungSelisihHari(jatuhTempoStr) {
  if (!jatuhTempoStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const jt = new Date(jatuhTempoStr);
  jt.setHours(0, 0, 0, 0);
  return Math.round((jt - now) / (1000 * 60 * 60 * 24));
}

export default function RekapHutangModal({
  supplierName = "",
  daftarSupplierList = [],
  initialDariTanggal,
  initialSampaiTanggal,
  onClose,
  onLihatFaktur,
  onStatusUpdated,
}) {
  const now = new Date();
  // Default: awal tahun ini s/d hari ini agar riwayat hutang terlihat lengkap
  const awalTahunDefault = `${now.getFullYear()}-01-01`;
  const awalBulanDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const hariIniDefault = getTglYmd(now);

  const [selectedSupplier, setSelectedSupplier] = useState(supplierName || "");
  const [daftarSupplier, setDaftarSupplier] = useState(daftarSupplierList || []);
  const [dariTanggal, setDariTanggal] = useState(initialDariTanggal || awalTahunDefault);
  const [sampaiTanggal, setSampaiTanggal] = useState(initialSampaiTanggal || hariIniDefault);
  const [filterStatus, setFilterStatus] = useState("belum"); // default fokus ke "belum" (hutang)
  const [fakturs, setFakturs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notif, setNotif] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  // Ambil daftar supplier jika belum ada
  useEffect(() => {
    if (!daftarSupplier || daftarSupplier.length === 0) {
      api("/suppliers")
        .then((res) => {
          if (Array.isArray(res)) {
            const list = res.map((s) => s.nama).filter(Boolean);
            setDaftarSupplier(list);
            if (!selectedSupplier && list.length > 0) {
              setSelectedSupplier(list[0]);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Muat data faktur untuk supplier & rentang tanggal yang dipilih
  function muatData() {
    if (!selectedSupplier) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    params.set("nama_supplier", selectedSupplier);
    if (dariTanggal) params.set("dari_tanggal", dariTanggal);
    if (sampaiTanggal) params.set("sampai_tanggal", sampaiTanggal);

    api(`/penerimaan?${params.toString()}`)
      .then((res) => {
        setFakturs(res || []);
        setError("");
      })
      .catch((err) => setError(err.message || "Gagal memuat rekap penerimaan"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    muatData();
  }, [selectedSupplier, dariTanggal, sampaiTanggal]);

  // Filter status bayar
  const fakturTampil = fakturs.filter((f) => {
    if (filterStatus === "belum") return f.status_bayar === "belum";
    if (filterStatus === "lunas") return f.status_bayar === "lunas";
    return true;
  });

  // Perhitungan KPI
  const totalTagihanSemua = fakturs.reduce((acc, f) => acc + Number(f.total || 0), 0);
  const totalLunas = fakturs.filter((f) => f.status_bayar === "lunas").reduce((acc, f) => acc + Number(f.total || 0), 0);
  const totalHutang = fakturs.filter((f) => f.status_bayar === "belum").reduce((acc, f) => acc + Number(f.total || 0), 0);

  // Toggle Bayar langsung dari modal
  async function handleToggleBayar(faktur) {
    setTogglingId(faktur.id);
    try {
      const res = await api(`/penerimaan/${faktur.id}/toggle-bayar`, { method: "PUT" });
      setFakturs((prev) =>
        prev.map((f) => (f.id === faktur.id ? { ...f, status_bayar: res.penerimaan.status_bayar, tanggal_bayar: res.penerimaan.tanggal_bayar } : f))
      );
      setNotif(`Status faktur ${faktur.no_faktur} diubah menjadi ${res.penerimaan.status_bayar === "lunas" ? "Lunas" : "Belum Lunas"}`);
      setTimeout(() => setNotif(""), 3500);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      alert("Gagal mengubah status: " + err.message);
    } finally {
      setTogglingId(null);
    }
  }

  // Preset tanggal
  function terapkanPreset(preset) {
    if (preset === "bulan-ini") {
      setDariTanggal(awalBulanDefault);
      setSampaiTanggal(hariIniDefault);
    } else if (preset === "3-bulan") {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      setDariTanggal(getTglYmd(d));
      setSampaiTanggal(hariIniDefault);
    } else if (preset === "tahun-ini") {
      setDariTanggal(awalTahunDefault);
      setSampaiTanggal(hariIniDefault);
    } else if (preset === "semua") {
      setDariTanggal("");
      setSampaiTanggal("");
    }
  }

  // Export Data
  function siapkanDataExport() {
    const headers = [
      { label: "No.", align: "center", width: "35px" },
      { label: "No. Faktur", align: "left" },
      { label: "Tgl Terima", align: "center" },
      { label: "Jatuh Tempo", align: "center" },
      { label: "Total Tagihan", align: "right" },
      { label: "Status Bayar", align: "center" },
      { label: "Tgl Bayar", align: "center" },
    ];

    let totalNominal = 0;
    const rows = fakturTampil.map((f, idx) => {
      totalNominal += Number(f.total || 0);
      return [
        idx + 1,
        f.no_faktur || "—",
        formatTglIndo(f.tanggal_terima),
        formatTglIndo(f.tanggal_jatuh_tempo),
        rupiah(f.total),
        f.status_bayar === "lunas" ? "LUNAS" : "BELUM LUNAS",
        f.tanggal_bayar ? formatTglIndo(f.tanggal_bayar) : "—",
      ];
    });

    const footers = [
      [
        { label: `Total (${rows.length} Faktur) :`, colspan: 4, align: "right" },
        { label: rupiah(totalNominal), align: "right" },
        { label: "-", align: "center", colspan: 2 },
      ],
    ];

    const labelRentang = (dariTanggal || sampaiTanggal)
      ? `${dariTanggal ? formatTglIndo(dariTanggal) : "Awal"} s/d ${sampaiTanggal ? formatTglIndo(sampaiTanggal) : "Hari Ini"}`
      : "Semua Waktu";

    return {
      judul: `REKAP HUTANG & TAGIHAN: ${selectedSupplier.toUpperCase()}`,
      periode: labelRentang,
      keterangan: `Sisa Hutang: ${rupiah(totalHutang)} · Sudah Lunas: ${rupiah(totalLunas)}`,
      headers,
      rows,
      footers,
    };
  }

  function handleCetak() {
    const d = siapkanDataExport();
    cetakDokumenA4({
      judul: d.judul,
      periode: d.periode,
      keterangan: d.keterangan,
      headers: d.headers,
      rows: d.rows,
      footers: d.footers,
      orientation: "portrait",
    });
  }

  function handleExportExcel() {
    const d = siapkanDataExport();
    exportExcel({
      filename: `rekap-hutang-${selectedSupplier}-${dariTanggal || "all"}-${sampaiTanggal || "all"}`,
      judul: d.judul,
      periode: d.periode,
      keterangan: d.keterangan,
      headers: d.headers,
      rows: d.rows,
      footers: d.footers,
    });
  }

  function handleExportWord() {
    const d = siapkanDataExport();
    exportWord({
      filename: `rekap-hutang-${selectedSupplier}-${dariTanggal || "all"}-${sampaiTanggal || "all"}`,
      judul: d.judul,
      periode: d.periode,
      keterangan: d.keterangan,
      headers: d.headers,
      rows: d.rows,
      footers: d.footers,
    });
  }

  return (
    <div
      className="modal-faktur-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-faktur-box"
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 920,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1.5px solid var(--line, #E2E8F0)",
            background: "#FAF5FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🏢</span>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#4A044E", margin: 0 }}>
                Rekap Hutang & Faktur Supplier
              </h3>
            </div>
            <p style={{ fontSize: 12, color: "#701A75", margin: "3px 0 0" }}>
              Filter rentang tanggal untuk mengecek jatuh tempo & total hutang faktur
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <TombolExportGroup
              onCetakPdf={handleCetak}
              onExportExcel={handleExportExcel}
              onExportWord={handleExportWord}
              disabled={fakturTampil.length === 0}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              style={{
                background: "#F3E8FF",
                border: "none",
                borderRadius: "50%",
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#701A75",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 18, height: 18 }}>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notifikasi / Error */}
        {notif && (
          <div style={{ background: "#ECFDF5", color: "#065F46", padding: "10px 20px", fontSize: 13, fontWeight: 600, borderBottom: "1px solid #A7F3D0" }}>
            ✓ {notif}
          </div>
        )}
        {error && (
          <div style={{ background: "#FEF2F2", color: "#991B1B", padding: "10px 20px", fontSize: 13, fontWeight: 600, borderBottom: "1px solid #FECACA" }}>
            ⚠ {error}
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: "18px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* BARIS KONTROL & FILTER */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              {/* Dropdown Supplier */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 260 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>
                  Nama PT / Supplier:
                </span>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 9,
                    border: "1.5px solid #CBD5E1",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "#0F172A",
                    background: "#fff",
                    outline: "none",
                  }}
                >
                  {daftarSupplier.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preset Tanggal Shortcut */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>Preset:</span>
                <button
                  type="button"
                  onClick={() => terapkanPreset("bulan-ini")}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 6,
                    border: "1px solid #CBD5E1",
                    background: "#fff",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => terapkanPreset("3-bulan")}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 6,
                    border: "1px solid #CBD5E1",
                    background: "#fff",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  3 Bulan
                </button>
                <button
                  type="button"
                  onClick={() => terapkanPreset("tahun-ini")}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 6,
                    border: "1px solid #CBD5E1",
                    background: "#fff",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Tahun Ini
                </button>
                <button
                  type="button"
                  onClick={() => terapkanPreset("semua")}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 6,
                    border: "1px solid #CBD5E1",
                    background: "#fff",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Semua Waktu
                </button>
              </div>
            </div>

            {/* Filter Tanggal Dari - Sampai & Filter Status */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, borderTop: "1px solid #E2E8F0", paddingTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#475569" }}>
                  <span>Dari:</span>
                  <input
                    type="date"
                    value={dariTanggal}
                    onChange={(e) => setDariTanggal(e.target.value)}
                    style={{
                      padding: "6px 9px",
                      borderRadius: 7,
                      border: "1.5px solid #CBD5E1",
                      fontSize: 12.5,
                      background: "#fff",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#475569" }}>
                  <span>Sampai:</span>
                  <input
                    type="date"
                    value={sampaiTanggal}
                    onChange={(e) => setSampaiTanggal(e.target.value)}
                    style={{
                      padding: "6px 9px",
                      borderRadius: 7,
                      border: "1.5px solid #CBD5E1",
                      fontSize: 12.5,
                      background: "#fff",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Status Chips */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setFilterStatus("belum")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: filterStatus === "belum" ? "1.5px solid #DC2626" : "1px solid #CBD5E1",
                    background: filterStatus === "belum" ? "#FEF2F2" : "#fff",
                    color: filterStatus === "belum" ? "#DC2626" : "#475569",
                  }}
                >
                  ○ Hutang (Belum Lunas)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("lunas")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: filterStatus === "lunas" ? "1.5px solid #15803D" : "1px solid #CBD5E1",
                    background: filterStatus === "lunas" ? "#F0FDF4" : "#fff",
                    color: filterStatus === "lunas" ? "#15803D" : "#475569",
                  }}
                >
                  ✓ Sudah Lunas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("semua")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: filterStatus === "semua" ? "1.5px solid var(--magenta)" : "1px solid #CBD5E1",
                    background: filterStatus === "semua" ? "#FAF5FF" : "#fff",
                    color: filterStatus === "semua" ? "#6B21A8" : "#475569",
                  }}
                >
                  Semua Faktur
                </button>
              </div>
            </div>
          </div>

          {/* 4 KARTU RINGKASAN KPI */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>Total Faktur</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", marginTop: 2 }}>{fakturs.length} Faktur</div>
              <div style={{ fontSize: 10.5, color: "#94A3B8" }}>Dalam rentang waktu ini</div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>Total Nilai Faktur</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--magenta-dark)", marginTop: 2 }}>{rupiah(totalTagihanSemua)}</div>
              <div style={{ fontSize: 10.5, color: "#94A3B8" }}>Jumlah seluruh tagihan</div>
            </div>

            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11.5, color: "#166534", fontWeight: 600 }}>✓ Sudah Dibayar (Lunas)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#15803D", marginTop: 2 }}>{rupiah(totalLunas)}</div>
              <div style={{ fontSize: 10.5, color: "#86EFAC" }}>Telah dilunasi</div>
            </div>

            <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11.5, color: "#991B1B", fontWeight: 700 }}>○ Sisa Hutang (Belum Lunas)</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#DC2626", marginTop: 2 }}>{rupiah(totalHutang)}</div>
              <div style={{ fontSize: 10.5, color: "#F87171", fontWeight: 600 }}>Wajib dibayar ke supplier</div>
            </div>
          </div>

          {/* TABEL FAKTUR SUPPLIER */}
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflowX: "auto" }}>
            <table className="obat-table" style={{ width: "100%", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={{ textAlign: "center", width: 35 }}>No</th>
                  <th style={{ textAlign: "left" }}>No. Faktur</th>
                  <th style={{ textAlign: "center" }}>Tgl Terima</th>
                  <th style={{ textAlign: "center" }}>Jatuh Tempo</th>
                  <th style={{ textAlign: "right" }}>Besar Uang</th>
                  <th style={{ textAlign: "center" }}>Status Bayar</th>
                  <th style={{ textAlign: "center", width: 150 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px 0", color: "#64748B" }}>
                      Memuat data faktur...
                    </td>
                  </tr>
                ) : fakturTampil.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "28px 0", color: "#64748B" }}>
                      Tidak ada data faktur pada rentang tanggal & status ini.
                    </td>
                  </tr>
                ) : (
                  fakturTampil.map((f, idx) => {
                    const sHari = hitungSelisihHari(f.tanggal_jatuh_tempo);
                    const isLunas = f.status_bayar === "lunas";
                    let badgeJatuhTempo = null;

                    if (!isLunas && sHari !== null) {
                      if (sHari < 0) {
                        badgeJatuhTempo = (
                          <span style={{ display: "block", fontSize: 10, color: "#DC2626", fontWeight: 700 }}>
                            ⚠️ Telat {Math.abs(sHari)} hari
                          </span>
                        );
                      } else if (sHari <= 7) {
                        badgeJatuhTempo = (
                          <span style={{ display: "block", fontSize: 10, color: "#D97706", fontWeight: 700 }}>
                            ⏳ Sisa {sHari} hari
                          </span>
                        );
                      }
                    }

                    return (
                      <tr key={f.id} style={{ background: isLunas ? "#fff" : "#FFFBFB" }}>
                        <td style={{ textAlign: "center", color: "#64748B" }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: "#0F172A" }}>{f.no_faktur}</td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          {formatTglIndo(f.tanggal_terima)}
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <div>{formatTglIndo(f.tanggal_jatuh_tempo)}</div>
                          {badgeJatuhTempo}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: isLunas ? "#0F172A" : "#DC2626" }}>
                          {rupiah(f.total)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isLunas ? "#DCFCE7" : "#FEE2E2",
                              color: isLunas ? "#15803D" : "#DC2626",
                              border: isLunas ? "1px solid #BBF7D0" : "1px solid #FECACA",
                            }}
                          >
                            {isLunas ? "✓ Lunas" : "○ Belum Lunas"}
                          </span>
                          {f.tanggal_bayar && isLunas && (
                            <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
                              {formatTglIndo(f.tanggal_bayar)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            {onLihatFaktur && (
                              <button
                                type="button"
                                onClick={() => onLihatFaktur(f)}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: 11.5,
                                  borderRadius: 6,
                                  border: "1px solid #CBD5E1",
                                  background: "#fff",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                Lihat
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={togglingId === f.id}
                              onClick={() => handleToggleBayar(f)}
                              style={{
                                padding: "4px 8px",
                                fontSize: 11.5,
                                borderRadius: 6,
                                border: isLunas ? "1px solid #E2E8F0" : "1px solid #86EFAC",
                                background: isLunas ? "#F8FAFC" : "#DCFCE7",
                                color: isLunas ? "#64748B" : "#15803D",
                                cursor: "pointer",
                                fontWeight: 700,
                              }}
                            >
                              {togglingId === f.id ? "…" : isLunas ? "Batal Lunas" : "Lunasi"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
