import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import KasirShell from "./KasirShell";
import StrukModal from "./komponen/StrukModal";

function getTglYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Riwayat() {
  const tglSekarang = getTglYmd(new Date());
  const [daftar, setDaftar] = useState([]);
  const [kasirList, setKasirList] = useState([]);
  const [dariTanggal, setDariTanggal] = useState(tglSekarang);
  const [sampaiTanggal, setSampaiTanggal] = useState(tglSekarang);
  const [kasirId, setKasirId] = useState("");
  const [sumber, setSumber] = useState("semua");
  const [loading, setLoading] = useState(true);
  const [struk, setStruk] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/users").then(setKasirList).catch(() => setKasirList([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dariTanggal) params.set("dari_tanggal", dariTanggal);
    if (sampaiTanggal) params.set("sampai_tanggal", sampaiTanggal);
    if (kasirId) params.set("kasir_id", kasirId);
    if (sumber) params.set("sumber", sumber);
    if (dariTanggal === tglSekarang && sampaiTanggal === tglSekarang) {
      params.set("periode", "hari-ini");
    }

    api(`/penjualan?${params}`)
      .then((d) => { setDaftar(d); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dariTanggal, sampaiTanggal, kasirId, sumber]);

  async function bukaStruk(id) {
    try {
      const data = await api(`/penjualan/${id}`);
      setStruk(data);
    } catch (e) {
      setError(e.message);
    }
  }

  const totalOmzet = daftar.reduce((s, t) => s + Number(t.total), 0);

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Riwayat Penjualan</h1>
          <p className="halaman-sub">
            {loading ? "Memuat…" : `${daftar.length} transaksi · total ${rupiah(totalOmzet)}`}
          </p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      {/* ---------- TAMPILAN KHUSUS MOBILE (SESUAI PREVIEW LAYAR 4) ---------- */}
      <div className="mobile-only">
        {/* Kalender Filter Mobile */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, padding: "0 2px" }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 4 }}>
              📅 Dari:
            </label>
            <input
              type="date"
              value={dariTanggal}
              onChange={(e) => setDariTanggal(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1.5px solid var(--line)",
                fontSize: 12.5,
                background: "#fff",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 4 }}>
              Sampai:
            </label>
            <input
              type="date"
              value={sampaiTanggal}
              onChange={(e) => setSampaiTanggal(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1.5px solid var(--line)",
                fontSize: 12.5,
                background: "#fff",
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="panel-kosong" style={{ padding: "20px", borderRadius: 14 }}>Memuat transaksi…</div>
        ) : daftar.length === 0 ? (
          <div className="panel-kosong" style={{ padding: "20px", borderRadius: 14 }}>Belum ada transaksi pada periode tanggal ini.</div>
        ) : (
          daftar.map((t) => (
            <div
              className="list-card"
              key={t.id}
              onClick={() => bukaStruk(t.id)}
            >
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" /><path d="M9 8h6M9 12h6" />
                </svg>
              </div>
              <div className="body">
                <div className="t1">#{t.no_struk} · {t.nama_pembeli || "Umum"}</div>
                <div className="t2">
                  {t.nama_kasir} · {t.metode_bayar?.toUpperCase()} · {new Date(t.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="t3">{rupiah(t.total)}</div>
            </div>
          ))
        )}
      </div>

      {/* ---------- TAMPILAN KHUSUS DESKTOP (PANEL & TABEL LENGKAP) ---------- */}
      <div className="panel desktop-only">
        <div className="panel-head" style={{ flexWrap: "wrap", gap: 12 }}>
          {/* Kalender Filter Tanggal */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              <span>📅 Dari:</span>
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
                  background: "#fff",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
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
                  background: "#fff",
                }}
              />
            </div>
          </div>

          <select className="filter-select" value={kasirId} onChange={(e) => setKasirId(e.target.value)}>
            <option value="">Semua Kasir</option>
            {kasirList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>

          <div className="periode-chips">
            <button type="button" className={`periode-chip ${sumber === "semua" ? "active" : ""}`} onClick={() => setSumber("semua")}>Semua Sumber</button>
            <button type="button" className={`periode-chip ${sumber === "kasir" ? "active" : ""}`} onClick={() => setSumber("kasir")}>Kasir</button>
            <button type="button" className={`periode-chip ${sumber === "online" ? "active" : ""}`} onClick={() => setSumber("online")}>Toko Online</button>
          </div>
        </div>

        {loading ? (
          <div className="panel-kosong">Memuat…</div>
        ) : daftar.length === 0 ? (
          <div className="panel-kosong">Belum ada transaksi pada periode ini.</div>
        ) : (
          <div className="obat-table-wrap">
            <table className="obat-table">
              <thead>
                <tr>
                  <th>No. Struk</th><th>Sumber</th><th>Tanggal</th><th>Waktu</th><th>Kasir</th>
                  <th>Pembeli</th><th>Item</th><th>Diskon</th><th>Total</th><th>Bayar</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((t) => (
                  <tr key={t.id} className="baris-klik" onClick={() => bukaStruk(t.id)}>
                    <td className="obat-batch-cell">{t.no_struk}</td>
                    <td>
                      <span className={`sumber-badge ${t.sumber}`}>
                        {t.sumber === "online" ? "Toko Online" : "Kasir"}
                      </span>
                    </td>
                    <td>{new Date(t.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td>{new Date(t.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td>{t.nama_kasir}</td>
                    <td>{t.nama_pembeli || "—"}</td>
                    <td>{t.items_count}</td>
                    <td>
                      {Number(t.diskon || 0) > 0 ? (
                        <span style={{ color: "#DC2626", fontWeight: 700, fontSize: 12 }}>
                          -{rupiah(t.diskon)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700 }}>{rupiah(t.total)}</td>
                    <td><span className="metode-badge">{t.metode_bayar}</span></td>
                    <td>
                      <div className="obat-aksi-icons">
                        <button
                          onClick={(e) => { e.stopPropagation(); bukaStruk(t.id); }}
                          title="Lihat & cetak struk"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2" /><rect x="8" y="14" width="8" height="7" rx="1" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StrukModal data={struk} onClose={() => setStruk(null)} />
    </KasirShell>
  );
}
