import { useState, useEffect } from "react";
import KasirShell from "./KasirShell";
import { api } from "../../lib/api";
import { useAuth } from "../../context/useAuth";
import { tambahLogPerubahan } from "../../lib/auditLog";

export default function KelolaUser() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suksesPesan, setSuksesPesan] = useState("");
  const [salinSukses, setSalinSukses] = useState(false);

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

  // Status & Pengaturan Jam Operasional
  const [operasional, setOperasional] = useState(null);
  const [modalOperasionalOpen, setModalOperasionalOpen] = useState(false);
  const [jamBuka, setJamBuka] = useState("07:00");
  const [jamTutup, setJamTutup] = useState("22:00");
  const [statusManual, setStatusManual] = useState("otomatis");
  const [pesanTutup, setPesanTutup] = useState("");
  const [savingOperasional, setSavingOperasional] = useState(false);

  function formatLastSeen(isoStr, isOnline) {
    if (isOnline) return "Online Sekarang";
    if (!isoStr) return "Belum pernah login";
    const d = new Date(isoStr);
    const diffMenit = Math.round((Date.now() - d.getTime()) / 60000);
    if (diffMenit <= 1) return "Offline · Baru saja";
    if (diffMenit < 60) return `Offline · ${diffMenit} mnt lalu`;
    const diffJam = Math.round(diffMenit / 60);
    if (diffJam < 24) return `Offline · ${diffJam} jam lalu`;
    return `Offline · ${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`;
  }

  function muatUsers(silent = false) {
    if (!silent) setLoading(true);
    api("/users/kelola")
      .then((data) => {
        setUsers(data);
        setError("");
      })
      .catch((err) => {
        if (!silent) setError(err.message || "Gagal memuat data pengguna.");
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }

  function muatOperasional() {
    api("/pengaturan-operasional")
      .then((d) => {
        setOperasional(d);
        setJamBuka(d.jam_buka || "07:00");
        setJamTutup(d.jam_tutup || "22:00");
        setStatusManual(d.status_manual || "otomatis");
        setPesanTutup(d.pesan_tutup || "");
      })
      .catch(() => {});
  }

  useEffect(() => {
    muatUsers();
    muatOperasional();
    // Polling status online/offline realtime & jam operasional setiap 8 detik
    const timer = setInterval(() => {
      muatUsers(true);
      muatOperasional();
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  async function handleSimpanOperasional(e) {
    e.preventDefault();
    setSavingOperasional(true);
    try {
      const res = await api("/pengaturan-operasional", {
        method: "POST",
        body: JSON.stringify({
          jam_buka: jamBuka,
          jam_tutup: jamTutup,
          status_operasional_manual: statusManual,
          pesan_tutup: pesanTutup || null,
        }),
      });
      setOperasional(res.operasional);
      setModalOperasionalOpen(false);
      setSuksesPesan("Pengaturan jam operasional apotek berhasil disimpan.");
      setTimeout(() => setSuksesPesan(""), 4000);
    } catch (err) {
      alert(err.message || "Gagal menyimpan jam operasional.");
    } finally {
      setSavingOperasional(false);
    }
  }

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

        const namaAkun = currentUser?.nama || currentUser?.username || "Admin";
        tambahLogPerubahan({
          nama_akun: namaAkun,
          role_akun: currentUser?.role || "admin",
          kategori: "Pengguna",
          aksi: "Ubah",
          judul: `${nama} (@${username})`,
          sebelum: `Role: ${userEdit.role}, Status: ${userEdit.aktif ? "Aktif" : "Nonaktif"}`,
          sesudah: `Role: ${role}, Status: ${aktif ? "Aktif" : "Nonaktif"}`,
          keterangan: `Pembaruan data akun pengguna (${namaAkun})`,
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

        const namaAkun = currentUser?.nama || currentUser?.username || "Admin";
        tambahLogPerubahan({
          nama_akun: namaAkun,
          role_akun: currentUser?.role || "admin",
          kategori: "Pengguna",
          aksi: "Tambah",
          judul: `${nama} (@${username})`,
          sebelum: "-",
          sesudah: `Role: ${role}, Status: Aktif`,
          keterangan: `Pembuatan akun kasir/pengguna baru (${namaAkun})`,
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

      const namaAkun = currentUser?.nama || currentUser?.username || "Admin";
      tambahLogPerubahan({
        nama_akun: namaAkun,
        role_akun: currentUser?.role || "admin",
        kategori: "Pengguna",
        aksi: statusTujuan ? "Aktifkan" : "Nonaktifkan",
        judul: `${u.nama} (@${u.username})`,
        sebelum: u.aktif ? "Akun Aktif" : "Akun Nonaktif",
        sesudah: statusTujuan ? "Akun Aktif" : "Akun Nonaktif",
        keterangan: `${statusTujuan ? "Aktivasi" : "Penonaktifan"} akun kasir (${namaAkun})`,
      });

      setSuksesPesan(`Status akun @${u.username} berhasil diubah.`);
      muatUsers();
      setTimeout(() => setSuksesPesan(""), 3500);
    } catch (err) {
      alert(err.message || "Gagal mengubah status akun.");
    }
  }

  const totalUser = users.length;
  const userOnline = users.filter((u) => u.is_online || u.id === currentUser?.id || u.username === currentUser?.username).length;
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
               Kelola Pengguna & Akun Kasir
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

        {/* Banner Keamanan Portal Staf & Kasir */}
        <div
          style={{
            background: "linear-gradient(135deg, #FAF5FF, #F3E8FF)",
            border: "1.5px solid #D8B4FE",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--magenta)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
                 Keamanan Portal Kasir &amp; Izin Akses Perangkat
                <span style={{ fontSize: 11, background: "#16A34A", color: "#fff", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>
                  Aktif
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
                Jalur rahasia: <code style={{ background: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 700, color: "var(--magenta-dark)" }}>/portal-bima</code> • Kunci Izin: <code style={{ background: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 700, color: "var(--magenta-dark)" }}>bima2026</code>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const urlIzin = `${window.location.origin}/portal-bima?kunci=bima2026`;
              navigator.clipboard.writeText(urlIzin);
              setSalinSukses(true);
              setTimeout(() => setSalinSukses(false), 3000);
            }}
            style={{
              background: salinSukses ? "#16A34A" : "var(--magenta)",
              color: "#fff",
              border: "none",
              padding: "9px 16px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
            }}
          >
            {salinSukses ? "Link Izin Disalin!" : "Salin Link Izin untuk Kasir"}
          </button>
        </div>

        {/* Card Jam Operasional & Pembatasan Akses */}
        <div
          style={{
            background: operasional?.is_open ? "#F0FDF4" : "#FEF2F2",
            border: operasional?.is_open ? "1px solid #BBF7D0" : "1px solid #FECACA",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 280, flex: "1 1 300px" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: operasional?.is_open ? "#16A34A" : "#DC2626",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
                Jam Operasional &amp; Pembatasan Sistem
                <span
                  style={{
                    fontSize: 11,
                    background: operasional?.is_open ? "#16A34A" : "#DC2626",
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: 100,
                    fontWeight: 700,
                  }}
                >
                  {operasional?.is_open ? "Buka (Sedang Beroperasi)" : "Tutup (Di Luar Jam)"}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
                Jadwal: <strong>{operasional?.jam_buka || "07:00"} – {operasional?.jam_tutup || "22:00"} WIB</strong> • Mode: <strong style={{ color: "var(--magenta-dark)" }}>{operasional?.keterangan || "Otomatis Sesuai Jadwal"}</strong>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
                Ketentuan: Akun <strong>Kasir</strong> dan <strong>Toko Online</strong> hanya beroperasi di jam buka. Akun <strong>Admin</strong> bebas akses 24 jam.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalOperasionalOpen(true)}
            style={{
              background: "#fff",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              padding: "9px 16px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            Atur Jam Operasional
          </button>
        </div>

        {/* Notifikasi Sukses */}
        {suksesPesan && (
          <div style={{ background: "#DCFCE7", color: "#15803D", padding: "12px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13.5, marginBottom: 18 }}>
            {suksesPesan}
          </div>
        )}

        {/* Ringkasan Akun & Status Realtime */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
          <div style={{ background: "#F0FDF4", padding: "14px 18px", borderRadius: 12, border: "1px solid #BBF7D0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#15803D", fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A", display: "inline-block", boxShadow: "0 0 0 3px rgba(22, 163, 74, 0.25)" }} />
              Sedang Online (Live)
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#15803D", marginTop: 4 }}>{userOnline} Akun</div>
          </div>
          <div style={{ background: "#fff", padding: "14px 18px", borderRadius: 12, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Total Akun</div>
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
            <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 700 }}>Dinonaktifkan</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#DC2626", marginTop: 4 }}>{nonaktif}</div>
          </div>
        </div>

        {/* Tabel Data User */}
        <div className="kasir-table-wrap" style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--line)", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table className="kasir-table" style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                <th style={{ padding: "12px 16px", fontSize: 12.5 }}>Nama Lengkap</th>
                <th style={{ padding: "12px 16px", fontSize: 12.5 }}>Username</th>
                <th style={{ padding: "12px 16px", fontSize: 12.5 }}>Role</th>
                <th style={{ padding: "12px 16px", fontSize: 12.5 }}>Sesi Realtime</th>
                <th style={{ padding: "12px 16px", fontSize: 12.5 }}>Status Akses</th>
                <th style={{ padding: "12px 16px", fontSize: 12.5 }}>Tgl Dibuat</th>
                <th style={{ padding: "12px 16px", fontSize: 12.5, textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--ink-soft)" }}>
                    Memuat data akun pengguna…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--ink-soft)" }}>
                    Belum ada data pengguna.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSaya = u.id === currentUser?.id || u.username === currentUser?.username;
                  const isOnline = Boolean(u.is_online || isSaya);
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
                        {isOnline ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "#DCFCE7",
                              color: "#15803D",
                              padding: "4px 10px",
                              borderRadius: 20,
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#16A34A",
                                boxShadow: "0 0 0 3px rgba(22, 163, 74, 0.25)",
                              }}
                            />
                            Online
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "#F1F5F9",
                              color: "#64748B",
                              padding: "4px 10px",
                              borderRadius: 20,
                              fontWeight: 600,
                              fontSize: 11.5,
                            }}
                            title={u.last_seen_at ? `Terakhir aktif: ${new Date(u.last_seen_at).toLocaleString("id-ID")}` : "Belum pernah login"}
                          >
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#94A3B8" }} />
                            {formatLastSeen(u.last_seen_at, u.is_online)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {u.aktif ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#15803D", fontWeight: 700, fontSize: 12.5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A" }} />
                            Bisa Login
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#DC2626", fontWeight: 700, fontSize: 12.5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626" }} />
                            Terkunci (Blokir)
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
                             Edit / Sandi
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
                              {u.aktif ? " Nonaktifkan" : " Aktifkan"}
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
                {userEdit ? `Edit Akun: ${userEdit.nama}` : " Tambah Akun Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--ink-soft)" }}
              >
                
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
      {/* Modal Pengaturan Jam Operasional */}
      {modalOperasionalOpen && (
        <div className="struk-overlay" onClick={() => !savingOperasional && setModalOperasionalOpen(false)}>
          <div className="struk-modal" style={{ maxWidth: 480, padding: 24, textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Pengaturan Jam Operasional</h3>
              <button
                type="button"
                onClick={() => setModalOperasionalOpen(false)}
                disabled={savingOperasional}
                style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--ink-soft)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimpanOperasional} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>
                    Jam Buka (WIB)
                  </label>
                  <input
                    type="time"
                    value={jamBuka}
                    onChange={(e) => setJamBuka(e.target.value)}
                    required
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, background: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>
                    Jam Tutup (WIB)
                  </label>
                  <input
                    type="time"
                    value={jamTutup}
                    onChange={(e) => setJamTutup(e.target.value)}
                    required
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, background: "#fff" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>
                  Mode Kontrol Operasional
                </label>
                <select
                  value={statusManual}
                  onChange={(e) => setStatusManual(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13.5, background: "#fff" }}
                >
                  <option value="otomatis">Otomatis Sesuai Jadwal Jam Buka - Tutup</option>
                  <option value="buka">Paksa Buka Sekarang (Lembur / Buka 24 Jam)</option>
                  <option value="tutup">Paksa Tutup Sekarang (Hari Libur / Istirahat Darurat)</option>
                </select>
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
                  {statusManual === "otomatis" && "Sistem otomatis membuka kasir & toko online sesuai jam buka s/d jam tutup."}
                  {statusManual === "buka" && "Apotek akan dianggap BUKA terus menerus mengabaikan jam tutup."}
                  {statusManual === "tutup" && "Apotek akan dianggap TUTUP sekarang juga (akses kasir & checkout diblokir)."}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>
                  Pesan Notifikasi Saat Tutup (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={pesanTutup}
                  onChange={(e) => setPesanTutup(e.target.value)}
                  placeholder="Contoh: Mohon maaf, apotek sedang tutup di luar jam operasional (07.00 - 22.00 WIB)."
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, background: "#fff" }}
                />
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: "#475569" }}>
                <strong>Catatan Keamanan:</strong> Akun Admin tetap dapat login kapan saja 24 jam untuk kelola data &amp; laporan, meskipun apotek sedang dalam status tutup.
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setModalOperasionalOpen(false)}
                  disabled={savingOperasional}
                  style={{ flex: 1, padding: "10px", borderRadius: 8 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-full"
                  disabled={savingOperasional}
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
                  {savingOperasional ? "Menyimpan…" : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </KasirShell>
  );
}
