import { useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/useAuth";
import { tambahLogPerubahan } from "../../../lib/auditLog";

export default function TambahSupplierModal({ supplierList = [], onClose, onSukses, onHapusSupplier }) {
  const { user } = useAuth();
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

  const [editSupplier, setEditSupplier] = useState(null);
  const [editNama, setEditNama] = useState("");
  const [editPkp, setEditPkp] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  async function simpanEdit(e) {
    e.preventDefault();
    if (!editNama.trim()) {
      setError("Nama supplier tidak boleh kosong.");
      return;
    }
    setEditLoading(true);
    setError("");
    setPesan("");

    try {
      const res = await api(`/suppliers/${editSupplier.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nama: editNama.trim(),
          is_pkp: editPkp,
          telepon: editSupplier.telepon || null,
          kontak: editSupplier.kontak || null,
          alamat: editSupplier.alamat || null,
        }),
      });

      const namaAkun = user?.nama || user?.username || "Petugas";
      tambahLogPerubahan({
        nama_akun: namaAkun,
        role_akun: user?.role || "kasir",
        kategori: "Supplier",
        aksi: "Edit",
        judul: editNama.trim(),
        sebelum: editSupplier.nama,
        sesudah: editNama.trim(),
        keterangan: `Ubah nama PBF dari "${editSupplier.nama}" menjadi "${editNama.trim()}" (${namaAkun})`,
      });

      setPesan(`Supplier "${editSupplier.nama}" berhasil diubah menjadi "${editNama.trim()}".`);
      setEditSupplier(null);
      if (onSukses) onSukses(res);
    } catch (err) {
      setError(err.message || "Gagal mengubah nama supplier.");
    } finally {
      setEditLoading(false);
    }
  }

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

      const namaAkun = user?.nama || user?.username || (user?.role === "admin" ? "Admin" : "Kasir");
      tambahLogPerubahan({
        nama_akun: namaAkun,
        role_akun: user?.role || "kasir",
        kategori: "Supplier",
        aksi: "Tambah",
        judul: nama.trim(),
        sebelum: "-",
        sesudah: isPkp ? "PKP" : "Non-PKP",
        keterangan: `Tambah supplier baru via formulir (${namaAkun})`,
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

      const namaAkun = user?.nama || user?.username || (user?.role === "admin" ? "Admin" : "Kasir");
      tambahLogPerubahan({
        nama_akun: namaAkun,
        role_akun: user?.role || "kasir",
        kategori: "Supplier",
        aksi: "Hapus",
        judul: s.nama,
        sebelum: "Aktif",
        sesudah: "Dihapus",
        keterangan: `Hapus supplier dari daftar pilihan (${namaAkun})`,
      });

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
               Kelola Supplier / PBF
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
             Daftar Supplier ({supplierList.length})
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
                  PKP (Kena PPN)
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
                        {s.telepon && <span> {s.telepon}</span>}
                        {s.kontak && <span> {s.kontak}</span>}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditSupplier(s);
                          setEditNama(s.nama);
                          setEditPkp(Boolean(s.is_pkp));
                          setError("");
                        }}
                        title={`Ubah Nama / Edit ${s.nama}`}
                        style={{
                          background: "#FAF5FF",
                          border: "1.5px solid #D8B4FE",
                          borderRadius: 8,
                          padding: "6px 10px",
                          color: "#6B21A8",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                          <path d="M17 3l4 4L7 21H3v-4L17 3z" />
                        </svg>
                        Edit
                      </button>

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
                  </div>
                ))}
              </div>
            )}

            {/* Modal Mini Inline Edit Supplier */}
            {editSupplier && (
              <form
                onSubmit={simpanEdit}
                style={{
                  marginTop: 14,
                  padding: "14px 16px",
                  background: "#FAF5FF",
                  border: "1.5px solid #C084FC",
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: "#581C87", marginBottom: 8 }}>
                  Ubah Nama PBF: <span style={{ color: "#7E22CE" }}>{editSupplier.nama}</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                  <input
                    type="text"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    placeholder="Nama baru supplier / PBF"
                    style={{
                      flex: 1,
                      minWidth: 220,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1.5px solid #D8B4FE",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                    required
                  />

                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#6B21A8", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editPkp}
                      onChange={(e) => setEditPkp(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <span>PKP (Kena PPN)</span>
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setEditSupplier(null)}
                    disabled={editLoading}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 7,
                      border: "1px solid #CBD5E1",
                      background: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 7,
                      border: "none",
                      background: "#7E22CE",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {editLoading ? "Menyimpan…" : "Simpan Perubahan PBF"}
                  </button>
                </div>
              </form>
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
