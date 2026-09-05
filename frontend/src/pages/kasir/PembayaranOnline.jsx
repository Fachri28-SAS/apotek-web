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
  const [struk, setStruk] = useState(null);
  const [prosesId, setProsesId] = useState(null);
  const [tabAktif, setTabAktif] = useState("perlu_disiapkan"); // perlu_disiapkan | selesai | semua
  const [itemExpanded, setItemExpanded] = useState({}); // { [pembayaran_id]: boolean }

  function muat() {
    api(`/pembayaran-online?tab=${tabAktif}`)
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
  }, [tabAktif]);

  async function tandaiSelesai(pembayaran) {
    const nama = pembayaran.penjualan?.nama_pembeli || "Pelanggan";
    if (!confirm(`Tandai pesanan untuk ${nama} sudah selesai disiapkan / sudah diserahkan?`)) {
      return;
    }

    setProsesId(pembayaran.id);
    setError("");
    setPesanSukses("");

    try {
      const res = await api(`/pembayaran-online/${pembayaran.id}/tandai-selesai`, { method: "POST" });
      setPesanSukses(res.message || "Pesanan berhasil diselesaikan.");
      muat();
    } catch (err) {
      setError(err.message);
    } finally {
      setProsesId(null);
    }
  }

  function formatNoWa(nohp) {
    if (!nohp) return "";
    let clean = nohp.replace(/\D/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    return clean;
  }

  function handleChatWa(p) {
    const wa = formatNoWa(p.penjualan?.telepon_pembeli);
    if (!wa) {
      alert("Nomor telepon tidak valid.");
      return;
    }
    const nama = p.penjualan?.nama_pembeli || "Kak";
    const strukNo = p.penjualan?.no_struk || "";
    const pesan = encodeURIComponent(
      `Halo ${nama}, kami dari Apotek Bima Farma menginformasikan bahwa pesanan obat Anda (${strukNo}) telah kami siapkan dan siap diambil / dikirim. Terima kasih!`
    );
    window.open(`https://wa.me/${wa}?text=${pesan}`, "_blank");
  }

  function toggleItems(id) {
    setItemExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24, display: "flex", alignItems: "center", gap: 8 }}>
            <span>📦</span> Pesanan Toko Online
          </h1>
          <p className="halaman-sub">
            Daftar pesanan obat dari web yang <strong>sudah lunas via Duitku</strong> &amp; siap disiapkan oleh apoteker/kasir.
          </p>
        </div>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 14 }}>{error}</div>}
      {pesanSukses && <div className="pesan-sukses" style={{ marginBottom: 14 }}>{pesanSukses}</div>}

      {/* Tabs Filter */}
      <div className="kasir-tabs-bar" style={{ marginBottom: 18 }}>
        <button
          className={`kasir-tab ${tabAktif === "perlu_disiapkan" ? "active" : ""}`}
          onClick={() => setTabAktif("perlu_disiapkan")}
          style={{ position: "relative" }}
        >
          🟡 Perlu Disiapkan
        </button>
        <button
          className={`kasir-tab ${tabAktif === "selesai" ? "active" : ""}`}
          onClick={() => setTabAktif("selesai")}
        >
          🟢 Riwayat Selesai
        </button>
        <button
          className={`kasir-tab ${tabAktif === "semua" ? "active" : ""}`}
          onClick={() => setTabAktif("semua")}
        >
          Semua Pesanan Lunas
        </button>
      </div>

      {/* Panel Daftar Pesanan */}
      <div className="panel">
        <div className="panel-head">
          <h3>
            {tabAktif === "perlu_disiapkan" && "Pesanan yang Harus Disiapkan"}
            {tabAktif === "selesai" && "Pesanan Selesai / Sudah Diambil"}
            {tabAktif === "semua" && "Semua Pesanan Online Lunas"}
            {" "}({daftar.length})
          </h3>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            Otomatis terupdate realtime setiap 5 detik
          </span>
        </div>

        {loading ? (
          <div className="panel-kosong">Memuat daftar pesanan online...</div>
        ) : daftar.length === 0 ? (
          <div className="panel-kosong" style={{ padding: "40px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>
              {tabAktif === "perlu_disiapkan" ? "🎉" : "📋"}
            </div>
            <strong>
              {tabAktif === "perlu_disiapkan"
                ? "Semua pesanan lunas sudah selesai disiapkan!"
                : "Belum ada riwayat pesanan dalam kategori ini."}
            </strong>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "4px 0 0" }}>
              Pesanan baru dari web akan otomatis muncul di sini begitu pembeli selesai bayar via Duitku.
            </p>
          </div>
        ) : (
          <div className="pembayaran-list">
            {daftar.map((p) => {
              const items = p.penjualan?.items || [];
              const expanded = itemExpanded[p.id] !== false; // Default expanded agar kasir langsung tahu obat apa yang harus diambil
              const isSelesai = p.status_penjualan === "selesai";

              return (
                <div
                  className="pembayaran-card"
                  key={p.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    padding: 18,
                    borderRadius: 14,
                    borderColor: isSelesai ? "var(--line)" : "#C084FC",
                    background: isSelesai ? "var(--surface)" : "#FAF5FF",
                    boxShadow: isSelesai ? "none" : "0 4px 14px rgba(168, 85, 247, 0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    {/* Info Kiri */}
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <strong style={{ fontSize: 15, color: "var(--ink)" }}>{p.penjualan?.no_struk}</strong>
                        {p.penjualan?.kode_tracking && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              background: "var(--magenta-tint)",
                              color: "var(--magenta-dark)",
                              padding: "2px 8px",
                              borderRadius: 6,
                              letterSpacing: "0.04em",
                            }}
                          >
                            Track: {p.penjualan.kode_tracking}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            padding: "3px 10px",
                            borderRadius: 100,
                            background: "var(--green-tint)",
                            color: "var(--green-dark)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          ⚡ Lunas Otomatis (Duitku)
                        </span>
                        {isSelesai ? (
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", background: "var(--bg)", padding: "3px 8px", borderRadius: 6 }}>
                            ✓ Sudah Diambil / Selesai
                          </span>
                        ) : (
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: "#9333EA", background: "#F3E8FF", padding: "3px 8px", borderRadius: 6 }}>
                            🟡 Perlu Disiapkan
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
                        Pembeli: {p.penjualan?.nama_pembeli || "Pelanggan"} ·{" "}
                        <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>{p.penjualan?.telepon_pembeli || "-"}</span>
                      </div>

                      {p.penjualan?.alamat_kirim && (
                        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
                          📍 Alamat Antar: <strong>{p.penjualan.alamat_kirim}</strong>
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
                        Waktu Pesan: {new Date(p.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>

                    {/* Tombol Aksi Kanan */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {/* Cetak Struk */}
                      <button
                        type="button"
                        onClick={() => setStruk(p.penjualan)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 14px",
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontWeight: 700,
                          background: "#fff",
                          border: "1.5px solid var(--magenta)",
                          color: "var(--magenta)",
                          cursor: "pointer",
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                          <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                          <path d="M6 14h12v8H6z" />
                        </svg>
                        Cetak Struk
                      </button>

                      {/* Chat WA */}
                      {p.penjualan?.telepon_pembeli && (
                        <button
                          type="button"
                          onClick={() => handleChatWa(p)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 14px",
                            borderRadius: 8,
                            fontSize: 12.5,
                            fontWeight: 700,
                            background: "#25D366",
                            border: "none",
                            color: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          💬 WhatsApp
                        </button>
                      )}

                      {/* Tandai Selesai */}
                      {!isSelesai && (
                        <button
                          type="button"
                          className="btn-tambah"
                          onClick={() => tandaiSelesai(p)}
                          disabled={prosesId === p.id}
                          style={{
                            padding: "8px 16px",
                            fontSize: 12.5,
                            fontWeight: 800,
                            background: "linear-gradient(135deg, #10B981, #059669)",
                          }}
                        >
                          {prosesId === p.id ? "Memproses..." : "✓ Tandai Obat Siap"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rincian Obat yang Dipesan */}
                  <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", marginTop: 4, border: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--magenta-dark)", textTransform: "uppercase" }}>
                        Daftar Obat yang Harus Diambil dari Rak ({items.length} Macam):
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleItems(p.id)}
                        style={{ background: "none", border: "none", color: "var(--ink-soft)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                      >
                        {expanded ? "▲ Tutup Rincian" : "▼ Buka Rincian"}
                      </button>
                    </div>

                    {expanded && (
                      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                        <tbody>
                          {items.map((it) => (
                            <tr key={it.id} style={{ borderBottom: "1px dashed var(--line)" }}>
                              <td style={{ padding: "6px 0", fontWeight: 700, color: "var(--ink)" }}>
                                {it.nama_obat}
                              </td>
                              <td style={{ padding: "6px 12px", color: "var(--magenta-dark)", fontWeight: 800 }}>
                                {it.qty} {it.nama_satuan}
                              </td>
                              <td style={{ padding: "6px 8px", color: "var(--ink-soft)", fontSize: 12 }}>
                                @ {rupiah(it.harga_jual)}
                              </td>
                              <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 700 }}>
                                {rupiah(it.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--line)" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>Total Tagihan (Lunas):</span>
                      <strong style={{ fontSize: 15, color: "var(--green-dark)" }}>{rupiah(p.penjualan?.total || p.jumlah)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Cetak Struk */}
      <StrukModal data={struk} onClose={() => setStruk(null)} />
    </KasirShell>
  );
}
