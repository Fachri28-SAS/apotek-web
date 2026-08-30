import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import KasirShell from "./KasirShell";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  var now = new Date(); now.setHours(0, 0, 0, 0);
  var exp = new Date(dateStr); exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - now) / 86400000);
}

var PERIODE = [
  { key: "hari-ini", label: "Hari Ini" },
  { key: "minggu-ini", label: "Minggu Ini" },
  { key: "bulan-ini", label: "Bulan Ini" },
  { key: "bulan-lalu", label: "Bulan Lalu" },
];

var LABEL_METODE = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer" };
var WARNA_METODE = { tunai: "#39A048", qris: "#A64BC7", transfer: "#1A56B8" };

/**
 * Grafik kurva area halus pakai SVG murni — jauh lebih enak dilihat
 * dibanding batang kaku, apalagi kalau datanya sepi (banyak hari nol).
 */
/**
 * Grafik pakai Recharts — library grafik yang matang, dipakai banyak
 * aplikasi. Kurva "monotone" otomatis halus TANPA overshoot aneh (beda
 * dengan Catmull-Rom manual sebelumnya), dan skala sumbu-nya otomatis
 * proporsional mengikuti data, bukan dipaksa 0-max secara kaku.
 */
function TooltipKustom({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  var item = payload[0].payload;
  var parts = item.label ? item.label.split(", ") : ["", ""];
  return (
    <div className="grafik-tooltip-kustom">
      <div className="grafik-tooltip-hari">{parts[0]} · {parts[1]}</div>
      <div className="grafik-tooltip-omzet">{rupiah(item.omzet)}</div>
    </div>
  );
}

function GrafikArea({ data }) {
  var dataChart = data.map(function(d) {
    var parts = d.label ? d.label.split(", ") : ["", ""];
    return { ...d, hari: parts[0] };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={dataChart} margin={{ top: 16, right: 12, left: 12, bottom: 0 }}>
        <defs>
          <linearGradient id="grafikGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#A64BC7" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#A64BC7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#E5E1D9" />
        <XAxis
          dataKey="hari"
          tick={{ fontSize: 12, fontWeight: 700, fill: "#1D241F" }}
          axisLine={{ stroke: "#E5E1D9" }}
          tickLine={false}
        />
        <Tooltip content={<TooltipKustom />} />
        <Area
          type="monotone"
          dataKey="omzet"
          stroke="#A64BC7"
          strokeWidth={2.5}
          fill="url(#grafikGradient)"
          dot={{ r: 4, fill: "#fff", stroke: "#A64BC7", strokeWidth: 2.5 }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function exportCSV(transaksi) {
  var header = "No. Struk,Sumber,Waktu,Kasir,Pembeli,Jumlah Item,Subtotal,Diskon,Total,Metode Bayar\n";
  var rows = transaksi.map(function(t) {
    return [
      t.no_struk,
      t.sumber === "online" ? "Toko Online" : "Kasir",
      new Date(t.created_at).toLocaleString("id-ID"),
      '"' + t.nama_kasir + '"',
      '"' + (t.nama_pembeli || "") + '"',
      t.items_count,
      t.subtotal,
      t.diskon,
      t.total,
      t.metode_bayar,
    ].join(",");
  }).join("\n");

  var blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "transaksi-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Laporan() {
  var [periode, setPeriode] = useState("hari-ini");
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState("");

  useEffect(function() {
    setLoading(true);
    api("/laporan?periode=" + periode)
      .then(function(d) { setData(d); setError(""); })
      .catch(function(e) { setError(e.message); })
      .finally(function() { setLoading(false); });
  }, [periode]);

  var labelPeriode = PERIODE.find(function(p){ return p.key === periode; }).label;

  if (!loading && !data) {
    return (
      <KasirShell>
        <div className="login-error">{error || "Gagal memuat laporan. Coba refresh halaman."}</div>
      </KasirShell>
    );
  }

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Laporan</h1>
          <p className="halaman-sub">Ringkasan penjualan dan stok</p>
        </div>
        <div className="periode-chips">
          {PERIODE.map(function(p) {
            return (
              <button key={p.key} type="button"
                className={"periode-chip " + (periode === p.key ? "active" : "")}
                onClick={function(){ setPeriode(p.key); }}>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="kpi-grid">
        <div className="kpi-card ungu">
          <div className="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 19V9M12 19V5M19 19v-6" /></svg></div>
          <div>
            <div className="kpi-angka">{loading ? "…" : rupiah(data.kpi.total_penjualan)}</div>
            <div className="kpi-label">Total Penjualan</div>
            <div className="kpi-sub">{labelPeriode}</div>
          </div>
        </div>
        <div className="kpi-card ungu">
          <div className="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M8 6V4h8v2" /></svg></div>
          <div>
            <div className="kpi-angka">{loading ? "…" : data.kpi.jumlah_transaksi}</div>
            <div className="kpi-label">Jumlah Transaksi</div>
            <div className="kpi-sub">{labelPeriode}</div>
          </div>
        </div>
        <div className="kpi-card ungu">
          <div className="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg></div>
          <div>
            <div className="kpi-angka">{loading ? "…" : rupiah(data.kpi.rata_rata)}</div>
            <div className="kpi-label">Rata-rata per Transaksi</div>
            <div className="kpi-sub">{labelPeriode}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-2kolom">
        <div className="panel" style={{ gridColumn: "1 / -1" }}>
          <div className="panel-head"><h3>Penjualan 7 Hari Terakhir</h3></div>
          {!loading && data && data.grafik_7_hari && data.grafik_7_hari.length ? (
            <GrafikArea data={data.grafik_7_hari} />
          ) : (
            <div className="panel-kosong">{loading ? "Memuat…" : "Belum ada data penjualan."}</div>
          )}
        </div>
      </div>

      <div className="dashboard-2kolom">
        <div className="panel">
          <div className="panel-head"><h3>Metode Pembayaran ({labelPeriode})</h3></div>
          {!loading && data && data.metode_breakdown && data.metode_breakdown.length ? (
            <div className="metode-breakdown">
              {data.metode_breakdown.map(function(m) {
                return (
                  <div className="metode-breakdown-row" key={m.metode}>
                    <div className="metode-breakdown-head">
                      <span>{LABEL_METODE[m.metode] || m.metode}</span>
                      <span>{m.jumlah}x · {rupiah(m.total)}</span>
                    </div>
                    <div className="metode-breakdown-track">
                      <div
                        className="metode-breakdown-fill"
                        style={{ width: m.persen + "%", background: WARNA_METODE[m.metode] || "var(--magenta)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panel-kosong">{loading ? "Memuat…" : "Belum ada transaksi."}</div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Obat Mendekati Kadaluwarsa</h3></div>
          {!loading && data && data.kadaluwarsa && data.kadaluwarsa.length ? (
            <div className="list-ringkas">
              {data.kadaluwarsa.slice(0, 6).map(function(o) {
                var hari = daysUntil(o.tanggal_exp);
                return (
                  <div className="list-ringkas-row" key={o.id}>
                    <div>
                      <div className="list-nama">{o.nama}</div>
                      <div className="list-sub">{o.nomor_batch ? "Batch " + o.nomor_batch : o.satuan_dasar}</div>
                    </div>
                    <span className={"exp-badge " + (hari <= 30 ? "merah" : "kuning")}>
                      {hari <= 0 ? "EXPIRED" : hari + " hari"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panel-kosong">{loading ? "Memuat…" : "Tidak ada obat mendekati kadaluwarsa."}</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Transaksi ({labelPeriode})</h3>
          <button
            className="btn-tambah"
            onClick={function(){ exportCSV(data && data.transaksi ? data.transaksi : []); }}
            disabled={!data || !data.transaksi || !data.transaksi.length}
            style={{ fontSize: 12.5 }}
          >
            Export CSV
          </button>
        </div>
        {!loading && data && data.transaksi && data.transaksi.length ? (
          <table className="obat-table">
            <thead>
              <tr><th>No. Struk</th><th>Sumber</th><th>Waktu</th><th>Kasir</th><th>Pembeli</th><th>Item</th><th>Subtotal</th><th>Diskon</th><th>Total</th><th>Bayar</th></tr>
            </thead>
            <tbody>
              {data.transaksi.map(function(t) {
                return (
                  <tr key={t.id}>
                    <td className="obat-batch-cell">{t.no_struk}</td>
                    <td><span className={"sumber-badge " + t.sumber}>{t.sumber === "online" ? "Toko Online" : "Kasir"}</span></td>
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
          <div className="panel-kosong">{loading ? "Memuat…" : "Belum ada transaksi pada periode ini."}</div>
        )}
      </div>
    </KasirShell>
  );
}
