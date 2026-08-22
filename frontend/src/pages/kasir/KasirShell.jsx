import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Kasir.css";

// hanyaAdmin: true -> menu ini disembunyikan total kalau yang login bukan admin.
// Ini cuma soal tampilan; penjagaan sungguhan tetap di middleware server.
const MENU = [
  { label: "Dashboard", path: "/kasir" },
  { label: "Kasir / Penjualan", path: "/kasir/jual" },
  { label: "Riwayat Penjualan", path: "/kasir/riwayat" },
  { label: "Penerimaan Barang", path: "/kasir/penerimaan" },
  { label: "Data Obat", path: "/kasir/obat" },
  { label: "Stok Opname", path: "/kasir/opname" },
  { label: "Laporan", path: "/kasir/laporan", hanyaAdmin: true },
];

export default function KasirShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
          <span className="nama">Bima Farma</span>
        </div>

        <nav className="kasir-menu">
          {menuTerlihat.map((m) => (
            <Link
              key={m.path}
              to={m.path}
              className={`kasir-menu-item ${location.pathname === m.path ? "active" : ""}`}
            >
              <span className="dot" />
              {m.label}
            </Link>
          ))}
        </nav>

        <div className="kasir-sidebar-footer">
          <div className="kasir-user-nama">{user?.nama}</div>
          <span className="kasir-user-role">{user?.role}</span>
          <button className="kasir-logout-btn" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </aside>

      <main className="kasir-content">{children}</main>
    </div>
  );
}
