import { useState, useEffect, useRef } from "react";
import { api } from "../../lib/api";
import KasirShell from "./KasirShell";
import DetailBatchModal from "./komponen/DetailBatchModal";

function getTglYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ---------- Search khusus opname: pilih OBAT, bukan satuan ---------- */
function SearchObatOpname({ onPilih, sudahDipilih }) {
  const [query, setQuery] = useState("");
  const [hasil, setHasil] = useState([]);
  const [loading, setLoading] = useState(false);
  const [terbuka, setTerbuka] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) { setHasil([]); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      api(`/obat?search=${encodeURIComponent(query)}`)
        .then(setHasil).catch(() => setHasil([])).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function klikLuar(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setTerbuka(false);
    }
    document.addEventListener("mousedown", klikLuar);
    return () => document.removeEventListener("mousedown", klikLuar);
  }, []);

  return (
    <div className="search-obat" ref={boxRef}>
      <div className="search-obat-input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Cari obat untuk dihitung ulang…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setTerbuka(true); }}
          onFocus={() => setTerbuka(true)}
        />
      </div>

      {terbuka && query.trim().length >= 2 && (
        <div className="search-obat-dropdown">
          {loading && <div className="search-obat-info">Mencari…</div>}
          {!loading && hasil.length === 0 && <div className="search-obat-info">Tidak ada obat yang cocok.</div>}
          {!loading && hasil.map((obat) => {
            const sudah = sudahDipilih.includes(obat.id);
            return (
              <button
                key={obat.id}
                type="button"
                className="opname-hasil-row"
                disabled={sudah}
                onClick={() => { onPilih(obat); setQuery(""); setTerbuka(false); }}
              >
                <span>
                  <span className="nama">{obat.nama}</span>
                  <span className="opname-hasil-stok">
                    Stok sistem: {obat.stok} {obat.satuan_dasar}
                  </span>
                </span>
                {sudah && <span className="badge-habis">Sudah ditambahkan</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StokOpname() {
  const tglSekarang = getTglYmd(new Date());
  const [items, setItems] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [dariTanggal, setDariTanggal] = useState(tglSekarang);
  const [sampaiTanggal, setSampaiTanggal] = useState(tglSekarang);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState("");
  const [modalBatchObat, setModalBatchObat] = useState(null);

  function muatRiwayat() {
    const params = new URLSearchParams({ tipe: "penyesuaian" });
    if (dariTanggal) params.set("dari_tanggal", dariTanggal);
    if (sampaiTanggal) params.set("sampai_tanggal", sampaiTanggal);
    api(`/stok-mutasi?${params}`)
      .then(setRiwayat)
      .catch(() => setRiwayat([]));
  }

  useEffect(() => { muatRiwayat(); }, [dariTanggal, sampaiTanggal]);

  function tambahItem(obat) {
    setItems((prev) => [...prev, {
      id: obat.id,
      obat_id: obat.id,
      nama: obat.nama,
      nomor_batch: obat.nomor_batch,
      tanggal_exp: obat.tanggal_exp,
      satuan_dasar: obat.satuan_dasar,
      stok_sistem: obat.stok,
      stok_fisik: "",
      keterangan: "",
      batches: null,
    }]);
    setSukses("");
  }

  function ubahItem(id, field, value) {
    setItems((prev) => prev.map((it) => (it.obat_id === id ? { ...it, [field]: value } : it)));
  }

  function hapusItem(id) {
    setItems((prev) => prev.filter((it) => it.obat_id !== id));
  }

  function handleSimpanBatch(obatId, { batches, totalStokFisik }) {
    setItems((prev) =>
      prev.map((it) =>
        it.obat_id === obatId
          ? { ...it, batches, stok_fisik: totalStokFisik }
          : it
      )
    );
  }

  const itemTerisi = items.filter((it) => it.stok_fisik !== "");
  const totalSelisih = itemTerisi.reduce((s, it) => s + (Number(it.stok_fisik) - it.stok_sistem), 0);
  const adaSelisih = itemTerisi.filter((it) => Number(it.stok_fisik) !== it.stok_sistem).length;

  async function simpan() {
    setError(""); setSukses("");

    if (itemTerisi.length === 0) {
      setError("Isi dulu Stok Fisik minimal satu baris.");
      return;
    }

    setLoading(true);
    try {
      await api("/obat/opname", {
        method: "POST",
        body: JSON.stringify({
          items: itemTerisi.map((it) => ({
            obat_id: it.obat_id,
            stok_fisik: Number(it.stok_fisik),
            keterangan: it.keterangan || null,
            batches: it.batches || null,
          })),
        }),
      });
      setSukses(`Berhasil menyesuaikan ${itemTerisi.length} obat. Stok sistem & rincian batch sudah diperbarui.`);
      setItems([]);
      muatRiwayat();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Stok Opname</h1>
          <p className="halaman-sub">Hitung stok fisik per obat & batch, sistem otomatis sinkronkan selisihnya</p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {sukses && <div className="pesan-sukses">{sukses}</div>}

      {/* ---------- PANEL INPUT ---------- */}
      <div className="panel">
        <div className="panel-head"><h3>Hitung Ulang Stok</h3></div>

        <SearchObatOpname onPilih={tambahItem} sudahDipilih={items.map((i) => i.obat_id)} />

        {items.length === 0 ? (
          <div className="panel-kosong">
            Cari obat di kotak atas untuk mulai. Bisa tambah banyak obat sekaligus dalam satu sesi.
          </div>
        ) : (
          <>
            <div className="obat-table-wrap">
              <table className="obat-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Nama Obat</th>
                    <th style={{ width: 140, textAlign: "center" }}>Rincian Batch</th>
                    <th style={{ width: 110 }}>Stok Sistem</th>
                    <th style={{ width: 120 }}>Stok Fisik</th>
                    <th style={{ width: 100 }}>Selisih</th>
                    <th>Keterangan</th>
                    <th style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const terisi = it.stok_fisik !== "";
                    const selisih = terisi ? Number(it.stok_fisik) - it.stok_sistem : null;
                    const adaBatchConfig = it.batches && it.batches.length > 0;
                    return (
                      <tr key={it.obat_id}>
                        <td><span className="obat-nama-cell">{it.nama}</span></td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => setModalBatchObat(it)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "5px 10px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              background: adaBatchConfig ? "#FAF5FF" : "#F8FAFC",
                              color: adaBatchConfig ? "var(--magenta-dark)" : "#64748B",
                              border: adaBatchConfig ? "1px solid #E9D5FF" : "1px solid #E2E8F0",
                              cursor: "pointer",
                            }}
                            title="Klik untuk opname per nomor batch obat"
                          >
                            <span>📦</span>
                            <span>{adaBatchConfig ? `${it.batches.length} Batch` : "Atur Batch"}</span>
                          </button>
                        </td>
                        <td className="obat-stok-cell">{it.stok_sistem} {it.satuan_dasar}</td>
                        <td>
                          <input
                            type="number" min="0" className="cart-input-angka"
                            value={it.stok_fisik}
                            placeholder="Stok riil"
                            onChange={(e) => ubahItem(it.obat_id, "stok_fisik", e.target.value)}
                          />
                        </td>
                        <td>
                          {selisih === null ? (
                            <span style={{ color: "var(--ink-soft)" }}>—</span>
                          ) : selisih === 0 ? (
                            <span className="selisih-badge sama">Pas</span>
                          ) : (
                            <span className={`selisih-badge ${selisih > 0 ? "lebih" : "kurang"}`}>
                              {selisih > 0 ? `+${selisih}` : selisih}
                            </span>
                          )}
                        </td>
                        <td>
                          <input
                            type="text" className="cart-input-angka"
                            value={it.keterangan}
                            placeholder="mis. rusak, hilang"
                            onChange={(e) => ubahItem(it.obat_id, "keterangan", e.target.value)}
                          />
                        </td>
                        <td>
                          <button className="cart-hapus-btn" onClick={() => hapusItem(it.obat_id)} aria-label="Hapus baris">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="opname-ringkasan">
              <div className="opname-ringkasan-info">
                <span>{itemTerisi.length} dari {items.length} baris terisi</span>
                {adaSelisih > 0 && (
                  <span className="opname-ringkasan-selisih">
                    {adaSelisih} obat selisih · total {totalSelisih > 0 ? `+${totalSelisih}` : totalSelisih}
                  </span>
                )}
              </div>
              <button className="payment-submit" style={{ width: "auto", marginTop: 0, padding: "12px 26px" }}
                onClick={simpan} disabled={loading || itemTerisi.length === 0}>
                {loading ? "Menyimpan…" : "Simpan Penyesuaian"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ---------- MODAL RINCIAN BATCH ---------- */}
      {modalBatchObat && (
        <DetailBatchModal
          obat={modalBatchObat}
          onClose={() => setModalBatchObat(null)}
          onSimpan={(hasilBatch) => handleSimpanBatch(modalBatchObat.obat_id, hasilBatch)}
        />
      )}

      {/* ---------- RIWAYAT ---------- */}
      <div className="panel">
        <div className="panel-head" style={{ flexWrap: "wrap", gap: 12 }}>
          <h3>Riwayat Penyesuaian</h3>
          <div className="kalender-filter-group" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="kalender-item-wrap" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              <span>📅 Dari:</span>
              <input
                type="date"
                value={dariTanggal}
                onChange={(e) => setDariTanggal(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1.5px solid var(--line)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  background: "#fff",
                }}
              />
            </div>

            <div className="kalender-item-wrap" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              <span>Sampai:</span>
              <input
                type="date"
                value={sampaiTanggal}
                onChange={(e) => setSampaiTanggal(e.target.value)}
                style={{
                  padding: "6px 10px",
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
        </div>

        {riwayat.length === 0 ? (
          <div className="panel-kosong">Belum ada penyesuaian pada periode ini.</div>
        ) : (
          <div className="obat-table-wrap">
            <table className="obat-table">
              <thead>
                <tr>
                  <th>Tanggal</th><th>Obat</th><th>Sebelum</th><th>Sesudah</th>
                  <th>Selisih</th><th>Petugas</th><th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td><span className="obat-nama-cell">{m.obat?.nama || "—"}</span></td>
                    <td>{m.stok_sebelum}</td>
                    <td>{m.stok_sesudah}</td>
                    <td>
                      <span className={`selisih-badge ${m.qty > 0 ? "lebih" : "kurang"}`}>
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </span>
                    </td>
                    <td>{m.user?.nama || "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-soft)" }}>{m.keterangan || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </KasirShell>
  );
}
