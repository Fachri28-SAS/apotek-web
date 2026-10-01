import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { api } from "../../lib/api";
import GantiPasswordModal from "./komponen/GantiPasswordModal";
import "./Kasir.css";

const MENU = [
  { label: "Dashboard", path: "/kasir",
    icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></> },
  { label: "Kasir / Penjualan", path: "/kasir/jual",
    icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M8 6V4h8v2" /></> },
  { label: "Pesanan Online", path: "/kasir/pembayaran-online",
    icon: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></> },
  { label: "Data Penjualan", path: "/kasir/riwayat",
    icon: <><path d="M12 7v5l3 3" /><circle cx="12" cy="12" r="9" /></> },
  { label: "Input Penerimaan Barang", path: "/kasir/penerimaan",
    icon: <><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M8 7V5a4 4 0 018 0v2" /></> },
  { label: "Data Penerimaan Barang", path: "/kasir/riwayat-penerimaan",
    icon: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></> },
  { label: "Bayar Tagihan PBF", path: "/kasir/pembayaran-penerimaan",
    icon: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 10h20M6 14h4" /></> },
  { label: "Data Obat", path: "/kasir/obat",
    icon: <><rect x="3" y="9" width="18" height="6" rx="3" /><path d="M8 9v6M16 9v6" /></> },
  { label: "Stok Opname", path: "/kasir/opname",
    icon: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></> },
  { label: "Laporan Penjualan", path: "/kasir/laporan", hanyaAdmin: true,
    icon: <><path d="M5 19V9M12 19V5M19 19v-6" /></> },
  { label: "Laporan Pengeluaran", path: "/kasir/pengeluaran", hanyaAdmin: true,
    icon: <><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></> },
  { label: "Kelola Pengguna", path: "/kasir/users", hanyaAdmin: true,
    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></> },
];


function JamRealtime() {
  const [waktu, setWaktu] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setWaktu(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="topbar-jam">
      {waktu.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
      {", "}
      {waktu.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

function mainkanSuaraNotifikasi() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {}
}

export default function KasirShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [badgeCounter, setBadgeCounter] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [gantiPasswordOpen, setGantiPasswordOpen] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [konfirmasiLogoutOpen, setKonfirmasiLogoutOpen] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);

  const halamanAktif = MENU.find((m) => m.path === location.pathname);

  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (sidebarMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarMobileOpen]);

  useEffect(() => {
    let lastCount = -1;

    function cekCounter() {
      api("/pembayaran-online/counter")
        .then((res) => {
          const count = res.menunggu_verifikasi || res.total_notifikasi || 0;
          setBadgeCounter(count);

          if (lastCount !== -1 && count > lastCount && location.pathname !== "/kasir/pembayaran-online") {
            mainkanSuaraNotifikasi();
            setShowToast(true);
          }
          lastCount = count;
        })
        .catch(() => {});
    }

    cekCounter();
    const timer = setInterval(cekCounter, 3500);

    return () => clearInterval(timer);
  }, [location.pathname]);

  async function handleLogout() {
    setLoadingLogout(true);
    try {
      await logout();
      navigate("/portal-bima", { replace: true });
    } finally {
      setLoadingLogout(false);
      setKonfirmasiLogoutOpen(false);
    }
  }

  const menuTerlihat = MENU.filter((m) => !m.hanyaAdmin || user?.role === "admin");

  return (
    <div className="kasir-shell">
      {/* Backdrop gelap saat drawer menu mobile terbuka */}
      {sidebarMobileOpen && (
        <div
          className="kasir-sidebar-backdrop"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      <aside className={`kasir-sidebar ${sidebarMobileOpen ? "open" : ""}`}>
        <div className="logo-area">
          <svg><use href="#cross-mark" /></svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="logo-apotek">APOTEK</div>
            <div className="logo-nama">BIMA FARMA</div>
            <div className="logo-jalan">Jl. Tanimulya Raya No. 1</div>
          </div>
          {/* Tombol close sidebar di mobile */}
          <button
            type="button"
            className="sidebar-close-mobile-btn"
            onClick={() => setSidebarMobileOpen(false)}
            aria-label="Tutup Menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 18, height: 18 }}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="kasir-menu">
          {menuTerlihat.map((m) => (
            <Link
              key={m.path}
              to={m.path}
              onClick={() => setSidebarMobileOpen(false)}
              className={`kasir-menu-item ${location.pathname === m.path ? "active" : ""}`}
            >
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{m.icon}</svg>
              <span>{m.label}</span>
              {m.path === "/kasir/pembayaran-online" && badgeCounter > 0 && (
                <span className="kasir-menu-badge" title={`${badgeCounter} pesanan menunggu verifikasi`}>
                  {badgeCounter}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="kasir-sidebar-footer">
          <div
            className="kasir-footer-profile-card"
            onClick={() => {
              setSidebarMobileOpen(false);
              setGantiPasswordOpen(true);
            }}
            style={{ cursor: "pointer" }}
            title="Klik untuk Ganti Kata Sandi Akun"
          >
            <div className="kasir-footer-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.5 3.6-7 8-7s8 2.5 8 7" />
              </svg>
            </div>
            <div className="kasir-footer-who">
              <div className="kasir-user-nama" title={user?.nama}>{user?.nama}</div>
              <div className="kasir-user-role-badge">
                <span className="user-role-dot" />
                <span style={{ textTransform: "capitalize" }}>{user?.role || "Petugas"}</span>
              </div>
            </div>
            <button
              type="button"
              className="kasir-logout-btn"
              onClick={(e) => {
                e.stopPropagation();
                setKonfirmasiLogoutOpen(true);
              }}
              title="Keluar dari Akun"
              aria-label="Keluar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            className="kasir-ganti-sandi-btn"
            onClick={() => {
              setSidebarMobileOpen(false);
              setGantiPasswordOpen(true);
            }}
            title="Ubah kata sandi akun"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2l-2 2m-1.5 1.5L16 7l-1.5-1.5M19 5l-2.5 2.5M15 9l-4 4-2-2-4 4 3 3 8-8-1-1z" />
              <circle cx="7.5" cy="16.5" r="1.5" />
            </svg>
            <span>Ganti Kata Sandi</span>
          </button>
        </div>
      </aside>

      <div className="kasir-main">
        <div className="kasir-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className="kasir-hamburger-btn"
              onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
              aria-label="Buka Menu Navigasi"
              title="Menu Navigasi"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 22, height: 22 }}>
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
              {badgeCounter > 0 && <span className="kasir-hamburger-dot" />}
            </button>
            <div className="topbar-left">
              {location.pathname === "/kasir" ? (
                <div className="topbar-greet-wrap">
                  <div className="topbar-greet-sub">
                    {new Date().getHours() < 11
                      ? "Selamat pagi"
                      : new Date().getHours() < 15
                      ? "Selamat siang"
                      : new Date().getHours() < 18
                      ? "Selamat sore"
                      : "Selamat malam"}
                  </div>
                  <h2 className="topbar-title" style={{ fontSize: "clamp(18px, 4vw, 22px)" }}>
                    {user?.nama || "Apotek Bima Farma"}
                  </h2>
                </div>
              ) : (
                <>
                  <h2 className="topbar-title">{halamanAktif?.label || "Sistem Kasir"}</h2>
                  <div className="topbar-status">
                    <span className="topbar-dot-online" />
                    Online — {user?.nama}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Tombol lonceng notifikasi pesanan online di mobile */}
            <button
              type="button"
              className="bell-btn-mobile"
              onClick={() => navigate("/kasir/pembayaran-online")}
              title="Pesanan Online Menunggu Verifikasi"
              aria-label="Pesanan Online"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 19, height: 19 }}>
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 01-3.4 0" />
              </svg>
              {badgeCounter > 0 && <span className="bell-dot" />}
            </button>
            <JamRealtime />
          </div>
        </div>

        <main className="kasir-content">{children}</main>

        <nav className="bottom-nav-mobile" aria-label="Navigasi Bawah">
          <Link
            to="/kasir"
            className={`nav-item-mobile ${location.pathname === "/kasir" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span>Dashboard</span>
          </Link>

          <Link
            to="/kasir/jual"
            className={`nav-item-mobile ${location.pathname === "/kasir/jual" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="13" rx="2" />
              <circle cx="12" cy="12.5" r="3" />
              <path d="M6 6v-1a2 2 0 012-2h8a2 2 0 012 2v1" />
            </svg>
            <span>Kasir</span>
          </Link>

          <Link
            to="/kasir/riwayat"
            className={`nav-item-mobile ${location.pathname === "/kasir/riwayat" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" />
              <path d="M9 8h6M9 12h6" />
            </svg>
            <span>Riwayat</span>
          </Link>

          <Link
            to="/kasir/obat"
            className={`nav-item-mobile ${location.pathname === "/kasir/obat" ? "active" : ""}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="9" width="18" height="6" rx="3" />
              <path d="M8 9v6M16 9v6" />
            </svg>
            <span>Stok</span>
          </Link>

          <button
            type="button"
            className={`nav-item-mobile ${sidebarMobileOpen ? "active" : ""}`}
            onClick={() => setSidebarMobileOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", position: "relative" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
            </svg>
            <span>Menu</span>
            {badgeCounter > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  right: "22%",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--red, #D64550)",
                }}
              />
            )}
          </button>
        </nav>

        {/* Floating Toast Notifikasi Pesanan Online Baru */}
        {showToast && (
          <div
            style={{
              position: "fixed",
              bottom: 80,
              right: 16,
              zIndex: 9999,
              background: "linear-gradient(135deg, #7C3AED, #A64BC7)",
              color: "#fff",
              padding: "12px 18px",
              borderRadius: 14,
              boxShadow: "0 10px 30px rgba(124, 58, 237, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              animation: "slideInUp 0.3s ease-out",
            }}
          >
            <span style={{ fontSize: 22 }}></span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Pesanan Online Baru Masuk!</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>Segera verifikasi pembayaran & stok</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowToast(false);
                navigate("/kasir/pembayaran-online");
              }}
              style={{
                marginLeft: 8,
                background: "#fff",
                color: "#7C3AED",
                border: "none",
                fontWeight: 700,
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Buka
            </button>
            <button
              type="button"
              onClick={() => setShowToast(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                opacity: 0.7,
                fontSize: 16,
                cursor: "pointer",
                padding: 4,
              }}
            >
              
            </button>
          </div>
        )}

        {gantiPasswordOpen && (
          <GantiPasswordModal user={user} onClose={() => setGantiPasswordOpen(false)} />
        )}

        {/* Modal Konfirmasi Logout */}
        {konfirmasiLogoutOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(6px)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              animation: "fadeIn 0.2s ease-out",
            }}
            onClick={() => !loadingLogout && setKonfirmasiLogoutOpen(false)}
          >
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                maxWidth: 380,
                width: "100%",
                padding: "26px 22px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                textAlign: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#FEE2E2",
                  color: "#DC2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 28, height: 28 }}>
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1E293B", margin: "0 0 8px" }}>
                Yakin Ingin Keluar?
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 22px", lineHeight: 1.5 }}>
                Sesi akun <strong>{user?.nama || "Anda"}</strong> akan diakhiri. Anda perlu login kembali untuk mengakses kasir.
              </p>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  disabled={loadingLogout}
                  onClick={() => setKonfirmasiLogoutOpen(false)}
                  style={{
                    flex: 1,
                    padding: "11px 16px",
                    borderRadius: 12,
                    border: "1px solid #CBD5E1",
                    background: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={loadingLogout}
                  onClick={handleLogout}
                  style={{
                    flex: 1,
                    padding: "11px 16px",
                    borderRadius: 12,
                    border: "none",
                    background: "#DC2626",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                    opacity: loadingLogout ? 0.7 : 1,
                  }}
                >
                  {loadingLogout ? "Memproses..." : "Ya, Keluar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
