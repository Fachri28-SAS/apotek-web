import { useState } from "react";
import { api } from "../../../lib/api";

export default function TambahSupplierModal({ onClose, onSukses }) {
  const [nama, setNama] = useState("");
  const [isPkp, setIsPkp] = useState(false);
  const [telepon, setTelepon] = useState("");
  const [kontak, setKontak] = useState("");
  const [alamat, setAlamat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama supplier / PBF wajib diisi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api("/suppliers", {
        method: "POST",
        body: JSON.stringify({
          nama: nama.trim(),
          is_pkp: isPkp,
          telepon: telepon.trim() || null,
          kontak: kontak.trim() || null,
          alamat: alamat.trim() || null,
        }),
      });

      onSukses(res);
      onClose();
    } catch (err) {
      setError(err.message || "Gagal menyimpan supplier baru.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
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
          borderRadius: 20,
          maxWidth: 480,
          width: "100%",
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
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              🏢 Tambah Supplier / PBF Baru
            </h2>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
              Supplier baru akan langsung otomatis dipilih di dropdown faktur.
            </div>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, background: "#fff" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} style={{ padding: "20px 24px" }}>
          {error && (
            <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "10px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
              Nama Supplier / PBF <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Contoh: PT Anugrah Argon Medica"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1.5px solid var(--line)",
                borderRadius: 10,
                fontSize: 13.5,
                outline: "none",
                color: "var(--ink)",
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
              Status Pajak (PKP)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => setIsPkp(false)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: !isPkp ? "2px solid var(--magenta)" : "1px solid var(--line)",
                  background: !isPkp ? "#FAF5FF" : "#fff",
                  color: !isPkp ? "var(--magenta-dark)" : "var(--ink-soft)",
                }}
              >
                Non PKP
              </button>
              <button
                type="button"
                onClick={() => setIsPkp(true)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: isPkp ? "2px solid var(--magenta)" : "1px solid var(--line)",
                  background: isPkp ? "#FAF5FF" : "#fff",
                  color: isPkp ? "var(--magenta-dark)" : "var(--ink-soft)",
                }}
              >
                PKP (PPN 11%)
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                No. Telepon / WA (opsional)
              </label>
              <input
                type="text"
                placeholder="0812..."
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1.5px solid var(--line)",
                  borderRadius: 10,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                Nama Sales / Kontak (opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Bpk. Budi"
                value={kontak}
                onChange={(e) => setKontak(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1.5px solid var(--line)",
                  borderRadius: 10,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
              Alamat Gudang / Kantor (opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Kawasan Industri Pulogadung"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1.5px solid var(--line)",
                borderRadius: 10,
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              style={{ padding: "9px 18px", borderRadius: 10, fontSize: 13.5 }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-tambah"
              style={{ padding: "9px 22px", borderRadius: 10, fontSize: 13.5, fontWeight: 700 }}
            >
              {loading ? "Menyimpan…" : "Simpan & Pilih Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
