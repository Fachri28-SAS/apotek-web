import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import KasirShell from "./KasirShell";
import StrukModal from "./komponen/StrukModal";

const PERIODE_OPSI = [
  { key: "hari-ini", label: "Hari Ini" },
  { key: "kemarin", label: "Kemarin" },
  { key: "7-hari", label: "7 Hari Terakhir" },
  { key: "bulan-ini", label: "Bulan Ini" },
  { key: "bulan-lalu", label: "Bulan Lalu" },
  { key: "tahun-ini", label: "Tahun Ini" },
  { key: "custom", label: "Rentang Tanggal…" },
];

export default function Laporan() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [periode, setPeriode] = useState("bulan-ini");
  const [dariTanggal, setDariTanggal] = useState("");
  const [sampaiTanggal, setSampaiTanggal] = useState("");
  const [kasirId, setKasirId] = useState("");
  const [kasirList, setKasirList] = useState([]);

  const [struk, setStruk] = useState(null);

  // Ambil daftar kasir untuk dropdown filter
  useEffect(() => {
    api("/users").then(setKasirList).catch(() => setKasirList([]));
  }, []);

  function muatLaporan() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("periode", periode);
    if (kasirId) params.set("kasir_id", kasirId);
    if (periode === "custom") {
      if (dariTanggal) params.set("dari_tanggal", dariTanggal);
      if (sampaiTanggal) params.set("sampai_tanggal", sampaiTanggal);
    }

    api(`/laporan?${params}`)
      .then((res) => {
        setData(res);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (periode !== "custom" || (dariTanggal && sampaiTanggal)) {
      muatLaporan();
    }
  }, [periode, dariTanggal, sampaiTanggal, kasirId]);

  async function bukaStruk(id) {
    try {
      const hasil = await api(`/penjualan/${id}`);
      setStruk(hasil);
    } catch (e) {
      alert("Gagal memuat struk: " + e.message);
    }
  }

  function eksporCSV() {
    if (!data || !data.transaksi || data.transaksi.length === 0) {
      alert("Tidak ada data transaksi untuk diekspor.");
      return;
    }

    const headers = ["No Struk", "Tanggal", "Kasir", "Pembeli", "Metode", "Subtotal", "Diskon", "Total"];
    const rows = data.transaksi.map((t) => [
      t.no_struk,
      t.tanggal,
      `"${t.nama_kasir || ''}"`,
      `"${t.nama_pembeli || ''}"`,
      t.metode_bayar,
      t.subtotal,
      t.diskon,
      t.total
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Penjualan_Bima_Farma_${periode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const kpi = data?.kpi || {};

  return (
    <KasirShell>
      {/* Header Laporan */}
      <div className="halaman-header no-print">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>Laporan Finansial & Penjualan</h1>
          <p className="halaman-sub">
            {data?.label_periode ? `Periode: ${data.label_periode}` : "Analisis pendapatan dan performa apotek"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline-action" onClick={eksporCSV} title="Download format Excel/CSV">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Ekspor CSV
          </button>
          <button className="btn-tambah" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="panel no-print" style={{ padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div className="periode-chips" style={{ margin: 0 }}>
            {PERIODE_OPSI.map((p) => (
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

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select
              className="filter-select"
              value={kasirId}
              onChange={(e) => setKasirId(e.target.value)}
              style={{ minWidth: 150 }}
            >
              <option value="">Semua Kasir</option>
              {kasirList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Form Rentang Tanggal jika pilih custom */}
        {periode === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Dari Tanggal:</label>
            <input
              type="date"
              className="filter-date-input"
              value={dariTanggal}
              onChange={(e) => setDariTanggal(e.target.value)}
            />
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Sampai Tanggal:</label>
            <input
              type="date"
              className="filter-date-input"
              value={sampaiTanggal}
              onChange={(e) => setSampaiTanggal(e.target.value)}
            />
            <button
              className="btn-tambah"
              style={{ padding: "7px 16px", fontSize: 13 }}
              onClick={muatLaporan}
            >
              Terapkan
            </button>
          </div>
        )}
      </div>

      {error && <div className="login-error">{error}</div>}

      {/* Header khusus Print */}
      <div className="print-header" style={{ display: "none" }}>
        <h2 style={{ textAlign: "center", margin: 0 }}>APOTEK BIMA FARMA</h2>
        <p style={{ textAlign: "center", fontSize: 12, color: "#666", marginBottom: 15 }}>
          Laporan Rekapitulasi Finansial — Periode: {data?.label_periode}
        </p>
      </div>

      {loading ? (
        <div className="panel-kosong" style={{ padding: 40 }}>Memuat data laporan…</div>
      ) : (
        <>
          {/* KPI Utama */}
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 20 }}>
            {/* 1. Total Omzet */}
            <div className="kpi-card ungu">
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <div className="kpi-angka" style={{ fontSize: 22, color: "var(--magenta-dark)" }}>
                  {rupiah(kpi.total_omzet || 0)}
                </div>
                <div className="kpi-label">Total Omzet Penjualan</div>
                <div className="kpi-sub">{kpi.total_transaksi || 0} Transaksi Lunas</div>
              </div>
            </div>

            {/* 2. Estimasi Laba Kotor */}
            <div className="kpi-card hijau" style={{ background: "var(--green-tint)" }}>
              <div className="kpi-icon" style={{ background: "rgba(57, 160, 72, 0.15)", color: "var(--green-dark)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <div>
                <div className="kpi-angka" style={{ fontSize: 22, color: "var(--green-dark)" }}>
                  {rupiah(kpi.laba_kotor || 0)}
                </div>
                <div className="kpi-label">Estimasi Laba Kotor</div>
                <div className="kpi-sub" style={{ color: "var(--green-dark)", fontWeight: 700 }}>
                  Margin Keuntungan: {kpi.margin_persen || 0}%
                </div>
              </div>
            </div>

            {/* 3. Total HPP / Modal */}
            <div className="kpi-card" style={{ background: "#F5F5F7" }}>
              <div className="kpi-icon" style={{ background: "#E5E5EA", color: "#555" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <div>
                <div className="kpi-angka" style={{ fontSize: 22, color: "var(--ink)" }}>
                  {rupiah(kpi.total_hpp || 0)}
                </div>
                <div className="kpi-label">Total HPP / Modal Pokok</div>
                <div className="kpi-sub">Modal obat terjual</div>
              </div>
            </div>

            {/* 4. Total Obat Terjual */}
            <div className="kpi-card kuning">
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="6" width="18" height="13" rx="2" />
                  <path d="M8 6V4h8v2" />
                </svg>
              </div>
              <div>
                <div className="kpi-angka" style={{ fontSize: 22 }}>
                  {kpi.total_item_terjual || 0}
                </div>
                <div className="kpi-label">Item Obat Terjual</div>
                <div className="kpi-sub">Rata-rata: {rupiah(kpi.rata_transaksi || 0)} / struk</div>
              </div>
            </div>
          </div>

          {/* 2 Kolom: Metode Pembayaran & Kinerja Kasir */}
          <div className="dashboard-2kolom" style={{ marginBottom: 20 }}>
            {/* Metode Pembayaran */}
            <div className="panel">
              <div className="panel-head">
                <h3>Metode Pembayaran</h3>
              </div>
              {data?.metode_pembayaran?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {data.metode_pembayaran.map((m) => (
                    <div key={m.metode} style={{ background: "var(--bg)", padding: 14, borderRadius: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ textTransform: "uppercase", fontWeight: 700, fontSize: 13 }}>
                          {m.metode}
                        </span>
                        <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                          {rupiah(m.total)} ({m.persentase}%)
                        </span>
                      </div>
                      <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${m.persentase}%`,
                            background: m.metode === "tunai" ? "var(--green)" : "var(--magenta)",
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
                        {m.jumlah_transaksi} transaksi
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="panel-kosong">Belum ada transaksi pada periode ini.</div>
              )}
            </div>

            {/* Kinerja Kasir */}
            <div className="panel">
              <div className="panel-head">
                <h3>Penjualan per Kasir</h3>
              </div>
              {data?.kinerja_kasir?.length ? (
                <table className="obat-table">
                  <thead>
                    <tr>
                      <th>Nama Petugas</th>
                      <th>Jumlah Transaksi</th>
                      <th>Total Omzet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.kinerja_kasir.map((k) => (
                      <tr key={k.user_id || k.nama_kasir}>
                        <td style={{ fontWeight: 600 }}>{k.nama_kasir || "—"}</td>
                        <td>{k.total_transaksi} transaksi</td>
                        <td style={{ fontWeight: 700, color: "var(--magenta-dark)" }}>
                          {rupiah(k.total_omzet)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="panel-kosong">Tidak ada data kasir.</div>
              )}
            </div>
          </div>

          {/* Top 10 Obat Terlaris */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-head">
              <h3>Top 10 Produk / Obat Terlaris</h3>
            </div>
            {data?.top_obat?.length ? (
              <table className="obat-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>Nama Obat</th>
                    <th>Satuan</th>
                    <th>Qty Terjual</th>
                    <th>Total Omzet</th>
                    <th>Estimasi Laba</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_obat.map((o, idx) => (
                    <tr key={`${o.nama_obat}-${o.nama_satuan}`}>
                      <td style={{ fontWeight: 700, color: "var(--ink-soft)" }}>{idx + 1}</td>
                      <td><span className="obat-nama-cell">{o.nama_obat}</span></td>
                      <td>{o.nama_satuan}</td>
                      <td style={{ fontWeight: 700, color: "var(--magenta-dark)" }}>{o.total_qty}</td>
                      <td style={{ fontWeight: 600 }}>{rupiah(o.total_omzet)}</td>
                      <td style={{ fontWeight: 600, color: "var(--green-dark)" }}>{rupiah(o.estimasi_laba)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="panel-kosong">Belum ada item obat terjual pada periode ini.</div>
            )}
          </div>

          {/* Tabel Rincian Transaksi */}
          <div className="panel">
            <div className="panel-head">
              <h3>Rincian Transaksi ({data?.transaksi?.length || 0})</h3>
            </div>
            {data?.transaksi?.length ? (
              <table className="obat-table">
                <thead>
                  <tr>
                    <th>No. Struk</th>
                    <th>Waktu</th>
                    <th>Kasir</th>
                    <th>Pembeli</th>
                    <th>Metode</th>
                    <th>Item</th>
                    <th>Diskon</th>
                    <th>Total</th>
                    <th className="no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transaksi.map((t) => (
                    <tr key={t.id} className="baris-klik" onClick={() => bukaStruk(t.id)}>
                      <td className="obat-batch-cell">{t.no_struk}</td>
                      <td>
                        {new Date(t.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>{t.nama_kasir}</td>
                      <td>{t.nama_pembeli || "—"}</td>
                      <td><span className="metode-badge">{t.metode_bayar}</span></td>
                      <td>{t.items_count}</td>
                      <td>{t.diskon > 0 ? rupiah(t.diskon) : "—"}</td>
                      <td style={{ fontWeight: 700 }}>{rupiah(t.total)}</td>
                      <td className="no-print">
                        <button
                          className="cart-hapus-btn"
                          style={{ color: "var(--magenta)", transform: "none" }}
                          onClick={(e) => { e.stopPropagation(); bukaStruk(t.id); }}
                          title="Lihat struk"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="panel-kosong">Tidak ada transaksi pada periode ini.</div>
            )}
          </div>
        </>
      )}

      {/* Modal Preview Struk jika diklik */}
      <StrukModal data={struk} onClose={() => setStruk(null)} />
    </KasirShell>
  );
}
