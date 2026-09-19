import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import { useAuth } from "../../context/useAuth";
import { cetakDokumenA4, exportExcel, exportWord } from "../../utils/exportDokumen";
import KasirShell from "./KasirShell";
import TombolExportGroup from "./komponen/TombolExportGroup";

const PERIODE = [
  { key: "hari-ini", label: "Hari Ini" },
  { key: "minggu-ini", label: "Minggu Ini" },
  { key: "bulan-ini", label: "Bulan Ini" },
  { key: "bulan-lalu", label: "Bulan Lalu" },
];

const KATEGORI_OPTIONS = [
  { key: "gaji", label: "Gaji Karyawan", badgeColor: "#15803D", bg: "#DCFCE7" },
  { key: "operasional", label: "Operasional Harian", badgeColor: "#A64BC7", bg: "#F3E8FF" },
  { key: "listrik_air", label: "Listrik, Air & Internet", badgeColor: "#D97706", bg: "#FEF3C7" },
  { key: "perlengkapan", label: "ATK & Perlengkapan", badgeColor: "#BE185D", bg: "#FCE7F3" },
  { key: "sewa", label: "Sewa & Tempat", badgeColor: "#4338CA", bg: "#EEF2FF" },
  { key: "pemeliharaan", label: "Perawatan & Kebersihan", badgeColor: "#0F766E", bg: "#CCFBF1" },
  { key: "lainnya", label: "Lain-lain", badgeColor: "#475569", bg: "#F1F5F9" },
];

function getTglYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTglIndo(tglStr) {
  if (!tglStr) return "";
  const d = new Date(tglStr);
  if (isNaN(d.getTime())) return tglStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getPresetRange(key) {
  const now = new Date();
  if (key === "hari-ini") {
    const tgl = getTglYmd(now);
    return { dari: tgl, sampai: tgl };
  }
  if (key === "minggu-ini") {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { dari: getTglYmd(mon), sampai: getTglYmd(sun) };
  }
  if (key === "bulan-ini") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dari: getTglYmd(start), sampai: getTglYmd(now) };
  }
  if (key === "bulan-lalu") {
    const startM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endM = new Date(now.getFullYear(), now.getMonth(), 0);
    return { dari: getTglYmd(startM), sampai: getTglYmd(endM) };
  }
  return { dari: getTglYmd(now), sampai: getTglYmd(now) };
}

export default function LaporanPengeluaran() {
  const { user } = useAuth();
  const initRange = getPresetRange("hari-ini");
  const [periode, setPeriode] = useState("hari-ini");
  const [dariTanggal, setDariTanggal] = useState(initRange.dari);
  const [sampaiTanggal, setSampaiTanggal] = useState(initRange.sampai);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tabAktif, setTabAktif] = useState("operasional"); // 'operasional' | 'gaji' | 'supplier'
  const [karyawanList, setKaryawanList] = useState([]);

  // Modal State
  const [modalBuka, setModalBuka] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    kategori: "gaji",
    nama_pengeluaran: "",
    nominal: "",
    metode_bayar: "transfer",
    keterangan: "",
  });

  useEffect(() => {
    api("/users")
      .then((users) => setKaryawanList(users || []))
      .catch(() => {});
  }, []);

  function muatData() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("periode", periode);
    if (dariTanggal) params.set("dari_tanggal", dariTanggal);
    if (sampaiTanggal) params.set("sampai_tanggal", sampaiTanggal);

    Promise.all([
      api(`/pengeluaran?${params}`),
      api(`/laporan?${params}`).catch(() => null),
    ])
      .then(([pengeluaranData, laporanData]) => {
        const labaKotor = laporanData?.kpi?.total_pendapatan ?? pengeluaranData?.kpi?.total_laba_penjualan ?? 0;
        const marginPersen = laporanData?.kpi?.margin_persen ?? null;
        const totalGaji = pengeluaranData?.kpi?.total_gaji ?? 0;
        const totalOperasionalNonGaji = Math.max(0, (pengeluaranData?.kpi?.total_operasional ?? 0) - totalGaji);
        const totalBeban = pengeluaranData?.kpi?.total_operasional ?? 0;
        const pendapatanBersih = labaKotor - totalBeban;

        setData({
          ...pengeluaranData,
          kpi: {
            ...pengeluaranData?.kpi,
            total_laba_penjualan: labaKotor,
            total_pendapatan: labaKotor,
            margin_persen: marginPersen,
            total_gaji: totalGaji,
            total_operasional_non_gaji: totalOperasionalNonGaji,
            pendapatan_bersih: pendapatanBersih,
          },
        });
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    muatData();
  }, [periode, dariTanggal, sampaiTanggal]);

  function pilihPreset(pKey) {
    const range = getPresetRange(pKey);
    setPeriode(pKey);
    setDariTanggal(range.dari);
    setSampaiTanggal(range.sampai);
  }

  const labelPeriode = periode === "custom"
    ? (dariTanggal === sampaiTanggal ? formatTglIndo(dariTanggal) : `${formatTglIndo(dariTanggal)} s/d ${formatTglIndo(sampaiTanggal)}`)
    : ((PERIODE.find((p) => p.key === periode)?.label || "Periode") + (dariTanggal ? ` (${dariTanggal === sampaiTanggal ? formatTglIndo(dariTanggal) : `${formatTglIndo(dariTanggal)} - ${formatTglIndo(sampaiTanggal)}`})` : ""));

  async function handleSimpan(e) {
    e.preventDefault();
    if (!form.nama_pengeluaran.trim()) {
      setFormError("Nama pengeluaran wajib diisi.");
      return;
    }
    const nominalNum = parseFloat(form.nominal);
    if (!nominalNum || nominalNum <= 0) {
      setFormError("Nominal harus lebih besar dari 0.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await api("/pengeluaran", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          nominal: nominalNum,
        }),
      });
      setModalBuka(false);
      setForm({
        tanggal: new Date().toISOString().slice(0, 10),
        kategori: "operasional",
        nama_pengeluaran: "",
        nominal: "",
        metode_bayar: "tunai",
        keterangan: "",
      });
      muatData();
    } catch (err) {
      setFormError(err.message || "Gagal menyimpan pengeluaran.");
    } finally {
      setSaving(false);
    }
  }

  async function handleHapus(id, nama) {
    if (!window.confirm(`Yakin ingin menghapus catatan pengeluaran "${nama}"?`)) return;
    try {
      await api(`/pengeluaran/${id}`, { method: "DELETE" });
      muatData();
    } catch (err) {
      alert("Gagal menghapus: " + err.message);
    }
  }

  function exportCSV() {
    if (!data) return;
    let header = "Jenis,Tanggal,Kategori / Supplier,Nama / No. Faktur,Nominal,Metode / Status,Catatan,Kasir\n";
    const barisOperasional = (data.operasional || []).map((o) => {
      const kat = KATEGORI_OPTIONS.find((k) => k.key === o.kategori)?.label || o.kategori;
      return [
        "Operasional",
        o.tanggal,
        `"${kat}"`,
        `"${o.nama_pengeluaran}"`,
        o.nominal,
        o.metode_bayar,
        `"${o.keterangan || ""}"`,
        `"${o.nama_kasir || ""}"`,
      ].join(",");
    });

    const barisSupplier = (data.penerimaan || []).map((p) => {
      return [
        "Pembelian Obat",
        p.tanggal_terima,
        `"${p.nama_supplier}"`,
        `"${p.no_faktur}"`,
        p.total,
        p.status_bayar,
        `"Jatuh Tempo: ${p.tanggal_jatuh_tempo || "-"}"`,
        `"Faktur PBF"`,
      ].join(",");
    });

    const rows = [...barisOperasional, ...barisSupplier].join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-pengeluaran-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function siapkanDataExportPengeluaran() {
    if (!data) return { headers: [], rows: [], footers: [], keterangan: "", judul: "LAPORAN PENGELUARAN" };

    let headers = [];
    let rows = [];
    let footers = [];
    let keterangan = "";
    let judul = "LAPORAN PENGELUARAN";

    if (tabAktif === "supplier") {
      judul = "LAPORAN PEMBELIAN SUPPLIER";
      keterangan = "";
      headers = [
        { label: "No.", align: "center", width: "35px" },
        { label: "Tanggal Terima", align: "center" },
        { label: "Nama Supplier", align: "left" },
        { label: "No. Faktur", align: "left" },
        { label: "Total Faktur", align: "right" },
        { label: "Status Bayar", align: "center" },
        { label: "Jatuh Tempo", align: "center" },
      ];

      let totalFaktur = 0;
      rows = (data.penerimaan || []).map((p, idx) => {
        totalFaktur += Number(p.total || 0);
        return [
          idx + 1,
          p.tanggal_terima ? new Date(p.tanggal_terima).toLocaleDateString("id-ID") : "-",
          p.nama_supplier || "-",
          p.no_faktur || "-",
          rupiah(p.total),
          p.status_bayar === "lunas" ? "LUNAS" : "BELUM LUNAS",
          p.tanggal_jatuh_tempo ? new Date(p.tanggal_jatuh_tempo).toLocaleDateString("id-ID") : "-",
        ];
      });

      footers = [
        [
          { label: `Total (${rows.length} Faktur) :`, colspan: 4, align: "right" },
          { label: rupiah(totalFaktur), align: "right" },
          { label: "-", align: "center", colspan: 2 },
        ],
      ];
    } else {
      const isGaji = tabAktif === "gaji";
      judul = isGaji ? "LAPORAN GAJI KARYAWAN" : "LAPORAN BIAYA OPERASIONAL";
      keterangan = "";

      headers = [
        { label: "No.", align: "center", width: "35px" },
        { label: "Tanggal", align: "center" },
        { label: "Kategori", align: "left" },
        { label: "Nama Pengeluaran", align: "left" },
        { label: "Nominal", align: "right" },
        { label: "Metode", align: "center" },
        { label: "Keterangan", align: "left" },
        { label: "Pencatat", align: "left" },
      ];

      const listOperasional = isGaji
        ? (data.operasional || []).filter((o) => o.kategori === "gaji")
        : (data.operasional || []);

      let totalNominal = 0;
      rows = listOperasional.map((o, idx) => {
        const katLabel = KATEGORI_OPTIONS.find((k) => k.key === o.kategori)?.label || o.kategori;
        totalNominal += Number(o.nominal || 0);
        return [
          idx + 1,
          o.tanggal ? new Date(o.tanggal).toLocaleDateString("id-ID") : "-",
          katLabel,
          o.nama_pengeluaran,
          rupiah(o.nominal),
          o.metode_bayar ? o.metode_bayar.toUpperCase() : "-",
          o.keterangan || "-",
          o.nama_kasir || "-",
        ];
      });

      footers = [
        [
          { label: `Total (${rows.length} Catatan) :`, colspan: 4, align: "right" },
          { label: rupiah(totalNominal), align: "right" },
          { label: "-", align: "center", colspan: 3 },
        ],
      ];
    }

    return { judul, headers, rows, footers, keterangan };
  }

  function handleCetakPengeluaran() {
    const { judul, headers, rows, footers, keterangan } = siapkanDataExportPengeluaran();
    cetakDokumenA4({
      judul,
      periode: labelPeriode,
      keterangan,
      headers,
      rows,
      footers,
      orientation: "portrait",
      namaUser: user?.nama || "Admin / Kasir",
    });
  }

  function handleExcelPengeluaran() {
    const { judul, headers, rows, footers, keterangan } = siapkanDataExportPengeluaran();
    exportExcel({
      filename: `pengeluaran-${tabAktif}-${periode}`,
      judul,
      periode: labelPeriode,
      keterangan,
      headers,
      rows,
      footers,
    });
  }

  function handleWordPengeluaran() {
    const { judul, headers, rows, footers, keterangan } = siapkanDataExportPengeluaran();
    exportWord({
      filename: `pengeluaran-${tabAktif}-${periode}`,
      judul,
      periode: labelPeriode,
      keterangan,
      headers,
      rows,
      footers,
      orientation: "portrait",
      namaUser: user?.nama || "Admin / Kasir",
    });
  }

  return (
    <KasirShell>
      <div className="halaman-header" style={{ flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 24 }}>Laporan Pengeluaran</h1>
          <p className="halaman-sub">{labelPeriode} &middot; Pencatatan kas keluar operasional dan rekap faktur pembelian obat</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Kalender Filter Tanggal */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
            <span>Dari:</span>
            <input
              type="date"
              value={dariTanggal}
              onChange={(e) => {
                setDariTanggal(e.target.value);
                setPeriode("custom");
              }}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                border: "1.5px solid var(--line)",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
                background: "#fff",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
            <span>Sampai:</span>
            <input
              type="date"
              value={sampaiTanggal}
              onChange={(e) => {
                setSampaiTanggal(e.target.value);
                setPeriode("custom");
              }}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                border: "1.5px solid var(--line)",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
                background: "#fff",
              }}
            />
          </div>

          {/* Preset Chips */}
          <div className="periode-chips" style={{ margin: 0 }}>
            {PERIODE.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`periode-chip ${periode === p.key ? "active" : ""}`}
                onClick={() => pilihPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-tambah"
            onClick={() => {
              setFormError("");
              setModalBuka(true);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 16, height: 16 }}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Catat Pengeluaran
          </button>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      {/* KPI GRID 4 KOLOM BERJAJAR */}
      <div className="kpi-grid kpi-grid-4">
        {/* 1. Total Pendapatan (Laba) - Persis sama dari Laporan Penjualan */}
        <div className="kpi-card hijau" style={{ border: "1.5px solid #86EFAC" }}>
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 5 }}>
              <span className="kpi-angka" style={{ color: "var(--green-dark)" }}>
                {loading ? "…" : rupiah(data?.kpi?.total_pendapatan ?? data?.kpi?.total_laba_penjualan ?? 0)}
              </span>
              {!loading && data?.kpi?.margin_persen != null && (
                <span className={"kpi-margin-badge " + (data.kpi.margin_persen >= 15 ? "" : "warning")}>
                  {data.kpi.margin_persen}% Margin
                </span>
              )}
            </div>
            <div className="kpi-label" style={{ color: "var(--green-dark)" }}>Total Pendapatan (Laba)</div>
            <div className="kpi-sub">Selisih jual - beli</div>
          </div>
        </div>

        {/* 2. Gaji Karyawan */}
        <div className="kpi-card biru">
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div>
            <div className="kpi-angka">
              {loading ? "…" : rupiah(data?.kpi?.total_gaji || 0)}
            </div>
            <div className="kpi-label">Gaji Karyawan</div>
            <div className="kpi-sub">Gaji kasir & staf</div>
          </div>
        </div>

        {/* 3. Biaya Operasional */}
        <div className="kpi-card kuning">
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div>
            <div className="kpi-angka">
              {loading ? "…" : rupiah(data?.kpi?.total_operasional_non_gaji ?? Math.max(0, (data?.kpi?.total_operasional || 0) - (data?.kpi?.total_gaji || 0)))}
            </div>
            <div className="kpi-label">Biaya Operasional</div>
            <div className="kpi-sub">Listrik, air & operasional</div>
          </div>
        </div>

        {/* 4. Total Pendapatan Bersih */}
        {(() => {
          const bersih = data?.kpi?.pendapatan_bersih ?? ((data?.kpi?.total_laba_penjualan || 0) - (data?.kpi?.total_operasional || 0));
          const isPositif = bersih >= 0;
          return (
            <div className={"kpi-card " + (isPositif ? "hijau" : "merah")} style={{ border: isPositif ? "1.5px solid #86EFAC" : "1.5px solid #FCA5A5" }}>
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              </div>
              <div>
                <div className="kpi-angka" style={{ color: isPositif ? "var(--green-dark)" : "#DC2626" }}>
                  {loading ? "…" : rupiah(bersih)}
                </div>
                <div className="kpi-label" style={{ color: isPositif ? "var(--green-dark)" : "#991B1B" }}>
                  Total Pendapatan Bersih
                </div>
                <div className="kpi-sub">Laba kotor - Beban operasional</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* BREAKDOWN KATEGORI PENGELUARAN */}
      {data && data.breakdown && data.breakdown.length > 0 && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <h3>Breakdown Kategori Pengeluaran ({labelPeriode})</h3>
          </div>
          <div className="metode-breakdown">
            {data.breakdown.map((b) => (
              <div className="metode-breakdown-row" key={b.kategori}>
                <div className="metode-breakdown-head">
                  <span style={{ fontWeight: 600 }}>{b.label}</span>
                  <span>{rupiah(b.total)} ({b.persen}%)</span>
                </div>
                <div className="metode-breakdown-track">
                  <div
                    className="metode-breakdown-fill"
                    style={{ width: `${b.persen}%`, background: b.warna || "var(--magenta)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB SWITCHER & DAFTAR DATA */}
      <div className="panel">
        <div className="panel-head" style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`periode-chip ${tabAktif === "operasional" ? "active" : ""}`}
              onClick={() => setTabAktif("operasional")}
              style={{ fontWeight: 700, padding: "7px 14px" }}
            >
              Semua Operasional ({data?.operasional?.length || 0})
            </button>
            <button
              type="button"
              className={`periode-chip ${tabAktif === "gaji" ? "active" : ""}`}
              onClick={() => setTabAktif("gaji")}
              style={{ fontWeight: 700, padding: "7px 14px" }}
            >
              Khusus Gaji Karyawan ({data?.operasional?.filter((o) => o.kategori === "gaji").length || 0})
            </button>
            <button
              type="button"
              className={`periode-chip ${tabAktif === "supplier" ? "active" : ""}`}
              onClick={() => setTabAktif("supplier")}
              style={{ fontWeight: 700, padding: "7px 14px" }}
            >
              Faktur Supplier / Kulakan ({data?.penerimaan?.length || 0})
            </button>
          </div>
          <TombolExportGroup
            onCetakPdf={handleCetakPengeluaran}
            onExportExcel={handleExcelPengeluaran}
            onExportWord={handleWordPengeluaran}
            disabled={!data || (!data.operasional?.length && !data.penerimaan?.length)}
          />
        </div>

        {/* TAB 1: KAS OPERASIONAL & TAB KHUSUS GAJI */}
        {(tabAktif === "operasional" || tabAktif === "gaji") && (
          <>
            {(() => {
              const listTampil = tabAktif === "gaji"
                ? (data?.operasional || []).filter((o) => o.kategori === "gaji")
                : (data?.operasional || []);

              if (loading) return <div className="panel-kosong">Memuat data pengeluaran…</div>;
              if (!listTampil.length) {
                return (
                  <div className="panel-kosong">
                    {tabAktif === "gaji"
                      ? "Belum ada catatan pembayaran gaji karyawan pada periode ini."
                      : "Belum ada catatan pengeluaran operasional pada periode ini."}
                  </div>
                );
              }

              return (
                <div className="obat-table-wrap">
                  <table className="obat-table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Kategori</th>
                        <th>Nama Pengeluaran</th>
                        <th>Nominal</th>
                        <th>Metode</th>
                        <th>Keterangan</th>
                        <th>Kasir / Petugas</th>
                        {user?.role === "admin" && <th style={{ textAlign: "center" }}>Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {listTampil.map((item) => {
                        const katInfo = KATEGORI_OPTIONS.find((k) => k.key === item.kategori);
                        return (
                          <tr key={item.id}>
                            <td>{new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                            <td>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  color: katInfo?.badgeColor || "#475569",
                                  background: katInfo?.bg || "#F1F5F9",
                                }}
                              >
                                {katInfo?.label || item.kategori}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{item.nama_pengeluaran}</td>
                            <td style={{ fontWeight: 700, color: item.kategori === "gaji" ? "#15803D" : "#DC2626" }}>
                              -{rupiah(item.nominal)}
                            </td>
                            <td><span className="metode-badge">{item.metode_bayar}</span></td>
                            <td style={{ color: "var(--ink-soft)", fontSize: 12.5 }}>{item.keterangan || "—"}</td>
                            <td>{item.nama_kasir || "—"}</td>
                            {user?.role === "admin" && (
                              <td style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleHapus(item.id, item.nama_pengeluaran)}
                                  style={{
                                    background: "#FEE2E2",
                                    color: "#DC2626",
                                    border: "none",
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                  title="Hapus Catatan"
                                >
                                  Hapus
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </>
        )}

        {/* TAB 2: FAKTUR PEMBELIAN SUPPLIER */}
        {tabAktif === "supplier" && (
          <>
            {!loading && data && data.penerimaan && data.penerimaan.length > 0 ? (
              <div className="obat-table-wrap">
                <table className="obat-table">
                  <thead>
                    <tr>
                      <th>Tanggal Terima</th>
                      <th>No. Faktur</th>
                      <th>Supplier</th>
                      <th>Jatuh Tempo</th>
                      <th>Status Bayar</th>
                      <th>Total Tagihan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.penerimaan.map((f) => (
                      <tr key={f.id}>
                        <td>{new Date(f.tanggal_terima).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="obat-batch-cell">{f.no_faktur}</td>
                        <td style={{ fontWeight: 600 }}>{f.nama_supplier}</td>
                        <td>{f.tanggal_jatuh_tempo ? new Date(f.tanggal_jatuh_tempo).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: f.status_bayar === "lunas" ? "#15803D" : "#B45309",
                              background: f.status_bayar === "lunas" ? "#DCFCE7" : "#FEF3C7",
                            }}
                          >
                            {f.status_bayar === "lunas" ? "Lunas" : "Belum Lunas"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: "#1A56B8" }}>{rupiah(f.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="panel-kosong">{loading ? "Memuat…" : "Tidak ada transaksi pembelian obat supplier pada periode ini."}</div>
            )}
          </>
        )}
      </div>

      {/* MODAL CATAT PENGELUARAN (POP-UP FLOATING DI TENGAH) */}
      {modalBuka && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(18, 12, 28, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !saving && setModalBuka(false)}
        >
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 20,
              maxWidth: 520,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
              border: "1px solid var(--line)",
            }}
          >
            <div
              className="modal-header"
              style={{
                padding: "18px 22px 14px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#FAF5FF",
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  💸 Catat Pengeluaran Kas
                </h2>
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
                  Catat pengeluaran operasional toko atau gaji karyawan
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => !saving && setModalBuka(false)}
                disabled={saving}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "#ffffff",
                  color: "var(--ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimpan} style={{ padding: "16px 20px" }}>
              {formError && <div className="login-error" style={{ marginBottom: 12 }}>{formError}</div>}

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Tanggal Transaksi</label>
                <input
                  type="date"
                  className="input-text"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Kategori Pengeluaran</label>
                <select
                  className="input-text"
                  value={form.kategori}
                  onChange={(e) => {
                    const kat = e.target.value;
                    let namaDefault = form.nama_pengeluaran;
                    if (kat !== "gaji" && namaDefault.startsWith("Gaji ")) {
                      namaDefault = "";
                    }
                    setForm({ ...form, kategori: kat, nama_pengeluaran: namaDefault });
                  }}
                  style={{ width: "100%" }}
                >
                  {KATEGORI_OPTIONS.map((k) => (
                    <option key={k.key} value={k.key}>{k.label}</option>
                  ))}
                </select>
              </div>

              {/* Helper Selector Karyawan saat memilih Gaji Karyawan */}
              {form.kategori === "gaji" && (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#15803D" }}>
                    Pilih Karyawan / Staf
                  </label>
                  <select
                    className="input-text"
                    style={{ width: "100%", background: "#F0FDF4", borderColor: "#86EFAC" }}
                    onChange={(e) => {
                      if (e.target.value && e.target.value !== "lainnya") {
                        const tgl = new Date(form.tanggal || new Date());
                        const bulanStr = tgl.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
                        setForm({
                          ...form,
                          nama_pengeluaran: `Gaji ${e.target.value} (${bulanStr})`,
                        });
                      }
                    }}
                  >
                    <option value="">-- Pilih Nama Staf (Otomatis Isi Judul) --</option>
                    {karyawanList.map((k) => (
                      <option key={k.id} value={k.nama}>{k.nama}</option>
                    ))}
                    <option value="lainnya">Karyawan Lain (Ketik Manual)</option>
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Nama Pengeluaran</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Contoh: Beli Plastik & Kantong Obat"
                  value={form.nama_pengeluaran}
                  onChange={(e) => setForm({ ...form, nama_pengeluaran: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Nominal (Rp)</label>
                <input
                  type="number"
                  className="input-text"
                  placeholder="0"
                  value={form.nominal}
                  onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                  required
                  min="1"
                  style={{ width: "100%", fontSize: 16, fontWeight: 700 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Metode Pembayaran</label>
                <select
                  className="input-text"
                  value={form.metode_bayar}
                  onChange={(e) => setForm({ ...form, metode_bayar: e.target.value })}
                  style={{ width: "100%" }}
                >
                  <option value="tunai">Tunai / Kas Toko</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Keterangan / Catatan Tambahan (Opsional)</label>
                <textarea
                  className="input-text"
                  rows={2}
                  placeholder="Contoh: 5 pack plastik ukuran sedang untuk resep"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn-batal"
                  onClick={() => setModalBuka(false)}
                  disabled={saving}
                  style={{ padding: "8px 16px", borderRadius: 8 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-tambah"
                  disabled={saving}
                  style={{ padding: "8px 18px", borderRadius: 8 }}
                >
                  {saving ? "Menyimpan…" : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </KasirShell>
  );
}
