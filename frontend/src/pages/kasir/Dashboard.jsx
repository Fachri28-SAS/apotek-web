import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import KasirShell from "./KasirShell";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr); exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - now) / 86400000);
}

function jam(iso) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const KPI = [
  {
    key: "produk_terjual", label: "Produk Terjual", sub: "Hari ini", warna: "ungu",
    icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M8 6V4h8v2" /></>,
  },
  {
    key: "stok_menipis", label: "Stok Menipis", sub: "Di bawah stok minimum", warna: "merah",
    icon: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></>,
  },
  {
    key: "akan_kadaluwarsa", label: "Akan Kadaluwarsa", sub: "≤ 90 hari lagi", warna: "kuning",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function muat() {
    api("/dashboard")
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    muat();
    const timer = setInterval(() => {
      if (!document.hidden) muat();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <KasirShell><div className="obat-table-info">Memuat dashboard…</div></KasirShell>;
  }

  return (
    <KasirShell>
      {/* Header Desktop */}
      <div className="halaman-header desktop-only">
        <div>
          <h1 style={{ fontSize: 24 }}>Halo, {user?.nama?.split(" ")[0]} 👋</h1>
          <p className="halaman-sub">Ringkasan apotek hari ini</p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      {/* ==================== TAMPILAN KHUSUS MOBILE (SESUAI PREVIEW) ==================== */}
      <div className="mobile-only">
        {/* KPI 2x2 Grid */}
        <div className="kpi-grid2">
          <div className="kpi-card2">
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <div className="val">{rupiah(data?.kpi?.penjualan_hari_ini ?? 0)}</div>
            <div className="lbl">Penjualan hari ini</div>
          </div>

          <div className="kpi-card2">
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" /><path d="M9 8h6M9 12h6" />
              </svg>
            </div>
            <div className="val">{data?.kpi?.transaksi_hari_ini ?? 0}</div>
            <div className="lbl">Transaksi hari ini</div>
          </div>

          <div className="kpi-card2 warn">
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L2.4 18a1.8 1.8 0 001.5 2.6h16.2a1.8 1.8 0 001.5-2.6L13.7 3.9a1.8 1.8 0 00-3.4 0z" />
              </svg>
            </div>
            <div className="val">{data?.kpi?.stok_menipis ?? 0}</div>
            <div className="lbl">Stok menipis</div>
          </div>

          <div className="kpi-card2 warn">
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
              </svg>
            </div>
            <div className="val">{data?.kpi?.akan_kadaluwarsa ?? 0}</div>
            <div className="lbl">Akan kadaluwarsa</div>
          </div>
        </div>

        {/* Transaksi Terbaru (Mobile List Cards) */}
        <div className="section-title-mobile">
          <span>Transaksi Terbaru</span>
          <span className="link" onClick={() => navigate("/kasir/riwayat")}>Lihat semua →</span>
        </div>
        {data?.transaksi_terbaru?.length ? (
          data.transaksi_terbaru.slice(0, 4).map((t) => (
            <div
              className="list-card"
              key={t.id}
              onClick={() => navigate("/kasir/riwayat")}
            >
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" /><path d="M9 8h6M9 12h6" />
                </svg>
              </div>
              <div className="body">
                <div className="t1">#{t.no_struk} · {t.nama_pembeli || "Umum"}</div>
                <div className="t2">{t.metode_bayar?.toUpperCase()} · {jam(t.created_at)}</div>
              </div>
              <div className="t3">{rupiah(t.total)}</div>
            </div>
          ))
        ) : (
          <div className="panel-kosong" style={{ padding: "16px", borderRadius: 14 }}>Belum ada transaksi hari ini.</div>
        )}

        {/* Stok Menipis (Mobile List Cards) */}
        <div className="section-title-mobile" style={{ marginTop: 22 }}>
          <span>Stok Menipis</span>
          <span className="link" onClick={() => navigate("/kasir/obat")}>Kelola stok →</span>
        </div>
        {data?.stok_menipis?.length ? (
          data.stok_menipis.slice(0, 5).map((o) => (
            <div
              className="list-card"
              key={o.id}
              onClick={() => navigate("/kasir/obat")}
            >
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="9" width="18" height="6" rx="3" /><path d="M8 9v6M16 9v6" />
                </svg>
              </div>
              <div className="body">
                <div className="t1">{o.nama}</div>
                <div className="t2">Min. stok {o.stok_minimum} {o.satuan_dasar}</div>
              </div>
              <span className="badge-mini low">{o.stok} {o.satuan_dasar}</span>
            </div>
          ))
        ) : (
          <div className="panel-kosong" style={{ padding: "16px", borderRadius: 14 }}>Semua stok aman.</div>
        )}
      </div>

      {/* ==================== TAMPILAN KHUSUS DESKTOP ==================== */}
      <div className="desktop-only">
        {/* ---------- KPI DESKTOP ---------- */}
        <div className="kpi-grid">
          {KPI.map((k) => (
            <div className={`kpi-card ${k.warna}`} key={k.key}>
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{k.icon}</svg>
              </div>
              <div>
                <div className="kpi-angka">{data?.kpi?.[k.key] ?? 0}</div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-sub">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ---------- TRANSAKSI TERBARU DESKTOP ---------- */}
        <div className="panel">
          <div className="panel-head"><h3>Transaksi Terbaru</h3></div>
          {data?.transaksi_terbaru?.length ? (
            <div className="obat-table-wrap">
              <table className="obat-table">
                <thead>
                  <tr><th>No. Struk</th><th>Waktu</th><th>Kasir</th><th>Pembeli</th><th>Item</th><th>Total</th><th>Bayar</th></tr>
                </thead>
                <tbody>
                  {data.transaksi_terbaru.map((t) => (
                    <tr key={t.id}>
                      <td className="obat-batch-cell">{t.no_struk}</td>
                      <td>{jam(t.created_at)}</td>
                      <td>{t.nama_kasir}</td>
                      <td>{t.nama_pembeli || "—"}</td>
                      <td>{t.items_count}</td>
                      <td style={{ fontWeight: 700 }}>{rupiah(t.total)}</td>
                      <td><span className="metode-badge">{t.metode_bayar}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel-kosong">Belum ada transaksi hari ini.</div>
          )}
        </div>

        <div className="dashboard-2kolom">
          {/* ---------- STOK MENIPIS ---------- */}
          <div className="panel">
            <div className="panel-head"><h3>Stok Menipis</h3></div>
            {data?.stok_menipis?.length ? (
              <div className="list-ringkas">
                {data.stok_menipis.map((o) => (
                  <div className="list-ringkas-row" key={o.id}>
                    <div>
                      <div className="list-nama">{o.nama}</div>
                      <div className="list-sub">Minimum {o.stok_minimum} {o.satuan_dasar}</div>
                    </div>
                    <span className="obat-stok-menipis">{o.stok} {o.satuan_dasar}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-kosong">Semua stok aman.</div>
            )}
          </div>

          {/* ---------- AKAN KADALUWARSA ---------- */}
          <div className="panel">
            <div className="panel-head"><h3>Akan Kadaluwarsa</h3></div>
            {data?.akan_kadaluwarsa?.length ? (
              <div className="list-ringkas">
                {data.akan_kadaluwarsa.map((o) => {
                  const hari = daysUntil(o.tanggal_exp);
                  return (
                    <div className="list-ringkas-row" key={o.id}>
                      <div>
                        <div className="list-nama">{o.nama}</div>
                        <div className="list-sub">
                          {o.nomor_batch ? `Batch ${o.nomor_batch} · ` : ""}
                          {new Date(o.tanggal_exp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <span className={`exp-badge ${hari <= 30 ? "merah" : "kuning"}`}>
                        {hari <= 0 ? "EXPIRED" : `${hari} hari lagi`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="panel-kosong">Tidak ada obat mendekati kadaluwarsa.</div>
            )}
          </div>
        </div>
      </div>
    </KasirShell>
  );
}
