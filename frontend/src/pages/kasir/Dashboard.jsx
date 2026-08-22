import { useAuth } from "../../context/AuthContext";
import KasirShell from "./KasirShell";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <KasirShell>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>
        Selamat datang, {user?.nama.split(" ")[0]} 👋
      </h1>
      <p style={{ color: "var(--ink-soft)" }}>
        Login berhasil sebagai <strong>{user?.role}</strong>. Halaman
        Dashboard sungguhan (KPI, transaksi terbaru, stok menipis) akan
        dibangun di sesi berikutnya.
      </p>
    </KasirShell>
  );
}
