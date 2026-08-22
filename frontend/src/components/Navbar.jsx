import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? "scrolled" : ""}>
      <div className="wrap">
        <nav>
          <a href="#beranda" className="brand">
            <svg className="brand-mark"><use href="#cross-mark" /></svg>
            <span className="brand-text">
              <span className="apotek">APOTEK</span>
              <span className="nama">BIMA FARMA</span>
            </span>
          </a>

          <div className="nav-links">
            <a href="#beranda">Beranda</a>
            <Link to="/toko">Toko</Link>
            <a href="#tentang">Tentang Kami</a>
            <a href="#lokasi">Lokasi</a>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <a href="#lokasi" className="btn btn-primary">Hubungi Kami</a>
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
          <a href="#beranda" onClick={() => setMobileOpen(false)}>Beranda</a>
          <Link to="/toko" onClick={() => setMobileOpen(false)}>Toko</Link>
          <a href="#tentang" onClick={() => setMobileOpen(false)}>Tentang Kami</a>
          <a href="#lokasi" onClick={() => setMobileOpen(false)}>Lokasi</a>
        </div>
      </div>
    </header>
  );
}
