import { useState, useEffect } from "react";
import { api } from "../../../lib/api";

export default function DetailBatchModal({ obat, onClose, onSimpan }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!obat?.id) return;
    setLoading(true);
    setError("");

    // Jika obat sudah punya draft batches lokal di state opname
    if (obat.batches && obat.batches.length > 0) {
      setBatches(obat.batches);
      setLoading(false);
      return;
    }

    // Ambil dari server
    api(`/obat/${obat.id}/batches`)
      .then((res) => {
        const mapped = (res || []).map((b) => ({
          id: b.id || null,
          nomor_batch: b.nomor_batch || "BATCH-01",
          tanggal_exp: b.tanggal_exp ? b.tanggal_exp.substring(0, 10) : "",
          stok_old: Number(b.stok || 0),
          stok: Number(b.stok || 0),
        }));
        setBatches(mapped);
      })
      .catch((err) => {
        // Fallback jika belum ada data batch di server
        setBatches([
          {
            id: null,
            nomor_batch: obat.nomor_batch || "BATCH-01",
            tanggal_exp: obat.tanggal_exp ? String(obat.tanggal_exp).substring(0, 10) : "",
            stok_old: Number(obat.stok_sistem || obat.stok || 0),
            stok: Number(obat.stok_sistem || obat.stok || 0),
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, [obat]);

  function ubahBatch(index, field, value) {
    setBatches((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function tambahBarisBatch() {
    setBatches((prev) => [
      ...prev,
      {
        id: null,
        nomor_batch: `BATCH-${String(prev.length + 1).padStart(2, "0")}`,
        tanggal_exp: "",
        stok_old: 0,
        stok: 0,
      },
    ]);
  }

  function hapusBatch(index) {
    if (batches.length === 1) {
      setError("Obat harus memiliki minimal 1 batch.");
      return;
    }
    setError("");
    setBatches((prev) => prev.filter((_, i) => i !== index));
  }

  const filteredBatches = batches.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (b.nomor_batch || "").toLowerCase().includes(q) ||
      (b.tanggal_exp || "").toLowerCase().includes(q)
    );
  });

  const totalStokFisik = batches.reduce((sum, b) => sum + (Number(b.stok) || 0), 0);
  const totalStokOld = batches.reduce((sum, b) => sum + (Number(b.stok_old) || 0), 0);
  const selisih = totalStokFisik - (obat.stok_sistem ?? obat.stok ?? totalStokOld);

  function handleSimpan() {
    // Validasi
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      if (!b.nomor_batch || !b.nomor_batch.trim()) {
        setError(`Nomor batch pada baris ke-${i + 1} tidak boleh kosong.`);
        return;
      }
      if (b.stok === "" || Number(b.stok) < 0) {
        setError(`Stok batch pada baris ke-${i + 1} harus angka 0 atau lebih.`);
        return;
      }
    }

    onSimpan({
      batches,
      totalStokFisik,
    });
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(18, 12, 28, 0.75)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: 18,
          maxWidth: 960,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FAF5FF",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--magenta-dark)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              📦 Rincian Batch & Stok Opname
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", margin: "3px 0 0" }}>
              {obat?.nama}
            </h2>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
              Satuan Dasar: <strong>{obat?.satuan_dasar}</strong> • Stok Tercatat di Sistem: <strong>{obat?.stok_sistem ?? obat?.stok} {obat?.satuan_dasar}</strong>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 8, background: "#fff" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* Toolbar Search & Info */}
        <div
          style={{
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            background: "#fff",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, maxWidth: 380, background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: 10, padding: "8px 14px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 16, height: 16, color: "var(--ink-soft)" }}>
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search by Batch No or Expired Date…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%", color: "var(--ink)" }}
            />
          </div>

          <button
            type="button"
            onClick={tambahBarisBatch}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#FAF5FF",
              color: "var(--magenta-dark)",
              border: "1.5px solid var(--magenta)",
              borderRadius: 10,
              padding: "8px 16px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Tambah Batch
          </button>
        </div>

        {error && (
          <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "10px 24px", fontSize: 12.5, fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Tabel Batch (Persis seperti di foto pengguna) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--ink-soft)", fontSize: 14 }}>
              Memuat data batch…
            </div>
          ) : (
            <table className="obat-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr style={{ background: "#1E293B", color: "#F8FAFC" }}>
                  <th style={{ color: "#F8FAFC", padding: "12px 14px", textAlign: "left", fontSize: 12 }}>ITEM NAME</th>
                  <th style={{ color: "#F8FAFC", padding: "12px 14px", textAlign: "center", width: 140, fontSize: 12 }}>STOCK BATCH (OLD)</th>
                  <th style={{ color: "#F8FAFC", padding: "12px 14px", textAlign: "center", width: 140, fontSize: 12 }}>STOCK BATCH (NEW)</th>
                  <th style={{ color: "#F8FAFC", padding: "12px 14px", textAlign: "left", width: 170, fontSize: 12 }}>BATCH NO.</th>
                  <th style={{ color: "#F8FAFC", padding: "12px 14px", textAlign: "left", width: 170, fontSize: 12 }}>EXPIRED DATE</th>
                  <th style={{ color: "#F8FAFC", padding: "12px 14px", textAlign: "center", width: 50, fontSize: 12 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((b, idx) => {
                  const realIndex = batches.indexOf(b);
                  return (
                    <tr key={realIndex} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>
                        {obat?.nama}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "var(--ink-soft)", fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>
                        {Number(b.stok_old || 0).toLocaleString("id-ID")}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="number"
                          min="0"
                          value={b.stok}
                          onChange={(e) => ubahBatch(realIndex, "stok", e.target.value === "" ? "" : Number(e.target.value))}
                          style={{
                            width: 100,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1.5px solid var(--magenta)",
                            textAlign: "center",
                            fontWeight: 800,
                            fontSize: 14,
                            background: "#FAF5FF",
                            color: "var(--magenta-dark)",
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={b.nomor_batch}
                          placeholder="Nomor batch…"
                          onChange={(e) => ubahBatch(realIndex, "nomor_batch", e.target.value.toUpperCase())}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1.5px solid var(--line)",
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={b.tanggal_exp}
                          onChange={(e) => ubahBatch(realIndex, "tanggal_exp", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            borderRadius: 8,
                            border: "1.5px solid var(--line)",
                            fontSize: 13,
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => hapusBatch(realIndex)}
                          title="Hapus baris batch ini"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer",
                            padding: 6,
                            borderRadius: 6,
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--line)",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 13.5, color: "var(--ink)" }}>
              Sisa stok fisik Anda:{" "}
              <strong style={{ color: "var(--magenta-dark)", fontSize: 15 }}>
                {totalStokFisik.toLocaleString("id-ID")} {obat?.satuan_dasar}
              </strong>
            </div>
            <div style={{ fontSize: 12.5 }}>
              Selisih:{" "}
              <span
                style={{
                  fontWeight: 800,
                  color: selisih === 0 ? "var(--green)" : selisih > 0 ? "var(--green)" : "#DC2626",
                }}
              >
                {selisih > 0 ? `+${selisih}` : selisih} {obat?.satuan_dasar}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              style={{ padding: "9px 18px", borderRadius: 10, fontSize: 13 }}
            >
              Close
            </button>
            <button
              type="button"
              className="btn-full"
              onClick={handleSimpan}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                background: "var(--magenta)",
                color: "#fff",
                fontWeight: 700,
                border: "none",
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              ✓ Simpan & Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
