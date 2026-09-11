import { useState, useEffect, useRef } from "react";
import { api } from "../../../lib/api";
import { rupiah } from "../../../utils/format";

export default function SearchObat({ onPilih }) {
  const [query, setQuery] = useState("");
  const [hasil, setHasil] = useState([]);
  const [loading, setLoading] = useState(false);
  const [terbuka, setTerbuka] = useState(false);
  const boxRef = useRef(null);

  // Debounce: jangan fetch tiap ketukan huruf, tunggu jeda 300ms dulu
  useEffect(() => {
    if (query.trim().length < 2) {
      setHasil([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      api(`/obat?search=${encodeURIComponent(query)}&untuk=kasir`)
        .then((data) => setHasil(data))
        .catch(() => setHasil([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Klik di luar kotak search -> tutup dropdown
  useEffect(() => {
    function handleClickLuar(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setTerbuka(false);
    }
    document.addEventListener("mousedown", handleClickLuar);
    return () => document.removeEventListener("mousedown", handleClickLuar);
  }, []);

  function pilihSatuan(obat, satuan) {
    onPilih(obat, satuan);
    setQuery("");
    setHasil([]);
    setTerbuka(false);
  }

  return (
    <div className="search-obat" ref={boxRef}>
      <div className="search-obat-input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Cari nama obat…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setTerbuka(true); }}
          onFocus={() => setTerbuka(true)}
        />
      </div>

      {terbuka && query.trim().length >= 2 && (
        <div className="search-obat-dropdown">
          {loading && <div className="search-obat-info">Mencari…</div>}

          {!loading && hasil.length === 0 && (
            <div className="search-obat-info">Tidak ada obat yang cocok.</div>
          )}

          {!loading && hasil.map((obat) => (
            <div className="search-obat-row" key={obat.id}>
              <div className="search-obat-row-head">
                <span className="nama">{obat.nama}</span>
                {obat.perlu_resep && <span className="badge-resep">Resep</span>}
                {obat.stok <= 0 && <span className="badge-habis">Stok habis</span>}
              </div>

              <div className="search-obat-satuan-list">
                {(() => {
                  const list = obat.satuan || [];
                  // Sembunyikan satuan Box / Dus jika obat punya satuan eceran lain (misal Strip, Pcs, Tablet, Botol)
                  const nonBox = list.filter((s) => !/^(box|dus)$/i.test((s.nama_satuan || "").trim()));
                  const tampil = nonBox.length > 0 ? nonBox : list;

                  return tampil.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="btn-satuan"
                      disabled={obat.stok < s.faktor}
                      onClick={() => pilihSatuan(obat, s)}
                      title={obat.stok < s.faktor ? "Stok tidak cukup untuk 1 " + s.nama_satuan : ""}
                    >
                      {s.nama_satuan} · {rupiah(s.harga_jual)}
                    </button>
                  ));
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
