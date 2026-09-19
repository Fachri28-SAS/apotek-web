import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { rupiah } from "../utils/format";
import KartuStrukDigital from "./komponen/KartuStrukDigital";
import "./TrackingPesanan.css";

export default function TrackingPesanan() {
  const { kodeTracking } = useParams();
  const [pesanan, setPesanan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Status state
  const [statusPembayaran, setStatusPembayaran] = useState("pending");
  const [statusPenjualan, setStatusPenjualan] = useState("pending");
  const [catatanVerifikasi, setCatatanVerifikasi] = useState(null);

  // Upload proof state
  const [buktiBase64, setBuktiBase64] = useState(null);
  const [buktiPreview, setBuktiPreview] = useState(null);
  const [nominalKlaim, setNominalKlaim] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadPesan, setUploadPesan] = useState("");
  const fileInputRef = useRef(null);

  // QRIS Lightbox / salin
  const [salinTeks, setSalinTeks] = useState(false);

  // 1. Muat data awal pesanan
  function muatDataAwal() {
    setLoading(true);
    api(`/pesanan/${kodeTracking}`)
      .then((data) => {
        setPesanan(data);
        setStatusPembayaran(data.pembayaran?.status || "pending");
        setStatusPenjualan(data.status_penjualan || "pending");
        setCatatanVerifikasi(data.pembayaran?.catatan_verifikasi || null);
        setNominalKlaim(data.pembayaran?.nominal_klaim_customer || data.total);
        if (data.pembayaran?.bukti_url) {
          setBuktiPreview(data.pembayaran.bukti_url);
        }
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    muatDataAwal();
  }, [kodeTracking]);

  // 2. AUTO-POLLING setiap 5 detik menggunakan Fetch API biasa (tanpa reload halaman)
  useEffect(() => {
    if (!kodeTracking) return;

    const timer = setInterval(() => {
      // Hanya polling jika tab browser aktif
      if (document.hidden) return;

      api(`/pesanan/${kodeTracking}/status`)
        .then((res) => {
          setStatusPembayaran((prevStatus) => {
            // Jika status berubah dari bukan sukses menjadi sukses, reload data lengkap sekali
            if (prevStatus !== res.status_pembayaran && res.status_pembayaran === "sukses") {
              muatDataAwal();
            }
            return res.status_pembayaran;
          });
          setStatusPenjualan(res.status_penjualan);
          setCatatanVerifikasi(res.catatan_verifikasi || null);
        })
        .catch(() => {
          // Tangani koneksi terputus secara senyap agar tidak mengganggu UI user
        });
    }, 5000);

    return () => clearInterval(timer);
  }, [kodeTracking]);

  function handleSalinKode() {
    if (pesanan?.kode_tracking) {
      navigator.clipboard.writeText(pesanan.kode_tracking);
      setSalinTeks(true);
      setTimeout(() => setSalinTeks(false), 2000);
    }
  }

  function pilihFileBukti(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBuktiBase64(reader.result);
      setBuktiPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleKirimBukti(e) {
    e.preventDefault();
    if (!buktiBase64) {
      setError("Silakan pilih file foto/screenshot bukti transfer terlebih dahulu.");
      return;
    }

    setUploading(true);
    setError("");
    setUploadPesan("");

    try {
      const res = await api(`/pesanan/${kodeTracking}/bukti`, {
        method: "POST",
        body: JSON.stringify({
          bukti_base64: buktiBase64,
          nominal_klaim: Number(nominalKlaim) || pesanan.total,
        }),
      });

      setStatusPembayaran(res.status_pembayaran);
      setUploadPesan("Bukti berhasil dikirim! Menunggu verifikasi kasir.");
      setBuktiBase64(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="tracking-page">
        <header className="tracking-nav">
          <div className="tracking-nav-inner">
            <Link to="/toko" className="tracking-brand">
              <svg><use href="#cross-mark" /></svg>
              <div className="tracking-brand-text">
                <span className="brand-sub">APOTEK</span>
                <span className="brand-title">BIMA FARMA</span>
                <span className="brand-lokasi" style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--ink-soft)" }}>Tanimulya, Ngamprah</span>
              </div>
            </Link>
          </div>
        </header>
        <div className="tracking-container" style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ color: "var(--ink-soft)", fontSize: 16 }}>Memuat status pesanan...</p>
        </div>
      </div>
    );
  }

  if (error && !pesanan) {
    return (
      <div className="tracking-page">
        <header className="tracking-nav">
          <div className="tracking-nav-inner">
            <Link to="/toko" className="tracking-brand">
              <svg><use href="#cross-mark" /></svg>
              <div className="tracking-brand-text">
                <span className="brand-sub">APOTEK</span>
                <span className="brand-title">BIMA FARMA</span>
                <span className="brand-lokasi" style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--ink-soft)" }}>Tanimulya, Ngamprah</span>
              </div>
            </Link>
          </div>
        </header>
        <div className="tracking-container" style={{ textAlign: "center", padding: "80px 0" }}>
          <h2 style={{ fontSize: 24, marginBottom: 12 }}>Pesanan Tidak Ditemukan</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>{error || "Kode tracking yang Anda masukkan tidak valid."}</p>
          <Link to="/toko" className="btn-upload-submit" style={{ display: "inline-block", maxWidth: 220, textDecoration: "none" }}>
            Kembali ke Toko
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="tracking-page">
      {/* ---------- NAVBAR TRACKING ---------- */}
      <header className="tracking-nav">
        <div className="tracking-nav-inner">
          <Link to="/toko" className="tracking-brand">
            <svg><use href="#cross-mark" /></svg>
            <div className="tracking-brand-text">
              <span className="brand-sub">APOTEK</span>
              <span className="brand-title">BIMA FARMA</span>
              <span className="brand-lokasi" style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--ink-soft)" }}>Tanimulya, Ngamprah</span>
            </div>
          </Link>
          <Link to="/toko" className="tracking-nav-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Kembali ke Toko
          </Link>
        </div>
      </header>

      <div className="tracking-container">
        {/* ---------- HERO STATUS BANNER (REAKTIF VIA POLLING) ---------- */}
        <div className={`status-hero status-${statusPembayaran} ${statusPembayaran}`}>
          <div className="status-icon-wrap">
            {statusPembayaran === "pending" && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            )}
            {statusPembayaran === "menunggu_verifikasi" && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            )}
            {statusPembayaran === "sukses" && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            {statusPembayaran === "kurang_bayar" && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            {(statusPembayaran === "gagal" || statusPembayaran === "expired") && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
          </div>

          <div className="status-hero-body">
            <div className="status-badge-live">
              <span className="live-pulse" />
              {statusPembayaran === "pending" && "Menunggu Pembayaran"}
              {statusPembayaran === "menunggu_verifikasi" && "Menunggu Verifikasi Kasir"}
              {statusPembayaran === "sukses" && "Pembayaran Lunas"}
              {statusPembayaran === "kurang_bayar" && "Pembayaran Kurang"}
              {(statusPembayaran === "gagal" || statusPembayaran === "expired") && "Pesanan Dibatalkan"}
            </div>

            <div className="status-hero-title">
              {statusPembayaran === "pending" && "Silakan Selesaikan Pembayaran QRIS"}
              {statusPembayaran === "menunggu_verifikasi" && "Bukti Transfer Sedang Diperiksa Kasir"}
              {statusPembayaran === "sukses" && "✓ Pembayaran Berhasil Dikonfirmasi!"}
              {statusPembayaran === "kurang_bayar" && "Nominal Transfer Belum Sesuai"}
              {(statusPembayaran === "gagal" || statusPembayaran === "expired") && "Pesanan Tidak Dapat Diproses"}
            </div>

            <div className="status-hero-desc">
              {statusPembayaran === "pending" && "Scan kode QRIS di samping dan kirimkan bukti transfer Anda agar pesanan dapat segera disiapkan."}
              {statusPembayaran === "menunggu_verifikasi" && "Kasir kami sedang mencocokkan mutasi rekening dengan bukti yang Anda kirim. Halaman ini akan otomatis diperbarui begitu diverifikasi."}
              {statusPembayaran === "sukses" && "Terima kasih! Pesanan Anda telah tercatat lunas dan sedang disiapkan oleh staf apotek Bima Farma."}
              {statusPembayaran === "kurang_bayar" && "Kasir menandai nominal transfer Anda kurang dari total tagihan. Silakan cek catatan di bawah dan upload bukti transfer kekurangan."}
              {(statusPembayaran === "gagal" || statusPembayaran === "expired") && "Pesanan ini telah dibatalkan. Silakan lakukan pemesanan ulang melalui Toko Online jika diperlukan."}
            </div>

            {catatanVerifikasi && (
              <div className="status-hero-note">
                <strong>Catatan Kasir:</strong> {catatanVerifikasi}
              </div>
            )}
          </div>
        </div>

        {/* ---------- 2-KOLOM: DETAIL & PEMBAYARAN ---------- */}
        <div className="tracking-grid">
          {/* KOLOM KIRI: DETAIL PESANAN */}
          <div className="tracking-card">
            <div className="tracking-card-head">
              <h3>Detail Pesanan</h3>
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{pesanan.no_struk}</span>
            </div>

            <div className="order-meta-grid">
              <div className="order-meta-item">
                <div className="order-meta-label">Kode Tracking</div>
                <div className="order-meta-val">
                  <span style={{ letterSpacing: "0.08em", color: "var(--magenta-dark)" }}>{pesanan.kode_tracking}</span>
                  <button className="copy-code-btn" onClick={handleSalinKode} title="Salin kode tracking">
                    {salinTeks ? "Tersalin!" : "Salin"}
                  </button>
                </div>
              </div>
              <div className="order-meta-item">
                <div className="order-meta-label">Nama Pemesan</div>
                <div className="order-meta-val">{pesanan.nama_pembeli}</div>
              </div>
              <div className="order-meta-item">
                <div className="order-meta-label">No. WhatsApp/HP</div>
                <div className="order-meta-val">{pesanan.telepon_pembeli}</div>
              </div>
              <div className="order-meta-item">
                <div className="order-meta-label">Waktu Pemesanan</div>
                <div className="order-meta-val" style={{ fontSize: 12.5 }}>
                  {new Date(pesanan.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
            </div>

            {pesanan.alamat_kirim && (
              <div style={{ marginBottom: 20, padding: 12, background: "var(--bg)", borderRadius: 12, border: "1px solid var(--line)" }}>
                <div className="order-meta-label">Alamat Pengiriman</div>
                <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{pesanan.alamat_kirim}</div>
              </div>
            )}

            <div className="items-list">
              <div className="order-meta-label" style={{ marginBottom: 4 }}>Daftar Obat</div>
              {pesanan.items.map((it) => (
                <div className="item-row" key={it.id}>
                  <div className="item-info">
                    <div className="item-name">{it.nama_obat}</div>
                    <div className="item-sub">{it.qty} {it.nama_satuan} × {rupiah(it.harga_jual)}</div>
                  </div>
                  <div className="item-price">{rupiah(it.subtotal)}</div>
                </div>
              ))}
            </div>

            <div className="total-breakdown">
              <span className="total-breakdown-label">Total Pembayaran</span>
              <span className="total-breakdown-val">{rupiah(pesanan.total)}</span>
            </div>
          </div>

          {/* KOLOM KANAN: PEMBAYARAN QRIS & STRUK DIGITAL */}
          <div className="tracking-card">
            <div className="tracking-card-head">
              <h3>
                {statusPembayaran === "sukses"
                  ? "Struk & Status Pembayaran"
                  : statusPembayaran === "menunggu_verifikasi"
                  ? "Verifikasi Pembayaran"
                  : "Pembayaran QRIS"}
              </h3>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--magenta-dark)" }}>
                {statusPembayaran === "sukses" ? "✓ Lunas" : rupiah(pesanan.total)}
              </span>
            </div>

            <div className="qris-payment-panel">
              {/* KONDISI 1: SUDAH LUNAS / TERKONFIRMASI */}
              {statusPembayaran === "sukses" ? (
                <div>
                  <div style={{ textAlign: "center", padding: "18px 16px", background: "var(--green-tint)", borderRadius: 14, border: "1.5px solid #86EFAC", marginBottom: 14 }}>
                    <div style={{ fontSize: 36, marginBottom: 6 }}>✅</div>
                    <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "var(--green-dark)" }}>Pembayaran Lunas &amp; Terverifikasi</h4>
                    <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>
                      Pesanan Anda sedang disiapkan oleh tim apoteker Apotek Bima Farma. Silakan simpan struk digital di bawah untuk ditunjukkan saat pengambilan obat.
                    </p>
                  </div>
                  <KartuStrukDigital pesanan={pesanan} items={pesanan.items} />
                </div>
              ) : statusPembayaran === "menunggu_verifikasi" ? (
                /* KONDISI 2: BUKTI SUDAH DIUNGGAH, MENUNGGU KASIR */
                <div>
                  <div style={{ textAlign: "center", padding: "18px 16px", background: "#FEF3C7", borderRadius: 14, border: "1.5px solid #FCD34D", marginBottom: 14 }}>
                    <div style={{ fontSize: 36, marginBottom: 6 }}>⏳</div>
                    <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#92400E" }}>Bukti Transfer Sedang Diverifikasi</h4>
                    <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "#78350F" }}>
                      Terima kasih! Bukti pembayaran Anda telah masuk ke dashboard kasir dan sedang dicocokkan dengan mutasi rekening GoPay apotek.
                    </p>
                    {buktiPreview && (
                      <div style={{ marginTop: 8 }}>
                        <a href={buktiPreview} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "#B45309", textDecoration: "underline" }}>
                          Lihat Foto Bukti yang Dikirim ↗
                        </a>
                      </div>
                    )}
                  </div>
                  <KartuStrukDigital pesanan={pesanan} items={pesanan.items} />
                </div>
              ) : (
                /* KONDISI 3: BELUM BAYAR (PENDING / KURANG BAYAR) */
                <div>
                  {/* Kartu Gambar QRIS Apotek Bima Farma */}
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1.5px solid var(--line)",
                      borderRadius: 16,
                      padding: "16px",
                      textAlign: "center",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "inline-block", background: "#FAF5FF", padding: "6px 14px", borderRadius: 20, fontSize: 11.5, fontWeight: 800, color: "var(--magenta-dark)", marginBottom: 10 }}>
                      NMID: ID1024357753648
                    </div>

                    <div style={{ maxWidth: 280, margin: "0 auto", padding: "8px", background: "#FFFFFF", borderRadius: 12, border: "1.5px solid #E2E8F0" }}>
                      <img
                        src="/qris-bima-farma.png"
                        alt="QRIS Apotek Bima Farma"
                        style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
                      />
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Total yang Harus Ditransfer:</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--magenta-dark)", marginTop: 2 }}>
                        {rupiah(pesanan.total)}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                      <a
                        href="/qris-bima-farma.png"
                        download="qris-apotek-bima-farma.png"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 16px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          background: "#F3E8FF",
                          color: "var(--magenta-dark)",
                          textDecoration: "none",
                          border: "1px solid #D8B4FE",
                        }}
                      >
                        <span>📥</span> Unduh QRIS untuk Scan Galeri
                      </a>
                    </div>

                    <div style={{ textAlign: "left", background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", marginTop: 12, fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                      <strong>Cara Bayar:</strong>
                      <ol style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                        <li>Buka GoPay, BCA, Livin, BRImo, DANA, OVO, ShopeePay, atau m-Banking lain.</li>
                        <li>Pindai QR di atas atau pilih &apos;Scan dari Galeri&apos;.</li>
                        <li>Masukkan nominal pas <strong>{rupiah(pesanan.total)}</strong> lalu konfirmasi bayar.</li>
                        <li>Simpan tangkapan layar (screenshot) bukti transfer lalu unggah di bawah ini.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Form Unggah Bukti Pembayaran */}
                  <form onSubmit={handleKirimBukti} style={{ background: "#FAF5FF", border: "1.5px solid #E9D5FF", borderRadius: 16, padding: "18px", marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--magenta-dark)", marginBottom: 4 }}>
                      📤 Unggah Bukti Pembayaran
                    </div>
                    <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 12px" }}>
                      Upload tangkapan layar atau foto resi transfer agar pesanan langsung masuk antrean verifikasi kasir.
                    </p>

                    {error && (
                      <div style={{ padding: "8px 12px", background: "#FEE2E2", color: "#991B1B", borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
                        {error}
                      </div>
                    )}
                    {uploadPesan && (
                      <div style={{ padding: "8px 12px", background: "#DCFCE7", color: "#166534", borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
                        {uploadPesan}
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={pilihFileBukti}
                      style={{ display: "none" }}
                      id="input-file-tracking"
                    />

                    {buktiPreview ? (
                      <div style={{ textAlign: "center", marginBottom: 12 }}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <img
                            src={buktiPreview}
                            alt="Bukti Transfer"
                            style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 10, border: "1.5px solid #86EFAC" }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setBuktiBase64(null);
                              setBuktiPreview(null);
                            }}
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              background: "rgba(0,0,0,0.65)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "50%",
                              width: 26,
                              height: 26,
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#166534", fontWeight: 700, marginTop: 4 }}>
                          ✓ Foto bukti siap dikirim
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="input-file-tracking"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: "20px 14px",
                          background: "#fff",
                          border: "2px dashed #C084FC",
                          borderRadius: 12,
                          cursor: "pointer",
                          textAlign: "center",
                          marginBottom: 12,
                        }}
                      >
                        <span style={{ fontSize: 28 }}>📷</span>
                        <strong style={{ fontSize: 13, color: "var(--magenta-dark)" }}>
                          Pilih Foto / Screenshot Bukti Transfer
                        </strong>
                        <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                          Format JPG, PNG, atau WebP (Maks. 5MB)
                        </span>
                      </label>
                    )}

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                        Nominal yang Ditransfer (Rp):
                      </label>
                      <input
                        type="number"
                        value={nominalKlaim}
                        onChange={(e) => setNominalKlaim(e.target.value)}
                        placeholder="Contoh: 50000"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid #CBD5E1",
                          fontSize: 13,
                          outline: "none",
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!buktiBase64 || uploading}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: 10,
                        fontSize: 13.5,
                        fontWeight: 800,
                        background: buktiBase64 && !uploading ? "linear-gradient(135deg, #10B981, #059669)" : "#CBD5E1",
                        color: "#fff",
                        border: "none",
                        cursor: buktiBase64 && !uploading ? "pointer" : "not-allowed",
                        boxShadow: buktiBase64 ? "0 4px 12px rgba(16, 185, 129, 0.25)" : "none",
                      }}
                    >
                      {uploading ? "Mengunggah Bukti…" : "✓ Kirim Bukti Pembayaran ke Kasir"}
                    </button>
                  </form>

                  {/* Struk Digital Preview */}
                  <KartuStrukDigital pesanan={pesanan} items={pesanan.items} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Indikator auto-refresh polling */}
        <div className="polling-indicator">
          <span className="polling-dot" />
          <span>Status pesanan diperbarui secara realtime otomatis setiap 5 detik</span>
        </div>
      </div>
    </div>
  );
}
