import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import KasirShell from "./KasirShell";
import StrukModal from "./komponen/StrukModal";

const PERIODE = [
  { key: "hari-ini", label: "Hari Ini" },
  { key: "minggu-ini", label: "Minggu Ini" },
  { key: "bulan-ini", label: "Bulan Ini" },
  { key: "bulan-lalu", label: "Bulan Lalu" },
  { key: "", label: "Semua" },
];

export default function Riwayat() {
  const [daftar, setDaftar] = useState([]);
  const [kasirList, setKasirList] = useState([]);
  const [periode, setPeriode] = useState("hari-ini");
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
    if (periode) params.set("periode", periode);
    if (kasirId) params.set("kasir_id", kasirId);
    if (sumber) params.set("sumber", sumber);

    api(`/penjualan?${params}`)
      .then((d) => { setDaftar(d); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [periode, kasirId, sumber]);

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

      <div className="panel">
        <div className="panel-head">
          <div className="periode-chips">
            {PERIODE.map((p) => (
              <button key={p.key} type="button"
                className={`periode-chip ${periode === p.key ? "active" : ""}`}
                onClick={() => setPeriode(p.key)}>
                {p.label}
              </button>
            ))}
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
                  <th>Pembeli</th><th>Item</th><th>Total</th><th>Bayar</th><th>Aksi</th>
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
