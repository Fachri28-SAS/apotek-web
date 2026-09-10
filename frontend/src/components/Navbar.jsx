import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

/**
 * Navbar bersama — dipakai Landing MAUPUN Toko, supaya keduanya
 * dijamin identik (tidak perlu lagi bikin versi terpisah yang harus
 * disamain manual satu-satu).
 *
 * Di Toko, kirim prop cartCount & onOpenCart — tombol "Hubungi Kami"
 * otomatis berubah jadi tombol Keranjang. Di Landing, cukup <Navbar />
 * tanpa prop apa pun, tampil seperti biasa.
 */
export default function Navbar({ cartCount, onOpenCart }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modalCek, setModalCek] = useState(false);
  const [inputKode, setInputKode] = useState("");
  const [lastTracking, setLastTracking] = useState("");
  const [lastPembeli, setLastPembeli] = useState("");
  const navigate = useNavigate();
  const diToko = typeof onOpenCart === "function";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [hasilCari, setHasilCari] = useState([]);
  const [loadingCari, setLoadingCari] = useState(false);
  const [errorCari, setErrorCari] = useState("");

  function handleBukaCekPesanan() {
    const saved = localStorage.getItem("apotek_last_tracking");
    const savedName = localStorage.getItem("apotek_last_pembeli");
    if (saved) setLastTracking(saved);
    if (savedName) setLastPembeli(savedName);
    setHasilCari([]);
    setErrorCari("");
    setModalCek(true);
    setMobileOpen(false);
  }

  async function handleCariPesanan(e) {
    e.preventDefault();
    const query = inputKode.trim();
    if (!query) return;

    if (query.toUpperCase().startsWith("TRK-")) {
      setModalCek(false);
      navigate(`/pesanan/${encodeURIComponent(query.toUpperCase())}`);
      return;
    }

    setLoadingCari(true);
    setErrorCari("");
    setHasilCari([]);
    try {
      const data = await api(`/pesanan-cari?q=${encodeURIComponent(query)}`);
      if (!data || data.length === 0) {
        setErrorCari("Tidak ditemukan pesanan dengan No. HP / Kode tersebut. Pastikan nomor sesuai saat checkout.");
      } else if (data.length === 1) {
        setModalCek(false);
        navigate(`/pesanan/${data[0].kode_tracking}`);
      } else {
        setHasilCari(data);
      }
    } catch (err) {
      setErrorCari(err.message || "Gagal mencari pesanan.");
    } finally {
      setLoadingCari(false);
    }
  }

  return (
    <>
      <div className="top-support-bar" style={{
        background: "var(--magenta-dark, #7A1154)",
        color: "#fff",
        fontSize: "12px",
        padding: "6px 0",
        fontWeight: 500,
        borderBottom: "1px solid rgba(255, 255, 255, 0.15)"
      }}>
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <span>📞 WA: <strong>0812-2360-4900</strong></span>
            <span>✉️ Support: <a href="mailto:bimafarmaapotek2@gmail.com" style={{ color: "#FFE4F2", textDecoration: "underline" }}><strong>bimafarmaapotek2@gmail.com</strong></a></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 4, fontSize: "11px", fontWeight: 700 }}>
              💳 Duitku Sandbox Active
            </span>
            <span>📍 Tanimulya, Ngamprah</span>
          </div>
        </div>
      </div>

      <header className={scrolled ? "scrolled" : ""}>
        <div className="wrap">
          <nav>
            <Link to="/" className="brand">
              <svg className="brand-mark"><use href="#cross-mark" /></svg>
              <span className="brand-text">
                <span className="apotek">APOTEK</span>
                <span className="nama">BIMA FARMA</span>
                <span className="lokasi-sub">Tanimulya, Ngamprah</span>
              </span>
            </Link>

            <div className="nav-links">
              <Link to="/#beranda">Beranda</Link>
              <Link to="/toko" className={diToko ? "active" : ""}>Toko</Link>
              {!diToko && (
                <>
                  <a href="#lokasi">Lokasi</a>
                </>
              )}
              <button
                type="button"
                onClick={handleBukaCekPesanan}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ink)",
                  fontSize: 14.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "6px 0",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: "var(--ink-soft)" }}>
                  <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                </svg>
                Cek Pesanan
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {diToko ? (
                <button className="cart-btn" onClick={onOpenCart}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                  </svg>
                  Keranjang
                  {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
                </button>
              ) : (
                <a href="#lokasi" className="btn btn-primary nav-cta-btn">Hubungi Kami</a>
              )}
              <button
                className="hamburger"
                aria-label="Buka menu"
                onClick={() => setMobileOpen((v) => !v)}
              >
                <span></span>
              </button>
            </div>
          </nav>

          <div className={`mobile-menu ${mobileOpen ? "open" : ""}`}>
            <Link to="/#beranda" onClick={() => setMobileOpen(false)}>Beranda</Link>
            <Link to="/toko" onClick={() => setMobileOpen(false)}>Toko</Link>
            {!diToko && (
              <>
                <a href="#lokasi" onClick={() => setMobileOpen(false)}>Lokasi &amp; Kontak</a>
              </>
            )}
            <button
              type="button"
              onClick={handleBukaCekPesanan}
              style={{
                background: "none",
                border: "none",
                textAlign: "left",
                color: "var(--ink)",
                fontSize: 15,
                fontWeight: 600,
                padding: "10px 0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: "var(--ink-soft)" }}>
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
              Cek Status Pesanan
            </button>
          </div>
        </div>
      </header>

      {/* ---------- MODAL CEK STATUS PESANAN (DI LUAR HEADER SUPAYA TIDAK KEPOTONG) ---------- */}
      {modalCek && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(18, 12, 28, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
            overflowY: "auto",
          }}
          onClick={() => setModalCek(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 460,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: 20,
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
              padding: "24px 26px",
              textAlign: "left",
              position: "relative",
              margin: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--magenta-tint)", color: "var(--magenta-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 20, height: 20 }}>
                    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "var(--ink)" }}>Cek Status Pesanan</h3>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Lacak pembayaran & bukti pengambilan obat</div>
                </div>
              </div>
              <button
                type="button"
                className="drawer-close"
                onClick={() => setModalCek(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            {/* Jika ada pesanan terakhir yang tersimpan di browser */}
            {lastTracking && (
              <div
                style={{
                  background: "#FAF5FF",
                  border: "1.5px dashed var(--magenta)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--magenta-dark)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Pesanan Terakhir di Perangkat Ini
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--ink)" }}>{lastTracking}</div>
                    {lastPembeli && <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>a.n. {lastPembeli}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalCek(false);
                      navigate(`/pesanan/${lastTracking}`);
                    }}
                    style={{
                      background: "var(--magenta)",
                      color: "#fff",
                      border: "none",
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Buka Status
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCariPesanan}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>
                  Nomor WhatsApp / HP atau Kode Tracking
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789 atau TRK-260901-XXXX"
                  value={inputKode}
                  onChange={(e) => setInputKode(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1.5px solid var(--line)",
                    fontSize: 14,
                  }}
                  required
                />
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 5 }}>
                  Lupa kode tracking? Masukkan nomor HP yang Anda gunakan saat pemesanan.
                </div>
              </div>

              {errorCari && (
                <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "10px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
                  {errorCari}
                </div>
              )}

              {/* Hasil Pencarian jika ada beberapa pesanan */}
              {hasilCari.length > 0 && (
                <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                    Ditemukan {hasilCari.length} Pesanan:
                  </div>
                  {hasilCari.map((p) => {
                    const lunas = p.status_pembayaran === "sukses";
                    return (
                      <div
                        key={p.kode_tracking}
                        style={{
                          background: "#fff",
                          border: "1px solid var(--line)",
                          borderRadius: 10,
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: "var(--ink)" }}>{p.kode_tracking}</div>
                          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                            a.n. {p.nama_pembeli} • Rp{Number(p.total).toLocaleString("id-ID")}
                          </div>
                          <div style={{ marginTop: 3 }}>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: lunas ? "#DCFCE7" : "#FFEDD5",
                                color: lunas ? "#15803D" : "#C2410C",
                              }}
                            >
                              {lunas ? "✓ LUNAS" : "MENUNGGU PEMBAYARAN"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setModalCek(false);
                            navigate(`/pesanan/${p.kode_tracking}`);
                          }}
                          style={{
                            background: "var(--magenta)",
                            color: "#fff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Buka
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setModalCek(false)}
                  style={{ flex: 1, padding: "11px", borderRadius: 10 }}
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="btn-full"
                  disabled={loadingCari}
                  style={{
                    flex: 1.5,
                    padding: "11px",
                    borderRadius: 10,
                    background: "var(--magenta)",
                    color: "#fff",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {loadingCari ? "Mencari…" : "Cari Pesanan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
