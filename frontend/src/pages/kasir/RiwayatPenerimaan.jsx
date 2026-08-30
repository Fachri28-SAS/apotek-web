import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import KasirShell from "./KasirShell";
import DetailFakturModal from "./komponen/DetailFakturModal";

const PERIODE = [
  { key: "", label: "Semua" },
  { key: "hari-ini", label: "Hari Ini" },
  { key: "minggu-ini", label: "Minggu Ini" },
  { key: "bulan-ini", label: "Bulan Ini" },
  { key: "bulan-lalu", label: "Bulan Lalu" },
];

export default function RiwayatPenerimaan() {
  const [daftar, setDaftar] = useState([]);
  const [periode, setPeriode] = useState("bulan-ini");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (periode) params.set("periode", periode);

    api(`/penerimaan?${params}`)
      .then((d) => { setDaftar(d); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [periode]);

  async function bukaDetail(id) {
    try {
      setDetail(await api(`/penerimaan/${id}`));
    } catch (e) {
      setError(e.message);
    }
  }

  const totalTagihan = daftar.reduce((s, p) => s + Number(p.total), 0);

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Riwayat Penerimaan</h1>
          <p className="halaman-sub">
            {loading ? "Memuat…" : `${daftar.length} faktur · total ${rupiah(totalTagihan)}`}
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
        </div>

        {loading ? (
          <div className="panel-kosong">Memuat…</div>
        ) : daftar.length === 0 ? (
          <div className="panel-kosong">Belum ada faktur penerimaan pada periode ini.</div>
        ) : (
          <table className="obat-table">
            <thead>
              <tr><th>Tanggal</th><th>Supplier</th><th>No. Faktur</th><th>Jumlah Item</th><th>Total Tagihan</th></tr>
            </thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.id} className="baris-klik" onClick={() => bukaDetail(p.id)}>
                  <td>{new Date(p.tanggal_terima).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="obat-nama-cell">{p.nama_supplier}</td>
                  <td className="obat-batch-cell">{p.no_faktur}</td>
                  <td>{p.items_count}</td>
                  <td style={{ fontWeight: 700 }}>{rupiah(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DetailFakturModal data={detail} onClose={() => setDetail(null)} />
    </KasirShell>
  );
}
