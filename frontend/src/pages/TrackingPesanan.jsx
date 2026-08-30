import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";
import { rupiah } from "../utils/format";
import { unduhQrisPng } from "../utils/qrisDownload";
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

  // QRIS Lightbox
  const [qrisBesar, setQrisBesar] = useState(false);
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
        <div className={`status-hero ${statusPembayaran}`}>
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

          {/* KOLOM KANAN: QRIS & UPLOAD BUKTI */}
          <div className="tracking-card">
            <div className="tracking-card-head">
              <h3>
                {statusPembayaran === "sukses" ? "Bukti Terverifikasi" : "QRIS Dinamis Otomatis"}
              </h3>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--magenta-dark)" }}>
                {statusPembayaran === "sukses" ? "✓ Lunas" : rupiah(pesanan.total)}
              </span>
            </div>

            <div className="qris-payment-panel">
              {/* Barcode QRIS Dinamis — Nominal Terkunci Otomatis */}
              {statusPembayaran !== "sukses" && (
                <div className="qris-card-inner">
                  <div
                    className="qris-image-container"
                    onClick={() => setQrisBesar(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      cursor: "zoom-in",
                      padding: 12,
                    }}
                  >
                    {pesanan.pembayaran?.qris_dinamis ? (
                      <QRCodeSVG
                        id="tracking-qris-svg"
                        value={pesanan.pembayaran.qris_dinamis}
                        size={195}
                        level="M"
                        includeMargin={false}
                      />
                    ) : (
                      <img src="/qris.png" alt="QRIS Apotek Bima Farma" onError={(e) => { e.target.style.display = "none"; }} />
                    )}
                  </div>
                  <div style={{ display: "inline-block", background: "var(--green-tint)", color: "var(--green-dark)", padding: "4px 10px", borderRadius: 100, fontSize: 12, fontWeight: 800, margin: "6px 0" }}>
                    ✓ Nominal Terkunci Otomatis: {rupiah(pesanan.total)}
                  </div>
                  <div className="qris-hint-text">
                    Scan via GoPay, BCA, Livin Mandiri, BRImo, DANA, ShopeePay, atau OVO (tinggal klik Bayar &amp; masukkan PIN)
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      unduhQrisPng({
                        svgId: "tracking-qris-svg",
                        namaFile: `qris-bima-farma-${pesanan.kode_tracking}.png`,
                        judul: "APOTEK BIMA FARMA",
                        nominal: rupiah(pesanan.total),
                      })
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      marginTop: 10,
                      padding: "7px 14px",
                      borderRadius: 100,
                      border: "1.5px solid var(--magenta)",
                      background: "#fff",
                      color: "var(--magenta)",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                      <path d="M12 15V3m0 12l-4-4m4 4l4-4M4 17v4h16v-4" />
                    </svg>
                    Unduh Gambar QRIS
                  </button>
                </div>
              )}

              {/* Form Upload Bukti */}
              {(statusPembayaran === "pending" || statusPembayaran === "kurang_bayar" || statusPembayaran === "menunggu_verifikasi") && (
                <form onSubmit={handleKirimBukti}>
                  {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
                  {uploadPesan && <div className="pesan-sukses" style={{ marginBottom: 12 }}>{uploadPesan}</div>}

                  <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                    {buktiPreview ? (
                      <div>
                        <img src={buktiPreview} className="upload-preview-img" alt="Preview Bukti Transfer" />
                        <div style={{ fontSize: 12, color: "var(--magenta-dark)", fontWeight: 700 }}>
                          Ketuk untuk mengganti gambar
                        </div>
                      </div>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 36, height: 36, margin: "0 auto 10px", color: "var(--ink-soft)" }}>
                          <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
                        </svg>
                        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>
                          Unggah Screenshot Bukti Transfer
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                          Format JPG, PNG atau WebP
                        </div>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={pilihFileBukti}
                      style={{ display: "none" }}
                    />
                  </div>

                  <div className="upload-input-group">
                    <label>Nominal yang Anda Transfer (Rp)</label>
                    <input
                      type="number"
                      value={nominalKlaim}
                      onChange={(e) => setNominalKlaim(e.target.value)}
                      placeholder="Masukkan nominal transfer"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-upload-submit"
                    disabled={uploading || (!buktiBase64 && !buktiPreview)}
                  >
                    {uploading ? "Mengunggah Bukti..." : statusPembayaran === "menunggu_verifikasi" ? "Unggah Ulang Bukti" : "Kirim Bukti Pembayaran"}
                  </button>
                </form>
              )}

              {statusPembayaran === "sukses" && buktiPreview && (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <img src={buktiPreview} className="upload-preview-img" alt="Bukti Transfer Lunas" style={{ maxHeight: 240 }} />
                  <p style={{ fontSize: 13, color: "var(--green-dark)", fontWeight: 700, marginTop: 10 }}>
                    Bukti transfer telah divalidasi oleh kasir apotek.
                  </p>
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

      {/* ---------- LIGHTBOX QRIS BESAR ---------- */}
      {qrisBesar && (
        <div className="qris-lightbox-overlay" onClick={() => setQrisBesar(false)}>
          <div className="qris-lightbox-box" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
            <button className="drawer-close" onClick={() => setQrisBesar(false)} style={{ marginLeft: "auto", marginBottom: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--ink)", marginBottom: 4 }}>
              APOTEK BIMA FARMA
            </div>
            <div style={{ fontSize: 13, color: "var(--green-dark)", fontWeight: 700, marginBottom: 12 }}>
              Total Pembayaran: {rupiah(pesanan.total)}
            </div>
            <div style={{ background: "#fff", padding: 14, borderRadius: 16, display: "inline-block", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              {pesanan.pembayaran?.qris_dinamis ? (
                <QRCodeSVG
                  id="tracking-qris-svg-lightbox"
                  value={pesanan.pembayaran.qris_dinamis}
                  size={260}
                  level="M"
                  includeMargin={true}
                />
              ) : (
                <img src="/qris.png" alt="QRIS Apotek Bima Farma — Perbesar" style={{ maxWidth: 260 }} />
              )}
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn-upload-submit"
                onClick={() =>
                  unduhQrisPng({
                    svgId: "tracking-qris-svg-lightbox",
                    namaFile: `qris-bima-farma-${pesanan.kode_tracking}.png`,
                    judul: "APOTEK BIMA FARMA",
                    nominal: rupiah(pesanan.total),
                  })
                }
                style={{ width: "100%", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <path d="M12 15V3m0 12l-4-4m4 4l4-4M4 17v4h16v-4" />
                </svg>
                Unduh / Simpan Gambar QRIS
              </button>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 10 }}>
              Buka aplikasi e-wallet / m-banking dan pilih menu <strong>Scan dari Galeri</strong>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
