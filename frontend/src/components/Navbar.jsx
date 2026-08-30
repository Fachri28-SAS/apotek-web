import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

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
  const diToko = typeof onOpenCart === "function";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? "scrolled" : ""}>
      <div className="wrap">
        <nav>
          <Link to="/" className="brand">
            <svg className="brand-mark"><use href="#cross-mark" /></svg>
            <span className="brand-text">
              <span className="apotek">APOTEK</span>
              <span className="nama">BIMA FARMA</span>
            </span>
          </Link>

          <div className="nav-links">
            <Link to="/#beranda">Beranda</Link>
            <Link to="/toko" className={diToko ? "active" : ""}>Toko</Link>
            {!diToko && (
              <>
                <a href="#tentang">Tentang Kami</a>
                <a href="#lokasi">Lokasi</a>
              </>
            )}
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
              <a href="#lokasi" className="btn btn-primary">Hubungi Kami</a>
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
              <a href="#tentang" onClick={() => setMobileOpen(false)}>Tentang Kami</a>
              <a href="#lokasi" onClick={() => setMobileOpen(false)}>Lokasi</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
