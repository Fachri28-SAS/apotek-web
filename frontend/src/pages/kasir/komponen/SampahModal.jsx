import { useState, useEffect } from "react";
import { api } from "../../../lib/api";

export default function SampahModal({ onClose, onSelesai }) {
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prosesId, setProsesId] = useState(null);

  function muat() {
    setLoading(true);
    api("/obat-sampah")
      .then((d) => { setDaftar(d); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { muat(); }, []);

  async function pulihkan(obat) {
    setProsesId(obat.id);
    setError("");
    try {
      await api(`/obat/${obat.id}/pulihkan`, { method: "POST" });
      setDaftar((prev) => prev.filter((o) => o.id !== obat.id));
      onSelesai(); // refresh tabel Data Obat utama, obat ini harus muncul lagi di situ
    } catch (err) {
      setError(err.message);
    } finally {
      setProsesId(null);
    }
  }

  async function hapusPermanen(obat) {
    if (!window.confirm(`Hapus "${obat.nama}" PERMANEN? Ini TIDAK BISA dibatalkan atau dipulihkan lagi.`)) return;
    setProsesId(obat.id);
    setError("");
    try {
      await api(`/obat/${obat.id}/permanen`, { method: "DELETE" });
      setDaftar((prev) => prev.filter((o) => o.id !== obat.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setProsesId(null);
    }
  }

  return (
    <div className="obat-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="obat-modal" style={{ maxWidth: 640 }}>
        <div className="obat-modal-head">
          <h2>🗑 Sampah</h2>
          <button className="kasir-logout-btn" onClick={onClose} aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="obat-modal-body">
          {error && <div className="login-error">{error}</div>}

          {loading ? (
            <div className="panel-kosong">Memuat…</div>
          ) : daftar.length === 0 ? (
            <div className="panel-kosong">Sampah kosong — belum ada obat yang dihapus.</div>
          ) : (
            <div className="sampah-list">
              {daftar.map((obat) => (
                <div className="sampah-item" key={obat.id}>
                  <div className="sampah-item-info">
                    <div className="sampah-item-nama">{obat.nama}</div>
                    <div className="sampah-item-sub">
                      {obat.kemasan || "-"} · Dihapus {new Date(obat.deleted_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div className="sampah-item-aksi">
                    <button className="btn-tolak" onClick={() => hapusPermanen(obat)} disabled={prosesId === obat.id}>
                      Hapus Permanen
                    </button>
                    <button className="btn-tambah" onClick={() => pulihkan(obat)} disabled={prosesId === obat.id}>
                      {prosesId === obat.id ? "Memproses…" : "↺ Pulihkan"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
