import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import KasirShell from "./KasirShell";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr); exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - now) / 86400000);
}

function GrafikBatang({ data }) {
  const maxOmzet = Math.max(...data.map((d) => d.omzet), 1);
  return (
    <div className="grafik-batang">
      {data.map((d) => {
        const tinggi = Math.max((d.omzet / maxOmzet) * 100, 2);
        return (
          <div className="grafik-col" key={d.tanggal}>
            <div className="grafik-tooltip">{rupiah(d.omzet)}</div>
            <div className="grafik-bar" style={{ height: tinggi + "%" }} />
            <div className="grafik-label">{d.label ? d.label.split(", ")[0] : ""}</div>
            <div className="grafik-sublabel">{d.label ? d.label.split(", ")[1] : ""}</div>
          </div>
        );
      })}
    </div>
  );
}

function exportCSV(transaksi) {
  const header = "No. Struk,Waktu,Kasir,Pembeli,Jumlah Item,Subtotal,Diskon,Total,Metode Bayar\n";
  const rows = transaksi.map((t) =>
    [
      t.no_struk,
      new Date(t.created_at).toLocaleString("id-ID"),
      '"' + t.nama_kasir + '"',
      '"' + (t.nama_pembeli || "") + '"',
      t.items_count,
      t.subtotal,
      t.diskon,
      t.total,
      t.metode_bayar,
    ].join(",")
  ).join("\n");

  var blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "transaksi-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

var KPI_ITEMS = [
  { key: "penjualan_7_hari", label: "Total Penjualan 7 Hari", format: "rupiah", warna: "ungu",
    icon: <><path d="M5 19V9M12 19V5M19 19v-6" /></> },
  { key: "transaksi_hari_ini", label: "Total Transaksi Hari Ini", format: "angka", warna: "ungu",
    icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M8 6V4h8v2" /></> },
  { key: "rata_rata", label: "Rata-rata per Transaksi", format: "rupiah", warna: "ungu",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></> },
];

export default function Laporan() {
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState("");

  useEffect(function() {
    api("/laporan")
      .then(function(d) { setData(d); setError(""); })
      .catch(function(e) { setError(e.message); })
      .finally(function() { setLoading(false); });
  }, []);

  if (loading) return <KasirShell><div className="panel-kosong">Memuat laporan...</div></KasirShell>;

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Laporan</h1>
          <p className="halaman-sub">Ringkasan penjualan dan stok</p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="kpi-grid">
        {KPI_ITEMS.map(function(k) {
          var val = data && data.kpi ? (data.kpi[k.key] || 0) : 0;
          return (
            <div className={"kpi-card " + k.warna} key={k.key}>
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{k.icon}</svg>
              </div>
              <div>
                <div className="kpi-angka">{k.format === "rupiah" ? rupiah(val) : val}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Penjualan 7 Hari Terakhir</h3></div>
        {data && data.grafik_7_hari && data.grafik_7_hari.length ? (
          <GrafikBatang data={data.grafik_7_hari} />
        ) : (
          <div className="panel-kosong">Belum ada data penjualan.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Obat Mendekati Kadaluwarsa (90 hari)</h3></div>
        {data && data.kadaluwarsa && data.kadaluwarsa.length ? (
          <table className="obat-table">
            <thead>
              <tr><th>Nama Obat</th><th>Satuan</th><th>Stok</th><th>Batch</th><th>Kadaluwarsa</th><th>Sisa</th></tr>
            </thead>
            <tbody>
              {data.kadaluwarsa.map(function(o) {
                var hari = daysUntil(o.tanggal_exp);
                return (
                  <tr key={o.id}>
                    <td className="obat-nama-cell">{o.nama}</td>
                    <td>{o.satuan_dasar}</td>
                    <td>{o.stok}</td>
                    <td className="obat-batch-cell">{o.nomor_batch || "\u2014"}</td>
                    <td>{new Date(o.tanggal_exp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td>
                      <span className={"exp-badge " + (hari <= 30 ? "merah" : "kuning")}>
                        {hari <= 0 ? "EXPIRED" : hari + " hari"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="panel-kosong">Tidak ada obat mendekati kadaluwarsa.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Transaksi Hari Ini</h3>
          <button
            className="btn-tambah"
            onClick={function() { exportCSV(data && data.transaksi_hari_ini ? data.transaksi_hari_ini : []); }}
            disabled={!data || !data.transaksi_hari_ini || !data.transaksi_hari_ini.length}
            style={{ fontSize: 12.5 }}
          >
            Export CSV
          </button>
        </div>
        {data && data.transaksi_hari_ini && data.transaksi_hari_ini.length ? (
          <table className="obat-table">
            <thead>
              <tr><th>No. Struk</th><th>Waktu</th><th>Kasir</th><th>Pembeli</th><th>Item</th><th>Subtotal</th><th>Diskon</th><th>Total</th><th>Bayar</th></tr>
            </thead>
            <tbody>
              {data.transaksi_hari_ini.map(function(t) {
                return (
                  <tr key={t.id}>
                    <td className="obat-batch-cell">{t.no_struk}</td>
                    <td>{new Date(t.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td>{t.nama_kasir}</td>
                    <td>{t.nama_pembeli || "\u2014"}</td>
                    <td>{t.items_count}</td>
                    <td>{rupiah(t.subtotal)}</td>
                    <td>{t.diskon > 0 ? "-" + rupiah(t.diskon) : "\u2014"}</td>
                    <td style={{ fontWeight: 700 }}>{rupiah(t.total)}</td>
                    <td><span className="metode-badge">{t.metode_bayar}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="panel-kosong">Belum ada transaksi hari ini.</div>
        )}
      </div>
    </KasirShell>
  );
}
