import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah, hitungMarginPersen, getStatusMargin } from "../../utils/format";
import KasirShell from "./KasirShell";
import ObatModal from "./komponen/ObatModal";
import SampahModal from "./komponen/SampahModal";
import RiwayatPengadaanModal from "./komponen/RiwayatPengadaanModal";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const exp = new Date(dateStr); exp.setHours(0,0,0,0);
  return Math.ceil((exp - now) / 86400000);
}

/**
 * Badge naik/turun harga beli — dibandingkan dari harga sebelumnya yang
 * tersimpan di obat_satuan. Kolom ini diperbarui dari 2 sumber: Penerimaan
 * Barang MAUPUN edit manual di Data Obat — jadi badge ini selalu ikut
 * bereaksi ke perubahan harga dari mana pun asalnya.
 */
function badgeHargaBeli(satuan) {
  if (!satuan || satuan.harga_beli_sebelumnya == null) return null;

  var selisih = Number(satuan.harga_beli) - Number(satuan.harga_beli_sebelumnya);
  var persen = satuan.harga_beli_sebelumnya > 0
    ? Math.round((selisih / satuan.harga_beli_sebelumnya) * 100)
    : 0;

  if (selisih === 0) return { warna: "hijau", teks: "✓ Tetap" };
  if (selisih > 0) return { warna: "merah", teks: `▲ +${persen}%` };
  return { warna: "biru", teks: `▼ ${persen}%` };
}

export default function DataObat() {
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [obatEdit, setObatEdit] = useState(null);
  const [sampahOpen, setSampahOpen] = useState(false);
  const [riwayatObat, setRiwayatObat] = useState(null);
  const [filterMarginTipis, setFilterMarginTipis] = useState(false);

  // Deteksi obat dengan margin di bawah batas aman (< 20%) atau jual rugi (< 0)
  const obatBermasalahMargin = daftar.filter((o) => {
    const def = o.satuan?.find((s) => s.is_default) || o.satuan?.[0];
    const m = hitungMarginPersen(def?.harga_beli, def?.harga_jual);
    return m !== null && m < 20;
  });
  const jumlahRugi = obatBermasalahMargin.filter((o) => {
    const def = o.satuan?.find((s) => s.is_default) || o.satuan?.[0];
    return (hitungMarginPersen(def?.harga_beli, def?.harga_jual) || 0) < 0;
  }).length;
  const jumlahTipis = obatBermasalahMargin.length - jumlahRugi;

  const daftarTampil = filterMarginTipis ? obatBermasalahMargin : daftar;

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
          <p className="halaman-sub">
            {filterMarginTipis
              ? `Menampilkan ${daftarTampil.length} obat dengan margin bermasalah (< 20%)`
              : `${daftar.length} obat terdaftar`}
          </p>
        </div>
        <div className="halaman-header-aksi">
          <button className="btn-sampah" onClick={() => setSampahOpen(true)}>🗑 Sampah</button>
          <button className="btn-tambah" onClick={bukaTambah}>+ Tambah Obat</button>
        </div>
      </div>

      {/* Banner Alert Margin Tipis / Rugi */}
      {obatBermasalahMargin.length > 0 && (
        <div className="margin-alert-box">
          <div className="alert-text">
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <strong>Peringatan Margin:</strong> Ditemukan <strong>{obatBermasalahMargin.length} obat</strong> dengan margin di bawah batas aman (20%).
              {jumlahRugi > 0 ? (
                <span style={{ color: "#DC2626", fontWeight: 800 }}> {jumlahRugi} obat jual rugi (harga beli &gt; harga jual)!</span>
              ) : null}
              {jumlahTipis > 0 ? (
                <span> {jumlahTipis} obat margin tipis (&lt; 20%).</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="alert-btn"
            onClick={() => setFilterMarginTipis(!filterMarginTipis)}
          >
            {filterMarginTipis ? "✕ Tampilkan Semua Obat" : `🔍 Lihat ${obatBermasalahMargin.length} Obat Bermasalah`}
          </button>
        </div>
      )}

      {/* ---------- TAMPILAN KHUSUS MOBILE (SESUAI PREVIEW LAYAR 5) ---------- */}
      <div className="mobile-only" style={{ marginBottom: 20 }}>
        <div className="search-mobile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
          </svg>
          <input
            type="text"
            placeholder="Cari obat…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="panel-kosong" style={{ padding: 20, borderRadius: 14 }}>Memuat obat…</div>
        ) : daftarTampil.length === 0 ? (
          <div className="panel-kosong" style={{ padding: 20, borderRadius: 14 }}>Tidak ada obat yang cocok.</div>
        ) : (
          daftarTampil.map((obat) => {
            const def = obat.satuan?.find((s) => s.is_default) || obat.satuan?.[0];
            const stokMenipis = obat.stok <= (obat.stok_minimum || 0);
            const mNum = hitungMarginPersen(def?.harga_beli, def?.harga_jual);
            const mStat = getStatusMargin(mNum);

            return (
              <div
                className="list-card"
                key={obat.id}
                onClick={() => bukaEdit(obat)}
              >
                <div className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="9" width="18" height="6" rx="3" /><path d="M8 9v6M16 9v6" />
                  </svg>
                </div>
                <div className="body">
                  <div className="t1">{obat.nama}</div>
                  <div className="t2" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span>{rupiah(def?.harga_jual || 0)} {def ? `/${def.nama_satuan}` : ""} {obat.nomor_batch ? `· Batch ${obat.nomor_batch}` : ""}</span>
                    {mStat.status !== "kosong" && (
                      <span className={`margin-badge ${mStat.warna}`} style={{ fontSize: 9.5, padding: "1px 5px" }}>
                        {mStat.label}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`badge-mini ${stokMenipis ? "low" : "ok"}`}>
                  {obat.stok} {obat.satuan_dasar}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ---------- TAMPILAN KHUSUS DESKTOP (SEARCH & TABEL LENGKAP) ---------- */}
      <div className="search-obat-input desktop-only" style={{ maxWidth: 340, marginBottom: 20 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input type="text" placeholder="Cari nama obat…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="obat-table-wrap desktop-only">
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
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={12} className="obat-table-info">Memuat…</td></tr>}
            {!loading && daftarTampil.length === 0 && <tr><td colSpan={12} className="obat-table-info">Tidak ada obat yang cocok.</td></tr>}
            {!loading && daftarTampil.map((obat) => {
              const def = obat.satuan?.find(s => s.is_default) || obat.satuan?.[0];
              const hari = daysUntil(obat.tanggal_exp);
              const satuanNames = obat.satuan?.map(s => s.nama_satuan).join(" / ");
              const hargaBeli = obat.satuan?.length > 1
                ? obat.satuan.map(s => rupiah(s.harga_beli)).join(" / ")
                : rupiah(def?.harga_beli);
              const hargaJual = obat.satuan?.length > 1
                ? obat.satuan.map(s => rupiah(s.harga_jual)).join(" / ")
                : rupiah(def?.harga_jual);
              const mNum = hitungMarginPersen(def?.harga_beli, def?.harga_jual);
              const mStat = getStatusMargin(mNum);

              return (
                <tr key={obat.id} className={!obat.aktif_dijual ? "obat-row-nonaktif" : ""}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {obat.gambar_url || obat.gambar ? (
                        <img
                          src={obat.gambar_url || `/storage/${obat.gambar}`}
                          alt=""
                          style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : null}
                      <span className="obat-nama-cell">{obat.nama}</span>
                    </div>
                  </td>
                  <td>{obat.kemasan || "-"}</td>
                  <td>{satuanNames}</td>
                  <td className="obat-batch-cell">{obat.nomor_batch || "-"}</td>
                  <td className="obat-harga-cell">
                    {hargaBeli}
                    {(() => {
                      const badge = badgeHargaBeli(def);
                      return badge ? <div className={`harga-badge ${badge.warna}`}>{badge.teks}</div> : null;
                    })()}
                  </td>
                  <td className="obat-harga-cell">{hargaJual}</td>
                  <td className="obat-margin-cell">
                    {mStat.status !== "kosong" ? (
                      <span className={`margin-badge ${mStat.warna}`}>
                        {mStat.label}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
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
                  {/* Kolom Aktif & Resep sengaja disembunyikan dari tampilan tabel
                      (permintaan user). Toggle-nya masih ada & berfungsi di
                      modal Edit Obat, dan field aktif_dijual/perlu_resep masih
                      dipakai penuh di backend (filter Kasir & Toko). Kalau
                      nanti mau dimunculkan lagi di tabel, tinggal un-comment
                      2 <td> di bawah ini + 2 <th> di header. */}
                  {/*
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
                  */}
                  <td>
                    <div className="obat-aksi-icons">
                      <button
                        type="button"
                        onClick={() => setRiwayatObat(obat)}
                        title="Lihat Asal-Usul & Riwayat Faktur Masuk"
                        style={{
                          background: "#FAF5FF",
                          border: "1px solid var(--magenta)",
                          borderRadius: 7,
                          padding: "5px 7px",
                          color: "var(--magenta-dark)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 14, height: 14 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </button>
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
          key={obatEdit ? `obat-${obatEdit.id}-${obatEdit.gambar || ""}` : "tambah"}
          obat={obatEdit}
          onClose={() => setModalOpen(false)}
          onSelesai={() => { setModalOpen(false); muatUlang(); }}
          onDataBerubah={muatUlang}
        />
      )}

      {sampahOpen && (
        <SampahModal
          onClose={() => setSampahOpen(false)}
          onSelesai={muatUlang}
        />
      )}

      {riwayatObat && (
        <RiwayatPengadaanModal
          obat={riwayatObat}
          onClose={() => setRiwayatObat(null)}
        />
      )}
    </KasirShell>
  );
}
