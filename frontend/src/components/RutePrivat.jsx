import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import LoadingScreen from "./LoadingScreen";

export default function RutePrivat({ children, rolesBoleh }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <LoadingScreen
        message="Memeriksa Sesi Login..."
        submessage="Menghubungkan ke sistem Apotek Bima Farma..."
      />
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
