import { useState } from "react";
import { api } from "../../../lib/api";

export default function TambahSupplierModal({ supplierList = [], onClose, onSukses, onHapusSupplier }) {
  const [tab, setTab] = useState("tambah"); // "tambah" | "daftar"
  const [nama, setNama] = useState("");
  const [isPkp, setIsPkp] = useState(false);
  const [telepon, setTelepon] = useState("");
  const [kontak, setKontak] = useState("");
  const [alamat, setAlamat] = useState("");
  const [loading, setLoading] = useState(false);
  const [hapusLoadingId, setHapusLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [pesan, setPesan] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama supplier / PBF wajib diisi.");
      return;
    }

    setLoading(true);
    setError("");
    setPesan("");

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

  async function hapus(s) {
    if (!confirm(`Hapus supplier "${s.nama}" dari daftar pilihan?`)) return;

    setHapusLoadingId(s.id);
    setError("");
    setPesan("");

    try {
      await api(`/suppliers/${s.id}`, { method: "DELETE" });
      onHapusSupplier(s.id);
      setPesan(`Supplier "${s.nama}" berhasil dihapus.`);
    } catch (err) {
      setError(err.message || "Gagal menghapus supplier.");
    } finally {
      setHapusLoadingId(null);
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
          maxWidth: 520,
          width: "100%",
          boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "18px 24px 14px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FAF5FF",
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              🏢 Kelola Supplier / PBF
            </h2>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
              Tambah atau hapus supplier untuk faktur penerimaan barang.
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

        {/* Tab Navigasi */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "#fff" }}>
          <button
            type="button"
            onClick={() => { setTab("tambah"); setError(""); setPesan(""); }}
            style={{
              flex: 1,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              borderBottom: tab === "tambah" ? "2.5px solid var(--magenta)" : "2.5px solid transparent",
              color: tab === "tambah" ? "var(--magenta-dark)" : "var(--ink-soft)",
              background: tab === "tambah" ? "#FAF5FF" : "transparent",
              cursor: "pointer",
            }}
          >
            + Tambah Supplier Baru
          </button>
          <button
            type="button"
            onClick={() => { setTab("daftar"); setError(""); setPesan(""); }}
            style={{
              flex: 1,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              borderBottom: tab === "daftar" ? "2.5px solid var(--magenta)" : "2.5px solid transparent",
              color: tab === "daftar" ? "var(--magenta-dark)" : "var(--ink-soft)",
              background: tab === "daftar" ? "#FAF5FF" : "transparent",
              cursor: "pointer",
            }}
          >
            📋 Daftar Supplier ({supplierList.length})
          </button>
        </div>

        {error && (
          <div style={{ background: "#FEE2E2", color: "#DC2626", margin: "14px 24px 0", padding: "10px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
            {error}
          </div>
        )}

        {pesan && (
          <div style={{ background: "#DCFCE7", color: "#15803D", margin: "14px 24px 0", padding: "10px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
            {pesan}
          </div>
        )}

        {/* TAB 1: FORM TAMBAH SUPPLIER */}
        {tab === "tambah" && (
          <form onSubmit={submit} style={{ padding: "18px 24px 22px" }}>
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
        )}

        {/* TAB 2: DAFTAR & HAPUS SUPPLIER */}
        {tab === "daftar" && (
          <div style={{ padding: "16px 24px 20px" }}>
            {supplierList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--ink-soft)", fontSize: 13.5 }}>
                Belum ada supplier yang terdaftar.
              </div>
            ) : (
              <div style={{ maxHeight: 340, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
                {supplierList.map((s, idx) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderBottom: idx < supplierList.length - 1 ? "1px solid var(--line)" : "none",
                      background: idx % 2 === 0 ? "#fff" : "#F8FAFC",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{s.nama}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: s.is_pkp ? "#EDE9FE" : "#F1F5F9",
                          color: s.is_pkp ? "var(--magenta-dark)" : "var(--ink-soft)",
                        }}>
                          {s.is_pkp ? "PKP" : "Non-PKP"}
                        </span>
                        {s.telepon && <span>📞 {s.telepon}</span>}
                        {s.kontak && <span>👤 {s.kontak}</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={hapusLoadingId === s.id}
                      onClick={() => hapus(s)}
                      title={`Hapus ${s.nama}`}
                      style={{
                        background: "#FEE2E2",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 10px",
                        color: "#DC2626",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 14, height: 14 }}>
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                      </svg>
                      {hapusLoadingId === s.id ? "…" : "Hapus"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                style={{ padding: "9px 20px", borderRadius: 10, fontSize: 13.5 }}
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
