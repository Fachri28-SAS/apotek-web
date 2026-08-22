import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Kasir.css";

const MENU = [
  { label: "Dashboard", path: "/kasir",
    icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></> },
  { label: "Kasir / Penjualan", path: "/kasir/jual",
    icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M8 6V4h8v2" /></> },
  { label: "Riwayat Penjualan", path: "/kasir/riwayat",
    icon: <><path d="M12 7v5l3 3" /><circle cx="12" cy="12" r="9" /></> },
  { label: "Penerimaan Barang", path: "/kasir/penerimaan",
    icon: <><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M8 7V5a4 4 0 018 0v2" /></> },
  { label: "Data Obat", path: "/kasir/obat",
    icon: <><rect x="3" y="9" width="18" height="6" rx="3" /><path d="M8 9v6M16 9v6" /></> },
  { label: "Stok Opname", path: "/kasir/opname",
    icon: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></> },
  { label: "Laporan", path: "/kasir/laporan", hanyaAdmin: true,
    icon: <><path d="M5 19V9M12 19V5M19 19v-6" /></> },
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

export default function KasirShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const halamanAktif = MENU.find((m) => m.path === location.pathname);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const menuTerlihat = MENU.filter((m) => !m.hanyaAdmin || user?.role === "admin");

  return (
    <div className="kasir-shell">
      <aside className="kasir-sidebar">
        <div className="logo-area">
          <svg><use href="#cross-mark" /></svg>
          <div>
            <div className="logo-apotek">APOTEK</div>
            <div className="logo-nama">BIMA FARMA</div>
          </div>
        </div>

        <nav className="kasir-menu">
          {menuTerlihat.map((m) => (
            <Link
              key={m.path}
              to={m.path}
              className={`kasir-menu-item ${location.pathname === m.path ? "active" : ""}`}
            >
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{m.icon}</svg>
              {m.label}
            </Link>
          ))}
        </nav>

        <div className="kasir-sidebar-footer">
          <div className="kasir-footer-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.5 3.6-7 8-7s8 2.5 8 7" />
            </svg>
          </div>
          <div className="kasir-footer-who">
            <div className="kasir-user-nama">{user?.nama}</div>
            <div className="kasir-user-role">{user?.role}</div>
          </div>
          <button className="kasir-logout-btn" onClick={handleLogout} title="Keluar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </aside>

      <div className="kasir-main">
        <div className="kasir-topbar">
          <div className="topbar-left">
            <h2 className="topbar-title">{halamanAktif?.label || "Sistem Kasir"}</h2>
            <div className="topbar-status">
              <span className="topbar-dot-online" />
              Online — {user?.nama}
            </div>
          </div>
          <JamRealtime />
        </div>
        <main className="kasir-content">{children}</main>
      </div>
    </div>
  );
}
