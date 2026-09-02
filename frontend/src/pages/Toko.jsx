import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";
import { rupiah } from "../utils/format";
import { unduhQrisPng } from "../utils/qrisDownload";
import Navbar from "../components/Navbar";
import "./Landing.css";
import "./Toko.css";

export function keteranganSatuan(namaSatuan) {
  if (!namaSatuan) return "";
  const s = namaSatuan.toLowerCase().trim();
  if (s.includes("blister") || s.includes("blitser")) return "1 Lempeng Mika";
  if (s.includes("strip")) return "1 Lempeng Foil";
  if (s.includes("box") || s.includes("dus") || s.includes("kotak")) return "1 Kotak Utuh";
  if (s.includes("botol") || s.includes("fls") || s.includes("btl")) return "1 Botol Cairan/Sirup";
  if (s.includes("tube") || s.includes("tub")) return "1 Tube Salep/Krim";
  if (s.includes("sachet") || s.includes("sch") || s.includes("sct")) return "1 Bungkus/Sachet";
  if (s.includes("tablet") || s.includes("tab")) return "1 Butir Tablet";
  if (s.includes("kapsul") || s.includes("kap")) return "1 Butir Kapsul";
  if (s.includes("pcs") || s.includes("biji") || s.includes("buah")) return "1 Satuan/Pcs";
  if (s.includes("ampul") || s.includes("vial")) return "1 Ampul Cair";
  if (s.includes("supp")) return "1 Peluru Rektal";
  return "";
}

export default function Toko() {
  const [produk, setProduk] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]); // [{obat_satuan_id, obat_id, nama, satuan, harga, qty, perlu_resep}]
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalPanduan, setModalPanduan] = useState(false);
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

  function muatProduk(silent = false) {
    if (!silent) setLoading(true);
    const params = new URLSearchParams({ untuk: "toko" });
    if (search) params.set("search", search);
    api(`/obat?${params}`)
      .then(setProduk)
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }

  // Muat produk saat user mengetik di pencarian
  useEffect(() => {
    const timer = setTimeout(() => muatProduk(false), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Realtime Polling: Perbarui daftar obat & foto terbaru secara otomatis di background setiap 5 detik
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        muatProduk(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [search]);

  function tambahKeKeranjang(obat) {
    if (obat.perlu_resep) return; // dijaga juga, tombol sudah disabled di UI
    const satuan = obat.satuan?.[0];
    if (!satuan) return;

    const maxTersedia = Math.floor(Number(obat.stok || 0) / Math.max(Number(satuan.faktor || 1), 1));
    if (maxTersedia <= 0) {
      alert(`Maaf, stok "${obat.nama}" saat ini sedang habis.`);
      return;
    }

    const key = satuan.id;
    let stokKurang = false;

    setCart((prev) => {
      const sudahAda = prev.find((it) => it.obat_satuan_id === key);
      if (sudahAda) {
        if (sudahAda.qty + 1 > maxTersedia) {
          stokKurang = true;
          return prev;
        }
        return prev.map((it) => (it.obat_satuan_id === key ? { ...it, qty: it.qty + 1 } : it));
      }
      return [...prev, {
        obat_satuan_id: satuan.id,
        obat_id: obat.id,
        nama: obat.nama,
        satuan: satuan.nama_satuan,
        satuan_dasar: obat.satuan_dasar,
        faktor: Number(satuan.faktor || 1),
        stok_dasar: Number(obat.stok || 0),
        harga: satuan.harga_jual,
        qty: 1,
      }];
    });

    if (stokKurang) {
      alert(`Maksimal batas pembelian untuk "${obat.nama}" sudah tercapai.`);
    } else {
      setDrawerOpen(true);
    }
  }

  function ubahQty(id, delta) {
    setCart((prev) => {
      const target = prev.find((it) => it.obat_satuan_id === id);
      if (!target) return prev;

      if (delta > 0) {
        const obatObj = (produk || []).find((o) => o.id === target.obat_id);
        const stokTerkini = obatObj ? Number(obatObj.stok || 0) : Number(target.stok_dasar || 9999);
        const maxTersedia = Math.floor(stokTerkini / Math.max(target.faktor || 1, 1));

        if (target.qty + delta > maxTersedia) {
          alert(`Maksimal batas pembelian untuk "${target.nama}" sudah tercapai.`);
          return prev;
        }
      }

      return prev
        .map((it) => (it.obat_satuan_id === id ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0);
    });
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
      if (hasil?.kode_tracking) {
        localStorage.setItem("apotek_last_tracking", hasil.kode_tracking);
        localStorage.setItem("apotek_last_pembeli", hasil.nama_pembeli || "");
      }
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
    }, 3500);
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

      <div className="wrap toolbar-modern">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input type="text" placeholder="Cari nama obat atau gejala…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        
        <button
          type="button"
          className="panduan-chip-btn"
          onClick={() => setModalPanduan(true)}
        >
          <span className="panduan-chip-icon">💡</span>
          <span>Panduan Satuan: <strong>Blister, Strip, Box, dll</strong></span>
        </button>
      </div>

      <section className="produk-section wrap">
        <div className="result-meta"><span>{loading ? "Memuat…" : `${produk.length} produk tersedia`}</span></div>
        <div className="produk-grid">
          {produk.map((obat) => {
            const satuan = obat.satuan?.[0];
            const stokTersedia = satuan?.faktor ? Math.floor(obat.stok / satuan.faktor) : Number(obat.stok || 0);
            const namaSatuan = satuan?.nama_satuan || obat.kemasan || obat.satuan_dasar || "Pcs";
            const ketSatuan = keteranganSatuan(namaSatuan);
            const diKeranjang = cart.find((it) => it.obat_satuan_id === satuan?.id);
            const habis = stokTersedia <= 0;

            return (
              <div className={`produk-card ${habis ? "produk-habis" : ""}`} key={obat.id}>
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
                  <div className="kemasan-row" style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontSize: 11.5, margin: "2px 0 6px" }}>
                    <span
                      style={{
                        color: "var(--magenta-dark)",
                        fontWeight: 700,
                        background: "var(--magenta-tint)",
                        padding: "1.5px 7px",
                        borderRadius: 4,
                      }}
                      title={ketSatuan || namaSatuan}
                    >
                      {namaSatuan} {ketSatuan ? `(${ketSatuan})` : ""}
                    </span>
                    <span style={{ color: "var(--line)" }}>•</span>
                    {habis ? (
                      <span style={{ color: "#DC2626", fontWeight: 700, fontSize: 11, background: "#FEE2E2", padding: "1px 6px", borderRadius: 4 }}>
                        Habis
                      </span>
                    ) : (
                      <span style={{ color: "#15803D", fontWeight: 600, fontSize: 11, background: "#DCFCE7", padding: "1px 6px", borderRadius: 4 }}>
                        Tersedia
                      </span>
                    )}
                  </div>
                  <div className="produk-foot">
                    {obat.perlu_resep ? (
                      <span className="produk-harga resep">Hubungi Apoteker</span>
                    ) : (
                      <span className="produk-harga">
                        {rupiah(satuan?.harga_jual)}{" "}
                        <small style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)" }}>/ {namaSatuan}</small>
                      </span>
                    )}
                    {habis ? (
                      <button
                        className="mini-btn"
                        disabled={true}
                        style={{
                          background: "#F1F5F9",
                          color: "#94A3B8",
                          border: "1px solid #CBD5E1",
                          cursor: "not-allowed",
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 11,
                          boxShadow: "none",
                        }}
                        title="Stok obat ini sedang habis"
                      >
                        Stok Habis
                      </button>
                    ) : obat.perlu_resep ? (
                      <a
                        href={`https://wa.me/6281287781519?text=${encodeURIComponent(`Halo Apotek Bima Farma, saya ingin konsultasi/pesan obat resep: ${obat.nama}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mini-btn"
                        style={{
                          background: "#059669",
                          color: "#fff",
                          padding: "6px 10px",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        title="Hubungi Apoteker via WhatsApp"
                      >
                        💬 Resep
                      </a>
                    ) : (
                      <button
                        className={`mini-btn ${diKeranjang ? "added" : ""}`}
                        onClick={() => tambahKeKeranjang(obat)}
                        title="Tambah ke keranjang"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                    )}
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
              cart.map((it) => {
                const obatObj = (produk || []).find((o) => o.id === it.obat_id);
                const stokDasarTerkini = obatObj ? Number(obatObj.stok || 0) : Number(it.stok_dasar || 0);
                const maxStok = Math.floor(stokDasarTerkini / Math.max(Number(it.faktor || 1), 1));
                const isMaxReached = it.qty >= maxStok;

                return (
                  <div className="cart-item" key={it.obat_satuan_id}>
                    <div className="thumb">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <rect x="3" y="9" width="18" height="6" rx="3" />
                      </svg>
                    </div>
                    <div className="info">
                      <h4>{it.nama}</h4>
                      <div className="harga">
                        {it.satuan} {keteranganSatuan(it.satuan) ? `(${keteranganSatuan(it.satuan)})` : ""} · {rupiah(it.harga)}
                      </div>
                      <div className="qty-row" style={{ alignItems: "center" }}>
                        <button className="qty-btn" onClick={() => ubahQty(it.obat_satuan_id, -1)}>−</button>
                        <span className="qty-val">{it.qty}</span>
                        <button
                          className="qty-btn"
                          disabled={isMaxReached}
                          onClick={() => ubahQty(it.obat_satuan_id, 1)}
                          style={{
                            opacity: isMaxReached ? 0.35 : 1,
                            cursor: isMaxReached ? "not-allowed" : "pointer",
                            background: isMaxReached ? "#E2E8F0" : undefined,
                          }}
                          title={isMaxReached ? `Stok maksimal ${maxStok} ${it.satuan} sudah tercapai` : "Tambah jumlah"}
                        >
                          +
                        </button>
                        <button className="remove-btn" onClick={() => hapusItem(it.obat_satuan_id)}>Hapus</button>
                      </div>
                      {isMaxReached && (
                        <div style={{ fontSize: 11, color: "#C2410C", fontWeight: 700, marginTop: 4 }}>
                          Batas stok maksimal tercapai
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
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

      {/* ---------- MODAL PANDUAN SATUAN & KEMASAN OBAT ---------- */}
      {modalPanduan && (
        <div className="panduan-modal-overlay" onClick={() => setModalPanduan(false)}>
          <div
            className="panduan-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panduan-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="panduan-modal-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 18, height: 18 }}>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--ink)" }}>Panduan Satuan &amp; Kemasan</h3>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>Kenali arti kemasan obat sebelum membeli</div>
                </div>
              </div>
              <button
                type="button"
                className="drawer-close"
                onClick={() => setModalPanduan(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <div className="panduan-modal-body">
              <div className="panduan-notice">
                ℹ️ Agar tidak salah membeli jumlah obat, berikut penjelasan arti kemasan obat resmi di Apotek Bima Farma:
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  {
                    icon: "💊",
                    nama: "Blister / Blitser",
                    desc: "1 Lempeng plastik mika kaku bergelembung + aluminium foil belakang (dikeluarkan dengan ditekan). Biasanya berisi 4–10 butir.",
                    contoh: "Contoh: Panadol, Enzyplex, Mylanta tablet",
                  },
                  {
                    icon: "📄",
                    nama: "Strip",
                    desc: "1 Lempeng bungkus foil lentur (dikeluarkan dengan disobek pinggirnya). Biasanya berisi 10 butir tablet.",
                    contoh: "Contoh: Paracetamol generik, Amoxicillin",
                  },
                  {
                    icon: "📦",
                    nama: "Box / Dus / Kotak",
                    desc: "1 Kotak kardus utuh dari pabrik (berisi 3–10 strip/blister). Cocok untuk stok obat di rumah.",
                    contoh: "Contoh: 1 Box Tolak Angin, 1 Box Vitamin C",
                  },
                  {
                    icon: "🧴",
                    nama: "Botol / Fls (Flask)",
                    desc: "1 Botol utuh obat cair sirup anak, tetes mata/telinga, atau larutan antiseptik.",
                    contoh: "Contoh: Sanmol sirup, Betadine, Cendo Eyefresh",
                  },
                  {
                    icon: "🧪",
                    nama: "Tube / Salep",
                    desc: "1 Tube salep, gel, atau krim kulit / obat luka.",
                    contoh: "Contoh: Bioplacenton, Salep 88, Hydrocortisone",
                  },
                  {
                    icon: "👝",
                    nama: "Sachet / Bungkus",
                    desc: "1 Bungkus serbuk atau larutan cair siap minum.",
                    contoh: "Contoh: Komix, Tolak Angin cair, Adem Sari",
                  },
                  {
                    icon: "🔘",
                    nama: "Tablet / Kapsul / Pcs",
                    desc: "1 Butir satuan terkecil obat.",
                    contoh: "Harga yang tertera adalah harga per 1 butir obat",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="panduan-item-card">
                    <div className="panduan-item-head">
                      <span className="panduan-item-emoji">{item.icon}</span>
                      <span className="panduan-item-nama">{item.nama}</span>
                    </div>
                    <div className="panduan-item-desc">{item.desc}</div>
                    <div className="panduan-item-contoh">{item.contoh}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panduan-modal-footer">
              <button
                type="button"
                className="btn-full"
                onClick={() => setModalPanduan(false)}
                style={{ width: "100%", padding: "12px", borderRadius: 12 }}
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
