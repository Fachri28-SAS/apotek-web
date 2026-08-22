import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import KasirShell from "./KasirShell";
import ObatModal from "./komponen/ObatModal";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const exp = new Date(dateStr); exp.setHours(0,0,0,0);
  return Math.ceil((exp - now) / 86400000);
}

function marginPct(beli, jual) {
  if (!jual || jual === 0) return "-";
  return ((jual - beli) / jual * 100).toFixed(1) + "%";
}

export default function DataObat() {
  const { user } = useAuth();
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [obatEdit, setObatEdit] = useState(null);

  function muatUlang() {
    setLoading(true);
    api(`/obat${search ? `?search=${encodeURIComponent(search)}` : ""}`)
      .then(setDaftar)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(muatUlang, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function bukaTambah() { setObatEdit(null); setModalOpen(true); }
  function bukaEdit(obat) { setObatEdit(obat); setModalOpen(true); }

  async function toggleField(obat, field) {
    await api(`/obat/${obat.id}`, {
      method: "PUT",
      body: JSON.stringify({ [field]: !obat[field] }),
    });
    muatUlang();
  }

  async function hapusObat(obat) {
    if (!confirm(`Hapus "${obat.nama}"?`)) return;
    await api(`/obat/${obat.id}`, { method: "DELETE" });
    muatUlang();
  }

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Data Obat</h1>
          <p className="halaman-sub">{daftar.length} obat terdaftar</p>
        </div>
        <button className="btn-tambah" onClick={bukaTambah}>+ Tambah Obat</button>
      </div>

      <div className="search-obat-input" style={{ maxWidth: 340, marginBottom: 20 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input type="text" placeholder="Cari nama obat…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="obat-table-wrap">
        <table className="obat-table">
          <thead>
            <tr>
              <th>Nama Obat</th>
              <th>Kemasan</th>
              <th>Satuan</th>
              <th>Batch</th>
              <th>Harga Beli</th>
              <th>Harga Jual</th>
              <th>Margin %</th>
              <th>Stok</th>
              <th>Kadaluwarsa</th>
              <th>Aktif</th>
              <th>Resep</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={12} className="obat-table-info">Memuat…</td></tr>}
            {!loading && daftar.length === 0 && <tr><td colSpan={12} className="obat-table-info">Tidak ada obat yang cocok.</td></tr>}
            {!loading && daftar.map((obat) => {
              const def = obat.satuan?.find(s => s.is_default) || obat.satuan?.[0];
              const hari = daysUntil(obat.tanggal_exp);
              const satuanNames = obat.satuan?.map(s => s.nama_satuan).join(" / ");
              const hargaBeli = obat.satuan?.length > 1
                ? obat.satuan.map(s => rupiah(s.harga_beli)).join(" / ")
                : rupiah(def?.harga_beli);
              const hargaJual = obat.satuan?.length > 1
                ? obat.satuan.map(s => rupiah(s.harga_jual)).join(" / ")
                : rupiah(def?.harga_jual);

              return (
                <tr key={obat.id} className={!obat.aktif_dijual ? "obat-row-nonaktif" : ""}>
                  <td>
                    <span className="obat-nama-cell">{obat.nama}</span>
                  </td>
                  <td>{obat.kemasan || "-"}</td>
                  <td>{satuanNames}</td>
                  <td className="obat-batch-cell">{obat.nomor_batch || "-"}</td>
                  <td className="obat-harga-cell">{hargaBeli}</td>
                  <td className="obat-harga-cell">{hargaJual}</td>
                  <td className="obat-margin-cell">{marginPct(def?.harga_beli, def?.harga_jual)}</td>
                  <td>
                    <span>{obat.stok} {obat.satuan_dasar}</span>
                    {obat.stok < obat.stok_minimum && <div className="obat-stok-menipis">MENIPIS</div>}
                  </td>
                  <td>
                    {obat.tanggal_exp ? (
                      <div>
                        <span>{new Date(obat.tanggal_exp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        {hari !== null && hari <= 90 && (
                          <span className={`exp-badge ${hari <= 30 ? "merah" : "kuning"}`}>
                            {hari <= 0 ? "EXPIRED" : `${hari}H`}
                          </span>
                        )}
                      </div>
                    ) : "-"}
                  </td>
                  <td>
                    <button
                      className={`toggle-pill ${obat.aktif_dijual ? "on" : ""}`}
                      onClick={() => toggleField(obat, "aktif_dijual")}
                      aria-label={obat.aktif_dijual ? "Nonaktifkan" : "Aktifkan"}
                    >
                      <span className="toggle-knob" />
                    </button>
                  </td>
                  <td>
                    <button
                      className={`toggle-pill ${obat.perlu_resep ? "on" : ""}`}
                      onClick={() => toggleField(obat, "perlu_resep")}
                      aria-label={obat.perlu_resep ? "Hapus resep" : "Wajib resep"}
                    >
                      <span className="toggle-knob" />
                    </button>
                  </td>
                  <td>
                    <div className="obat-aksi-icons">
                      <button onClick={() => bukaEdit(obat)} title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M17 3l4 4L7 21H3v-4L17 3z" />
                        </svg>
                      </button>
                      <button className="hapus" onClick={() => hapusObat(obat)} title="Hapus">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ObatModal
          obat={obatEdit}
          onClose={() => setModalOpen(false)}
          onSelesai={() => { setModalOpen(false); muatUlang(); }}
        />
      )}
    </KasirShell>
  );
}
