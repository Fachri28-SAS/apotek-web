import { Link } from "react-router-dom";

/**
 * Navbar khusus Toko. SENGAJA dibuat terpisah dari Navbar Landing,
 * dengan class name sendiri (toko-nav-*) — supaya tidak ada lagi
 * kemungkinan CSS saling bentrok/bocor antar halaman seperti kejadian
 * sebelumnya.
 */
export default function TokoNavbar({ cartCount, onOpenCart }) {
  return (
    <header className="toko-nav">
      <div className="toko-nav-inner">
        <div className="toko-nav-left">
          <Link to="/" className="toko-nav-brand">
            <svg className="toko-nav-logo"><use href="#cross-mark" /></svg>
            <span className="toko-nav-textwrap">
              <span className="toko-nav-apotek">APOTEK</span>
              <span className="toko-nav-nama">BIMA FARMA</span>
            </span>
          </Link>

          <nav className="toko-nav-links">
            <Link to="/">Beranda</Link>
            <Link to="/toko" className="active">Toko</Link>
          </nav>
        </div>

        <button className="toko-nav-cart" onClick={onOpenCart}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          Keranjang
          {cartCount > 0 && <span className="toko-nav-cart-count">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}
