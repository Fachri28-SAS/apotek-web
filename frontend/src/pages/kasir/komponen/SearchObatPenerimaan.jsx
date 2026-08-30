import { useState, useEffect, useRef } from "react";
import { api } from "../../../lib/api";

export default function SearchObatPenerimaan({ onPilih, supplierId }) {
  const [query, setQuery] = useState("");
  const [hasil, setHasil] = useState([]);
  const [loading, setLoading] = useState(false);
  const [terbuka, setTerbuka] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) { setHasil([]); return; }
    setLoading(true);
    const params = new URLSearchParams({ search: query });
    if (supplierId) params.set("supplier_id", supplierId);
    const timer = setTimeout(() => {
      api(`/obat?${params}`).then(setHasil).catch(() => setHasil([])).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, supplierId]);

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
          placeholder={supplierId ? "Cari obat dari supplier ini…" : "Cari obat…"}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setTerbuka(true); }}
          onFocus={() => setTerbuka(true)}
        />
      </div>

      {terbuka && query.trim().length >= 2 && (
        <div className="search-obat-dropdown">
          {loading && <div className="search-obat-info">Mencari…</div>}
          {!loading && hasil.length === 0 && <div className="search-obat-info">Tidak ada obat yang cocok.</div>}
          {!loading && hasil.map((obat) => (
            <button
              key={obat.id}
              type="button"
              className="opname-hasil-row"
              onClick={() => { onPilih(obat); setQuery(""); setTerbuka(false); }}
            >
              <span>
                <span className="nama">{obat.nama}</span>
                <span className="opname-hasil-stok">{obat.satuan.map((s) => s.nama_satuan).join(" / ")}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
