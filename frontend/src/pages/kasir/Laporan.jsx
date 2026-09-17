import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import { cetakDokumenA4, exportExcel, exportWord } from "../../utils/exportDokumen";
import KasirShell from "./KasirShell";
import TombolExportGroup from "./komponen/TombolExportGroup";

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

function getTglYmd(d) {
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

function formatTglIndo(tglStr) {
  if (!tglStr) return "";
  var d = new Date(tglStr);
  if (isNaN(d.getTime())) return tglStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getPresetRange(key) {
  var now = new Date();
  if (key === "hari-ini") {
    var tgl = getTglYmd(now);
    return { dari: tgl, sampai: tgl };
  }
  if (key === "minggu-ini") {
    var day = now.getDay();
    var diffToMon = (day === 0 ? -6 : 1) - day;
    var mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    var sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { dari: getTglYmd(mon), sampai: getTglYmd(sun) };
  }
  if (key === "bulan-ini") {
    var start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dari: getTglYmd(start), sampai: getTglYmd(now) };
  }
  if (key === "bulan-lalu") {
    var startM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var endM = new Date(now.getFullYear(), now.getMonth(), 0);
    return { dari: getTglYmd(startM), sampai: getTglYmd(endM) };
  }
  return { dari: getTglYmd(now), sampai: getTglYmd(now) };
}

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
  var header = "No. Struk,Sumber,Waktu,Kasir,Pembeli,Jumlah Item,Subtotal,Diskon,Total Penjualan,Total Modal (HPP),Total Pendapatan (Laba),Margin,Metode Bayar\n";
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
      t.total_modal || 0,
      t.total_pendapatan || 0,
      (t.margin_persen || 0) + "%",
      t.metode_bayar,
    ].join(",");
  }).join("\n");

  var blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "laporan-penjualan-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Laporan() {
  var initRange = getPresetRange("hari-ini");
  var [periode, setPeriode] = useState("hari-ini");
  var [dariTanggal, setDariTanggal] = useState(initRange.dari);
  var [sampaiTanggal, setSampaiTanggal] = useState(initRange.sampai);
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState("");

  useEffect(function() {
    setLoading(true);
    var params = new URLSearchParams();
    params.set("periode", periode);
    if (dariTanggal) params.set("dari_tanggal", dariTanggal);
    if (sampaiTanggal) params.set("sampai_tanggal", sampaiTanggal);

    api("/laporan?" + params.toString())
      .then(function(d) { setData(d); setError(""); })
      .catch(function(e) { setError(e.message); })
      .finally(function() { setLoading(false); });
  }, [periode, dariTanggal, sampaiTanggal]);

  function pilihPreset(pKey) {
    var range = getPresetRange(pKey);
    setPeriode(pKey);
    setDariTanggal(range.dari);
    setSampaiTanggal(range.sampai);
  }

  var labelPeriode = periode === "custom"
    ? (dariTanggal === sampaiTanggal ? formatTglIndo(dariTanggal) : (formatTglIndo(dariTanggal) + " s/d " + formatTglIndo(sampaiTanggal)))
    : ((PERIODE.find(function(p){ return p.key === periode; })?.label || "Periode") + (dariTanggal ? " (" + (dariTanggal === sampaiTanggal ? formatTglIndo(dariTanggal) : formatTglIndo(dariTanggal) + " - " + formatTglIndo(sampaiTanggal)) + ")" : ""));

  function siapkanDataExportLaporan() {
    var transaksi = data && data.transaksi ? data.transaksi : [];
    var headers = [
      { label: "No.", align: "center", width: "30px" },
      { label: "No. Struk", align: "left" },
      { label: "Sumber", align: "center" },
      { label: "Waktu", align: "center" },
      { label: "Kasir", align: "left" },
      { label: "Pembeli", align: "left" },
      { label: "Item", align: "center" },
      { label: "Total Jual", align: "right" },
      { label: "Modal (HPP)", align: "right" },
      { label: "Pendapatan (Laba)", align: "right" },
      { label: "Margin", align: "center" },
      { label: "Metode", align: "center" },
    ];

    var totalJual = 0;
    var totalModal = 0;
    var totalLaba = 0;

    var rows = transaksi.map(function(t, idx) {
      totalJual += Number(t.total || 0);
      totalModal += Number(t.total_modal || 0);
      totalLaba += Number(t.total_pendapatan || 0);

      return [
        idx + 1,
        t.no_struk,
        t.sumber === "online" ? "Toko Online" : "Kasir",
        new Date(t.created_at).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        t.nama_kasir || "-",
        t.nama_pembeli || "-",
        t.items_count || 0,
        rupiah(t.total),
        rupiah(t.total_modal || 0),
        rupiah(t.total_pendapatan || 0),
        (t.margin_persen || 0) + "%",
        t.metode_bayar || "-",
      ];
    });

    var footers = [
      [
        { label: "Grand Total (" + rows.length + " Transaksi) :", colspan: 7, align: "right" },
        { label: rupiah(totalJual), align: "right" },
        { label: rupiah(totalModal), align: "right" },
        { label: rupiah(totalLaba), align: "right" },
        {
          label: totalJual > 0 ? Math.round((totalLaba / totalJual) * 100) + "%" : "0%",
          align: "center",
        },
        { label: "-", align: "center" },
      ],
    ];

    return { headers, rows, footers };
  }

  function handleCetakLaporan() {
    var exp = siapkanDataExportLaporan();
    cetakDokumenA4({
      judul: "LAPORAN PENJUALAN TRANSAKSI",
      periode: labelPeriode,
      keterangan: "Rekapitulasi Omzet & Laba Bersih (" + exp.rows.length + " Transaksi)",
      headers: exp.headers,
      rows: exp.rows,
      footers: exp.footers,
      orientation: "landscape",
      namaUser: "Kasir Apotek",
    });
  }

  function handleExcelLaporan() {
    var exp = siapkanDataExportLaporan();
    exportExcel({
      filename: "laporan-penjualan-" + periode,
      judul: "LAPORAN PENJUALAN TRANSAKSI",
      periode: labelPeriode,
      keterangan: "Rekapitulasi Omzet & Laba Bersih (" + exp.rows.length + " Transaksi)",
      headers: exp.headers,
      rows: exp.rows,
      footers: exp.footers,
    });
  }

  function handleWordLaporan() {
    var exp = siapkanDataExportLaporan();
    exportWord({
      filename: "laporan-penjualan-" + periode,
      judul: "LAPORAN PENJUALAN TRANSAKSI",
      periode: labelPeriode,
      keterangan: "Rekapitulasi Omzet & Laba Bersih (" + exp.rows.length + " Transaksi)",
      headers: exp.headers,
      rows: exp.rows,
      footers: exp.footers,
      orientation: "landscape",
      namaUser: "Kasir Apotek",
    });
  }

  if (!loading && !data) {
    return (
      <KasirShell>
        <div className="login-error">{error || "Gagal memuat laporan. Coba refresh halaman."}</div>
      </KasirShell>
    );
  }

  return (
    <KasirShell>
      <div className="halaman-header" style={{ flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 24 }}>Laporan Penjualan</h1>
          <p className="halaman-sub">{labelPeriode} &middot; Ringkasan omzet, laba kotor, dan perputaran obat</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Kalender Filter Tanggal */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
            <span>Dari:</span>
            <input
              type="date"
              value={dariTanggal}
              onChange={function(e) {
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
              onChange={function(e) {
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
            {PERIODE.map(function(p) {
              return (
                <button
                  key={p.key}
                  type="button"
                  className={"periode-chip " + (periode === p.key ? "active" : "")}
                  onClick={function(){ pilihPreset(p.key); }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="kpi-grid">
        {/* Total Pendapatan (Laba Kotor dari Selisih Harga Jual dan Beli) */}
        <div className="kpi-card hijau" style={{ border: "1.5px solid #86EFAC" }}>
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <span className="kpi-angka" style={{ color: "var(--green-dark)" }}>
                {loading ? "…" : rupiah(data.kpi.total_pendapatan)}
              </span>
              {!loading && (
                <span className={"kpi-margin-badge " + (data.kpi.margin_persen >= 15 ? "" : "warning")}>
                  {data.kpi.margin_persen}% Margin
                </span>
              )}
            </div>
            <div className="kpi-label" style={{ color: "var(--green-dark)" }}>Total Pendapatan (Laba)</div>
            <div className="kpi-sub">Selisih Jual - Beli ({labelPeriode})</div>
          </div>
        </div>

        {/* Total Penjualan (Omzet) */}
        <div className="kpi-card ungu">
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 19V9M12 19V5M19 19v-6" />
            </svg>
          </div>
          <div>
            <div className="kpi-angka">{loading ? "…" : rupiah(data.kpi.total_penjualan)}</div>
            <div className="kpi-label">Total Penjualan</div>
            <div className="kpi-sub">Omzet kotor ({labelPeriode})</div>
          </div>
        </div>

        {/* Total Modal (HPP) */}
        <div className="kpi-card biru">
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
            </svg>
          </div>
          <div>
            <div className="kpi-angka">{loading ? "…" : rupiah(data.kpi.total_modal)}</div>
            <div className="kpi-label">Total Modal (HPP)</div>
            <div className="kpi-sub">Harga beli obat terjual</div>
          </div>
        </div>

        {/* Jumlah Transaksi */}
        <div className="kpi-card ungu">
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="6" width="18" height="13" rx="2" /><path d="M8 6V4h8v2" />
            </svg>
          </div>
          <div>
            <div className="kpi-angka">{loading ? "…" : data.kpi.jumlah_transaksi}</div>
            <div className="kpi-label">Jumlah Transaksi</div>
            <div className="kpi-sub">{labelPeriode}</div>
          </div>
        </div>

        {/* Rata-rata per Transaksi */}
        <div className="kpi-card kuning">
          <div className="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" />
            </svg>
          </div>
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
        <div className="panel-head" style={{ flexWrap: "wrap", gap: 10 }}>
          <h3>Transaksi ({labelPeriode})</h3>
          <TombolExportGroup
            onCetakPdf={handleCetakLaporan}
            onExportExcel={handleExcelLaporan}
            onExportWord={handleWordLaporan}
            disabled={!data || !data.transaksi || !data.transaksi.length}
          />
        </div>
        {!loading && data && data.transaksi && data.transaksi.length ? (
          <div className="obat-table-wrap">
            <table className="obat-table">
              <thead>
                <tr>
                  <th>No. Struk</th>
                  <th>Sumber</th>
                  <th>Waktu</th>
                  <th>Kasir</th>
                  <th>Pembeli</th>
                  <th>Item</th>
                  <th>Total Jual</th>
                  <th>Modal (HPP)</th>
                  <th>Pendapatan (Laba)</th>
                  <th>Margin</th>
                  <th>Bayar</th>
                </tr>
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
                      <td style={{ fontWeight: 700 }}>{rupiah(t.total)}</td>
                      <td style={{ color: "var(--ink-soft)" }}>{rupiah(t.total_modal || 0)}</td>
                      <td style={{ color: "var(--green-dark)", fontWeight: 700 }}>
                        +{rupiah(t.total_pendapatan || 0)}
                      </td>
                      <td>
                        <span className={"kpi-margin-badge " + ((t.margin_persen || 0) >= 15 ? "" : "warning")}>
                          {t.margin_persen || 0}%
                        </span>
                      </td>
                      <td><span className="metode-badge">{t.metode_bayar}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel-kosong">{loading ? "Memuat…" : "Belum ada transaksi pada periode ini."}</div>
        )}
      </div>
    </KasirShell>
  );
}
