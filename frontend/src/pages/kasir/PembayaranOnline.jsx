import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import KasirShell from "./KasirShell";
import StrukModal from "./komponen/StrukModal";

export default function PembayaranOnline() {
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState(null); // url gambar bukti
  const [struk, setStruk] = useState(null);
  const [prosesId, setProsesId] = useState(null);

  function muat() {
    api("/pembayaran-online")
      .then((d) => { setDaftar(d); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    muat();
    // Sesuai permintaan: refresh tiap 5 detik supaya pesanan baru langsung
    // muncul tanpa kasir harus reload manual.
    const timer = setInterval(() => {
      if (!document.hidden) muat();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function konfirmasi(id) {
    setProsesId(id);
    setError("");
    try {
      const hasil = await api(`/pembayaran-online/${id}/konfirmasi`, { method: "POST" });
      setStruk(hasil);
      muat();
    } catch (err) {
      setError(err.message);
    } finally {
      setProsesId(null);
    }
  }

  async function tolak(id) {
    if (!confirm("Tolak pesanan ini? Pesanan akan dibatalkan.")) return;
    setProsesId(id);
    setError("");
    try {
      await api(`/pembayaran-online/${id}/tolak`, { method: "POST" });
      muat();
    } catch (err) {
      setError(err.message);
    } finally {
      setProsesId(null);
    }
  }

  const perluVerifikasi = daftar.filter((d) => d.sudah_upload_bukti);
  const belumBayar = daftar.filter((d) => !d.sudah_upload_bukti);

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Pembayaran Online</h1>
          <p className="halaman-sub">Pesanan dari Toko Online yang perlu diverifikasi — refresh otomatis tiap 5 detik</p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="panel">
        <div className="panel-head"><h3>Menunggu Verifikasi ({perluVerifikasi.length})</h3></div>
        {loading ? (
          <div className="panel-kosong">Memuat…</div>
        ) : perluVerifikasi.length === 0 ? (
          <div className="panel-kosong">Belum ada bukti transfer yang perlu diperiksa.</div>
        ) : (
          <div className="pembayaran-list">
            {perluVerifikasi.map((p) => (
              <div className="pembayaran-card" key={p.id}>
                <div className="pembayaran-bukti-thumb" onClick={() => setLightbox(p.bukti_url)}>
                  <img src={p.bukti_url} alt="Bukti transfer" />
                </div>
                <div className="pembayaran-info">
                  <div className="pembayaran-no-struk">{p.penjualan.no_struk}</div>
                  <div className="pembayaran-nama">{p.penjualan.nama_pembeli} · {p.penjualan.telepon_pembeli}</div>
                  <div className="pembayaran-detail">{p.penjualan.items_count} item</div>
                  <div className="pembayaran-nominal-row">
                    <span>Total pesanan: <strong>{rupiah(p.jumlah)}</strong></span>
                    <span>Klaim customer: <strong className={Number(p.nominal_klaim_customer) < Number(p.jumlah) ? "kurang-bayar" : ""}>{rupiah(p.nominal_klaim_customer)}</strong></span>
                  </div>
                </div>
                <div className="pembayaran-aksi">
                  <button className="btn-tolak" onClick={() => tolak(p.id)} disabled={prosesId === p.id}>Tolak</button>
                  <button className="btn-tambah" onClick={() => konfirmasi(p.id)} disabled={prosesId === p.id}>
                    {prosesId === p.id ? "Memproses…" : "✓ Sudah Bayar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {belumBayar.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Menunggu Pembayaran Customer ({belumBayar.length})</h3></div>
          <table className="obat-table">
            <thead><tr><th>No. Struk</th><th>Pembeli</th><th>Total</th><th>Dibuat</th></tr></thead>
            <tbody>
              {belumBayar.map((p) => (
                <tr key={p.id}>
                  <td className="obat-batch-cell">{p.penjualan.no_struk}</td>
                  <td>{p.penjualan.nama_pembeli}</td>
                  <td style={{ fontWeight: 700 }}>{rupiah(p.jumlah)}</td>
                  <td style={{ fontSize: 12, color: "var(--ink-soft)" }}>{new Date(p.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lightbox && (
        <div className="struk-overlay" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Bukti transfer" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }} />
        </div>
      )}

      <StrukModal data={struk} onClose={() => setStruk(null)} />
    </KasirShell>
  );
}
