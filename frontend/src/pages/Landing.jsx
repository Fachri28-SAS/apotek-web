import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Landing.css";

export default function Landing() {
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <TrustStrip />
      <TokoPreview />
      <Divider />
      <TentangKami />
      <Lokasi />
      <Footer />
    </div>
  );
}

/* ==================== HERO ==================== */
function Hero() {
  return (
    <section className="hero" id="beranda" style={{ paddingTop: 70 }}>
      <div className="hero-pattern"></div>
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow magenta">Apotek Keluarga · Tanimulya, Ngamprah</span>
          <h1>Teman sehat warga <em>Bandung Barat</em>, sedia setiap hari</h1>
          <p className="lead">
            Bima Farma melayani penebusan resep dokter, obat bebas, vitamin,
            hingga alat kesehatan — dilayani apoteker berizin dengan harga
            yang jelas dan bersahabat.
          </p>
          <div className="hero-cta">
            <Link to="/toko" className="btn btn-primary">Lihat Produk Toko</Link>
            <a href="#lokasi" className="btn btn-outline">Hubungi Apotek</a>
          </div>
          <div className="hero-meta">
            <div><strong>Online</strong>Pesan &amp; bayar</div>
            <div><strong>Setiap&nbsp;Hari</strong>Apotek buka</div>
            <div><strong>Berizin</strong>Apoteker bersertifikat</div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="halo"></div>
          <svg className="cross-big"><use href="#cross-mark" /></svg>
        </div>
      </div>
    </section>
  );
}

/* ==================== TRUST STRIP ==================== */
const TRUST_ITEMS = [
  {
    title: "Apoteker Berizin", sub: "Konsultasi langsung", stroke: "#E4B8F2",
    path: <><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></>,
  },
  {
    title: "Buka Setiap Hari", sub: "Termasuk akhir pekan", stroke: "#F0A9D2",
    path: <><path d="M12 7v5l3 3" /><circle cx="12" cy="12" r="9" /></>,
  },
  {
    title: "Stok Obat Lengkap", sub: "Resep & obat bebas", stroke: "#E4B8F2",
    path: <><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M8 7V5a4 4 0 018 0v2" /></>,
  },
  {
    title: "Pelayanan Ramah", sub: "Untuk seluruh keluarga", stroke: "#F0A9D2",
    path: <path d="M12 21c-4-3-8-6.5-8-11a5 5 0 019-3 5 5 0 019 3c0 4.5-4 8-10 11z" />,
  },
];

function TrustStrip() {
  return (
    <div className="trust">
      <div className="wrap">
        {TRUST_ITEMS.map((t) => (
          <div className="trust-item" key={t.title}>
            <svg viewBox="0 0 24 24" fill="none" stroke={t.stroke} strokeWidth="1.8">{t.path}</svg>
            <div className="t">{t.title}</div>
            <div className="s">{t.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== CUPLIKAN TOKO ==================== */
// Data dummy — ganti fetch("/api/produk?limit=4") begitu backend siap
const PRODUK_PREVIEW = [
  { nama: "Paracetamol 500mg", kemasan: "Strip isi 10 tablet",
    icon: <><rect x="3" y="9" width="18" height="6" rx="3" /><path d="M8 9v6M16 9v6" /></> },
  { nama: "Vitamin C 1000mg", kemasan: "Tabung isi 10 tablet",
    icon: <><path d="M12 3v6M9 6h6" /><circle cx="12" cy="14" r="7" /></> },
  { nama: "Termometer Digital", kemasan: "1 unit + baterai",
    icon: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 12h6M12 9v6" /></> },
  { nama: "Sunscreen SPF 50", kemasan: "Tube 40ml",
    icon: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></> },
];

function TokoPreview() {
  return (
    <section className="toko" id="toko">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Toko</span>
          <h2>Pesan obat &amp; kebutuhan sehat, langsung dari HP</h2>
          <p>Pilih produk, bayar online, dan kasir kami langsung siapkan pesanan Anda — tinggal ambil atau tunggu diantar.</p>
        </div>

        <div className="produk-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {PRODUK_PREVIEW.map((p) => (
            <div className="produk-card" key={p.nama}>
              <div className="produk-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{p.icon}</svg>
              </div>
              <h3>{p.nama}</h3>
              <p>{p.kemasan}</p>
            </div>
          ))}
        </div>

        <div className="toko-cta">
          <div>
            <h3>Lihat semua produk &amp; pesan sekarang</h3>
            <p>Semua obat dan kebutuhan kami ada dalam satu daftar, tinggal cari &amp; pilih.</p>
          </div>
          <Link to="/toko" className="btn btn-primary">Buka Toko Online</Link>
        </div>
      </div>
    </section>
  );
}

function Divider() {
  return (
    <div className="divider">
      <svg viewBox="0 0 52 20">
        <path d="M2 10c8-14 16 14 24 0s16-14 24 0" fill="none" stroke="#A31670" strokeWidth="2" />
      </svg>
    </div>
  );
}

/* ==================== TENTANG KAMI ==================== */
const VALUES = [
  { title: "Apoteker Berpengalaman", desc: "Siap konsultasi setiap kunjungan.",
    icon: <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" /> },
  { title: "Harga Terjangkau", desc: "Transparan, sesuai kebutuhan.",
    icon: <path d="M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /> },
  { title: "Pelayanan Ramah", desc: "Untuk semua kalangan usia.",
    icon: <path d="M12 21c-4-3-8-6.5-8-11a5 5 0 019-3 5 5 0 019 3c0 4.5-4 8-10 11z" /> },
  { title: "Lokasi Strategis", desc: "Mudah dijangkau dari Tanimulya.",
    icon: <><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.4" /></> },
];

function TentangKami() {
  return (
    <section className="tentang" id="tentang">
      <div className="wrap tentang-grid">
        <div className="tentang-visual">
          <svg className="cross-outline"><use href="#cross-outline" /></svg>
        </div>
        <div className="tentang-copy">
          <span className="eyebrow magenta">Tentang Kami</span>
          <h2 style={{ margin: "14px 0 16px", fontSize: "clamp(26px,3vw,34px)", fontWeight: 700 }}>
            Apotek Bima Farma
          </h2>
          <p className="lead">
            Bima Farma hadir sebagai apotek keluarga di Tanimulya, Ngamprah —
            tempat warga sekitar percaya untuk urusan obat dan kesehatan
            sehari-hari.
          </p>
          <p>
            Kami berkomitmen menyediakan obat yang lengkap dan asli, dilayani
            oleh apoteker yang siap membantu menjelaskan aturan pakai dengan
            bahasa yang mudah dimengerti, tanpa buru-buru dan tanpa sungkan
            bertanya.
          </p>
          <div className="values">
            {VALUES.map((v) => (
              <div className="value-item" key={v.title}>
                <div className="value-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{v.icon}</svg>
                </div>
                <div>
                  <h4>{v.title}</h4>
                  <p>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================== LOKASI & KONTAK ==================== */
function Lokasi() {
  return (
    <section className="lokasi" id="lokasi">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Lokasi &amp; Kontak</span>
          <h2>Kunjungi apotek kami</h2>
          <p>Ada di Jalan Tanimulya Raya No. 1 (Haji Gofur) — mudah dijangkau warga Ngamprah dan sekitarnya.</p>
        </div>

        <div className="lokasi-grid">
          <div className="lokasi-card">
            <div className="lokasi-row">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.4" />
                </svg>
              </div>
              <div>
                <h4>Alamat</h4>
                <p>Jalan Tanimulya Raya No. 1, Haji Gofur, Ngamprah,<br />Kabupaten Bandung Barat</p>
              </div>
            </div>
            <div className="lokasi-row">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 7v5l3 3" /><circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <div><h4>Jam Operasional</h4><p>Setiap hari, 07.00 – 22.00 WIB</p></div>
            </div>
            <div className="lokasi-row">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.5 2.1L8 9.7a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.9.3 1.8.5 2.7.6a2 2 0 011.7 2z" />
                </svg>
              </div>
              <div><h4>Telepon / WhatsApp</h4><p>Tambahkan nomor kontak apotek di sini</p></div>
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
function Footer() {
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
              </span>
            </a>
            <p>Apotek keluarga di Tanimulya, Ngamprah — melayani kebutuhan obat dan kesehatan warga Bandung Barat setiap hari.</p>
          </div>
          <div>
            <h5>Menu</h5>
            <ul>
              <li><a href="#beranda">Beranda</a></li>
              <li><Link to="/toko">Toko</Link></li>
              <li><a href="#tentang">Tentang Kami</a></li>
              <li><a href="#lokasi">Lokasi</a></li>
            </ul>
          </div>
          <div>
            <h5>Kontak</h5>
            <ul>
              <li>Jl. Tanimulya Raya No. 1, Haji Gofur</li>
              <li>Ngamprah, Kab. Bandung Barat</li>
              <li>Setiap hari, 07.00–22.00 WIB</li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 Apotek Bima Farma. Seluruh hak cipta dilindungi.</span>
          <span>Desain — draf untuk persetujuan pemilik</span>
        </div>
      </div>
    </footer>
  );
}
