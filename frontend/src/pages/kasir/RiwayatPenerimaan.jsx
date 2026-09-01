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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (periode) params.set("periode", periode);
    if (search.trim()) params.set("search", search.trim());

    const timer = setTimeout(() => {
      api(`/penerimaan?${params}`)
        .then((d) => { setDaftar(d || []); setError(""); })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [periode, search]);

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
        <div className="panel-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          {/* Search Box Pencarian Obat / Faktur */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260, maxWidth: 420, background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: 12, padding: "8px 14px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 17, height: 17, color: "var(--ink-soft)" }}>
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama obat, no. batch, supplier, faktur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13.5, width: "100%", color: "var(--ink)" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", padding: 0 }}>
                ✕
              </button>
            )}
          </div>

          <div className="periode-chips" style={{ margin: 0 }}>
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
          <div className="panel-kosong">Memuat data penerimaan…</div>
        ) : daftar.length === 0 ? (
          <div className="panel-kosong">
            {search ? `Tidak ditemukan faktur penerimaan untuk pencarian "${search}".` : "Belum ada faktur penerimaan pada periode ini."}
          </div>
        ) : (
          <table className="obat-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Supplier</th>
                <th>No. Faktur</th>
                <th>Obat / Item Masuk</th>
                <th style={{ textAlign: "right" }}>Total Tagihan</th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.id} className="baris-klik" onClick={() => bukaDetail(p.id)}>
                  <td>{new Date(p.tanggal_terima).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="obat-nama-cell">
                    <div style={{ fontWeight: 700 }}>{p.nama_supplier}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>Klik untuk lihat faktur lengkap ➔</div>
                  </td>
                  <td className="obat-batch-cell">{p.no_faktur}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 12.5, color: "var(--magenta-dark)" }}>
                        {p.items_count} item obat masuk
                      </span>
                      {p.items && p.items.length > 0 && (
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.3 }}>
                          {p.items.slice(0, 3).map((it) => it.nama_obat).join(", ")}
                          {p.items.length > 3 ? ` +${p.items.length - 3} lainnya` : ""}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 800, textAlign: "right", color: "var(--ink)" }}>{rupiah(p.total)}</td>
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
