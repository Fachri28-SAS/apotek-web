import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import KasirShell from "./KasirShell";
import StrukModal from "./komponen/StrukModal";

export default function PembayaranOnline() {
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pesanSukses, setPesanSukses] = useState("");
  const [lightbox, setLightbox] = useState(null); // url gambar bukti
  const [struk, setStruk] = useState(null);
  const [prosesId, setProsesId] = useState(null);
  const [tabAktif, setTabAktif] = useState("semua"); // semua | verifikasi | kurang_bayar | belum_bayar
  const [itemExpanded, setItemExpanded] = useState({}); // { [pembayaran_id]: boolean }

  function muat() {
    api("/pembayaran-online")
      .then((d) => {
        setDaftar(d);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    muat();
    // Auto refresh tiap 5 detik tanpa reload halaman
    const timer = setInterval(() => {
      if (!document.hidden) muat();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function konfirmasi(pembayaran) {
    if (!confirm(`Konfirmasi pembayaran Rp ${pembayaran.jumlah.toLocaleString('id-ID')} untuk ${pembayaran.penjualan?.nama_pembeli}? Stok obat akan otomatis dipotong.`)) {
      return;
    }
    setProsesId(pembayaran.id);
    setError("");
    setPesanSukses("");
    try {
      const hasil = await api(`/pembayaran-online/${pembayaran.id}/konfirmasi`, { method: "POST" });
      setStruk(hasil.penjualan);
      setPesanSukses(hasil.message || "Pembayaran berhasil dikonfirmasi.");
      muat();
    } catch (err) {
      setError(err.message);
    } finally {
      setProsesId(null);
    }
  }

  async function tandaiKurangBayar(pembayaran) {
    const defaultNominal = pembayaran.nominal_klaim_customer ? `Klaim Rp ${pembayaran.nominal_klaim_customer.toLocaleString('id-ID')} tapi tagihan Rp ${pembayaran.jumlah.toLocaleString('id-ID')}` : "";
    const catatan = prompt(
      "Masukkan catatan/alasan kurang bayar (akan tampil di halaman tracking pelanggan):",
      defaultNominal ? `Nominal transfer kurang (${defaultNominal}). Silakan transfer kekurangan dan upload ulang bukti.` : "Nominal transfer kurang. Silakan transfer kekurangan dan upload ulang bukti."
    );

    if (catatan === null) return; // Dibatalkan kasir

    setProsesId(pembayaran.id);
    setError("");
    setPesanSukses("");
    try {
      const res = await api(`/pembayaran-online/${pembayaran.id}/kurang-bayar`, {
        method: "POST",
        body: JSON.stringify({ catatan }),
      });
      setPesanSukses(res.message);
      muat();
    } catch (err) {
      setError(err.message);
    } finally {
      setProsesId(null);
    }
  }

  async function tolak(id) {
    const alasan = prompt("Masukkan alasan penolakan pesanan (opsional):", "Bukti transfer tidak valid atau tidak terbaca.");
    if (alasan === null) return;

    setProsesId(id);
    setError("");
    setPesanSukses("");
    try {
      const res = await api(`/pembayaran-online/${id}/tolak`, {
        method: "POST",
        body: JSON.stringify({ catatan: alasan }),
      });
      setPesanSukses(res.message);
      muat();
    } catch (err) {
      setError(err.message);
    } finally {
      setProsesId(null);
    }
  }

  function toggleItems(id) {
    setItemExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Filter daftar pesanan
  const perluVerifikasi = daftar.filter((d) => d.status === "menunggu_verifikasi" || (d.status === "pending" && d.sudah_upload_bukti));
  const kurangBayar = daftar.filter((d) => d.status === "kurang_bayar");
  const belumBayar = daftar.filter((d) => d.status === "pending" && !d.sudah_upload_bukti);

  const daftarTampil = daftar.filter((d) => {
    if (tabAktif === "verifikasi") return d.status === "menunggu_verifikasi" || (d.status === "pending" && d.sudah_upload_bukti);
    if (tabAktif === "kurang_bayar") return d.status === "kurang_bayar";
    if (tabAktif === "belum_bayar") return d.status === "pending" && !d.sudah_upload_bukti;
    return true;
  });

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Verifikasi Pembayaran QRIS Online</h1>
          <p className="halaman-sub">
            Validasi mutasi QRIS dari pesanan Toko Online — auto-update setiap 5 detik
          </p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {pesanSukses && <div className="pesan-sukses">{pesanSukses}</div>}

      {/* Tabs Filter */}
      <div className="kasir-tabs-bar" style={{ marginBottom: 18 }}>
        <button
          className={`kasir-tab ${tabAktif === "semua" ? "active" : ""}`}
          onClick={() => setTabAktif("semua")}
        >
          Semua ({daftar.length})
        </button>
        <button
          className={`kasir-tab ${tabAktif === "verifikasi" ? "active" : ""}`}
          onClick={() => setTabAktif("verifikasi")}
          style={{ position: "relative" }}
        >
          Menunggu Verifikasi ({perluVerifikasi.length})
          {perluVerifikasi.length > 0 && <span className="kasir-tab-dot" style={{ background: "#E53E3E" }} />}
        </button>
        <button
          className={`kasir-tab ${tabAktif === "kurang_bayar" ? "active" : ""}`}
          onClick={() => setTabAktif("kurang_bayar")}
        >
          Kurang Bayar ({kurangBayar.length})
        </button>
        <button
          className={`kasir-tab ${tabAktif === "belum_bayar" ? "active" : ""}`}
          onClick={() => setTabAktif("belum_bayar")}
        >
          Belum Upload Bukti ({belumBayar.length})
        </button>
      </div>

      {/* Panel Daftar Pesanan */}
      <div className="panel">
        <div className="panel-head">
          <h3>
            Daftar Pesanan ({daftarTampil.length})
          </h3>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            Klik foto bukti transfer untuk memperbesar
          </span>
        </div>

        {loading ? (
          <div className="panel-kosong">Memuat data pembayaran...</div>
        ) : daftarTampil.length === 0 ? (
          <div className="panel-kosong">Tidak ada pesanan dalam kategori ini.</div>
        ) : (
          <div className="pembayaran-list">
            {daftarTampil.map((p) => {
              const items = p.penjualan?.items || [];
              const expanded = !!itemExpanded[p.id];

              return (
                <div
                  className="pembayaran-card"
                  key={p.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    padding: 16,
                    borderColor: p.status === "menunggu_verifikasi" ? "var(--magenta)" : p.status === "kurang_bayar" ? "#FCA5A5" : "var(--line)",
                    background: p.status === "menunggu_verifikasi" ? "#FDFAFE" : "var(--surface)",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 16, alignItems: "center", width: "100%" }}>
                    {/* Thumbnail Bukti Transfer */}
                    <div
                      className="pembayaran-bukti-thumb"
                      onClick={() => p.bukti_url && setLightbox(p.bukti_url)}
                      style={{ width: 80, height: 80, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}
                      title={p.bukti_url ? "Klik untuk memperbesar bukti transfer" : "Belum upload bukti"}
                    >
                      {p.bukti_url ? (
                        <img src={p.bukti_url} alt="Bukti transfer" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 28, height: 28, color: "#CCC" }}>
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                        </svg>
                      )}
                    </div>

                    {/* Info Utama Pesanan */}
                    <div className="pembayaran-info">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span className="pembayaran-no-struk">{p.penjualan?.no_struk}</span>
                        {p.penjualan?.kode_tracking && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              background: "var(--magenta-tint)",
                              color: "var(--magenta-dark)",
                              padding: "2px 7px",
                              borderRadius: 6,
                              letterSpacing: "0.04em",
                            }}
                            title="Kode tracking pelanggan"
                          >
                            Track: {p.penjualan.kode_tracking}
                          </span>
                        )}
                        <span className={`status-badge-inline ${p.status}`}>
                          {p.status === "menunggu_verifikasi" && "Menunggu Verifikasi"}
                          {p.status === "pending" && "Menunggu Pembayaran"}
                          {p.status === "kurang_bayar" && "Kurang Bayar"}
                          {p.status === "sukses" && "Lunas"}
                        </span>
                      </div>

                      <div className="pembayaran-nama">
                        {p.penjualan?.nama_pembeli} · {p.penjualan?.telepon_pembeli}
                      </div>

                      {p.penjualan?.alamat_kirim && (
                        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
                          Alamat: {p.penjualan.alamat_kirim}
                        </div>
                      )}

                      <div className="pembayaran-nominal-row" style={{ marginTop: 6 }}>
                        <span>Total Tagihan: <strong>{rupiah(p.jumlah)}</strong></span>
                        {p.nominal_klaim_customer && (
                          <span>
                            Klaim Transfer:{" "}
                            <strong className={Number(p.nominal_klaim_customer) < Number(p.jumlah) ? "kurang-bayar" : ""}>
                              {rupiah(p.nominal_klaim_customer)}
                            </strong>
                          </span>
                        )}
                        <button
                          onClick={() => toggleItems(p.id)}
                          style={{ background: "none", border: "none", color: "var(--magenta-dark)", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 }}
                        >
                          {expanded ? "▲ Sembunyikan Item" : `▼ Lihat ${items.length} Item Obat`}
                        </button>
                      </div>

                      {p.catatan_verifikasi && (
                        <div style={{ fontSize: 12, color: "#DC2626", marginTop: 4, fontWeight: 600 }}>
                          Catatan: {p.catatan_verifikasi}
                        </div>
                      )}
                    </div>

                    {/* Tombol Aksi Kasir */}
                    <div className="pembayaran-aksi">
                      <button
                        className="btn-tambah"
                        onClick={() => konfirmasi(p)}
                        disabled={prosesId === p.id || !p.sudah_upload_bukti}
                        title={!p.sudah_upload_bukti ? "Customer belum upload bukti transfer" : "Konfirmasi dan potong stok"}
                        style={{ fontSize: 12.5, padding: "8px 16px" }}
                      >
                        {prosesId === p.id ? "Memproses..." : "✓ Konfirmasi Lunas"}
                      </button>

                      <button
                        className="btn-kurang-bayar"
                        onClick={() => tandaiKurangBayar(p)}
                        disabled={prosesId === p.id || !p.sudah_upload_bukti}
                      >
                        Tandai Kurang Bayar
                      </button>

                      <button
                        className="btn-tolak"
                        onClick={() => tolak(p.id)}
                        disabled={prosesId === p.id}
                      >
                        Tolak
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Detail Item Obat */}
                  {expanded && items.length > 0 && (
                    <div style={{ background: "var(--bg)", borderRadius: 10, padding: "10px 14px", marginTop: 4, border: "1px solid var(--line)" }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 6 }}>
                        Rincian Item yang Dipesan:
                      </div>
                      <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
                        <tbody>
                          {items.map((it) => (
                            <tr key={it.id} style={{ borderBottom: "1px dashed var(--line)" }}>
                              <td style={{ padding: "4px 0", fontWeight: 700 }}>{it.nama_obat}</td>
                              <td style={{ padding: "4px 8px", color: "var(--ink-soft)" }}>{it.qty} {it.nama_satuan}</td>
                              <td style={{ padding: "4px 8px", color: "var(--ink-soft)" }}>@ {rupiah(it.harga_jual)}</td>
                              <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 700 }}>{rupiah(it.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Bukti Transfer */}
      {lightbox && (
        <div className="struk-overlay" onClick={() => setLightbox(null)}>
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <img
              src={lightbox}
              alt="Bukti transfer penuh"
              style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 12, objectFit: "contain" }}
            />
            <button
              onClick={() => setLightbox(null)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "rgba(0,0,0,0.7)",
                color: "#FFF",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                cursor: "pointer",
                fontSize: 18,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal Struk saat Berhasil Konfirmasi Lunas */}
      <StrukModal data={struk} onClose={() => setStruk(null)} />
    </KasirShell>
  );
}
