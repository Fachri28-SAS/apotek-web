import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Spinner from "../components/Spinner";
import "./Login.css";

// Kunci izin akses resmi untuk mendaftarkan perangkat staf/kasir
const KUNCI_RESMI = ["bima2026", "bimafarma2026"];

function cekKunciValid(input) {
  if (!input) return false;
  return KUNCI_RESMI.includes(input.trim().toLowerCase());
}

export default function Login() {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem("bf_ingat_username") || "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ingatUsername, setIngatUsername] = useState(() => {
    return !!localStorage.getItem("bf_ingat_username");
  });
  const [error, setError] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Status Izin Perangkat (Client Authorization)
  const [terotorisasi, setTerotorisasi] = useState(() => {
    return localStorage.getItem("bf_perangkat_izin") === "true";
  });
  const [inputKunci, setInputKunci] = useState("");
  const [showKunci, setShowKunci] = useState(false);
  const [errorKunci, setErrorKunci] = useState("");
  const [suksesKunci, setSuksesKunci] = useState("");

  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tujuanAwal = location.state?.dari || "/kasir";

  // Deteksi otomatis jika URL dibuka dengan query ?kunci=bima2026 atau ?key=bima2026
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paramKunci = params.get("kunci") || params.get("key") || params.get("token");
    if (paramKunci && cekKunciValid(paramKunci)) {
      localStorage.setItem("bf_perangkat_izin", "true");
      setTerotorisasi(true);
      // Bersihkan param dari address bar agar kunci rahasia tidak tersimpan di riwayat browser
      navigate("/portal-bima", { replace: true });
    }
  }, [location.search, navigate]);

  // Jika sudah login, otomatis alihkan ke dashboard kasir
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/kasir", { replace: true });
    }
  }, [user, authLoading, navigate]);

  function handleVerifikasiKunci(e) {
    e.preventDefault();
    setErrorKunci("");
    if (cekKunciValid(inputKunci)) {
      localStorage.setItem("bf_perangkat_izin", "true");
      setSuksesKunci("Perangkat berhasil diotorisasi! Membuka formulir masuk...");
      setTimeout(() => {
        setTerotorisasi(true);
      }, 400);
    } else {
      setErrorKunci("Kunci izin tidak valid. Hubungi pemilik apotek untuk mendapatkan akses.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoadingSubmit(true);
    try {
      if (ingatUsername) {
        localStorage.setItem("bf_ingat_username", username.trim());
      } else {
        localStorage.removeItem("bf_ingat_username");
      }
      await login(username, password);
      navigate(tujuanAwal, { replace: true });
    } catch (err) {
      setError(err.message);
      setLoadingSubmit(false);
    }
  }

  return (
    <div className="login-page" translate="no">
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
        {!terotorisasi ? (
          /* TAMPILAN JIKA PERANGKAT BELUM DIBERI IZIN */
          <div className="login-form-wrap">
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, var(--magenta), #7C1155)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 24px rgba(163, 22, 112, 0.28)",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 28, height: 28 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            <h1 style={{ fontSize: 22, textAlign: "center", marginBottom: 8 }}>Otorisasi Perangkat</h1>
            <p className="sub" style={{ textAlign: "center", marginBottom: 22, lineHeight: 1.5 }}>
              Portal ini khusus staf &amp; kasir Apotek Bima Farma.<br />
              Masukkan <strong>Kunci Izin</strong> untuk mendaftarkan perangkat ini.
            </p>

            {errorKunci && <div className="login-error" style={{ marginBottom: 16 }}>{errorKunci}</div>}
            {suksesKunci && (
              <div style={{ background: "#DCFCE7", color: "#15803D", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>
                ✓ {suksesKunci}
              </div>
            )}

            <form onSubmit={handleVerifikasiKunci}>
              <div className="login-field">
                <label htmlFor="kunciAkses">Kunci Izin Apotek</label>
                <div className="login-input-wrap">
                  <svg className="leading" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 2l-2 2m-1.5 1.5L10 13l-4 4 2 2 4-4 7.5-7.5M16 5l3 3" />
                    <circle cx="7.5" cy="16.5" r="3.5" />
                  </svg>
                  <input
                    id="kunciAkses"
                    type={showKunci ? "text" : "password"}
                    placeholder="Masukkan kunci izin..."
                    value={inputKunci}
                    onChange={(e) => setInputKunci(e.target.value)}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowKunci((v) => !v)}
                    aria-label={showKunci ? "Sembunyikan" : "Tampilkan"}
                  >
                    {showKunci ? (
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
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.4 }}>
                  Kunci izin hanya perlu dimasukkan satu kali pada setiap komputer/HP kasir.
                </div>
              </div>

              <button className="login-submit" type="submit" style={{ marginTop: 18 }}>
                Otorisasi Perangkat Ini
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <Link to="/" style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "none", fontWeight: 600 }}>
                ← Kembali ke Beranda Apotek
              </Link>
            </div>
          </div>
        ) : (
          /* TAMPILAN JIKA PERANGKAT SUDAH DIBERI IZIN */
          <div className="login-form-wrap">
            {/* Header Brand khusus tampilan Mobile sesuai mockup */}
            <div className="login-mobile-brand">
              <div className="login-mobile-logo-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M12 2v20M2 12h20" />
                </svg>
              </div>
              <div className="login-mobile-sub">APOTEK</div>
              <div className="login-mobile-name">BIMA FARMA</div>
              <div className="login-mobile-tagline">Sistem Kasir &amp; Operasional Apotek</div>

              <div className="login-role-tabs-preview">
                <div className="role-tab-badge active">👤 Kasir</div>
                <div className="role-tab-badge">🛡️ Admin</div>
              </div>
            </div>

            <h1 className="login-title-desktop">Selamat datang kembali</h1>
            <p className="sub login-title-desktop">Masuk untuk mulai bertugas di sistem kasir &amp; apotek.</p>

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
                  <input
                    type="checkbox"
                    checked={ingatUsername}
                    onChange={(e) => setIngatUsername(e.target.checked)}
                  />
                  Ingat nama pengguna
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

            <div
              style={{
                marginTop: 24,
                paddingTop: 16,
                borderTop: "1px dashed var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11.5,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  color: "#16A34A",
                  fontWeight: 700,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                Perangkat Terotorisasi
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Kunci kembali perangkat ini? Anda harus memasukkan Kunci Izin lagi untuk membuka portal.")) {
                    localStorage.removeItem("bf_perangkat_izin");
                    setTerotorisasi(false);
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#DC2626",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Kunci Perangkat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
