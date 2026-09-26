import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../lib/api";
import { rupiah, hitungHargaJualOtomatis, hitungMarginPersen, getStatusMargin } from "../../utils/format";
import { cetakDokumenA4, exportExcel, exportWord } from "../../utils/exportDokumen";
import KasirShell from "./KasirShell";
import ObatModal from "./komponen/ObatModal";
import SampahModal from "./komponen/SampahModal";
import RiwayatPengadaanModal from "./komponen/RiwayatPengadaanModal";
import TombolExportGroup from "./komponen/TombolExportGroup";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const exp = new Date(dateStr); exp.setHours(0,0,0,0);
  return Math.ceil((exp - now) / 86400000);
}

/**
 * Badge naik/turun harga beli — dibandingkan dari harga sebelumnya yang
 * tersimpan di obat_satuan. Kolom ini diperbarui dari 2 sumber: Penerimaan
 * Barang MAUPUN edit manual di Data Obat — jadi badge ini selalu ikut
 * bereaksi ke perubahan harga dari mana pun asalnya.
 */
function badgeHargaBeli(satuan) {
  if (!satuan || satuan.harga_beli_sebelumnya == null) return null;

  var selisih = Number(satuan.harga_beli) - Number(satuan.harga_beli_sebelumnya);
  var persen = satuan.harga_beli_sebelumnya > 0
    ? Math.round((selisih / satuan.harga_beli_sebelumnya) * 100)
    : 0;

  if (selisih === 0) return { warna: "hijau", teks: "✓ Tetap" };
  if (selisih > 0) return { warna: "merah", teks: `▲ +${persen}%` };
  return { warna: "biru", teks: `▼ ${persen}%` };
}

const CACHE_KEY = "bimafarma_obat_cache";

function getCachedObat() {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function DataObat() {
  const { user } = useAuth();
  const [daftar, setDaftar] = useState(getCachedObat);
  const [loading, setLoading] = useState(() => getCachedObat().length === 0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [obatEdit, setObatEdit] = useState(null);
  const [sampahOpen, setSampahOpen] = useState(false);
  const [riwayatObat, setRiwayatObat] = useState(null);
  const [filterMarginTipis, setFilterMarginTipis] = useState(false);
  const [sedangPerbaiki, setSedangPerbaiki] = useState(false);

  // Deteksi obat dengan margin bermasalah (< 25%) ATAU harga jual belum genap kelipatan 500
  const obatBermasalahMargin = daftar.filter((o) => {
    return o.satuan?.some((s) => {
      const m = hitungMarginPersen(s.harga_beli, s.harga_jual);
      const j = Number(s.harga_jual || 0);
      const tidakBulat = j > 0 && j % 500 !== 0;
      return (m !== null && m < 25) || tidakBulat;
    });
  });
  const jumlahRugi = obatBermasalahMargin.filter((o) => {
    const def = o.satuan?.find((s) => s.is_default) || o.satuan?.[0];
    return (hitungMarginPersen(def?.harga_beli, def?.harga_jual) || 0) < 20;
  }).length;
  const jumlahTipis = obatBermasalahMargin.length - jumlahRugi;

  const daftarTampil = filterMarginTipis ? obatBermasalahMargin : daftar;

  const totalNilaiKeseluruhan = daftar.reduce((acc, o) => {
    const def = o.satuan?.find((s) => s.is_default) || o.satuan?.[0];
    return acc + (Number(o.stok || 0) * Number(def?.harga_beli || 0));
  }, 0);

  const totalNilaiJualKeseluruhan = daftar.reduce((acc, o) => {
    const def = o.satuan?.find((s) => s.is_default) || o.satuan?.[0];
    return acc + (Number(o.stok || 0) * Number(def?.harga_jual || 0));
  }, 0);

  const totalFisikKeseluruhan = daftar.reduce((acc, o) => acc + Number(o.stok || 0), 0);

  const totalPotensiLaba = Math.max(0, totalNilaiJualKeseluruhan - totalNilaiKeseluruhan);

  // Rumus Klien: (Total Jual - Total Beli) / Total Beli * 100% = Pendapatan / Total Beli * 100% (~33.3%)
  const persenMarginKeseluruhan = totalNilaiKeseluruhan > 0
    ? ((totalPotensiLaba / totalNilaiKeseluruhan) * 100)
    : 0;

  const rataRataNilaiPerObat = daftar.length > 0 ? Math.round(totalNilaiKeseluruhan / daftar.length) : 0;

  function formatPersen(nilai, total) {
    if (!total || total <= 0 || !nilai || Number(nilai) <= 0) return "0%";
    const p = (Number(nilai) / Number(total)) * 100;
    if (p > 0 && p < 0.01) return "< 0.01%";
    if (p < 1) return `${p.toFixed(2)}%`;
    return `${p.toFixed(1)}%`;
  }

  function muatUlang() {
    setLoading(true);
    setErrorMsg(null);
    api(`/obat${search ? `?search=${encodeURIComponent(search)}` : ""}`)
      .then((data) => {
        if (Array.isArray(data)) {
          setDaftar(data);
          setErrorMsg(null);
          if (!search) {
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
              localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            } catch {
              // ignore
            }
          }
        }
      })
      .catch((err) => {
        console.error("Gagal memuat katalog obat:", err);
        setErrorMsg(err.message || "Gagal menghubungi server database.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(muatUlang, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  function bukaTambah() { setObatEdit(null); setModalOpen(true); }
  function bukaEdit(obat) { setObatEdit(obat); setModalOpen(true); }

  async function toggleField(obat, field) {
    await api(`/obat/${obat.id}`, {
      method: "PUT",
      body: JSON.stringify({ [field]: !obat[field] }),
    });
    muatUlang();
  }

  async function hapusObat(obat) {
    if (!confirm(`Hapus "${obat.nama}"?`)) return;
    await api(`/obat/${obat.id}`, { method: "DELETE" });
    muatUlang();
  }

  async function handlePerbaikiSemuaMargin() {
    if (obatBermasalahMargin.length === 0) return;
    if (
      !window.confirm(
        `Sesuaikan ${obatBermasalahMargin.length} obat yang harganya belum genap / margin tipis?\n\n` +
        `• Harga jual otomatis dihitung dengan Margin 25% (Harga Beli / 0.75)\n` +
        `• Dibulatkan ke atas ke kelipatan Rp 500 / Rp 1.000 (tidak ada angka ganjil)\n` +
        `• Desimal pada harga beli juga akan dibersihkan ke rupiah utuh.`
      )
    ) {
      return;
    }

    setSedangPerbaiki(true);
    try {
      try {
        await api("/obat/perbaiki-margin-semua", {
          method: "POST",
          body: JSON.stringify({ hanya_bermasalah: true }),
        });
      } catch (e) {
        // Fallback langsung lewat PUT per obat secara paralel (chunk 5)
        const chunkSize = 5;
        for (let i = 0; i < obatBermasalahMargin.length; i += chunkSize) {
          const chunk = obatBermasalahMargin.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(async (o) => {
              if (!o.satuan || o.satuan.length === 0) return;
              const satuanBaru = o.satuan.map((s) => {
                const beliBulat = Math.round(Number(s.harga_beli || 0));
                const autoJual = hitungHargaJualOtomatis(beliBulat, 25);
                return {
                  id: s.id,
                  nama_satuan: s.nama_satuan,
                  faktor: s.faktor || 1,
                  harga_beli: beliBulat,
                  harga_jual: autoJual,
                };
              });
              return api(`/obat/${o.id}`, {
                method: "PUT",
                body: JSON.stringify({ nama: o.nama, satuan: satuanBaru }),
              });
            })
          );
        }
      }
      alert(`Sukses! ${obatBermasalahMargin.length} obat telah diperbarui menjadi margin 25% dan kelipatan 500/1.000.`);
      muatUlang();
    } catch (err) {
      alert("Gagal memperbaiki margin: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setSedangPerbaiki(false);
    }
  }

  async function handlePerbaikiSatuObat(obat) {
    const def = obat.satuan?.find((s) => s.is_default) || obat.satuan?.[0];
    const beliBulat = Math.round(Number(def?.harga_beli || 0));
    const autoJual = hitungHargaJualOtomatis(beliBulat, 25);

    if (
      !window.confirm(
        `Perbarui harga obat "${obat.nama}"?\n` +
        `• Harga Beli: ${rupiah(beliBulat)}\n` +
        `• Harga Jual Baru: ${rupiah(autoJual)} (Margin 25% & Kelipatan Rp 500)`
      )
    ) {
      return;
    }

    try {
      const satuanBaru = obat.satuan.map((s) => {
        const b = Math.round(Number(s.harga_beli || 0));
        return {
          id: s.id,
          nama_satuan: s.nama_satuan,
          faktor: s.faktor || 1,
          harga_beli: b,
          harga_jual: hitungHargaJualOtomatis(b, 25),
        };
      });

      await api(`/obat/${obat.id}`, {
        method: "PUT",
        body: JSON.stringify({ nama: obat.nama, satuan: satuanBaru }),
      });
      muatUlang();
    } catch (err) {
      alert("Gagal memperbarui harga: " + (err.message || "Terjadi kesalahan"));
    }
  }

  function siapkanDataExport() {
    const headers = [
      { label: "No.", align: "center", width: "35px" },
      { label: "Nama Obat", align: "left" },
      { label: "Kemasan", align: "left" },
      { label: "Satuan", align: "left" },
      { label: "No. Batch", align: "center" },
      { label: "Harga Beli", align: "right" },
      { label: "Harga Jual", align: "right" },
      { label: "Margin", align: "center" },
      { label: "Stok", align: "right" },
      { label: "Total Nilai", align: "right" },
      { label: "Expired", align: "center" },
    ];

    const totalAsetStok = daftarTampil.reduce((acc, o) => {
      const def = o.satuan?.find((s) => s.is_default) || o.satuan?.[0];
      return acc + (Number(o.stok || 0) * Number(def?.harga_beli || 0));
    }, 0);

    const totalFisikStok = daftarTampil.reduce((acc, o) => acc + Number(o.stok || 0), 0);

    const rows = daftarTampil.map((obat, idx) => {
      const def = obat.satuan?.find((s) => s.is_default) || obat.satuan?.[0];
      const satuanNames = obat.satuan?.map((s) => s.nama_satuan).join(" / ") || obat.satuan_dasar || "-";
      const hargaBeli = obat.satuan?.length > 1
        ? obat.satuan.map((s) => rupiah(s.harga_beli)).join(" / ")
        : rupiah(def?.harga_beli);
      const hargaJual = obat.satuan?.length > 1
        ? obat.satuan.map((s) => rupiah(s.harga_jual)).join(" / ")
        : rupiah(def?.harga_jual);
      const mNum = hitungMarginPersen(def?.harga_beli, def?.harga_jual);
      const mStat = getStatusMargin(mNum);
      const expStr = obat.tanggal_exp
        ? new Date(obat.tanggal_exp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
        : "-";

      const stokNum = Number(obat.stok || 0);
      const beliNum = Number(def?.harga_beli || 0);
      const nilaiUang = stokNum * beliNum;

      return [
        idx + 1,
        obat.nama,
        obat.kemasan || "-",
        satuanNames,
        obat.nomor_batch || "-",
        hargaBeli,
        hargaJual,
        mStat.label,
        `${stokNum} ${obat.satuan_dasar || ""}`,
        rupiah(nilaiUang),
        expStr,
      ];
    });

    const footers = [
      [
        {
          label: `Total Data: ${rows.length} Obat · Total Fisik: ${totalFisikStok.toLocaleString("id-ID")} Unit · Total Besar Uang: ${rupiah(totalAsetStok)}`,
          colspan: 11,
          align: "right",
        },
      ],
    ];

    const keterangan = filterMarginTipis
      ? "Obat Margin < 20%"
      : search
      ? `Pencarian: "${search}"`
      : "";

    return { headers, rows, footers, keterangan };
  }

  function handleCetakDataObat() {
    const { headers, rows, footers, keterangan } = siapkanDataExport();
    cetakDokumenA4({
      judul: "LAPORAN DATA OBAT",
      periode: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      keterangan,
      headers,
      rows,
      footers,
      orientation: "landscape",
      namaUser: user?.nama || "Petugas",
    });
  }

  function handleExcelDataObat() {
    const { headers, rows, footers, keterangan } = siapkanDataExport();
    exportExcel({
      filename: "data-obat-apotek-bima-farma",
      judul: "LAPORAN DATA OBAT",
      periode: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      keterangan,
      headers,
      rows,
      footers,
    });
  }

  function handleWordDataObat() {
    const { headers, rows, footers, keterangan } = siapkanDataExport();
    exportWord({
      filename: "data-obat-apotek-bima-farma",
      judul: "LAPORAN DATA OBAT",
      periode: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      keterangan,
      headers,
      rows,
      footers,
      orientation: "landscape",
      namaUser: user?.nama || "Petugas",
    });
  }

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Data Obat</h1>
          <p className="halaman-sub">
            {filterMarginTipis
              ? `Menampilkan ${daftarTampil.length} obat dengan margin bermasalah (< 20%)`
              : loading && daftar.length === 0
              ? "Menghubungkan ke database apotek…"
              : `${daftar.length} obat terdaftar ${loading ? "· (Menyinkronkan…)" : ""}`}
          </p>
        </div>
        <div className="halaman-header-aksi" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {errorMsg && (
            <button
              type="button"
              onClick={muatUlang}
              style={{
                background: "#DC2626",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              🔄 Muat Ulang
            </button>
          )}
          <TombolExportGroup
            onCetakPdf={handleCetakDataObat}
            onExportExcel={handleExcelDataObat}
            onExportWord={handleWordDataObat}
            disabled={daftarTampil.length === 0}
          />
          <button className="btn-sampah" onClick={() => setSampahOpen(true)}>🗑 Sampah</button>
          <button className="btn-tambah" onClick={bukaTambah}>+ Tambah Obat</button>
        </div>
      </div>

      {/* Banner Notifikasi Error / Timeout */}
      {errorMsg && (
        <div style={{
          background: "#FEF2F2",
          border: "1px solid #FCA5A5",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          color: "#991B1B"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <strong>Kendala Koneksi Server:</strong> {errorMsg}
              {daftar.length > 0 ? (
                <div style={{ fontSize: 12, marginTop: 2, color: "#7F1D1D" }}>
                  Sistem menampilkan cadangan terakhir ({daftar.length} obat). Klik tombol muat ulang untuk mencoba menyinkronkan kembali.
                </div>
              ) : (
                <div style={{ fontSize: 12, marginTop: 2, color: "#7F1D1D" }}>
                  Server sedang merespons lambat saat mengambil 1.500+ katalog obat. Silakan coba klik Muat Ulang.
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={muatUlang}
            style={{
              background: "#DC2626",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            🔄 Coba Lagi
          </button>
        </div>
      )}

      {/* Kartu Ringkasan Stok & Total Nilai Uang (Aset) - Khusus Admin (tidak tampil untuk Kasir) */}
      {user?.role === "admin" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}>
          <div style={{
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}>
            <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Total Obat Terdaftar</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
              {daftar.length} <small style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-soft)" }}>jenis</small>
            </span>
          </div>

          <div style={{
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}>
            <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Total Fisik Stok</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
              {totalFisikKeseluruhan.toLocaleString("id-ID")} <small style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-soft)" }}>unit</small>
            </span>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)",
            border: "1px solid #E9D5FF",
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            boxShadow: "0 1px 3px rgba(124, 58, 237, 0.06)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--magenta-dark)", fontWeight: 700 }}>
                Total Besar Uang (Modal Stok)
              </span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: "var(--magenta-dark)" }}>
              {rupiah(totalNilaiKeseluruhan)}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
              Potensi Nilai Jual: <strong style={{ color: "var(--ink)" }}>{rupiah(totalNilaiJualKeseluruhan)}</strong>
            </span>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
            border: "1px solid #BBF7D0",
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            boxShadow: "0 1px 3px rgba(22, 163, 74, 0.06)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>
                Persentase Margin
              </span>
              <span style={{
                background: "#16A34A",
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: 12
              }}>
                Margin Stok
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#15803D" }}>
                +{persenMarginKeseluruhan.toFixed(1)}%
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#166534" }}>
              Potensi Pendapatan: <strong>+{rupiah(totalPotensiLaba)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Banner Alert Margin Tipis / Rugi */}
      {obatBermasalahMargin.length > 0 && (
        <div className="margin-alert-box">
          <div className="alert-text">
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <strong>Peringatan Margin:</strong> Ditemukan <strong>{obatBermasalahMargin.length} obat</strong> dengan margin di bawah batas aman (25%).
              {jumlahRugi > 0 ? (
                <span style={{ color: "#DC2626", fontWeight: 800 }}> {jumlahRugi} obat margin rendah (&lt; 20%)!</span>
              ) : null}
              {jumlahTipis > 0 ? (
                <span> {jumlahTipis} obat margin tipis (20% – 25%).</span>
              ) : null}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="alert-btn"
              onClick={() => setFilterMarginTipis(!filterMarginTipis)}
            >
              {filterMarginTipis ? "✕ Tampilkan Semua Obat" : `🔍 Lihat ${obatBermasalahMargin.length} Obat Bermasalah`}
            </button>
            <button
              type="button"
              className="alert-btn"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
                borderColor: "#6D28D9",
                color: "#fff",
                fontWeight: 700
              }}
              disabled={sedangPerbaiki}
              onClick={handlePerbaikiSemuaMargin}
            >
              {sedangPerbaiki ? "Memproses…" : `⚡ Perbaiki Semua Margin 25% & Bulat 500 (${obatBermasalahMargin.length} Obat)`}
            </button>
          </div>
        </div>
      )}

      {/* ---------- TAMPILAN KHUSUS MOBILE (SESUAI PREVIEW LAYAR 5) ---------- */}
      <div className="mobile-only" style={{ marginBottom: 20 }}>
        <div className="search-mobile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
          </svg>
          <input
            type="text"
            placeholder="Cari obat…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading && daftar.length === 0 ? (
          <div className="panel-kosong" style={{ padding: 24, borderRadius: 14 }}>
            <div style={{ fontWeight: 700, color: "var(--magenta-dark)" }}>Sedang memuat katalog obat dari server…</div>
          </div>
        ) : daftarTampil.length === 0 ? (
          <div className="panel-kosong" style={{ padding: 20, borderRadius: 14 }}>Tidak ada obat yang cocok.</div>
        ) : (
          daftarTampil.map((obat) => {
            const def = obat.satuan?.find((s) => s.is_default) || obat.satuan?.[0];
            const stokMenipis = obat.stok <= (obat.stok_minimum || 0);
            const mNum = hitungMarginPersen(def?.harga_beli, def?.harga_jual);
            const mStat = getStatusMargin(mNum);
            const stokNum = Number(obat.stok || 0);
            const beliNum = Number(def?.harga_beli || 0);
            const nilaiUang = stokNum * beliNum;
            const persenStr = formatPersen(nilaiUang, totalNilaiKeseluruhan);

            return (
              <div
                className="list-card"
                key={obat.id}
                onClick={() => bukaEdit(obat)}
              >
                <div className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="9" width="18" height="6" rx="3" /><path d="M8 9v6M16 9v6" />
                  </svg>
                </div>
                <div className="body">
                  <div className="t1">{obat.nama}</div>
                  <div className="t2" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span>{rupiah(def?.harga_jual || 0)} {def ? `/${def.nama_satuan}` : ""} {obat.nomor_batch ? `· Batch ${obat.nomor_batch}` : ""}</span>
                    {mStat.status !== "kosong" && (
                      <span className={`margin-badge ${mStat.warna}`} style={{ fontSize: 9.5, padding: "1px 5px" }}>
                        {mStat.label}
                      </span>
                    )}
                    {(mStat.status === "rugi" || mStat.status === "tipis") && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePerbaikiSatuObat(obat);
                        }}
                        style={{
                          background: "#F5F3FF",
                          border: "1px solid #7C3AED",
                          color: "#6D28D9",
                          borderRadius: 4,
                          padding: "1px 6px",
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        ⚡ Jadi 25%
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--magenta-dark)", fontWeight: 700, marginTop: 3 }}>
                    Nilai Stok: {rupiah(nilaiUang)} ({persenStr} dari total)
                  </div>
                </div>
                <span className={`badge-mini ${stokMenipis ? "low" : "ok"}`}>
                  {obat.stok} {obat.satuan_dasar}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ---------- TAMPILAN KHUSUS DESKTOP (SEARCH & TABEL LENGKAP) ---------- */}
      <div className="search-obat-input desktop-only" style={{ maxWidth: 340, marginBottom: 20 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input type="text" placeholder="Cari nama obat…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="obat-table-wrap desktop-only">
        <table className="obat-table" style={{ minWidth: 1140 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 170 }}>Nama Obat</th>
              <th style={{ width: 80, minWidth: 80 }}>Kemasan</th>
              <th style={{ width: 80, minWidth: 80 }}>Satuan</th>
              <th style={{ width: 90, minWidth: 90 }}>Batch</th>
              <th style={{ minWidth: 110 }}>Harga Beli</th>
              <th style={{ minWidth: 100 }}>Harga Jual</th>
              <th style={{ width: 90, minWidth: 90 }}>Margin %</th>
              <th style={{ width: 85, minWidth: 85 }}>Stok</th>
              <th style={{ minWidth: 125, textAlign: "right" }}>Total Nilai</th>
              <th style={{ width: 110, minWidth: 110 }}>Kadaluwarsa</th>
              <th style={{ width: 130, minWidth: 130, textAlign: "center" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && daftar.length === 0 && (
              <tr>
                <td colSpan={11} className="obat-table-info" style={{ padding: "36px 16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 700, color: "var(--magenta-dark)", fontSize: 14 }}>
                      Sedang menyinkronkan data katalog obat dari server apotek…
                    </div>
                    <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Memuat seluruh data 1.500+ obat dan harga satuan...</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && daftarTampil.length === 0 && (
              <tr><td colSpan={11} className="obat-table-info">Tidak ada obat yang cocok.</td></tr>
            )}
            {daftarTampil.map((obat) => {
              const def = obat.satuan?.find(s => s.is_default) || obat.satuan?.[0];
              const hari = daysUntil(obat.tanggal_exp);
              const satuanNames = obat.satuan?.map(s => s.nama_satuan).join(" / ");
              const hargaBeli = obat.satuan?.length > 1
                ? obat.satuan.map(s => rupiah(s.harga_beli)).join(" / ")
                : rupiah(def?.harga_beli);
              const hargaJual = obat.satuan?.length > 1
                ? obat.satuan.map(s => rupiah(s.harga_jual)).join(" / ")
                : rupiah(def?.harga_jual);
              const mNum = hitungMarginPersen(def?.harga_beli, def?.harga_jual);
              const mStat = getStatusMargin(mNum);
              const stokNum = Number(obat.stok || 0);
              const beliNum = Number(def?.harga_beli || 0);
              const nilaiUang = stokNum * beliNum;
              const persenStr = formatPersen(nilaiUang, totalNilaiKeseluruhan);

              return (
                <tr key={obat.id} className={!obat.aktif_dijual ? "obat-row-nonaktif" : ""}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {obat.gambar_url || obat.gambar ? (
                        <img
                          src={obat.gambar_url || `/storage/${obat.gambar}`}
                          alt=""
                          style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : null}
                      <span className="obat-nama-cell">{obat.nama}</span>
                    </div>
                  </td>
                  <td>{obat.kemasan || "-"}</td>
                  <td>{satuanNames}</td>
                  <td className="obat-batch-cell">{obat.nomor_batch || "-"}</td>
                  <td className="obat-harga-cell">
                    {hargaBeli}
                    {(() => {
                      const badge = badgeHargaBeli(def);
                      return badge ? <div className={`harga-badge ${badge.warna}`}>{badge.teks}</div> : null;
                    })()}
                  </td>
                  <td className="obat-harga-cell">{hargaJual}</td>
                  <td className="obat-margin-cell">
                    {mStat.status !== "kosong" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                        <span className={`margin-badge ${mStat.warna}`}>
                          {mStat.label}
                        </span>
                        {(mStat.status === "rugi" || mStat.status === "tipis") && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePerbaikiSatuObat(obat);
                            }}
                            style={{
                              background: "#F5F3FF",
                              border: "1px solid #7C3AED",
                              color: "#6D28D9",
                              borderRadius: 5,
                              padding: "2px 7px",
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: "pointer",
                              whiteSpace: "nowrap"
                            }}
                            title="Otomatis hitung margin 25% dan dibulatkan ke kelipatan 500"
                          >
                            ⚡ Jadi 25%
                          </button>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <span>{obat.stok} {obat.satuan_dasar}</span>
                    {obat.stok < obat.stok_minimum && <div className="obat-stok-menipis">MENIPIS</div>}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 13 }}>
                      {rupiah(nilaiUang)}
                    </div>
                  </td>
                  <td>
                    {obat.tanggal_exp ? (
                      <div>
                        <span>{new Date(obat.tanggal_exp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        {hari !== null && hari <= 90 && (
                          <span className={`exp-badge ${hari <= 30 ? "merah" : "kuning"}`}>
                            {hari <= 0 ? "EXPIRED" : `${hari}H`}
                          </span>
                        )}
                      </div>
                    ) : "-"}
                  </td>
                  {/* Kolom Aktif & Resep sengaja disembunyikan dari tampilan tabel
                      (permintaan user). Toggle-nya masih ada & berfungsi di
                      modal Edit Obat, dan field aktif_dijual/perlu_resep masih
                      dipakai penuh di backend (filter Kasir & Toko). Kalau
                      nanti mau dimunculkan lagi di tabel, tinggal un-comment
                      2 <td> di bawah ini + 2 <th> di header. */}
                  {/*
                  <td>
                    <button
                      className={`toggle-pill ${obat.aktif_dijual ? "on" : ""}`}
                      onClick={() => toggleField(obat, "aktif_dijual")}
                      aria-label={obat.aktif_dijual ? "Nonaktifkan" : "Aktifkan"}
                    >
                      <span className="toggle-knob" />
                    </button>
                  </td>
                  <td>
                    <button
                      className={`toggle-pill ${obat.perlu_resep ? "on" : ""}`}
                      onClick={() => toggleField(obat, "perlu_resep")}
                      aria-label={obat.perlu_resep ? "Hapus resep" : "Wajib resep"}
                    >
                      <span className="toggle-knob" />
                    </button>
                  </td>
                  */}
                  <td style={{ width: 130, minWidth: 130, textAlign: "center", whiteSpace: "nowrap" }}>
                    <div className="obat-aksi-icons" style={{ justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={() => setRiwayatObat(obat)}
                        title="Lihat Asal-Usul & Riwayat Faktur Masuk"
                        style={{
                          background: "#FAF5FF",
                          border: "1px solid var(--magenta)",
                          borderRadius: 8,
                          padding: 0,
                          width: 32,
                          height: 32,
                          color: "var(--magenta-dark)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 14, height: 14 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </button>
                      <button onClick={() => bukaEdit(obat)} title="Edit" style={{ flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M17 3l4 4L7 21H3v-4L17 3z" />
                        </svg>
                      </button>
                      <button className="hapus" onClick={() => hapusObat(obat)} title="Hapus" style={{ flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ObatModal
          key={obatEdit ? `obat-${obatEdit.id}-${obatEdit.gambar || ""}` : "tambah"}
          obat={obatEdit}
          onClose={() => setModalOpen(false)}
          onSelesai={() => { setModalOpen(false); muatUlang(); }}
          onDataBerubah={muatUlang}
        />
      )}

      {sampahOpen && (
        <SampahModal
          onClose={() => setSampahOpen(false)}
          onSelesai={muatUlang}
        />
      )}

      {riwayatObat && (
        <RiwayatPengadaanModal
          obat={riwayatObat}
          onClose={() => setRiwayatObat(null)}
        />
      )}
    </KasirShell>
  );
}
