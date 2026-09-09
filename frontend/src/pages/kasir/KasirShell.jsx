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
  { label: "Riwayat Penjualan", path: "/kasir/riwayat",
    icon: <><path d="M12 7v5l3 3" /><circle cx="12" cy="12" r="9" /></> },
  { label: "Penerimaan Barang", path: "/kasir/penerimaan",
    icon: <><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M8 7V5a4 4 0 018 0v2" /></> },
  { label: "Riwayat Penerimaan", path: "/kasir/riwayat-penerimaan",
    icon: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></> },
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

// Suara notifikasi lembut menggunakan Web Audio API murni (tanpa butuh file eksternal)
function mainkanSuaraNotifikasi() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Nada ding-dong ganda yang ramah & elegan
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    // browser auto-play policy fallback
  }
}

export default function KasirShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [badgeCounter, setBadgeCounter] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [gantiPasswordOpen, setGantiPasswordOpen] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const halamanAktif = MENU.find((m) => m.path === location.pathname);

  // Tutup sidebar mobile saat navigasi pindah halaman
  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [location.pathname]);

  // Kunci scroll background saat sidebar drawer mobile terbuka
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

  // Polling badge notifikasi pesanan online yang menunggu verifikasi kasir secara realtime (setiap 3.5 detik)
  useEffect(() => {
    let lastCount = -1;

    function cekCounter() {
      api("/pembayaran-online/counter")
        .then((res) => {
          const count = res.menunggu_verifikasi || res.total_notifikasi || 0;
          setBadgeCounter(count);

          // Jika ada pesanan baru bertambah & bukan di halaman pembayaran online, bunyikan notifikasi & tampilkan toast
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
    await logout();
    navigate("/portal-bima", { replace: true });
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
          <div style={{ flex: 1 }}>
            <div className="logo-apotek">APOTEK</div>
            <div className="logo-nama">BIMA FARMA</div>
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

        <div
          className="kasir-sidebar-footer"
          onClick={() => {
            setSidebarMobileOpen(false);
            setGantiPasswordOpen(true);
          }}
          style={{ cursor: "pointer", transition: "background 0.2s" }}
          title="Klik untuk Ganti Kata Sandi Akun"
        >
          <div className="kasir-footer-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.5 3.6-7 8-7s8 2.5 8 7" />
            </svg>
          </div>
          <div className="kasir-footer-who">
            <div className="kasir-user-nama">{user?.nama}</div>
            <div className="kasir-user-role" style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span>{user?.role}</span>
              <span style={{ fontSize: 9.5, color: "var(--magenta-dark)", background: "var(--magenta-tint)", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                🔑 Ganti Sandi
              </span>
            </div>
          </div>
          <button
            className="kasir-logout-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            title="Keluar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
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
            </button>
            <div className="topbar-left">
              <h2 className="topbar-title">{halamanAktif?.label || "Sistem Kasir"}</h2>
              <div className="topbar-status">
                <span className="topbar-dot-online" />
                Online — {user?.nama}
              </div>
            </div>
          </div>
          <JamRealtime />
        </div>
        <main className="kasir-content">{children}</main>

        {/* Floating Toast Notifikasi Pesanan Online Baru */}
        {showToast && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 9999,
              background: "linear-gradient(135deg, #7C3AED, #A64BC7)",
              color: "#fff",
              padding: "14px 20px",
              borderRadius: 14,
              boxShadow: "0 10px 30px rgba(124, 58, 237, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              animation: "slideInUp 0.3s ease-out",
            }}
          >
            <span style={{ fontSize: 24 }}>🔔</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13.5 }}>Pesanan Online Baru Masuk!</div>
              <div style={{ fontSize: 11.5, opacity: 0.9 }}>Segera verifikasi pembayaran & stok</div>
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
              ✕
            </button>
          </div>
        )}

        {gantiPasswordOpen && (
          <GantiPasswordModal user={user} onClose={() => setGantiPasswordOpen(false)} />
        )}
      </div>
    </div>
  );
}
