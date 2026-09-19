import { useState, useEffect, useRef, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";
import { rupiah } from "../utils/format";
import { unduhQrisPng } from "../utils/qrisDownload";
import Navbar from "../components/Navbar";
import KartuStrukDigital from "./komponen/KartuStrukDigital";
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

export function getGambarObatUrl(itemOrObat) {
  if (!itemOrObat) return null;
  const src = itemOrObat.gambar_url || itemOrObat.gambar;
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  const clean = src.replace(/^\/?(api\/)?storage\//, "");
  return `/storage/${clean}`;
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

  // Pagination Toko: 15 produk per halaman (3 baris x 5 kolom di desktop)
  const [halaman, setHalaman] = useState(1);
  const ITEM_PER_HALAMAN = 15;

  function muatProduk(silent = false) {
    if (!silent) setLoading(true);
    const params = new URLSearchParams({ untuk: "toko" });
    if (search) params.set("search", search);
    api(`/obat?${params}`)
      .then((data) => {
        if (Array.isArray(data)) {
          setProduk(data);
        } else {
          setProduk([]);
        }
      })
      .catch((err) => {
        console.error("Gagal muat obat toko:", err);
        setProduk([]);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }

  // Muat produk saat user mengetik di pencarian & reset ke halaman 1
  useEffect(() => {
    setHalaman(1);
    const timer = setTimeout(() => muatProduk(false), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Background Polling: Perbarui daftar obat di background setiap 45 detik (hanya saat tab aktif)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        muatProduk(true);
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [search]);

  // Hitung produk terpaginasi
  const totalHalaman = Math.max(1, Math.ceil((produk || []).length / ITEM_PER_HALAMAN));
  const paginatedProduk = useMemo(() => {
    const mulai = (halaman - 1) * ITEM_PER_HALAMAN;
    return (produk || []).slice(mulai, mulai + ITEM_PER_HALAMAN);
  }, [produk, halaman]);

  function gantiHalaman(nomor) {
    if (nomor < 1 || nomor > totalHalaman || nomor === halaman) return;
    setHalaman(nomor);
    const el = document.getElementById("katalog-produk");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

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
        gambar: obat.gambar,
        gambar_url: obat.gambar_url,
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

      <section className="produk-section wrap" id="katalog-produk">
        <div className="result-meta">
          <span>
            {loading ? "Memuat…" : `${(produk || []).length} produk tersedia • Halaman ${halaman} dari ${totalHalaman}`}
          </span>
        </div>
        <div className="produk-grid">
          {paginatedProduk.map((obat) => {
            const satuan = obat.satuan?.[0];
            const stokTersedia = satuan?.faktor ? Math.floor(obat.stok / satuan.faktor) : Number(obat.stok || 0);
            const namaSatuan = satuan?.nama_satuan || obat.kemasan || obat.satuan_dasar || "Pcs";
            const ketSatuan = keteranganSatuan(namaSatuan);
            const diKeranjang = cart.find((it) => it.obat_satuan_id === satuan?.id);
            const habis = stokTersedia <= 0;

            const imgUrl = getGambarObatUrl(obat);

            return (
              <div className={`produk-card ${habis ? "produk-habis" : ""}`} key={obat.id}>
                {obat.perlu_resep && <span className="badge-resep-produk">Resep</span>}
                <div className="produk-thumb">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={obat.nama}
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        if (!e.target.dataset.triedApi) {
                          e.target.dataset.triedApi = "true";
                          const g = obat.gambar;
                          if (g && !g.startsWith("http")) {
                            e.target.src = `/api/storage/${g.replace(/^\/?storage\//, "")}`;
                            return;
                          }
                        }
                        e.target.style.display = "none";
                      }}
                    />
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

        {/* Controls Navigasi Pagination */}
        {totalHalaman > 1 && (
          <div className="pagination-wrap">
            <button
              type="button"
              className="pagination-btn pagination-nav"
              disabled={halaman <= 1}
              onClick={() => gantiHalaman(halaman - 1)}
              title="Halaman Sebelumnya"
            >
              ← Sebelumnya
            </button>

            <div className="pagination-pages">
              {Array.from({ length: totalHalaman }, (_, i) => i + 1)
                .filter((p) => {
                  return p === 1 || p === totalHalaman || Math.abs(p - halaman) <= 1;
                })
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    acc.push("dots-" + p);
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item) => {
                  if (typeof item === "string") {
                    return (
                      <span key={item} className="pagination-dots">
                        …
                      </span>
                    );
                  }
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`pagination-btn ${item === halaman ? "active" : ""}`}
                      onClick={() => gantiHalaman(item)}
                    >
                      {item}
                    </button>
                  );
                })}
            </div>

            <button
              type="button"
              className="pagination-btn pagination-nav"
              disabled={halaman >= totalHalaman}
              onClick={() => gantiHalaman(halaman + 1)}
              title="Halaman Selanjutnya"
            >
              Selanjutnya →
            </button>
          </div>
        )}
      </section>

      {/* ---------- OVERLAY + DRAWER ---------- */}
      <div className={`overlay ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <div className={`drawer ${drawerOpen ? "open" : ""}`}>
        <div className="drawer-head">
          <h3>
            {tahap === "keranjang" && "Keranjang Belanja"}
            {tahap === "checkout" && "Data Pengiriman"}
            {tahap === "qris" && "Pembayaran Online"}
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
            (cart || []).length === 0 ? (
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

                const imgUrl = getGambarObatUrl(it) || getGambarObatUrl(obatObj);

                return (
                  <div className="cart-item" key={it.obat_satuan_id}>
                    <div className="thumb">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={it.nama}
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
                          onError={(e) => {
                            if (!e.target.dataset.triedApi) {
                              e.target.dataset.triedApi = "true";
                              const g = it.gambar || obatObj?.gambar;
                              if (g && !g.startsWith("http")) {
                                e.target.src = `/api/storage/${g.replace(/^\/?storage\//, "")}`;
                                return;
                              }
                            }
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <rect x="3" y="9" width="18" height="6" rx="3" />
                        </svg>
                      )}
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

          {/* ---- TAHAP 3: PEMBAYARAN QRIS RESMI APOTEK BIMA FARMA ---- */}
          {tahap === "qris" && order && (
            <div className="qris-checkout-container" style={{ padding: "10px 0" }}>
              {/* 1. Header Tagihan */}
              <div className="qris-header-tagihan">
                <span className="tagihan-label">TOTAL PEMBAYARAN</span>
                <div className="tagihan-amount">{rupiah(order.total)}</div>
                <div className="tagihan-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Scan QRIS Langsung ke GoPay / Bank Apotek
                </div>
              </div>

              {/* Card QRIS Apotek Bima Farma */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid var(--magenta, #C084FC)",
                  borderRadius: 16,
                  padding: "20px 16px",
                  margin: "14px 0",
                  textAlign: "center",
                  boxShadow: "0 6px 20px rgba(112, 26, 117, 0.08)",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--magenta-dark, #701A75)", marginBottom: 2 }}>
                  APOTEK BIMA FARMA, NGAMPRAH
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-soft, #64748B)", marginBottom: 12 }}>
                  NMID: <strong>ID1024357753648</strong> &middot; Satu QRIS untuk Semua Bank &amp; E-Wallet
                </div>

                {/* Gambar QRIS Resmi */}
                <div
                  style={{
                    display: "inline-block",
                    padding: 8,
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
                    cursor: "pointer",
                  }}
                  onClick={() => setQrisBesar(true)}
                  title="Klik untuk memperbesar QRIS"
                >
                  <img
                    src="/qris-bima-farma.png"
                    alt="QRIS Apotek Bima Farma, Ngamprah"
                    style={{ width: 220, height: "auto", display: "block", borderRadius: 8 }}
                  />
                  <div style={{ fontSize: 10.5, color: "var(--magenta-dark)", fontWeight: 700, marginTop: 4 }}>
                    🔍 Klik untuk Perbesar
                  </div>
                </div>

                {/* Tombol Simpan QRIS ke Galeri HP */}
                <div style={{ marginTop: 12 }}>
                  <a
                    href="/qris-bima-farma.png"
                    download="QRIS-Apotek-Bima-Farma.png"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      background: "#FAF5FF",
                      color: "var(--magenta-dark)",
                      border: "1px solid #D8B4FE",
                      textDecoration: "none",
                    }}
                  >
                    <span>📥</span>
                    <span>Simpan Gambar QRIS ke Galeri HP</span>
                  </a>
                </div>

                {/* Panduan Singkat */}
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginTop: 14,
                    fontSize: 11.5,
                    color: "var(--ink-soft)",
                    textAlign: "left",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Cara Bayar:</strong>
                  <ol style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                    <li>Buka GoPay, BCA, Livin, BRI, BNI, DANA, OVO, atau ShopeePay.</li>
                    <li>Scan QRIS di atas (atau scan dari galeri HP Anda).</li>
                    <li>Masukkan nominal pas: <strong style={{ color: "var(--magenta-dark)" }}>{rupiah(order.total)}</strong>.</li>
                    <li>Selesaikan pembayaran dan upload bukti transfer di bawah ini.</li>
                  </ol>
                </div>
              </div>

              {/* Form Upload Bukti Transfer */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1.5px solid var(--line)",
                  borderRadius: 14,
                  padding: "16px",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>
                  📤 Unggah Bukti Transfer
                </div>
                <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 12px", lineHeight: 1.4 }}>
                  Lampirkan foto atau tangkapan layar bukti transfer GoPay / Bank Anda agar pesanan langsung masuk antrean kasir.
                </p>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={pilihFileBukti}
                  style={{ display: "none" }}
                  id="input-bukti-drawer"
                />

                {buktiPreview ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <img
                        src={buktiPreview}
                        alt="Preview Bukti"
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
                    <div style={{ fontSize: 11.5, color: "#166534", fontWeight: 700, marginTop: 6 }}>
                      ✓ Bukti foto siap dikirim
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="input-bukti-drawer"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "20px 14px",
                      background: "#fff",
                      border: "2px dashed #CBD5E1",
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: 26 }}>📷</span>
                    <strong style={{ fontSize: 13, color: "var(--magenta-dark)" }}>
                      Klik untuk Memilih Foto Bukti Transfer
                    </strong>
                    <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      Format JPG, PNG, atau tangkapan layar (Maks. 5MB)
                    </span>
                  </label>
                )}

                <button
                  type="button"
                  onClick={kirimBukti}
                  disabled={!buktiBase64 || loadingCheckout}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding: "12px",
                    borderRadius: 10,
                    fontSize: 13.5,
                    fontWeight: 800,
                    background: buktiBase64 ? "linear-gradient(135deg, #10B981, #059669)" : "#CBD5E1",
                    color: "#fff",
                    border: "none",
                    cursor: buktiBase64 && !loadingCheckout ? "pointer" : "not-allowed",
                  }}
                >
                  {loadingCheckout ? "Mengirim Bukti…" : "✓ Kirim Bukti Pembayaran"}
                </button>
              </div>

              {order.kode_tracking && (
                <div style={{ textAlign: "center", padding: "8px 12px", background: "var(--card-bg, #F8FAFC)", borderRadius: 10, border: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Kode Tracking: </span>
                  <strong style={{ fontSize: 13, letterSpacing: "1px", color: "var(--magenta-dark)" }}>{order.kode_tracking}</strong>
                </div>
              )}
            </div>
          )}

          {/* ---- TAHAP 4: SELESAI & STRUK DIGITAL PEMBELI ---- */}
          {tahap === "selesai" && order && (
            <div className="nota-wrap" style={{ padding: "10px 0" }}>
              <div className="nota-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <h3>Bukti Pembayaran Terkirim!</h3>
              <p className="sub">Kode Tracking: <strong style={{ color: "var(--magenta-dark)", letterSpacing: "0.05em" }}>{order.kode_tracking}</strong></p>
              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "8px 0 16px", lineHeight: 1.45 }}>
                Pesanan Anda telah masuk ke sistem apotek Bima Farma. Berikut adalah struk digital resmi Anda:
              </p>

              {/* Kartu Struk Digital Lengkap dengan Opsi Unduh PNG, Cetak PDF, & WA */}
              <KartuStrukDigital pesanan={order} items={cart} />

              {order.kode_tracking && (
                <a
                  href={`/pesanan/${order.kode_tracking}`}
                  className="btn-full"
                  style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 14, padding: "12px" }}
                >
                  Buka Halaman Status &amp; Tracking Pesanan →
                </a>
              )}
            </div>
          )}
        </div>

        <div className="drawer-foot">
          {tahap === "keranjang" && (cart || []).length > 0 && (
            <>
              <div className="sum-row total"><span>Total</span><span>{rupiah(totalKeranjang)}</span></div>
              <button className="btn-full" onClick={() => setTahap("checkout")}>Checkout</button>
            </>
          )}
          {tahap === "checkout" && (
            <button className="btn-full" onClick={submitCheckout} disabled={loadingCheckout}>
              {loadingCheckout ? "Memproses…" : "Lanjut ke Pembayaran QRIS"}
            </button>
          )}
          {tahap === "qris" && (
            <>
              <button
                className="btn-full"
                onClick={kirimBukti}
                disabled={!buktiBase64 || loadingCheckout}
                style={{
                  background: buktiBase64 ? "linear-gradient(135deg, #10B981, #059669)" : "#94A3B8",
                  cursor: buktiBase64 && !loadingCheckout ? "pointer" : "not-allowed",
                }}
              >
                {loadingCheckout ? "Mengirim Bukti…" : (buktiBase64 ? "Kirim Bukti Pembayaran Sekarang" : "Pilih Bukti Transfer Dulu di Atas")}
              </button>
              {order?.kode_tracking && (
                <a
                  href={`/pesanan/${order.kode_tracking}`}
                  className="btn-ghost"
                  style={{ display: "block", textAlign: "center", textDecoration: "none" }}
                >
                  Buka Halaman Status Pesanan
                </a>
              )}
            </>
          )}
          {tahap === "selesai" && (
            <button className="btn-ghost" onClick={() => { setDrawerOpen(false); setTahap("keranjang"); }}>
              Selesai &amp; Tutup
            </button>
          )}
        </div>
      </div>

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
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: "#9333EA" }}>
                        <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="2" /><circle cx="16" cy="8" r="2" /><circle cx="8" cy="16" r="2" /><circle cx="16" cy="16" r="2" />
                      </svg>
                    ),
                    nama: "Blister / Blitser",
                    desc: "1 Lempeng plastik mika kaku bergelembung + aluminium foil belakang (dikeluarkan dengan ditekan). Biasanya berisi 4–10 butir.",
                    contoh: "Contoh: Panadol, Enzyplex, Mylanta tablet",
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: "#9333EA" }}>
                        <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 9h16M4 15h16" />
                      </svg>
                    ),
                    nama: "Strip",
                    desc: "1 Lempeng bungkus foil lentur (dikeluarkan dengan disobek pinggirnya). Biasanya berisi 10 butir tablet.",
                    contoh: "Contoh: Paracetamol generik, Amoxicillin",
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: "#9333EA" }}>
                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
                      </svg>
                    ),
                    nama: "Box / Dus / Kotak",
                    desc: "1 Kotak kardus utuh dari pabrik (berisi 3–10 strip/blister). Cocok untuk stok obat di rumah.",
                    contoh: "Contoh: 1 Box Tolak Angin, 1 Box Vitamin C",
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: "#9333EA" }}>
                        <path d="M9 3h6M10 3v3h4V3M7 7h10a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2Z" /><path d="M12 11v6M9 14h6" />
                      </svg>
                    ),
                    nama: "Botol / Fls (Flask / Sirup)",
                    desc: "1 Botol utuh obat cair sirup anak, tetes mata/telinga, atau larutan antiseptik.",
                    contoh: "Contoh: Sanmol sirup, Betadine, Cendo Eyefresh, Curcuma Plus",
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: "#9333EA" }}>
                        <path d="M5 19 19 5M16 3l5 5-2 2-5-5 2-2ZM3 21l3-1-2-2-1 3Z" />
                      </svg>
                    ),
                    nama: "Tube / Salep",
                    desc: "1 Tube salep, gel, atau krim kulit / obat luka.",
                    contoh: "Contoh: Bioplacenton, Salep 88, Hydrocortisone",
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: "#9333EA" }}>
                        <rect x="5" y="4" width="14" height="16" rx="2" /><path d="M5 8h14M10 12h4" />
                      </svg>
                    ),
                    nama: "Sachet / Bungkus",
                    desc: "1 Bungkus serbuk atau larutan cair siap minum.",
                    contoh: "Contoh: Komix, Tolak Angin cair, Adem Sari, Promag cair",
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: "#9333EA" }}>
                        <rect x="3" y="9" width="18" height="6" rx="3" /><path d="M12 9v6" />
                      </svg>
                    ),
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
