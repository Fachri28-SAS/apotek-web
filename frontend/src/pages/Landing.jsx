import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import "./Landing.css";

function rupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

function getGambarObatUrl(itemOrObat) {
  if (!itemOrObat) return null;
  const src = itemOrObat.gambar_url || itemOrObat.gambar;
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  if (src.startsWith("/")) return src;
  return `/storage/${src}`;
}

export default function Landing() {
  const [modalCaraBayar, setModalCaraBayar] = useState(false);

  useEffect(() => {
    if (window.location.hash === "#cara-bayar" || window.location.hash === "#cara-pembayaran") {
      setModalCaraBayar(true);
    }
  }, []);

  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <TokoPreview />
      <Lokasi />
      <Footer onOpenCaraBayar={() => setModalCaraBayar(true)} />
      {modalCaraBayar && <ModalCaraBayar onClose={() => setModalCaraBayar(false)} />}
    </div>
  );
}

/* ==================== HERO ==================== */
function Hero() {
  return (
    <section className="hero" id="beranda" style={{ paddingTop: 50 }}>
      <div className="hero-pattern"></div>
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow magenta">Apotek Keluarga · Tanimulya, Ngamprah</span>
          <h1>Apotek Bima Farma <em>Tanimulya</em></h1>
          <p className="lead">
            Bima Farma melayani penebusan resep dokter, obat bebas, vitamin,
            hingga alat kesehatan dengan sistem pembayaran online otomatis terverifikasi Duitku.
          </p>
          <div className="hero-cta">
            <Link to="/toko" className="btn btn-primary">Buka Toko Online</Link>
            <a href="#lokasi" className="btn btn-outline">Kontak &amp; Lokasi</a>
          </div>
          <div className="hero-meta">
            <div><strong>Online</strong>Pesan &amp; bayar via Duitku</div>
            <div><strong>Setiap&nbsp;Hari</strong>Buka 07.00 - 22.00 WIB</div>
            <div><strong>Berizin</strong>Apoteker bersertifikat SIA/SIPA</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================== KATALOG PRODUK UNGGULAN & DUITKU ==================== */
const PRODUK_FALLBACK = [
  {
    id: 1,
    nama: "Paracetamol 500mg",
    kemasan: "Strip isi 10 Kaplet",
    satuan_dasar: "Strip",
    harga: 5000,
    kategori: "Obat Bebas",
    deskripsi: "Obat analgesik dan antipiretik untuk meredakan demam, sakit kepala, sakit gigi, dan nyeri ringan hingga sedang.",
  },
  {
    id: 2,
    nama: "Sanmol Sirup Paracetamol 60ml",
    kemasan: "Botol 60 ml",
    satuan_dasar: "Botol",
    harga: 22500,
    kategori: "Obat Bebas",
    deskripsi: "Sirup penurun panas dan pereda nyeri untuk anak dan balita dengan rasa buah yang disukai anak.",
  },
  {
    id: 3,
    nama: "Antasida Doen Tablet Kunyah",
    kemasan: "Strip isi 10 Tablet",
    satuan_dasar: "Strip",
    harga: 4000,
    kategori: "Obat Bebas",
    deskripsi: "Meringankan gejala kelebihan asam lambung, nyeri lambung, sakit maag, nyeri ulu hati, dan kembung.",
  },
  {
    id: 4,
    nama: "Vitamin C IPI 50mg",
    kemasan: "Botol isi 45 Tablet",
    satuan_dasar: "Botol",
    harga: 7500,
    kategori: "Suplemen & Vitamin",
    deskripsi: "Suplemen vitamin harian untuk memelihara daya tahan tubuh, mencegah sariawan, dan mempercepat pemulihan fisik.",
  },
  {
    id: 5,
    nama: "Betadine Antiseptic Solution 15ml",
    kemasan: "Botol 15 ml",
    satuan_dasar: "Botol",
    harga: 18000,
    kategori: "Antiseptik & P3K",
    deskripsi: "Antiseptik luka luar dengan Povidone Iodine 10% untuk membunuh kuman penyebab infeksi pada luka lecet dan gores.",
  },
  {
    id: 6,
    nama: "Mylanta Sirup 50ml",
    kemasan: "Botol 50 ml",
    satuan_dasar: "Botol",
    harga: 21000,
    kategori: "Obat Lambung & Maag",
    deskripsi: "Antasida cair cepat meredakan rasa perih asam lambung, begah, tukak lambung, dan kembung.",
  },
];

function TokoPreview() {
  const [daftarProduk, setDaftarProduk] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/obat?untuk=toko")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDaftarProduk(data.slice(0, 8));
        } else {
          setDaftarProduk(PRODUK_FALLBACK);
        }
      })
      .catch(() => {
        setDaftarProduk(PRODUK_FALLBACK);
      })
      .finally(() => setLoading(false));
  }, []);

  const listTampil = daftarProduk.length > 0 ? daftarProduk : PRODUK_FALLBACK;

  return (
    <section className="toko" id="toko">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Katalog Produk Resmi</span>
          <h2>Produk Obat &amp; Kesehatan Terdaftar</h2>
          <p>
            Semua produk berizin resmi BPOM dan disimpan sesuai standar kefarmasian. Pesan online dari HP Anda,
            pilih metode pembayaran otomatis via Duitku, dan pesanan langsung disiapkan untuk diambil.
          </p>
        </div>

        <div className="produk-grid">
          {listTampil.map((p) => {
            const fotoUrl = getGambarObatUrl(p);
            const harga = p.harga || p.satuan?.[0]?.harga_jual || p.satuan?.[0]?.hargaJual || 5000;
            const kemasan = p.kemasan || p.satuan_dasar || "1 Satuan";
            const deskripsi = p.deskripsi || p.kategori || "Obat resmi terdaftar BPOM untuk menjaga kesehatan Anda dan keluarga.";

            return (
              <div className="produk-card" key={p.id || p.nama}>
                {/* Header Foto / Visual Produk */}
                <div className="produk-thumb-box">
                  {fotoUrl ? (
                    <img src={fotoUrl} alt={p.nama} className="produk-thumb-img" />
                  ) : (
                    <div className="produk-thumb-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="produk-thumb-icon">
                        <path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7.07-7.07l7 7a5 5 0 0 1-7.07 7.07Z" />
                        <path d="m8.5 8.5 7 7" />
                      </svg>
                      <span className="produk-thumb-tag">Apotek Bima Farma</span>
                    </div>
                  )}
                </div>

                <div className="produk-info">
                  <h3 className="produk-nama">{p.nama}</h3>
                  <div className="produk-kemasan-text">Kemasan: {kemasan}</div>

                  <div className="produk-bawah">
                    <div className="produk-harga">{rupiah(harga)}</div>
                    <Link to="/toko" className="btn-beli-produk">
                      Beli Online →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link to="/toko" className="btn btn-outline" style={{ padding: "12px 30px", fontSize: "15px" }}>
            Lihat Semua Produk Lengkap di Toko Online →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ==================== LOKASI & KONTAK SUPPORT ==================== */
function Lokasi() {
  return (
    <section className="lokasi" id="lokasi">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Lokasi &amp; Kontak Support</span>
          <h2>Kunjungi apotek kami &amp; Hubungi Support</h2>
          <p>
            Beralamat di Jalan Tanimulya Raya No. 1 (Haji Gofur), Ngamprah, Kabupaten Bandung Barat.
            Untuk bantuan pemesanan atau pertanyaan verifikasi merchant, silakan hubungi kontak resmi kami di bawah ini.
          </p>
        </div>

        <div className="lokasi-grid">
          <div className="lokasi-card">
            {/* Email Support Resmi Sesuai Duitku */}
            <div className="lokasi-row" style={{ background: "var(--magenta-tint, #FAF0F6)", borderRadius: 12, padding: "14px 12px", border: "1.5px solid var(--magenta)" }}>
              <div className="ic" style={{ background: "var(--magenta)", color: "#fff" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div>
                <h4 style={{ color: "var(--magenta-dark)", fontWeight: 800 }}>Email Kontak Support Resmi</h4>
                <p style={{ margin: "2px 0 0" }}>
                  <a href="mailto:bimafarmaapotek2@gmail.com" style={{ color: "var(--magenta-dark)", fontWeight: 800, fontSize: "15px", textDecoration: "underline" }}>
                    bimafarmaapotek2@gmail.com
                  </a>
                </p>
                <span style={{ fontSize: "11.5px", color: "var(--ink-soft)" }}>Email akun terdaftar merchant Duitku Payment Gateway</span>
              </div>
            </div>

            <div className="lokasi-row">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.4" />
                </svg>
              </div>
              <div>
                <h4>Alamat Lokasi Usaha</h4>
                <p>Jalan Tanimulya Raya No. 1, Haji Gofur, Ngamprah,<br />Kabupaten Bandung Barat, Jawa Barat 40552</p>
              </div>
            </div>

            <div className="lokasi-row">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 7v5l3 3" /><circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <div><h4>Jam Operasional Apotek</h4><p>Buka setiap hari, 07.00 – 22.00 WIB</p></div>
            </div>

            <div className="lokasi-row">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.5 2.1L8 9.7a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.9.3 1.8.5 2.7.6a2 2 0 011.7 2z" />
                </svg>
              </div>
              <div>
                <h4>Telepon / WhatsApp</h4>
                <p><a href="https://wa.me/6281223604900" target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: "var(--ink)" }}>0812-2360-4900</a></p>
              </div>
            </div>
          </div>

          <div className="map-box">
            <iframe
              src="https://www.google.com/maps?q=Jalan+Tanimulya+Raya+No.1+Haji+Gofur+Ngamprah+Kabupaten+Bandung+Barat&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 340 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Lokasi Apotek Bima Farma"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================== FOOTER ==================== */
function Footer({ onOpenCaraBayar }) {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <a href="#beranda" className="brand">
              <svg className="brand-mark"><use href="#cross-mark" /></svg>
              <span className="brand-text">
                <span className="apotek">APOTEK</span>
                <span className="nama">BIMA FARMA</span>
                <span className="lokasi-sub" style={{ color: "#A9B2A9" }}>Tanimulya, Ngamprah</span>
              </span>
            </a>
            <p>
              Apotek keluarga di Tanimulya, Ngamprah — melayani kebutuhan obat, resep dokter, dan kesehatan
              warga Bandung Barat setiap hari dengan dukungan pembayaran resmi Duitku.
            </p>
          </div>

          <div>
            <h5>Menu Website</h5>
            <ul>
              <li><a href="#beranda">Beranda</a></li>
              <li><Link to="/toko">Toko Online &amp; Katalog</Link></li>
              <li><a href="#lokasi">Kontak &amp; Lokasi</a></li>
              <li>
                <button
                  type="button"
                  onClick={onOpenCaraBayar}
                  className="foot-link-btn"
                >
                  Cara Pembayaran
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h5>Kontak &amp; Dukungan Support</h5>
            <ul>
              <li><strong>Email Support:</strong> <a href="mailto:bimafarmaapotek2@gmail.com" style={{ color: "#F0A9D2", textDecoration: "underline" }}>bimafarmaapotek2@gmail.com</a></li>
              <li><strong>Telepon / WA:</strong> 0812-2360-4900</li>
              <li><strong>Alamat:</strong> Jl. Tanimulya Raya No. 1, Haji Gofur, Ngamprah, Kab. Bandung Barat</li>
              <li><strong>Jam Buka:</strong> Setiap hari, 07.00–22.00 WIB</li>
            </ul>
          </div>
        </div>

        <div className="foot-payment-notice" style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, fontSize: "12.5px", color: "#A0AEC0" }}>
          <span>
            💳 Pembayaran Online Aman &amp; Terverifikasi • QRIS Universal • Transfer Bank (VA) • E-Wallet{" "}
            <button
              type="button"
              onClick={onOpenCaraBayar}
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "2px 8px",
                marginLeft: "8px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Lihat Panduan
            </button>
          </span>
          <span>Resmi Berizin SIA &amp; SIPA Apoteker</span>
        </div>

        <div className="foot-bottom" style={{ marginTop: 16 }}>
          <span>© 2026 Apotek Bima Farma (apotekbimafarma.com). Seluruh hak cipta dilindungi.</span>
        </div>
      </div>
    </footer>
  );
}

/* ==================== MODAL PANDUAN CARA PEMBAYARAN ==================== */
function ModalCaraBayar({ onClose }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="cara-bayar-overlay" onClick={onClose}>
      <div className="cara-bayar-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="cara-bayar-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="cara-bayar-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M2 10h20" />
                <path d="M6 15h4" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17.5, fontWeight: 800, color: "var(--ink)" }}>
                Panduan &amp; Cara Pembayaran
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                Alur belanja obat resmi dan pembayaran otomatis di Apotek Bima Farma
              </p>
            </div>
          </div>
          <button type="button" className="cara-bayar-close-btn" onClick={onClose} title="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body Modal */}
        <div className="cara-bayar-body">
          {/* Highlight Metode Pembayaran */}
          <div className="cara-bayar-methods-box">
            <h4 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, color: "var(--magenta-dark)" }}>
              💳 Metode Pembayaran Online Resmi Terverifikasi:
            </h4>
            <div className="cara-bayar-pill-grid">
              <span className="cb-pill">📱 QRIS (Semua Bank &amp; E-Wallet)</span>
              <span className="cb-pill">🏦 Virtual Account (BCA, BRI, BNI, Mandiri)</span>
            </div>
          </div>

          {/* Langkah 1 - 4 */}
          <div className="cara-bayar-steps">
            <div className="cb-step-item">
              <div className="cb-step-num">1</div>
              <div className="cb-step-content">
                <h5>Pilih Obat di Katalog / Toko</h5>
                <p>
                  Buka menu <strong>Toko Online</strong>, cari obat yang Anda butuhkan, dan klik tombol <strong>"Beli Online"</strong> untuk memasukkan ke keranjang belanja.
                </p>
              </div>
            </div>

            <div className="cb-step-item">
              <div className="cb-step-num">2</div>
              <div className="cb-step-content">
                <h5>Lengkapi Data Pembeli</h5>
                <p>
                  Buka keranjang, masukkan <strong>Nama Penerima</strong>, <strong>Nomor WhatsApp aktif</strong> (untuk menerima nota digital &amp; nomor resi pelacakan), dan <strong>Alamat</strong> pengantaran atau penjemputan.
                </p>
              </div>
            </div>

            <div className="cb-step-item">
              <div className="cb-step-num">3</div>
              <div className="cb-step-content">
                <h5>Pilih Metode &amp; Selesaikan Pembayaran</h5>
                <p>
                  Pilih pembayaran otomatis via <strong>Duitku Payment Gateway</strong> (scan QRIS atau transfer Virtual Account). Pembayaran otomatis diverifikasi sistem dalam hitungan detik tanpa perlu konfirmasi manual.
                </p>
              </div>
            </div>

            <div className="cb-step-item">
              <div className="cb-step-num">4</div>
              <div className="cb-step-content">
                <h5>Dapatkan Kode Tracking &amp; Ambil Obat</h5>
                <p>
                  Setelah lunas, Anda akan mendapatkan <strong>Kode Tracking</strong> (contoh: <code>TRK-XXXXXX</code>) untuk memantau obat yang disiapkan oleh Apoteker hingga siap diambil di apotek atau dikirim ke lokasi Anda.
                </p>
              </div>
            </div>
          </div>

          {/* Alert Khusus Obat Resep */}
          <div className="cb-resep-notice">
            <strong>⚠️ Khusus Obat Resep Dokter:</strong>
            <p style={{ margin: "4px 0 0", fontSize: 11.5 }}>
              Untuk obat golongan Keras / yang membutuhkan resep dokter, silakan kirimkan foto resep asli terlebih dahulu ke WhatsApp resmi apoteker kami untuk verifikasi dosis.
            </p>
          </div>

          {/* Kontak Bantuan */}
          <div className="cb-support-box">
            <span>Butuh bantuan pemesanan atau pertanyaan pembayaran?</span>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
              <a href="https://wa.me/6281223604900" target="_blank" rel="noopener noreferrer" style={{ color: "var(--magenta-dark)", fontWeight: 700, fontSize: 12.5, textDecoration: "none" }}>
                💬 WhatsApp: 0812-2360-4900
              </a>
              <a href="mailto:bimafarmaapotek2@gmail.com" style={{ color: "var(--magenta-dark)", fontWeight: 700, fontSize: 12.5, textDecoration: "underline" }}>
                ✉️ bimafarmaapotek2@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="cara-bayar-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} style={{ padding: "9px 18px", fontSize: 13 }}>
            Tutup
          </button>
          <Link to="/toko" className="btn btn-primary" onClick={onClose} style={{ padding: "9px 20px", fontSize: 13 }}>
            Mulai Belanja di Toko →
          </Link>
        </div>
      </div>
    </div>
  );
}
