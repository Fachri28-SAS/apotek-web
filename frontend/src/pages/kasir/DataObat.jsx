import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../lib/api";
import { rupiah, hitungHargaJualOtomatis, hitungMarginPersen, getStatusMargin } from "../../utils/format";
import { cetakDokumenA4, exportExcel, exportWord } from "../../utils/exportDokumen";
import { tambahLogPerubahan } from "../../lib/auditLog";
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
  const isAdmin = user?.role === "admin";

  const [daftar, setDaftar] = useState(getCachedObat);
  const [loading, setLoading] = useState(() => getCachedObat().length === 0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [notifSukses, setNotifSukses] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [obatEdit, setObatEdit] = useState(null);
  const [sampahOpen, setSampahOpen] = useState(false);
  const [riwayatObat, setRiwayatObat] = useState(null);
  const [filterMarginTipis, setFilterMarginTipis] = useState(false);
  const [sedangPerbaiki, setSedangPerbaiki] = useState(false);

  // Kontrol Sembunyikan: ON (Hilang) / OFF (Tampil) untuk Kasir & Admin
  const [sembunyikan, setSembunyikan] = useState(() => {
    const saved = localStorage.getItem("bima_mode_sembunyikan");
    if (saved !== null) return saved === "true";
    return false; // Default: OFF (tidak disembunyikan / kolom tampil)
  });

  function toggleSembunyikan() {
    setSembunyikan((prev) => {
      const baru = !prev;
      localStorage.setItem("bima_mode_sembunyikan", baru ? "true" : "false");
      return baru;
    });
  }

  // Shortcut rahasia: Tekan tombol 'h' atau 'm' di keyboard untuk sembunyikan/tampilkan kolom secara senyap
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable ||
        modalOpen ||
        sampahOpen ||
        riwayatObat
      ) {
        return;
      }
      if (e.key.toLowerCase() === "h" || e.key.toLowerCase() === "m") {
        toggleSembunyikan();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, sampahOpen, riwayatObat]);

  // Kolom margin tampil saat mode sembunyikan tidak aktif
  const tampilkanMargin = !sembunyikan;

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50); // 25, 50, 100, 200, "semua"

  // Scope cetak: "halaman" atau "semua"
  const [scopeCetak, setScopeCetak] = useState("halaman");

  // State Edit Harga Langsung (Inline Quick Edit)
  const [editingKey, setEditingKey] = useState(null); // string: `${obatId}_${satuanId}`
  const [inputHargaJual, setInputHargaJual] = useState("");
  const [savingKey, setSavingKey] = useState(null);

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

  // Reset ke halaman 1 saat pencarian atau filter margin berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMarginTipis]);

  // Kalkulasi data per halaman (Pagination)
  const totalData = daftarTampil.length;
  const totalPages = perPage === "semua" ? 1 : Math.ceil(totalData / perPage) || 1;
  const startIndex = perPage === "semua" ? 0 : (currentPage - 1) * perPage;
  const endIndex = perPage === "semua" ? totalData : startIndex + perPage;
  const daftarHalaman = perPage === "semua" ? daftarTampil : daftarTampil.slice(startIndex, endIndex);

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

  // Rumus Klien: (Total Jual - Total Beli) / Total Beli * 100%
  const persenMarginKeseluruhan = totalNilaiKeseluruhan > 0
    ? ((totalPotensiLaba / totalNilaiKeseluruhan) * 100)
    : 0;

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
            } catch {}
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

  async function hapusObat(obat) {
    if (!confirm(`Hapus "${obat.nama}"?`)) return;
    await api(`/obat/${obat.id}`, { method: "DELETE" });
    tambahLogPerubahan({
      kategori: "Katalog Obat",
      aksi: "Hapus Obat",
      item: obat.nama,
      sebelum: `Stok: ${obat.stok || 0}`,
      sesudah: "Dihapus ke Sampah",
      keterangan: "Obat dihapus oleh petugas",
      oleh: user?.nama || user?.username || "Admin",
    });
    muatUlang();
  }

  // --- LOGIKA EDIT HARGA JUAL LANGSUNG DI SITU (INLINE PRICE EDIT) ---
  function mulaiEditHarga(obat, satuan) {
    const targetSatuan = satuan || obat.satuan?.[0];
    if (!targetSatuan) return;
    const key = `${obat.id}_${targetSatuan.id}`;
    setEditingKey(key);
    setInputHargaJual(String(Math.round(Number(targetSatuan.harga_jual || 0))));
  }

  function batalEditHarga() {
    setEditingKey(null);
    setInputHargaJual("");
  }

  async function simpanEditHarga(obat, targetSatuan, hargaBaruStr) {
    const hargaBaru = Math.round(Number(hargaBaruStr || 0));
    if (isNaN(hargaBaru) || hargaBaru < 0) {
      alert("Harga jual harus berupa angka valid.");
      return;
    }

    const hargaLama = Number(targetSatuan.harga_jual || 0);
    const key = `${obat.id}_${targetSatuan.id}`;
    setSavingKey(key);

    try {
      const satuanBaru = (obat.satuan || []).map((s) => {
        const isTarget = s.id === targetSatuan.id;
        return {
          id: s.id,
          nama_satuan: s.nama_satuan,
          faktor: s.faktor || 1,
          harga_beli: s.harga_beli,
          harga_jual: isTarget ? hargaBaru : s.harga_jual,
          is_default: s.is_default,
        };
      });

      const res = await api(`/obat/${obat.id}`, {
        method: "PUT",
        body: JSON.stringify({ nama: obat.nama, satuan: satuanBaru }),
      });

      const updateList = res?.satuan || satuanBaru;
      setDaftar((prev) =>
        prev.map((o) => (o.id === obat.id ? { ...o, satuan: updateList } : o))
      );

      // Update cache di storage
      try {
        const cached = getCachedObat();
        const updatedCache = cached.map((o) =>
          o.id === obat.id ? { ...o, satuan: updateList } : o
        );
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(updatedCache));
        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedCache));
      } catch {}

      // Catat ke riwayat perubahan (Audit Log)
      tambahLogPerubahan({
        kategori: "Katalog Obat",
        aksi: "Ganti Harga Obat",
        item: `${obat.nama} (${targetSatuan.nama_satuan})`,
        sebelum: rupiah(hargaLama),
        sesudah: rupiah(hargaBaru),
        keterangan: `Ubah harga jual satuan ${targetSatuan.nama_satuan}`,
        oleh: user?.nama || user?.username || "Admin",
      });

      setEditingKey(null);
      setNotifSukses(`✓ Harga ${obat.nama} (${targetSatuan.nama_satuan}) berhasil diubah menjadi ${rupiah(hargaBaru)}`);
      setTimeout(() => setNotifSukses(""), 4000);
    } catch (err) {
      alert("Gagal mengubah harga: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setSavingKey(null);
    }
  }

  // --- PERBAIKI MARGIN OTOMATIS ---
  async function handlePerbaikiSemuaMargin() {
    if (obatBermasalahMargin.length === 0) return;
    if (
      !window.confirm(
        `Sesuaikan ${obatBermasalahMargin.length} obat yang harganya belum genap / margin tipis?\n\n` +
        `• Harga jual otomatis dihitung dengan Margin 25% (Harga Beli / 0.75)\n` +
        `• Dibulatkan ke atas ke kelipatan Rp 500 / Rp 1.000\n` +
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
      tambahLogPerubahan({
        kategori: "Katalog Obat",
        aksi: "Auto Margin 25%",
        item: `${obatBermasalahMargin.length} Obat`,
        sebelum: "Margin tipis / belum bulat 500",
        sesudah: "Margin 25% kelipatan Rp 500",
        keterangan: "Penyesuaian massal harga jual obat",
        oleh: user?.nama || user?.username || "Admin",
      });
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
    const jualLama = Number(def?.harga_jual || 0);

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
      tambahLogPerubahan({
        kategori: "Katalog Obat",
        aksi: "Auto Margin 25%",
        item: obat.nama,
        sebelum: rupiah(jualLama),
        sesudah: rupiah(autoJual),
        keterangan: `Penyesuaian otomatis margin 25% bulat Rp 500`,
        oleh: user?.nama || user?.username || "Admin",
      });
      muatUlang();
    } catch (err) {
      alert("Gagal memperbarui harga: " + (err.message || "Terjadi kesalahan"));
    }
  }

  // --- EKSPOR DATA OBAT (PER HALAMAN ATAU SEMUA DATA) ---
  // --- EKSPOR & CETAK DATA OBAT (PER HALAMAN ATAU SEMUA DATA) ---
  // Kolom Margin % tidak pernah diikutsertakan dalam cetak/ekspor (rahasia apotek)
  function siapkanDataExport(scope = "semua") {
    const dataSumber = scope === "halaman" && perPage !== "semua" ? daftarHalaman : daftarTampil;

    const headers = [
      { label: "NO", align: "center", width: "45px" },
      { label: "Nama Obat", align: "left" },
      { label: "Kemasan", align: "left" },
      { label: "Satuan", align: "left" },
      { label: "No. Batch", align: "center" },
      { label: "Harga Beli", align: "right" },
      { label: "Harga Jual", align: "right" },
      { label: "Stok", align: "right" },
      { label: "Total Nilai", align: "right" },
      { label: "Kadaluwarsa", align: "center" },
    ];

    let totalAsetStok = 0;
    let totalFisikStok = 0;

    const rows = dataSumber.map((obat, idx) => {
      const noUrut = (scope === "halaman" && perPage !== "semua") ? startIndex + idx + 1 : idx + 1;
      const def = obat.satuan?.find((s) => s.is_default) || obat.satuan?.[0];
      const satuanNames = obat.satuan?.map((s) => s.nama_satuan).join(" / ");
      const expStr = obat.tanggal_exp
        ? new Date(obat.tanggal_exp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
        : "-";

      const stokNum = Number(obat.stok || 0);
      const beliNum = Number(def?.harga_beli || 0);
      const nilaiUang = stokNum * beliNum;
      totalAsetStok += nilaiUang;
      totalFisikStok += stokNum;

      return [
        noUrut,
        obat.nama,
        obat.kemasan || "-",
        satuanNames || "-",
        obat.nomor_batch || "-",
        rupiah(def?.harga_beli),
        rupiah(def?.harga_jual),
        `${obat.stok} ${obat.satuan_dasar || ""}`,
        rupiah(nilaiUang),
        expStr,
      ];
    });

    const footers = [
      [
        {
          label: `Total Data: ${rows.length} Obat · Total Fisik: ${totalFisikStok.toLocaleString("id-ID")} Unit · Total Besar Uang: ${rupiah(totalAsetStok)}`,
          colspan: headers.length,
          align: "right",
        },
      ],
    ];

    const infoHal = (scope === "halaman" && perPage !== "semua") ? ` (Halaman ${currentPage} dari ${totalPages})` : " (Semua Data)";
    const keterangan = (filterMarginTipis ? "Obat Margin < 25%" : search ? `Pencarian: "${search}"` : "") + infoHal;

    return { headers, rows, footers, keterangan };
  }

  function handleCetakDataObat() {
    const { headers, rows, footers, keterangan } = siapkanDataExport(scopeCetak);
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
    const { headers, rows, footers, keterangan } = siapkanDataExport(scopeCetak);
    exportExcel({
      filename: `data-obat-apotek-bima-farma-${scopeCetak === "halaman" ? `hal-${currentPage}` : "semua"}`,
      judul: "LAPORAN DATA OBAT",
      periode: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      keterangan,
      headers,
      rows,
      footers,
    });
  }

  function handleWordDataObat() {
    const { headers, rows, footers, keterangan } = siapkanDataExport(scopeCetak);
    exportWord({
      filename: `data-obat-apotek-bima-farma-${scopeCetak === "halaman" ? `hal-${currentPage}` : "semua"}`,
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

  // Helper render tombol nomor halaman (Pagination pintar)
  function renderPageNumbers() {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(
        <button
          key={1}
          type="button"
          onClick={() => setCurrentPage(1)}
          className={`pagination-num-btn ${currentPage === 1 ? "active" : ""}`}
        >
          1
        </button>
      );
      if (start > 2) {
        pages.push(<span key="dots-start" style={{ padding: "0 4px", color: "var(--ink-soft)" }}>…</span>);
      }
    }

    for (let p = start; p <= end; p++) {
      pages.push(
        <button
          key={p}
          type="button"
          onClick={() => setCurrentPage(p)}
          className={`pagination-num-btn ${currentPage === p ? "active" : ""}`}
        >
          {p}
        </button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(<span key="dots-end" style={{ padding: "0 4px", color: "var(--ink-soft)" }}>…</span>);
      }
      pages.push(
        <button
          key={totalPages}
          type="button"
          onClick={() => setCurrentPage(totalPages)}
          className={`pagination-num-btn ${currentPage === totalPages ? "active" : ""}`}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  }

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <div
            onClick={toggleSembunyikan}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              userSelect: "none",
            }}
            title="Klik judul ini atau tekan 'H' di keyboard untuk sembunyikan / tampilkan kolom"
          >
            <h1 style={{ fontSize: 24, margin: 0 }}>Data Obat</h1>
            <span
              style={{
                fontSize: 12,
                opacity: 0.18,
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.18")}
            >
              {sembunyikan ? "🙈" : "👁️"}
            </span>
          </div>
          <p className="halaman-sub">
            {filterMarginTipis
              ? `Menampilkan ${daftarTampil.length} obat dengan margin bermasalah (< 25%)`
              : loading && daftar.length === 0
              ? "Menghubungkan ke database apotek…"
              : `${totalData.toLocaleString("id-ID")} obat terdaftar ${loading ? "· (Menyinkronkan…)" : ""}`}
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
                cursor: "pointer",
              }}
            >
              🔄 Muat Ulang
            </button>
          )}

          {/* Selector Lingkup Cetak (Per Halaman vs Semua Data) */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "var(--surface)",
              border: "1.5px solid var(--line)",
              padding: "3px 6px",
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 700, marginRight: 2 }}>
              Cetak:
            </span>
            <button
              type="button"
              onClick={() => setScopeCetak("halaman")}
              style={{
                padding: "4px 8px",
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: scopeCetak === "halaman" ? "var(--magenta)" : "transparent",
                color: scopeCetak === "halaman" ? "#fff" : "var(--ink-soft)",
                transition: "all 0.15s ease",
              }}
              title="Cetak atau ekspor data pada halaman ini saja"
            >
              Hal. {currentPage} ({daftarHalaman.length})
            </button>
            <button
              type="button"
              onClick={() => setScopeCetak("semua")}
              style={{
                padding: "4px 8px",
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: scopeCetak === "semua" ? "var(--magenta)" : "transparent",
                color: scopeCetak === "semua" ? "#fff" : "var(--ink-soft)",
                transition: "all 0.15s ease",
              }}
              title="Cetak atau ekspor seluruh obat di database"
            >
              Semua ({totalData})
            </button>
          </div>

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

      {/* Banner Notifikasi Sukses Simpan Harga Langsung */}
      {notifSukses && (
        <div
          style={{
            background: "#ECFDF5",
            color: "#065F46",
            padding: "10px 16px",
            borderRadius: 10,
            marginBottom: 14,
            fontWeight: 700,
            fontSize: 13.5,
            border: "1px solid #A7F3D0",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>{notifSukses}</span>
        </div>
      )}

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
          color: "#991B1B",
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
                  Server sedang merespons lambat saat mengambil katalog obat. Silakan coba klik Muat Ulang.
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
              whiteSpace: "nowrap",
            }}
          >
            🔄 Coba Lagi
          </button>
        </div>
      )}

      {/* Kartu Ringkasan Stok & Total Nilai Uang (Aset) - Khusus Admin (tidak tampil untuk Kasir) */}
      {isAdmin && (
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
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
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
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
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
            boxShadow: "0 1px 3px rgba(124, 58, 237, 0.06)",
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
            boxShadow: "0 1px 3px rgba(22, 163, 74, 0.06)",
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
                borderRadius: 12,
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
      {isAdmin && obatBermasalahMargin.length > 0 && (
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
                fontWeight: 700,
              }}
              disabled={sedangPerbaiki}
              onClick={handlePerbaikiSemuaMargin}
            >
              {sedangPerbaiki ? "Memproses…" : `⚡ Perbaiki Semua Margin 25% & Bulat 500 (${obatBermasalahMargin.length} Obat)`}
            </button>
          </div>
        </div>
      )}

      {/* ---------- TAMPILAN KHUSUS MOBILE ---------- */}
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
        ) : daftarHalaman.length === 0 ? (
          <div className="panel-kosong" style={{ padding: 20, borderRadius: 14 }}>Tidak ada obat yang cocok.</div>
        ) : (
          daftarHalaman.map((obat, idx) => {
            const noUrut = startIndex + idx + 1;
            const def = obat.satuan?.find((s) => s.is_default) || obat.satuan?.[0];
            const stokMenipis = obat.stok <= (obat.stok_minimum || 0);
            const mNum = hitungMarginPersen(def?.harga_beli, def?.harga_jual);
            const mStat = getStatusMargin(mNum);
            const stokNum = Number(obat.stok || 0);
            const beliNum = Number(def?.harga_beli || 0);
            const nilaiUang = stokNum * beliNum;
            const persenStr = formatPersen(nilaiUang, totalNilaiKeseluruhan);

            const isEditHarga = def && editingKey === `${obat.id}_${def.id}`;

            return (
              <div
                className="list-card"
                key={obat.id}
                onClick={() => !isEditHarga && bukaEdit(obat)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--ink-soft)",
                      background: "#F1F5F9",
                      padding: "2px 6px",
                      borderRadius: 6,
                    }}
                  >
                    #{noUrut}
                  </span>
                  <div className="body" style={{ flex: 1 }}>
                    <div className="t1" style={{ fontSize: 14.5 }}>{obat.nama}</div>
                    
                    {/* Harga Jual dengan Kemampuan Edit Langsung di Mobile */}
                    <div style={{ margin: "5px 0" }} onClick={(e) => e.stopPropagation()}>
                      {isEditHarga ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>Rp</span>
                          <input
                            type="number"
                            value={inputHargaJual}
                            onChange={(e) => setInputHargaJual(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") simpanEditHarga(obat, def, inputHargaJual);
                              if (e.key === "Escape") batalEditHarga();
                            }}
                            autoFocus
                            style={{
                              width: 95,
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "2px solid var(--magenta)",
                              fontSize: 13,
                              fontWeight: 700,
                              outline: "none",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => simpanEditHarga(obat, def, inputHargaJual)}
                            disabled={savingKey === `${obat.id}_${def.id}`}
                            style={{
                              background: "#16A34A",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "5px 8px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {savingKey === `${obat.id}_${def.id}` ? "…" : "✓"}
                          </button>
                          <button
                            type="button"
                            onClick={batalEditHarga}
                            style={{
                              background: "#E2E8F0",
                              color: "#475569",
                              border: "none",
                              borderRadius: 6,
                              padding: "5px 8px",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => mulaiEditHarga(obat, def)}
                          title="Ketuk untuk ubah harga jual langsung"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "rgba(147, 51, 234, 0.06)",
                            border: "1px dashed #D8B4FE",
                            cursor: "pointer",
                          }}
                        >
                          <span style={{ fontWeight: 800, color: "var(--ink)", fontSize: 13 }}>
                            {rupiah(def?.harga_jual || 0)} {def ? `/${def.nama_satuan}` : ""}
                          </span>
                          <span style={{ fontSize: 10, color: "var(--magenta)" }}>✏️</span>
                        </div>
                      )}
                    </div>

                    <div className="t2" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {obat.nomor_batch && <span>Batch: {obat.nomor_batch}</span>}
                      {tampilkanMargin && mStat.status !== "kosong" && (
                        <span className={`margin-badge ${mStat.warna}`} style={{ fontSize: 9.5, padding: "1px 5px" }}>
                          {mStat.label}
                        </span>
                      )}
                      {isAdmin && (mStat.status === "rugi" || mStat.status === "tipis") && (
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
                            cursor: "pointer",
                          }}
                        >
                          ⚡ 25%
                        </button>
                      )}
                    </div>
                    {isAdmin && (
                      <div style={{ fontSize: 11.5, color: "var(--magenta-dark)", fontWeight: 700, marginTop: 3 }}>
                        Nilai Stok: {rupiah(nilaiUang)} ({persenStr})
                      </div>
                    )}
                  </div>
                  <span className={`badge-mini ${stokMenipis ? "low" : "ok"}`}>
                    {obat.stok} {obat.satuan_dasar}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ---------- TAMPILAN KHUSUS DESKTOP (SEARCH, KONTROL & TABEL) ---------- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div className="search-obat-input desktop-only" style={{ maxWidth: 360, margin: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Cari nama obat, batch, kemasan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", padding: 0 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Info Ringkas Halaman di Desktop Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)" }}>
          <span>
            Menampilkan <strong>{totalData === 0 ? 0 : startIndex + 1}</strong> – <strong>{Math.min(endIndex, totalData)}</strong> dari <strong>{totalData.toLocaleString("id-ID")}</strong> obat
          </span>
        </div>
      </div>

      {/* WRAPPER TABEL RESPONTIF (RESPONSIVE TABLE WRAPPER) */}
      <div
        className="obat-table-wrap desktop-only"
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          borderRadius: 14,
          border: "1px solid var(--line)",
          background: "#fff",
          marginBottom: 16,
        }}
      >
        <table className="obat-table" style={{ minWidth: tampilkanMargin ? 980 : 880, width: "100%", fontSize: 12.5 }}>
          <thead>
            <tr>
              {/* 1. NO DI PALING DEPAN */}
              <th style={{ width: 36, minWidth: 36, textAlign: "center", padding: "7px 4px" }}>NO</th>
              <th style={{ minWidth: 160, padding: "7px 8px" }}>Nama Obat</th>
              <th style={{ width: 65, minWidth: 65, padding: "7px 5px" }}>Kemasan</th>
              <th style={{ width: 65, minWidth: 65, padding: "7px 5px" }}>Satuan</th>
              <th style={{ width: 75, minWidth: 75, textAlign: "center", padding: "7px 5px" }}>Batch</th>
              <th style={{ width: 98, minWidth: 98, textAlign: "right", padding: "7px 6px" }}>Harga Beli</th>
              {/* Kolom Harga Jual dengan Keterangan Edit Langsung */}
              <th style={{ width: 108, minWidth: 108, textAlign: "right", padding: "7px 6px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                  <span>Harga Jual</span>
                  <span style={{ fontSize: 10.5, color: "var(--magenta)", fontWeight: 800 }} title="Bisa langsung diedit di sini">
                    ✏️
                  </span>
                </div>
              </th>
              {/* Kolom Margin (Bisa disembunyikan via tombol Sembunyikan) */}
              {tampilkanMargin && (
                <th style={{ width: 85, minWidth: 85, textAlign: "center", padding: "7px 4px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <span>Margin %</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSembunyikan();
                      }}
                      title="Klik untuk menyembunyikan kolom ini"
                      style={{
                        background: "#F1F5F9",
                        border: "1px solid #CBD5E1",
                        color: "#475569",
                        borderRadius: 4,
                        padding: "1px 4px",
                        fontSize: 9,
                        cursor: "pointer",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </th>
              )}
              <th style={{ width: 72, minWidth: 72, textAlign: "center", padding: "7px 5px" }}>Stok</th>
              <th style={{ width: 105, minWidth: 105, textAlign: "right", padding: "7px 6px" }}>Total Nilai</th>
              <th style={{ width: 92, minWidth: 92, textAlign: "center", padding: "7px 5px" }}>Kadaluwarsa</th>
              <th style={{ width: 86, minWidth: 86, textAlign: "center", padding: "7px 4px" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && daftar.length === 0 && (
              <tr>
                <td colSpan={tampilkanMargin ? 12 : 11} className="obat-table-info" style={{ padding: "30px 16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 700, color: "var(--magenta-dark)", fontSize: 14 }}>
                      Sedang menyinkronkan data katalog obat dari server apotek…
                    </div>
                    <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Memuat seluruh data 1.500+ obat dan harga satuan...</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && daftarHalaman.length === 0 && (
              <tr>
                <td colSpan={tampilkanMargin ? 12 : 11} className="obat-table-info">
                  {search ? `Tidak ada obat yang cocok dengan pencarian "${search}".` : "Tidak ada data obat."}
                </td>
              </tr>
            )}
            {daftarHalaman.map((obat, idx) => {
              const noUrut = startIndex + idx + 1;
              const def = obat.satuan?.find((s) => s.is_default) || obat.satuan?.[0];
              const hari = daysUntil(obat.tanggal_exp);
              const satuanNames = obat.satuan?.map((s) => s.nama_satuan).join(" / ");
              const hargaBeli = obat.satuan?.length > 1
                ? obat.satuan.map((s) => rupiah(s.harga_beli)).join(" / ")
                : rupiah(def?.harga_beli);

              const mNum = hitungMarginPersen(def?.harga_beli, def?.harga_jual);
              const mStat = getStatusMargin(mNum);
              const stokNum = Number(obat.stok || 0);
              const beliNum = Number(def?.harga_beli || 0);
              const nilaiUang = stokNum * beliNum;

              // Key unik inline edit untuk obat dan satuannya
              const inlineEditKey = def ? `${obat.id}_${def.id}` : null;
              const isEditing = inlineEditKey && editingKey === inlineEditKey;

              return (
                <tr key={obat.id} className={!obat.aktif_dijual ? "obat-row-nonaktif" : ""}>
                  {/* 1. NO */}
                  <td style={{ textAlign: "center", fontWeight: 700, color: "var(--ink-soft)", padding: "6px 4px" }}>
                    {noUrut}
                  </td>

                  {/* 2. NAMA OBAT */}
                  <td style={{ padding: "6px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {obat.gambar_url || obat.gambar ? (
                        <img
                          src={obat.gambar_url || `/storage/${obat.gambar}`}
                          alt=""
                          style={{ width: 26, height: 26, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : null}
                      <span className="obat-nama-cell" style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13 }}>
                        {obat.nama}
                      </span>
                    </div>
                  </td>

                  {/* 3. KEMASAN */}
                  <td style={{ color: "var(--ink-soft)", padding: "6px 6px" }}>{obat.kemasan || "-"}</td>

                  {/* 4. SATUAN */}
                  <td style={{ fontWeight: 600, padding: "6px 6px" }}>{satuanNames}</td>

                  {/* 5. BATCH */}
                  <td className="obat-batch-cell" style={{ textAlign: "center", padding: "6px 5px" }}>{obat.nomor_batch || "-"}</td>

                  {/* 6. HARGA BELI */}
                  <td className="obat-harga-cell" style={{ textAlign: "right", padding: "6px 6px" }}>
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span>{hargaBeli}</span>
                      {(() => {
                        const badge = badgeHargaBeli(def);
                        return badge ? <div className={`harga-badge ${badge.warna}`} style={{ marginTop: 2 }}>{badge.teks}</div> : null;
                      })()}
                    </div>
                  </td>

                  {/* 7. HARGA JUAL - EDIT LANGSUNG DI SITU (INLINE QUICK EDIT) */}
                  <td className="obat-harga-cell" style={{ textAlign: "right", padding: "6px 6px" }}>
                    {isEditing ? (
                      <div
                        style={{ display: "inline-flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-soft)" }}>Rp</span>
                        <input
                          type="number"
                          value={inputHargaJual}
                          onChange={(e) => setInputHargaJual(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") simpanEditHarga(obat, def, inputHargaJual);
                            if (e.key === "Escape") batalEditHarga();
                          }}
                          autoFocus
                          style={{
                            width: 80,
                            padding: "2px 5px",
                            borderRadius: 6,
                            border: "2px solid var(--magenta)",
                            fontSize: 12,
                            fontWeight: 800,
                            outline: "none",
                            textAlign: "right",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => simpanEditHarga(obat, def, inputHargaJual)}
                          disabled={savingKey === inlineEditKey}
                          title="Simpan perubahan harga (Enter)"
                          style={{
                            background: "#16A34A",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "3px 6px",
                            cursor: "pointer",
                            fontSize: 10.5,
                            fontWeight: 800,
                          }}
                        >
                          {savingKey === inlineEditKey ? "…" : "✓"}
                        </button>
                        <button
                          type="button"
                          onClick={batalEditHarga}
                          title="Batal (Esc)"
                          style={{
                            background: "#E2E8F0",
                            color: "#475569",
                            border: "none",
                            borderRadius: 4,
                            padding: "3px 5px",
                            cursor: "pointer",
                            fontSize: 10.5,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => mulaiEditHarga(obat, def)}
                        title="Klik untuk ubah harga jual langsung di sini"
                        style={{
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          justifyContent: "flex-end",
                          padding: "2px 6px",
                          borderRadius: 6,
                          background: "rgba(147, 51, 234, 0.05)",
                          border: "1px dashed #D8B4FE",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span style={{ fontWeight: 800, color: "var(--ink)", fontSize: 12.5 }}>
                          {rupiah(def?.harga_jual)}
                        </span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10, color: "var(--magenta)" }}>
                          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </div>
                    )}
                  </td>

                  {/* 8. MARGIN % (Jika OFF, kolom ini lenyap total dan Stok bergeser ke kanan Harga Jual) */}
                  {tampilkanMargin && (
                    <td className="obat-margin-cell" style={{ textAlign: "center", padding: "6px 4px" }}>
                      {mStat.status !== "kosong" ? (
                        <div style={{ display: "inline-flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                          <span className={`margin-badge ${mStat.warna}`} style={{ fontSize: 11, padding: "2px 6px" }}>
                            {mStat.label}
                          </span>
                          {isAdmin && (mStat.status === "rugi" || mStat.status === "tipis") && (
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
                                padding: "1px 5px",
                                fontSize: 9,
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                              title="Otomatis hitung margin 25% dan kelipatan 500"
                            >
                              ⚡ Jadi 25%
                            </button>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  )}

                  {/* 9. STOK (Menempel langsung di kanan Harga Jual jika Margin OFF) */}
                  <td style={{ textAlign: "center", padding: "6px 5px" }}>
                    <span style={{ fontWeight: 700 }}>{obat.stok}</span>{" "}
                    <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{obat.satuan_dasar}</span>
                    {obat.stok < obat.stok_minimum && <div className="obat-stok-menipis">MENIPIS</div>}
                  </td>

                  {/* 10. TOTAL NILAI */}
                  <td style={{ textAlign: "right", whiteSpace: "nowrap", padding: "6px 6px" }}>
                    <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 12.5 }}>
                      {rupiah(nilaiUang)}
                    </div>
                  </td>

                  {/* 11. KADALUWARSA */}
                  <td style={{ textAlign: "center", padding: "6px 5px" }}>
                    {obat.tanggal_exp ? (
                      <div>
                        <span style={{ fontSize: 12 }}>{new Date(obat.tanggal_exp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        {hari !== null && hari <= 90 && (
                          <div style={{ marginTop: 2 }}>
                            <span className={`exp-badge ${hari <= 30 ? "merah" : "kuning"}`}>
                              {hari <= 0 ? "EXPIRED" : `${hari}H`}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : "-"}
                  </td>

                  {/* 12. AKSI */}
                  <td style={{ width: 86, minWidth: 86, textAlign: "center", whiteSpace: "nowrap", padding: "6px 4px" }}>
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
                          width: 30,
                          height: 30,
                          color: "var(--magenta-dark)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 13, height: 13 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </button>
                      <button onClick={() => bukaEdit(obat)} title="Edit Obat Lengkap" style={{ flexShrink: 0 }}>
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

      {/* NAVIGASI HALAMAN (PAGINATION) - DESKTOP & MOBILE */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 18px",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid var(--line)",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 13, color: "var(--ink-soft)" }}>
          <span>
            Menampilkan <strong>{totalData === 0 ? 0 : startIndex + 1}</strong> – <strong>{Math.min(endIndex, totalData)}</strong> dari <strong>{totalData.toLocaleString("id-ID")}</strong> obat
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>Per Halaman:</span>
            <select
              value={perPage}
              onChange={(e) => {
                const val = e.target.value === "semua" ? "semua" : Number(e.target.value);
                setPerPage(val);
                setCurrentPage(1);
              }}
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                border: "1.5px solid var(--line)",
                fontSize: 12.5,
                fontWeight: 700,
                background: "#FAF5FF",
                color: "var(--magenta-dark)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value="semua">Semua</option>
            </select>
          </div>
        </div>

        {perPage !== "semua" && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: currentPage <= 1 ? "#F1F5F9" : "#fff",
                color: currentPage <= 1 ? "#94A3B8" : "var(--ink)",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 700,
              }}
              title="Halaman Pertama"
            >
              ««
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              style={{
                padding: "6px 11px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: currentPage <= 1 ? "#F1F5F9" : "#fff",
                color: currentPage <= 1 ? "#94A3B8" : "var(--ink)",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 700,
              }}
              title="Halaman Sebelumnya"
            >
              ‹
            </button>

            {/* Nomor-nomor halaman */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {renderPageNumbers()}
            </div>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              style={{
                padding: "6px 11px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: currentPage >= totalPages ? "#F1F5F9" : "#fff",
                color: currentPage >= totalPages ? "#94A3B8" : "var(--ink)",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 700,
              }}
              title="Halaman Selanjutnya"
            >
              ›
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: currentPage >= totalPages ? "#F1F5F9" : "#fff",
                color: currentPage >= totalPages ? "#94A3B8" : "var(--ink)",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 700,
              }}
              title="Halaman Terakhir"
            >
              »»
            </button>
          </div>
        )}
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
