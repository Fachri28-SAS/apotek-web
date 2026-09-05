import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import { useAuth } from "../../context/useAuth";
import KasirShell from "./KasirShell";

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

export default function LaporanPengeluaran() {
  const { user } = useAuth();
  const [periode, setPeriode] = useState("bulan-ini");
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
    api("/pengeluaran?periode=" + periode)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    muatData();
  }, [periode]);

  const labelPeriode = PERIODE.find((p) => p.key === periode)?.label || "";

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

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Laporan Pengeluaran</h1>
          <p className="halaman-sub">Pencatatan kas keluar operasional dan rekap faktur pembelian obat</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="periode-chips">
            {PERIODE.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`periode-chip ${periode === p.key ? "active" : ""}`}
                onClick={() => setPeriode(p.key)}
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

      {/* KPI GRID */}
      <div className="kpi-grid">
        {/* Total Keseluruhan Pengeluaran */}
        <div className="kpi-card merah" style={{ border: "1.5px solid #FCA5A5" }}>
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div>
            <div className="kpi-angka" style={{ color: "#DC2626" }}>
              {loading ? "…" : rupiah(data?.kpi?.total_pengeluaran || 0)}
            </div>
            <div className="kpi-label" style={{ color: "#991B1B" }}>Total Seluruh Pengeluaran</div>
            <div className="kpi-sub">Operasional + Kulakan ({labelPeriode})</div>
          </div>
        </div>

        {/* Pembelian Obat (Faktur Supplier) */}
        <div className="kpi-card biru">
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div>
            <div className="kpi-angka">{loading ? "…" : rupiah(data?.kpi?.total_pembelian_obat || 0)}</div>
            <div className="kpi-label">Pembelian Obat (Supplier)</div>
            <div className="kpi-sub">Faktur barang masuk ({labelPeriode})</div>
          </div>
        </div>

        {/* Gaji Karyawan */}
        <div className="kpi-card hijau" style={{ border: "1.5px solid #86EFAC" }}>
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div>
            <div className="kpi-angka" style={{ color: "var(--green-dark)" }}>
              {loading ? "…" : rupiah(data?.kpi?.total_gaji || 0)}
            </div>
            <div className="kpi-label" style={{ color: "var(--green-dark)" }}>Gaji Karyawan</div>
            <div className="kpi-sub">Gaji kasir & staf ({labelPeriode})</div>
          </div>
        </div>

        {/* Biaya Operasional Lainnya */}
        <div className="kpi-card kuning">
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div>
            <div className="kpi-angka">
              {loading ? "…" : rupiah(Math.max(0, (data?.kpi?.total_operasional || 0) - (data?.kpi?.total_gaji || 0)))}
            </div>
            <div className="kpi-label">Operasional & Listrik</div>
            <div className="kpi-sub">Di luar gaji ({labelPeriode})</div>
          </div>
        </div>

        {/* Jumlah Catatan */}
        <div className="kpi-card ungu">
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </div>
          <div>
            <div className="kpi-angka">{loading ? "…" : data?.kpi?.jumlah_catatan || 0}</div>
            <div className="kpi-label">Jumlah Catatan</div>
            <div className="kpi-sub">{labelPeriode}</div>
          </div>
        </div>
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
          <button
            className="btn-tambah"
            onClick={exportCSV}
            disabled={!data || (!data.operasional?.length && !data.penerimaan?.length)}
            style={{ fontSize: 12.5 }}
          >
            Export CSV
          </button>
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
