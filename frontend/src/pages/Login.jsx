import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Spinner from "../components/Spinner";
import LoadingScreen from "../components/LoadingScreen";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ingat, setIngat] = useState(true);
  const [error, setError] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [suksesLogin, setSuksesLogin] = useState(false);

  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tujuanAwal = location.state?.dari || "/kasir";

  // Jika sudah login, otomatis alihkan ke dashboard kasir
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/kasir", { replace: true });
    }
  }, [user, authLoading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoadingSubmit(true);
    try {
      await login(username, password, ingat);
      setSuksesLogin(true);
      // Animasi transisi halus sebelum pindah ke kasir
      setTimeout(() => {
        navigate(tujuanAwal, { replace: true });
      }, 350);
    } catch (err) {
      setError(err.message);
      setLoadingSubmit(false);
    }
  }

  if (suksesLogin) {
    return (
      <LoadingScreen
        message="Berhasil Masuk!"
        submessage="Membuka sistem kasir Apotek Bima Farma..."
      />
    );
  }

  return (
    <div className="login-page">
      {/* ---------- PANEL KIRI ---------- */}
      <div className="login-brand">
        <div className="login-brand-logo">
          <svg><use href="#cross-mark" /></svg>
          <span>
            <div className="apotek">APOTEK</div>
            <div className="nama">BIMA FARMA</div>
          </span>
        </div>

        <div className="login-brand-mid">
          <h1>Kelola apotek Anda dengan lebih tenang.</h1>
          <p>
            Satu sistem untuk kasir, stok, penerimaan barang, hingga
            laporan — bisa dipakai beberapa kasir sekaligus secara
            bersamaan.
          </p>

          <div className="login-features">
            <div className="login-feature">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="6" width="18" height="13" rx="2" /><path d="M8 6V4h8v2" />
                </svg>
              </div>
              <h4>Kasir Multi-Tab</h4>
              <p>Layani beberapa pelanggan sekaligus</p>
            </div>
            <div className="login-feature">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 19V9M12 19V5M19 19v-6" />
                </svg>
              </div>
              <h4>Laporan Real-time</h4>
              <p>Pantau penjualan &amp; stok kapan saja</p>
            </div>
          </div>
        </div>

        <div className="login-brand-foot">
          © 2026 Apotek Bima Farma — Jl. Tanimulya Raya No. 1, Haji Gofur
        </div>
      </div>

      {/* ---------- PANEL KANAN ---------- */}
      <div className="login-form-side">
        <div className="login-form-wrap">
          <h1>Selamat datang kembali</h1>
          <p className="sub">Masuk untuk mulai bertugas di sistem kasir &amp; apotek.</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="username">Nama Pengguna</label>
              <div className="login-input-wrap">
                <svg className="leading" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Masukkan nama pengguna"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Kata Sandi</label>
              <div className="login-input-wrap">
                <svg className="leading" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M6.6 6.6C4.5 8 3 10 3 12c0 0 4 7 9 7 1.6 0 3-.4 4.2-1.1M9.9 4.2A10.4 10.4 0 0112 4c5 0 9 7 9 7-.3.6-1 1.6-2 2.6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="login-row">
              <label className="login-remember">
                <input type="checkbox" checked={ingat} onChange={(e) => setIngat(e.target.checked)} />
                Ingat saya
              </label>
              <button
                type="button"
                className="login-forgot"
                onClick={() => alert("Hubungi admin apotek untuk reset kata sandi.")}
              >
                Lupa kata sandi?
              </button>
            </div>

            <button className="login-submit" type="submit" disabled={loadingSubmit}>
              {loadingSubmit ? (
                <Spinner size={18} color="#ffffff" text="Memeriksa akun…" />
              ) : (
                <>
                  Masuk
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="login-help">
            Sistem akses terenkripsi Apotek Bima Farma.<br />
            Butuh bantuan? <a href="#">Hubungi admin apotek</a>
          </p>
        </div>
      </div>
    </div>
  );
}
