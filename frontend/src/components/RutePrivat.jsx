import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Bungkus halaman yang butuh login:
 *   <RutePrivat><Dashboard /></RutePrivat>
 *
 * Untuk halaman yang cuma boleh admin (misal Laporan):
 *   <RutePrivat rolesBoleh={['admin']}><Laporan /></RutePrivat>
 *
 * PENTING: ini cuma soal pengalaman pakai (langsung dialihkan, bukan lihat
 * halaman kosong). Penjagaan SUNGGUHAN tetap di server lewat middleware
 * `role` — jadi walau ada yang coba akal-akalan lewat DevTools, request ke
 * API tetap ditolak 403 oleh Laravel.
 */
export default function RutePrivat({ children, rolesBoleh }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--ink-soft)" }}>
        Memeriksa sesi login…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (rolesBoleh && !rolesBoleh.includes(user.role)) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <h2 style={{ marginBottom: 12 }}>Tidak Punya Akses</h2>
        <p style={{ color: "var(--ink-soft)" }}>
          Halaman ini khusus untuk {rolesBoleh.join(" / ")}. Akun kamu
          login sebagai <strong>{user.role}</strong>.
        </p>
      </div>
    );
  }

  return children;
}
