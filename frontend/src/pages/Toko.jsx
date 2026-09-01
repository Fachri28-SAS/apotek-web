import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";
import { rupiah } from "../utils/format";
import { unduhQrisPng } from "../utils/qrisDownload";
import Navbar from "../components/Navbar";
import "./Landing.css";
import "./Toko.css";

export default function Toko() {
  const [produk, setProduk] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]); // [{obat_satuan_id, obat_id, nama, satuan, harga, qty, perlu_resep}]
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tahap, setTahap] = useState("keranjang"); // keranjang | checkout | qris | selesai
  const [order, setOrder] = useState(null); // {penjualan_id, pembayaran_id, no_struk, total}
  const [statusPesanan, setStatusPesanan] = useState("pending");
  const [error, setError] = useState("");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const fileInputRef = useRef(null);
  const [buktiPreview, setBuktiPreview] = useState(null);
  const [buktiBase64, setBuktiBase64] = useState(null);
  const [nominalKlaim, setNominalKlaim] = useState("");
  const [qrisBesar, setQrisBesar] = useState(false);

  const [namaPembeli, setNamaPembeli] = useState("");
  const [teleponPembeli, setTeleponPembeli] = useState("");
  const [alamatKirim, setAlamatKirim] = useState("");

  function muatProduk() {
    setLoading(true);
    const params = new URLSearchParams({ untuk: "toko" });
    if (search) params.set("search", search);
    api(`/obat?${params}`).then(setProduk).finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(muatProduk, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function tambahKeKeranjang(obat) {
    if (obat.perlu_resep) return; // dijaga juga, tombol sudah disabled di UI
    const satuan = obat.satuan[0];
    const key = satuan.id;
    setCart((prev) => {
      const sudahAda = prev.find((it) => it.obat_satuan_id === key);
      if (sudahAda) {
        return prev.map((it) => (it.obat_satuan_id === key ? { ...it, qty: it.qty + 1 } : it));
      }
      return [...prev, {
        obat_satuan_id: satuan.id,
        obat_id: obat.id,
        nama: obat.nama,
        satuan: satuan.nama_satuan,
        harga: satuan.harga_jual,
        qty: 1,
      }];
    });
    setDrawerOpen(true);
  }

  function ubahQty(id, delta) {
    setCart((prev) => prev
      .map((it) => (it.obat_satuan_id === id ? { ...it, qty: it.qty + delta } : it))
      .filter((it) => it.qty > 0));
  }

  function hapusItem(id) {
    setCart((prev) => prev.filter((it) => it.obat_satuan_id !== id));
  }

  const totalKeranjang = cart.reduce((s, it) => s + it.qty * it.harga, 0);
  const jumlahItem = cart.reduce((s, it) => s + it.qty, 0);

  async function submitCheckout() {
    setError("");
    if (!namaPembeli.trim() || !teleponPembeli.trim()) {
      setError("Nama dan No. HP wajib diisi.");
      return;
    }
    setLoadingCheckout(true);
    try {
      const hasil = await api("/toko/checkout", {
        method: "POST",
        body: JSON.stringify({
          nama_pembeli: namaPembeli,
          telepon_pembeli: teleponPembeli,
          alamat_kirim: alamatKirim || null,
          items: cart.map((it) => ({ obat_satuan_id: it.obat_satuan_id, qty: it.qty })),
        }),
      });
      setOrder(hasil);
      setNominalKlaim(hasil.total);
      setTahap("qris");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCheckout(false);
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

  async function kirimBukti() {
    setError("");
    if (!buktiBase64) { setError("Upload dulu screenshot bukti transfer."); return; }
    setLoadingCheckout(true);
    try {
      await api(`/pesanan/${order.kode_tracking}/bukti`, {
        method: "POST",
        body: JSON.stringify({ bukti_base64: buktiBase64, nominal_klaim: Number(nominalKlaim) }),
      });
      setTahap("selesai");
      setCart([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCheckout(false);
    }
  }

  // Polling status setelah bukti terkirim — cek apakah kasir sudah konfirmasi
  useEffect(() => {
    if (tahap !== "selesai" || !order?.kode_tracking) return;
    const timer = setInterval(() => {
      api(`/pesanan/${order.kode_tracking}/status`)
        .then((d) => setStatusPesanan(d.status_pembayaran))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [tahap, order]);

  return (
    <div className="toko-page">
      <Navbar cartCount={jumlahItem} onOpenCart={() => setDrawerOpen(true)} />

      <section className="shop-hero">
        <div className="wrap">
          <span className="eyebrow">Toko Online</span>
          <h1>Belanja obat tanpa antri</h1>
          <p>Cari, pesan, dan bayar langsung dari rumah — kami siapkan pesanan Anda begitu pembayaran terkonfirmasi.</p>
        </div>
      </section>

      <div className="wrap toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input type="text" placeholder="Cari obat…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <section className="produk-section wrap">
        <div className="result-meta"><span>{loading ? "Memuat…" : `${produk.length} produk tersedia`}</span></div>
        <div className="produk-grid">
          {produk.map((obat) => {
            const satuan = obat.satuan[0];
            const diKeranjang = cart.find((it) => it.obat_satuan_id === satuan?.id);
            return (
              <div className="produk-card" key={obat.id}>
                {obat.perlu_resep && <span className="badge-resep-produk">Resep</span>}
                <div className="produk-thumb">
                  {obat.gambar_url || obat.gambar ? (
                    <img
                      src={obat.gambar_url || `/storage/${obat.gambar}`}
                      alt={obat.nama}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <rect x="3" y="9" width="18" height="6" rx="3" /><path d="M8 9v6M16 9v6" />
                    </svg>
                  )}
                </div>
                <div className="produk-body">
                  <h3>{obat.nama}</h3>
                  <div className="kemasan">{obat.kemasan}</div>
                  <div className="produk-foot">
                    {obat.perlu_resep ? (
                      <span className="produk-harga resep">Hubungi Apoteker</span>
                    ) : (
                      <span className="produk-harga">{rupiah(satuan?.harga_jual)}</span>
                    )}
                    <button
                      className={`mini-btn ${diKeranjang ? "added" : ""}`}
                      disabled={obat.perlu_resep || obat.stok <= 0}
                      onClick={() => tambahKeKeranjang(obat)}
                      title={obat.perlu_resep ? "Perlu resep dokter" : obat.stok <= 0 ? "Stok habis" : "Tambah ke keranjang"}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- OVERLAY + DRAWER ---------- */}
      <div className={`overlay ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <div className={`drawer ${drawerOpen ? "open" : ""}`}>
        <div className="drawer-head">
          <h3>
            {tahap === "keranjang" && "Keranjang Belanja"}
            {tahap === "checkout" && "Data Pengiriman"}
            {tahap === "qris" && "Pembayaran QRIS"}
            {tahap === "selesai" && "Status Pesanan"}
          </h3>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="drawer-body">
          {error && <div className="login-error">{error}</div>}

          {/* ---- TAHAP 1: KERANJANG ---- */}
          {tahap === "keranjang" && (
            cart.length === 0 ? (
              <div className="cart-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></svg>
                Keranjang masih kosong.
              </div>
            ) : (
              cart.map((it) => (
                <div className="cart-item" key={it.obat_satuan_id}>
                  <div className="thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="9" width="18" height="6" rx="3" /></svg></div>
                  <div className="info">
                    <h4>{it.nama}</h4>
                    <div className="harga">{it.satuan} · {rupiah(it.harga)}</div>
                    <div className="qty-row">
                      <button className="qty-btn" onClick={() => ubahQty(it.obat_satuan_id, -1)}>−</button>
                      <span className="qty-val">{it.qty}</span>
                      <button className="qty-btn" onClick={() => ubahQty(it.obat_satuan_id, 1)}>+</button>
                      <button className="remove-btn" onClick={() => hapusItem(it.obat_satuan_id)}>Hapus</button>
                    </div>
                  </div>
                </div>
              ))
            )
          )}

          {/* ---- TAHAP 2: CHECKOUT ---- */}
          {tahap === "checkout" && (
            <>
              <button className="back-link" onClick={() => setTahap("keranjang")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                Kembali ke keranjang
              </button>
              <div className="form-group">
                <label>Nama Lengkap</label>
                <input value={namaPembeli} onChange={(e) => setNamaPembeli(e.target.value)} placeholder="Contoh: Bu Siti" />
              </div>
              <div className="form-group">
                <label>No. HP / WhatsApp</label>
                <input value={teleponPembeli} onChange={(e) => setTeleponPembeli(e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="form-group">
                <label>Alamat (opsional, kalau perlu diantar)</label>
                <textarea rows={3} value={alamatKirim} onChange={(e) => setAlamatKirim(e.target.value)} placeholder="Jl. Contoh No. 1, RT/RW..." />
              </div>
            </>
          )}

          {/* ---- TAHAP 3: QRIS ---- */}
          {tahap === "qris" && order && (
            <div className="qris-box">
              <div
                className="qris-image"
                onClick={() => setQrisBesar(true)}
                style={{
                  cursor: "zoom-in",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fff",
                  padding: 12,
                }}
              >
                {order.qris_dinamis ? (
                  <QRCodeSVG
                    id="toko-qris-svg"
                    value={order.qris_dinamis}
                    size={185}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <img src="/qris.png" alt="QRIS Apotek Bima Farma" onError={(e) => { e.target.style.display = "none"; }} />
                )}
              </div>
              <div style={{ display: "inline-block", background: "var(--green-tint)", color: "var(--green-dark)", padding: "3px 8px", borderRadius: 100, fontSize: 11.5, fontWeight: 800, margin: "6px 0" }}>
                ✓ Nominal Terkunci Otomatis: {rupiah(order.total)}
              </div>
              <p className="qris-tap-hint">Ketuk barcode untuk memperbesar</p>
              <button
                type="button"
                onClick={() =>
                  unduhQrisPng({
                    svgId: "toko-qris-svg",
                    namaFile: `qris-bima-farma-${order.kode_tracking || "checkout"}.png`,
                    judul: "APOTEK BIMA FARMA",
                    nominal: rupiah(order.total),
                  })
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  margin: "4px auto 10px",
                  padding: "6px 14px",
                  borderRadius: 100,
                  border: "1.5px solid var(--magenta)",
                  background: "#fff",
                  color: "var(--magenta)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <path d="M12 15V3m0 12l-4-4m4 4l4-4M4 17v4h16v-4" />
                </svg>
                Unduh Gambar QRIS
              </button>
              <div className="qris-nominal">
                Total Tagihan
                <strong>{rupiah(order.total)}</strong>
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.5 }}>
                Scan via GoPay, BCA, Livin, BRImo, DANA, OVO, ShopeePay (tinggal masukkan PIN), lalu upload bukti transfer di bawah.
              </p>

              <div className="upload-bukti-box" onClick={() => fileInputRef.current?.click()}>
                {buktiPreview ? (
                  <img src={buktiPreview} className="upload-bukti-preview" alt="Preview bukti" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 28, height: 28, margin: "0 auto 8px", color: "var(--ink-soft)" }}>
                      <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
                    </svg>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Upload Bukti Transfer</div>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={pilihFileBukti} style={{ display: "none" }} />
              </div>
            </div>
          )}

          {/* ---- TAHAP 4: SELESAI / MENUNGGU ---- */}
          {tahap === "selesai" && order && (
            <div className="nota-wrap">
              <div className="nota-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <h3>Bukti Terkirim!</h3>
              <p className="sub">Kode Tracking: <strong style={{ color: "var(--magenta-dark)", letterSpacing: "0.05em" }}>{order.kode_tracking}</strong></p>
              <span className="status-pill">
                {(statusPesanan === "pending" || statusPesanan === "menunggu_verifikasi") && "Menunggu Verifikasi Kasir"}
                {statusPesanan === "sukses" && "✓ Lunas — Pesanan Diproses"}
                {statusPesanan === "kurang_bayar" && "Nominal Kurang Bayar"}
                {(statusPesanan === "gagal" || statusPesanan === "expired") && "Pesanan Dibatalkan"}
              </span>
              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 14 }}>
                Kasir kami sedang memeriksa bukti transfer Anda. Anda bisa memantau status pesanan kapan saja melalui tautan tracking berikut:
              </p>

              {order.kode_tracking && (
                <a
                  href={`/pesanan/${order.kode_tracking}`}
                  className="btn-full"
                  style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 16, padding: "12px" }}
                >
                  Buka Halaman Tracking Pesanan →
                </a>
              )}
            </div>
          )}
        </div>

        <div className="drawer-foot">
          {tahap === "keranjang" && cart.length > 0 && (
            <>
              <div className="sum-row total"><span>Total</span><span>{rupiah(totalKeranjang)}</span></div>
              <button className="btn-full" onClick={() => setTahap("checkout")}>Checkout</button>
            </>
          )}
          {tahap === "checkout" && (
            <button className="btn-full" onClick={submitCheckout} disabled={loadingCheckout}>
              {loadingCheckout ? "Memproses…" : "Lanjut ke Pembayaran"}
            </button>
          )}
          {tahap === "qris" && (
            <>
              <button className="btn-full" onClick={kirimBukti} disabled={loadingCheckout}>
                {loadingCheckout ? "Mengirim…" : "Kirim Bukti Transfer"}
              </button>
              {order?.kode_tracking && (
                <a
                  href={`/pesanan/${order.kode_tracking}`}
                  className="btn-ghost"
                  style={{ display: "block", textAlign: "center", textDecoration: "none" }}
                >
                  Buka Halaman Tracking Pembayaran
                </a>
              )}
            </>
          )}
          {tahap === "selesai" && (
            <button className="btn-ghost" onClick={() => { setDrawerOpen(false); setTahap("keranjang"); }}>
              Tutup
            </button>
          )}
        </div>
      </div>

      {/* ---------- LIGHTBOX QRIS DIPERBESAR ---------- */}
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
              Total Pembayaran: {rupiah(order?.total || 0)}
            </div>
            <div style={{ background: "#fff", padding: 14, borderRadius: 16, display: "inline-block", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              {order?.qris_dinamis ? (
                <QRCodeSVG
                  id="toko-qris-svg-lightbox"
                  value={order.qris_dinamis}
                  size={260}
                  level="M"
                  includeMargin={true}
                />
              ) : (
                <img src="/qris.png" alt="QRIS Apotek Bima Farma — perbesar" style={{ maxWidth: 260 }} />
              )}
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn-full"
                onClick={() =>
                  unduhQrisPng({
                    svgId: "toko-qris-svg-lightbox",
                    namaFile: `qris-bima-farma-${order?.kode_tracking || "checkout"}.png`,
                    judul: "APOTEK BIMA FARMA",
                    nominal: rupiah(order?.total || 0),
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
