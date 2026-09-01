import { useState, useEffect } from "react";
import KasirShell from "./KasirShell";
import { api } from "../../lib/api";
import { useAuth } from "../../context/useAuth";

export default function KelolaUser() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suksesPesan, setSuksesPesan] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [userEdit, setUserEdit] = useState(null); // null = tambah baru, object = edit

  // Form State
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("kasir");
  const [aktif, setAktif] = useState(true);
  const [saving, setSaving] = useState(false);

  function muatUsers() {
    setLoading(true);
    api("/users/kelola")
      .then((data) => {
        setUsers(data);
        setError("");
      })
      .catch((err) => setError(err.message || "Gagal memuat data pengguna."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    muatUsers();
  }, []);

  function bukaModalTambah() {
    setUserEdit(null);
    setNama("");
    setUsername("");
    setPassword("");
    setRole("kasir");
    setAktif(true);
    setError("");
    setModalOpen(true);
  }

  function bukaModalEdit(u) {
    setUserEdit(u);
    setNama(u.nama);
    setUsername(u.username);
    setPassword(""); // kosong jika tidak ingin ganti password
    setRole(u.role);
    setAktif(Boolean(u.aktif));
    setError("");
    setModalOpen(true);
  }

  async function handleSimpan(e) {
    e.preventDefault();
    setError("");

    if (!nama.trim() || !username.trim()) {
      setError("Nama dan username wajib diisi.");
      return;
    }
    if (!userEdit && (!password || password.length < 6)) {
      setError("Kata sandi awal wajib diisi (minimal 6 karakter).");
      return;
    }
    if (userEdit && password && password.length < 6) {
      setError("Kata sandi baru minimal 6 karakter.");
      return;
    }

    setSaving(true);
    try {
      if (userEdit) {
        // Edit User
        const body = {
          nama: nama.trim(),
          username: username.trim(),
          role,
          aktif,
        };
        if (password) body.password = password;

        await api(`/users/${userEdit.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        setSuksesPesan(`Data akun @${username} berhasil diperbarui.`);
      } else {
        // Tambah User Baru
        await api("/users", {
          method: "POST",
          body: JSON.stringify({
            nama: nama.trim(),
            username: username.trim(),
            password,
            role,
          }),
        });
        setSuksesPesan(`Akun baru @${username} berhasil dibuat.`);
      }

      setModalOpen(false);
      muatUsers();
      setTimeout(() => setSuksesPesan(""), 4000);
    } catch (err) {
      setError(err.message || "Gagal menyimpan akun.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(u) {
    if (u.id === currentUser?.id) {
      alert("Anda tidak bisa menonaktifkan akun yang sedang digunakan saat ini.");
      return;
    }

    const statusTujuan = !u.aktif;
    const pesanKonfirmasi = statusTujuan
      ? `Aktifkan kembali akun "${u.nama}" (@${u.username})? Kasir ini akan bisa login kembali.`
      : `Nonaktifkan akun "${u.nama}" (@${u.username})?\n\nKasir ini TIDAK AKAN BISA LOGIN LAGI ke sistem. Riwayat transaksi masa lalu tetap aman.`;

    if (!window.confirm(pesanKonfirmasi)) return;

    try {
      await api(`/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({ aktif: statusTujuan }),
      });
      setSuksesPesan(`Status akun @${u.username} berhasil diubah.`);
      muatUsers();
      setTimeout(() => setSuksesPesan(""), 3500);
    } catch (err) {
      alert(err.message || "Gagal mengubah status akun.");
    }
  }

  const totalUser = users.length;
  const kasirAktif = users.filter((u) => u.aktif && u.role === "kasir").length;
  const adminAktif = users.filter((u) => u.aktif && u.role === "admin").length;
  const nonaktif = users.filter((u) => !u.aktif).length;

  return (
    <KasirShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 40 }}>
        {/* Top Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: "0 0 4px" }}>
              👥 Kelola Pengguna & Akun Kasir
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
              Kelola akses staf, tambah kasir baru, nonaktifkan akun kasir yang keluar, atau reset kata sandi.
            </p>
          </div>
          <button
            type="button"
            className="btn-full"
            onClick={bukaModalTambah}
            style={{
              background: "var(--magenta)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13.5,
              padding: "10px 18px",
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              border: "none",
              boxShadow: "0 4px 12px rgba(166, 75, 199, 0.25)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 16, height: 16 }}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah Akun Baru
          </button>
        </div>

        {/* Notifikasi Sukses */}
        {suksesPesan && (
          <div style={{ background: "#DCFCE7", color: "#15803D", padding: "12px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13.5, marginBottom: 18 }}>
            ✓ {suksesPesan}
          </div>
        )}

        {/* Ringkasan Akun */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
          <div style={{ background: "#fff", padding: "14px 18px", borderRadius: 12, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Total Akun Terdaftar</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", marginTop: 4 }}>{totalUser}</div>
          </div>
          <div style={{ background: "#FAF5FF", padding: "14px 18px", borderRadius: 12, border: "1px solid #E9D5FF" }}>
            <div style={{ fontSize: 12, color: "var(--magenta-dark)", fontWeight: 700 }}>Kasir Aktif</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--magenta-dark)", marginTop: 4 }}>{kasirAktif}</div>
          </div>
          <div style={{ background: "#EFF6FF", padding: "14px 18px", borderRadius: 12, border: "1px solid #BFDBFE" }}>
            <div style={{ fontSize: 12, color: "#1D4ED8", fontWeight: 700 }}>Admin Aktif</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1D4ED8", marginTop: 4 }}>{adminAktif}</div>
          </div>
          <div style={{ background: "#FEF2F2", padding: "14px 18px", borderRadius: 12, border: "1px solid #FECACA" }}>
            <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 700 }}>Akun Dinonaktifkan (Blokir)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#DC2626", marginTop: 4 }}>{nonaktif}</div>
          </div>
        </div>

        {/* Tabel Data User */}
        <div className="kasir-table-wrap" style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--line)", overflow: "hidden" }}>
          <table className="kasir-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                <th style={{ padding: "12px 16px", fontSize: 12.5 }}>Nama Lengkap</th>
                <th style={{ padding: "12px 16px", fontSize: 12.5 }}>Username</th>
                <th style={{ padding: "12px 16px", fontSize: 12.5 }}>Role</th>
                <th style={{ padding: "12px 16px", fontSize: 12.5 }}>Status Akses</th>
                <th style={{ padding: "12px 16px", fontSize: 12.5 }}>Tgl Dibuat</th>
                <th style={{ padding: "12px 16px", fontSize: 12.5, textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--ink-soft)" }}>
                    Memuat data akun pengguna…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--ink-soft)" }}>
                    Belum ada data pengguna.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSaya = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: "1px solid var(--line)",
                        opacity: u.aktif ? 1 : 0.65,
                        background: u.aktif ? "#fff" : "#FAFAFA",
                      }}
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: "var(--ink)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span>{u.nama}</span>
                          {isSaya && (
                            <span style={{ fontSize: 10, background: "#DCFCE7", color: "#15803D", padding: "1px 6px", borderRadius: 4, fontWeight: 800 }}>
                              Akun Anda
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--magenta-dark)", fontWeight: 600 }}>
                        @{u.username}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: u.role === "admin" ? "#EFF6FF" : "var(--magenta-tint)",
                            color: u.role === "admin" ? "#1D4ED8" : "var(--magenta-dark)",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {u.aktif ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#15803D", fontWeight: 700, fontSize: 12.5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A" }} />
                            Aktif (Bisa Login)
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#DC2626", fontWeight: 700, fontSize: 12.5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626" }} />
                            Dinonaktifkan (Terkunci)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--ink-soft)" }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                          {/* Tombol Edit / Reset Password */}
                          <button
                            type="button"
                            onClick={() => bukaModalEdit(u)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 8,
                              border: "1px solid var(--line)",
                              background: "#fff",
                              color: "var(--ink)",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            title="Ubah data atau reset password"
                          >
                            ✏️ Edit / Sandi
                          </button>

                          {/* Tombol Toggle Aktif / Nonaktifkan */}
                          {!isSaya && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 8,
                                border: "none",
                                background: u.aktif ? "#FEE2E2" : "#DCFCE7",
                                color: u.aktif ? "#DC2626" : "#15803D",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                              title={u.aktif ? "Nonaktifkan akun ini (blokir login)" : "Aktifkan kembali akun ini"}
                            >
                              {u.aktif ? "🔴 Nonaktifkan" : "🟢 Aktifkan"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- MODAL TAMBAH / EDIT USER ---------- */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440, width: "90vw", padding: "24px 26px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "var(--ink)" }}>
                {userEdit ? `Edit Akun: ${userEdit.nama}` : "➕ Tambah Akun Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--ink-soft)" }}
              >
                ✕
              </button>
            </div>

            {error && (
              <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "10px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSimpan} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 5, color: "var(--ink)" }}>
                  Nama Lengkap Staf / Kasir
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Siti Rahma"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13.5 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 5, color: "var(--ink)" }}>
                  Username untuk Login
                </label>
                <input
                  type="text"
                  placeholder="Contoh: sitirahma"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13.5 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 5, color: "var(--ink)" }}>
                  {userEdit ? "Ganti Kata Sandi (Kosongkan jika tidak ingin diubah)" : "Kata Sandi Awal"}
                </label>
                <input
                  type="password"
                  placeholder={userEdit ? "Ketik sandi baru (minimal 6 karakter)" : "Minimal 6 karakter"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13.5 }}
                  required={!userEdit}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 5, color: "var(--ink)" }}>
                  Hak Akses / Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13.5, background: "#fff" }}
                >
                  <option value="kasir">Kasir (Operasional & Penjualan)</option>
                  <option value="admin">Admin (Akses Penuh & Laporan)</option>
                </select>
              </div>

              {userEdit && (
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", fontWeight: 700, color: aktif ? "#15803D" : "#DC2626" }}>
                  <input
                    type="checkbox"
                    checked={aktif}
                    onChange={(e) => setAktif(e.target.checked)}
                    disabled={userEdit.id === currentUser?.id}
                  />
                  Akun Aktif (Bisa Login ke Sistem)
                </label>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setModalOpen(false)}
                  style={{ flex: 1, padding: "10px", borderRadius: 8 }}
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-full"
                  disabled={saving}
                  style={{
                    flex: 1.5,
                    padding: "10px",
                    borderRadius: 8,
                    background: "var(--magenta)",
                    color: "#fff",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {saving ? "Menyimpan…" : "Simpan Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </KasirShell>
  );
}
