import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../lib/api";
import KasirShell from "./KasirShell";
import TombolExportGroup from "./komponen/TombolExportGroup";
import RincianMasukModal from "./komponen/RincianMasukModal";
import RincianKeluarModal from "./komponen/RincianKeluarModal";
import { cetakDokumenA4, exportExcel, exportWord } from "../../utils/exportDokumen";

function getTglYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getAwalBulanYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

export default function StokOpname() {
  const { user } = useAuth();
  const hariIni = new Date();
  const [dariTanggal, setDariTanggal] = useState(getAwalBulanYmd(hariIni));
  const [sampaiTanggal, setSampaiTanggal] = useState(getTglYmd(hariIni));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState("");
  const [daftarObat, setDaftarObat] = useState([]);

  // State Modal Interaktif Rincian
  const [modalMasukObat, setModalMasukObat] = useState(null);
  const [modalKeluarObat, setModalKeluarObat] = useState(null);

  // State Modal Mini Koreksi Stok Langsung (Pensil)
  const [modalKoreksiObat, setModalKoreksiObat] = useState(null);
  const [inputStokCepat, setInputStokCepat] = useState("");
  const [loadingKoreksiCepat, setLoadingKoreksiCepat] = useState(false);

  // Ambil data stok obat dengan fallback cerdas
  async function muatData() {
    setLoading(true);
    setError("");

    try {
      // 1. Coba endpoint dedicated backend
      const res = await api(
        `/daftar-stok-obat?dari_tanggal=${dariTanggal}&sampai_tanggal=${sampaiTanggal}`
      );
      if (res && Array.isArray(res.data)) {
        setDaftarObat(res.data);
        setLoading(false);
        return;
      }
    } catch (_) {
      // 2. Fallback cerdas: kalkulasi di frontend menggunakan endpoint yang sudah ada
      try {
        const [listObat, listPenerimaan, listPenjualan] = await Promise.all([
          api("/obat"),
          api(`/penerimaan?dari_tanggal=${dariTanggal}&sampai_tanggal=${sampaiTanggal}`).catch(() => []),
          api(`/penjualan?dari_tanggal=${dariTanggal}&sampai_tanggal=${sampaiTanggal}&limit=2000`).catch(() => []),
        ]);

        const rawObat = Array.isArray(listObat) ? listObat : [];
        const rawPenerimaan = Array.isArray(listPenerimaan) ? listPenerimaan : [];
        const rawPenjualan = Array.isArray(listPenjualan) ? listPenjualan : [];

        // Kelompokkan penerimaan item per obat_id
        const masukMap = {};
        const penerimaanTerakhirMap = {};

        rawPenerimaan.forEach((pen) => {
          (pen.items || []).forEach((pi) => {
            const oid = pi.obat_id;
            if (!oid) return;

            const isiKemasan = Number(pi.kemasan || pi.faktor || 1);
            const qtyDasar = Math.round(Number(pi.qty || 0) * isiKemasan);

            if (!masukMap[oid]) masukMap[oid] = [];
            masukMap[oid].push({
              penerimaan_id: pen.id,
              tanggal_terima: pen.tanggal_terima,
              nama_pbf: pen.nama_supplier || "-",
              no_faktur: pen.no_faktur || "-",
              qty: Number(pi.qty || 0),
              qty_dasar: qtyDasar,
              nama_satuan: pi.nama_satuan || "Unit",
              kemasan: isiKemasan,
              harga_beli: Number(pi.harga_beli || 0),
              diskon: Number(pi.diskon || 0),
              nomor_batch: pi.nomor_batch || "-",
              tanggal_exp: pi.tanggal_exp || "-",
              subtotal: Number(pi.subtotal || 0),
            });

            if (!penerimaanTerakhirMap[oid] || pen.tanggal_terima >= penerimaanTerakhirMap[oid].tanggal_terima) {
              penerimaanTerakhirMap[oid] = {
                no_faktur: pen.no_faktur || "-",
                tanggal_terima: pen.tanggal_terima || "-",
                nomor_batch: pi.nomor_batch || "-",
                tanggal_exp: pi.tanggal_exp || "-",
              };
            }
          });
        });

        // Kelompokkan penjualan item per obat_id
        const keluarMap = {};
        rawPenjualan.forEach((penj) => {
          if (penj.status === "batal") return;
          (penj.items || []).forEach((pji) => {
            const oid = pji.obat_id;
            if (!oid) return;

            const faktor = Number(pji.faktor || 1);
            const qtyDasar = Math.round(Number(pji.qty || 0) * faktor);

            if (!keluarMap[oid]) keluarMap[oid] = [];
            keluarMap[oid].push({
              penjualan_id: penj.id,
              tanggal: penj.tanggal || (penj.created_at ? penj.created_at.slice(0, 10) : "-"),
              jam: penj.created_at ? penj.created_at.slice(11, 16) : "-",
              no_struk: penj.no_struk || "-",
              sumber: penj.sumber || "kasir",
              nama_kasir: penj.nama_kasir || "Kasir",
              qty: Number(pji.qty || 0),
              qty_dasar: qtyDasar,
              nama_satuan: pji.nama_satuan || "Unit",
              harga_jual: Number(pji.harga_jual || 0),
              subtotal: Number(pji.subtotal || 0),
            });
          });
        });

        // Rakit array akhir
        const terurut = [...rawObat].sort((a, b) => a.nama.localeCompare(b.nama));
        const hasil = terurut.map((ob, idx) => {
          const rMasuk = masukMap[ob.id] || [];
          const rKeluar = keluarMap[ob.id] || [];

          const totalMasukDasar = rMasuk.reduce((s, it) => s + it.qty_dasar, 0);
          const totalKeluarDasar = rKeluar.reduce((s, it) => s + it.qty_dasar, 0);

          const trxTerakhir = penerimaanTerakhirMap[ob.id];
          const noFaktur = trxTerakhir ? trxTerakhir.no_faktur : "-";
          const tglFaktur = trxTerakhir ? trxTerakhir.tanggal_terima : "-";
          const batchTerakhir = trxTerakhir && trxTerakhir.nomor_batch !== "-"
            ? trxTerakhir.nomor_batch
            : ob.nomor_batch || "-";
          const expTerakhir = trxTerakhir && trxTerakhir.tanggal_exp !== "-"
            ? trxTerakhir.tanggal_exp
            : ob.tanggal_exp || "-";

          const satuanUtama = (ob.satuan || [])[0];
          const namaKemasan = satuanUtama ? satuanUtama.nama_satuan : ob.satuan_dasar || "Unit";

          const sisaAktual = Number(ob.stok || 0);
          const stokAwal = Math.max(sisaAktual - totalMasukDasar + totalKeluarDasar, 0);
          const jml = stokAwal + totalMasukDasar;
          const sisa = jml - totalKeluarDasar;

          return {
            no: idx + 1,
            id: ob.id,
            nama: ob.nama,
            kode: ob.kode,
            no_faktur: noFaktur,
            tgl_faktur: tglFaktur,
            batch: batchTerakhir,
            kemasan: namaKemasan,
            satuan_dasar: ob.satuan_dasar || "Unit",
            stok: stokAwal,
            masuk: totalMasukDasar,
            jml: jml,
            keluar: totalKeluarDasar,
            sisa: sisa,
            ekp: expTerakhir,
            rincian_masuk: rMasuk,
            rincian_keluar: rKeluar,
          };
        });

        setDaftarObat(hasil);
      } catch (err) {
        setError("Gagal memuat data stok obat: " + (err.message || ""));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    muatData();
  }, [dariTanggal, sampaiTanggal]);

  // Filter teks pencarian
  const dataTampil = daftarObat.filter((ob) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      ob.nama.toLowerCase().includes(s) ||
      String(ob.no_faktur || "").toLowerCase().includes(s) ||
      String(ob.batch || "").toLowerCase().includes(s) ||
      String(ob.kode || "").toLowerCase().includes(s)
    );
  });

  function formatTgl(str) {
    if (!str || str === "-") return "-";
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Kop resmi Apotek Bima Farma sesuai Foto Excel
  const KOP_EXCEL_HTML = `
    <div style="text-align: center; margin-bottom: 14px; font-family: sans-serif;">
      <div style="font-size: 15px; font-weight: 800; letter-spacing: 0.5px; color: #000;">DAFTAR STOK OBAT</div>
      <div style="font-size: 13px; font-weight: 700; color: #111; margin-top: 2px;">APOTEK BIMA FARMA</div>
      <div style="font-size: 11px; color: #333; margin-top: 2px;">Jln. Tanimulya Raya no 1 Haji Gofur Ngamprah Bandung Barat</div>
      <div style="font-size: 11px; font-weight: 600; color: #222; margin-top: 4px; border-bottom: 1.5px solid #000; padding-bottom: 6px;">
        DARI TANGGAL ${formatTgl(dariTanggal).toUpperCase()} SAMPAI TANGGAL ${formatTgl(sampaiTanggal).toUpperCase()}
      </div>
    </div>
  `;

  // Handler Cetak Laporan Utama (Kolom EXP)
  function handleCetakUtama() {
    cetakDokumenA4({
      judul: "DAFTAR STOK OBAT",
      periode: `DARI TANGGAL ${formatTgl(dariTanggal).toUpperCase()} SAMPAI TANGGAL ${formatTgl(sampaiTanggal).toUpperCase()}`,
      orientation: "landscape",
      customKop: KOP_EXCEL_HTML,
      sembunyikanJudulDokumen: true,
      headers: [
        { label: "NO", align: "center", width: "35px" },
        { label: "NAMA OBAT", align: "left" },
        { label: "NO FAKTUR", align: "left", width: "95px" },
        { label: "TGL FAKTUR", align: "center", width: "80px" },
        { label: "BATCH", align: "center", width: "75px" },
        { label: "KEMASAN", align: "left", width: "75px" },
        { label: "STOK", align: "center", width: "55px" },
        { label: "MASUK", align: "center", width: "55px" },
        { label: "JML", align: "center", width: "55px" },
        { label: "KELUAR", align: "center", width: "55px" },
        { label: "SISA", align: "center", width: "55px" },
        { label: "EXP", align: "center", width: "80px" },
      ],
      rows: dataTampil.map((ob, idx) => [
        idx + 1,
        ob.nama,
        ob.no_faktur || "-",
        formatTgl(ob.tgl_faktur),
        ob.batch || "-",
        ob.kemasan || "-",
        ob.stok,
        ob.masuk,
        ob.jml,
        ob.keluar,
        ob.sisa,
        formatTgl(ob.ekp),
      ]),
    });
  }

  function handleExportExcelUtama() {
    exportExcel({
      filename: `Daftar_Stok_Obat_${dariTanggal}_sd_${sampaiTanggal}`,
      judul: "DAFTAR STOK OBAT - APOTEK BIMA FARMA",
      periode: `DARI TANGGAL ${formatTgl(dariTanggal)} SAMPAI TANGGAL ${formatTgl(sampaiTanggal)}`,
      headers: [
        { label: "NO", align: "center" },
        { label: "NAMA OBAT", align: "left" },
        { label: "NO FAKTUR", align: "left" },
        { label: "TGL FAKTUR", align: "center" },
        { label: "BATCH", align: "center" },
        { label: "KEMASAN", align: "left" },
        { label: "STOK", align: "center" },
        { label: "MASUK", align: "center" },
        { label: "JML", align: "center" },
        { label: "KELUAR", align: "center" },
        { label: "SISA", align: "center" },
        { label: "EXP", align: "center" },
      ],
      rows: dataTampil.map((ob, idx) => [
        idx + 1,
        ob.nama,
        ob.no_faktur || "-",
        formatTgl(ob.tgl_faktur),
        ob.batch || "-",
        ob.kemasan || "-",
        ob.stok,
        ob.masuk,
        ob.jml,
        ob.keluar,
        ob.sisa,
        formatTgl(ob.ekp),
      ]),
    });
  }

  function handleExportWordUtama() {
    exportWord({
      filename: `Daftar_Stok_Obat_${dariTanggal}_sd_${sampaiTanggal}`,
      judul: "DAFTAR STOK OBAT - APOTEK BIMA FARMA",
      periode: `DARI TANGGAL ${formatTgl(dariTanggal)} SAMPAI TANGGAL ${formatTgl(sampaiTanggal)}`,
      headers: [
        { label: "NO", align: "center" },
        { label: "NAMA OBAT", align: "left" },
        { label: "NO FAKTUR", align: "left" },
        { label: "TGL FAKTUR", align: "center" },
        { label: "BATCH", align: "center" },
        { label: "KEMASAN", align: "left" },
        { label: "STOK", align: "center" },
        { label: "MASUK", align: "center" },
        { label: "JML", align: "center" },
        { label: "KELUAR", align: "center" },
        { label: "SISA", align: "center" },
        { label: "EXP", align: "center" },
      ],
      rows: dataTampil.map((ob, idx) => [
        idx + 1,
        ob.nama,
        ob.no_faktur || "-",
        formatTgl(ob.tgl_faktur),
        ob.batch || "-",
        ob.kemasan || "-",
        ob.stok,
        ob.masuk,
        ob.jml,
        ob.keluar,
        ob.sisa,
        formatTgl(ob.ekp),
      ]),
    });
  }

  // Koreksi langsung stok via dialog mini tanpa data tambahan
  async function handleSimpanKoreksiModal() {
    if (!modalKoreksiObat) return;
    const angka = Number(inputStokCepat);
    if (isNaN(angka) || angka < 0) {
      alert("Masukkan angka stok yang valid.");
      return;
    }

    setLoadingKoreksiCepat(true);
    setError("");
    setSukses("");

    try {
      await api("/obat/opname", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              obat_id: modalKoreksiObat.id,
              stok_fisik: angka,
            },
          ],
        }),
      });

      const targetId = modalKoreksiObat.id;
      const targetNama = modalKoreksiObat.nama;
      const selisih = angka - (modalKoreksiObat.sisa ?? modalKoreksiObat.stok ?? 0);

      setDaftarObat((prev) =>
        prev.map((item) => {
          if (item.id !== targetId) return item;
          const stokBaru = Math.max(item.stok + selisih, 0);
          const sisaBaru = Math.max(angka, 0);
          return {
            ...item,
            stok: stokBaru,
            jml: stokBaru + item.masuk,
            sisa: sisaBaru,
          };
        })
      );
      setModalKoreksiObat(null);
      setSukses(`Stok "${targetNama}" berhasil dikoreksi menjadi ${angka}.`);
    } catch (err) {
      setError("Gagal menyimpan koreksi stok: " + (err.message || ""));
    } finally {
      setLoadingKoreksiCepat(false);
    }
  }

  // Hapus data obat (Bak Sampah)
  async function handleHapusObat(ob) {
    if (!window.confirm(`Yakin ingin menghapus obat "${ob.nama}"?`)) return;

    setError("");
    setSukses("");

    try {
      await api(`/obat/${ob.id}`, { method: "DELETE" });
      setDaftarObat((prev) => prev.filter((item) => item.id !== ob.id));
      setSukses(`Obat "${ob.nama}" berhasil dihapus.`);
    } catch (err) {
      setError(`Gagal menghapus obat "${ob.nama}": ` + (err.message || ""));
    }
  }

  return (
    <KasirShell>
      <div style={{ padding: "16px 20px" }}>
        {/* KOP RESMI DOKUMEN SESUAI EXCEL KLIEN */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "18px 24px 14px",
            border: "1.5px solid #E2E8F0",
            marginBottom: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: "#0F172A",
              margin: 0,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            DAFTAR STOK OBAT
          </h1>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "var(--magenta, #7E22CE)",
              marginTop: 3,
            }}
          >
            APOTEK BIMA FARMA
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
            Jln. Tanimulya Raya no 1 Haji Gofur Ngamprah Bandung Barat
          </div>

          {/* BARIS FILTER DARI TANGGAL SAMPAI TANGGAL & TOMBOL CETAK */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 14,
              marginTop: 16,
              paddingTop: 14,
              borderTop: "1.5px dashed #CBD5E1",
            }}
          >
            {/* Filter Rentang Tanggal */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "#1E293B" }}>
                DARI TANGGAL
              </span>
              <input
                type="date"
                value={dariTanggal}
                onChange={(e) => setDariTanggal(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1.5px solid #CBD5E1",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#0F172A",
                  background: "#F8FAFC",
                }}
              />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "#1E293B" }}>
                SAMPAI TANGGAL
              </span>
              <input
                type="date"
                value={sampaiTanggal}
                onChange={(e) => setSampaiTanggal(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1.5px solid #CBD5E1",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#0F172A",
                  background: "#F8FAFC",
                }}
              />
            </div>

            {/* Pencarian Obat & Tombol Cetak Dokumen */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Cari nama obat / batch / no faktur..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #CBD5E1",
                    fontSize: 12,
                    minWidth: 260,
                  }}
                />
              </div>

              <TombolExportGroup
                onCetakPdf={handleCetakUtama}
                onExportExcel={handleExportExcelUtama}
                onExportWord={handleExportWordUtama}
                disabled={loading || dataTampil.length === 0}
                labelCetak="CETAK"
              />
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "#FEF2F2",
              color: "#DC2626",
              fontSize: 12.5,
              fontWeight: 600,
              marginBottom: 14,
              border: "1px solid #FECACA",
            }}
          >
            {error}
          </div>
        )}

        {sukses && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "#ECFDF5",
              color: "#065F46",
              fontSize: 12.5,
              fontWeight: 600,
              marginBottom: 14,
              border: "1px solid #A7F3D0",
            }}
          >
            {sukses}
          </div>
        )}

        {/* TABEL DAFTAR STOK OBAT 13 KOLOM SESUAI EXCEL FISIK */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1.5px solid #CBD5E1",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflowX: "auto",
          }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748B", fontSize: 13 }}>
              Memuat data stok obat dan mutasi transaksi...
            </div>
          ) : dataTampil.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748B", fontSize: 13 }}>
              Tidak ada data obat yang sesuai dengan pencarian atau periode tanggal.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                fontFamily: "inherit",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#F1F5F9",
                    borderBottom: "2px solid #94A3B8",
                    color: "#0F172A",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  <th style={{ padding: "9px 8px", textAlign: "center", borderRight: "1px solid #CBD5E1", width: 40 }}>
                    NO
                  </th>
                  <th style={{ padding: "9px 12px", textAlign: "left", borderRight: "1px solid #CBD5E1", minWidth: 200 }}>
                    NAMA OBAT
                  </th>
                  <th style={{ padding: "9px 10px", textAlign: "left", borderRight: "1px solid #CBD5E1", width: 110 }}>
                    NO FAKTUR
                  </th>
                  <th style={{ padding: "9px 8px", textAlign: "center", borderRight: "1px solid #CBD5E1", width: 95 }}>
                    TGL FAKTUR
                  </th>
                  <th style={{ padding: "9px 8px", textAlign: "center", borderRight: "1px solid #CBD5E1", width: 90 }}>
                    BATCH
                  </th>
                  <th style={{ padding: "9px 10px", textAlign: "left", borderRight: "1px solid #CBD5E1", width: 90 }}>
                    KEMASAN
                  </th>
                  <th style={{ padding: "9px 8px", textAlign: "center", borderRight: "1px solid #CBD5E1", width: 70, background: "#F8FAFC" }}>
                    STOK
                  </th>
                  <th
                    style={{
                      padding: "9px 8px",
                      textAlign: "center",
                      borderRight: "1px solid #CBD5E1",
                      width: 70,
                      background: "#ECFDF5",
                      color: "#065F46",
                    }}
                    title="Klik angka masuk untuk melihat rincian per tanggal masuk & nama PBF"
                  >
                    MASUK
                  </th>
                  <th style={{ padding: "9px 8px", textAlign: "center", borderRight: "1px solid #CBD5E1", width: 60, background: "#F8FAFC" }}>
                    JML
                  </th>
                  <th
                    style={{
                      padding: "9px 8px",
                      textAlign: "center",
                      borderRight: "1px solid #CBD5E1",
                      width: 70,
                      background: "#FEF2F2",
                      color: "#991B1B",
                    }}
                    title="Klik angka keluar untuk melihat rincian per tanggal keluar & no struk"
                  >
                    KELUAR
                  </th>
                  <th style={{ padding: "9px 8px", textAlign: "center", borderRight: "1px solid #CBD5E1", width: 65, background: "#F0FDF4", color: "#166534" }}>
                    SISA
                  </th>
                  <th style={{ padding: "9px 8px", textAlign: "center", borderRight: "1px solid #CBD5E1", width: 95 }}>
                    EXP
                  </th>
                  <th style={{ padding: "9px 10px", textAlign: "center", width: 85 }}>
                    AKSI
                  </th>
                </tr>
              </thead>
              <tbody>
                {dataTampil.map((ob, idx) => {
                  const adaMasuk = ob.masuk > 0;
                  const adaKeluar = ob.keluar > 0;

                  return (
                    <tr
                      key={ob.id}
                      style={{
                        borderBottom: "1px solid #E2E8F0",
                        background: idx % 2 === 1 ? "#FAFAFA" : "#fff",
                      }}
                    >
                      {/* NO */}
                      <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #E2E8F0", color: "#64748B", fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* NAMA OBAT */}
                      <td style={{ padding: "8px 12px", textAlign: "left", borderRight: "1px solid #E2E8F0", fontWeight: 700, color: "#0F172A" }}>
                        {ob.nama}
                      </td>

                      {/* NO FAKTUR */}
                      <td style={{ padding: "8px 10px", textAlign: "left", borderRight: "1px solid #E2E8F0", fontFamily: "monospace", fontSize: 11.5, color: "#334155" }}>
                        {ob.no_faktur || "-"}
                      </td>

                      {/* TGL FAKTUR */}
                      <td style={{ padding: "8px 8px", textAlign: "center", borderRight: "1px solid #E2E8F0", fontSize: 11.5, color: "#475569" }}>
                        {formatTgl(ob.tgl_faktur)}
                      </td>

                      {/* BATCH */}
                      <td style={{ padding: "8px 8px", textAlign: "center", borderRight: "1px solid #E2E8F0", fontSize: 11.5, color: "#334155" }}>
                        {ob.batch || "-"}
                      </td>

                      {/* KEMASAN */}
                      <td style={{ padding: "8px 10px", textAlign: "left", borderRight: "1px solid #E2E8F0", color: "#475569" }}>
                        {ob.kemasan || "-"}
                      </td>

                      {/* STOK (AWAL) */}
                      <td style={{ padding: "8px 8px", textAlign: "center", borderRight: "1px solid #E2E8F0", fontWeight: 700, color: "#334155" }}>
                        {ob.stok}
                      </td>

                      {/* MASUK (INTERAKTIF KLIK DRILLDOWN RINCIAN MASUK & PBF) */}
                      <td
                        style={{
                          padding: "8px 8px",
                          textAlign: "center",
                          borderRight: "1px solid #E2E8F0",
                          background: adaMasuk ? "#F0FDF4" : undefined,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setModalMasukObat(ob)}
                          title="Klik untuk melihat rincian pertanggal masuk obat dan nama PBF"
                          style={{
                            border: "none",
                            background: adaMasuk ? "#DCFCE7" : "transparent",
                            color: adaMasuk ? "#15803D" : "#94A3B8",
                            fontWeight: 800,
                            fontSize: 12,
                            padding: "3px 8px",
                            borderRadius: 6,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            textDecoration: adaMasuk ? "underline" : "none",
                          }}
                        >
                          {ob.masuk}
                        </button>
                      </td>

                      {/* JML (STOK AWAL + MASUK) */}
                      <td style={{ padding: "8px 8px", textAlign: "center", borderRight: "1px solid #E2E8F0", fontWeight: 700, color: "#1E293B" }}>
                        {ob.jml}
                      </td>

                      {/* KELUAR (INTERAKTIF KLIK DRILLDOWN RINCIAN KELUAR) */}
                      <td
                        style={{
                          padding: "8px 8px",
                          textAlign: "center",
                          borderRight: "1px solid #E2E8F0",
                          background: adaKeluar ? "#FEF2F2" : undefined,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setModalKeluarObat(ob)}
                          title="Klik untuk melihat rincian pertanggal keluar obat dan no struk"
                          style={{
                            border: "none",
                            background: adaKeluar ? "#FEE2E2" : "transparent",
                            color: adaKeluar ? "#B91C1C" : "#94A3B8",
                            fontWeight: 800,
                            fontSize: 12,
                            padding: "3px 8px",
                            borderRadius: 6,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            textDecoration: adaKeluar ? "underline" : "none",
                          }}
                        >
                          {ob.keluar}
                        </button>
                      </td>

                      {/* SISA (STOK AKHIR) */}
                      <td style={{ padding: "8px 8px", textAlign: "center", borderRight: "1px solid #E2E8F0", fontWeight: 800, color: ob.sisa <= 5 ? "#DC2626" : "#047857" }}>
                        {ob.sisa}
                      </td>

                      {/* EXP (EXPIRED TERAKHIR) */}
                      <td style={{ padding: "8px 8px", textAlign: "center", borderRight: "1px solid #E2E8F0", fontSize: 11.5, color: "#475569" }}>
                        {formatTgl(ob.ekp)}
                      </td>

                      {/* AKSI: PENSIL (KOREKSI LANGSUNG STOK) & BAK SAMPAH (HAPUS) */}
                      <td style={{ padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {/* 1. Tombol Pensil (Koreksi Langsung Stok) */}
                          <button
                            type="button"
                            onClick={() => {
                              setModalKoreksiObat(ob);
                              setInputStokCepat(String(ob.sisa ?? ob.stok ?? 0));
                            }}
                            title="Koreksi langsung angka stok"
                            style={{
                              width: 30,
                              height: 30,
                              minWidth: 30,
                              minHeight: 30,
                              borderRadius: 6,
                              border: "1.5px solid #DDD6FE",
                              background: "#FAF5FF",
                              color: "#7E22CE",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                            }}
                          >
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#7E22CE"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: 15, height: 15, minWidth: 15, minHeight: 15, display: "block", flexShrink: 0 }}
                            >
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          {/* 2. Tombol Bak Sampah (Hapus Data Obat) */}
                          <button
                            type="button"
                            onClick={() => handleHapusObat(ob)}
                            title="Hapus data obat"
                            style={{
                              width: 30,
                              height: 30,
                              minWidth: 30,
                              minHeight: 30,
                              borderRadius: 6,
                              border: "1.5px solid #FECACA",
                              background: "#FEF2F2",
                              color: "#DC2626",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                            }}
                          >
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#DC2626"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: 15, height: 15, minWidth: 15, minHeight: 15, display: "block", flexShrink: 0 }}
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL 1: RINCIAN OBAT MASUK PER TANGGAL & PBF (BISA DICETAK) */}
      {modalMasukObat && (
        <RincianMasukModal
          obat={modalMasukObat}
          dariTanggal={dariTanggal}
          sampaiTanggal={sampaiTanggal}
          onClose={() => setModalMasukObat(null)}
        />
      )}

      {/* MODAL 2: RINCIAN OBAT KELUAR PER TANGGAL & STRUK (BISA DICETAK) */}
      {modalKeluarObat && (
        <RincianKeluarModal
          obat={modalKeluarObat}
          dariTanggal={dariTanggal}
          sampaiTanggal={sampaiTanggal}
          onClose={() => setModalKeluarObat(null)}
        />
      )}

      {/* MODAL MINI KOREKSI STOK LANGSUNG (PENSIL) */}
      {modalKoreksiObat && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalKoreksiObat(null);
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 360,
              padding: "20px 22px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
              Koreksi Stok Obat
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--magenta, #7E22CE)", marginBottom: 14 }}>
              {modalKoreksiObat.nama}
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>
              Stok Nyata Saat Ini ({modalKoreksiObat.satuan_dasar || "Unit"}):
            </label>
            <input
              type="number"
              min="0"
              autoFocus
              value={inputStokCepat}
              onChange={(e) => setInputStokCepat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSimpanKoreksiModal();
                if (e.key === "Escape") setModalKoreksiObat(null);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "2px solid var(--magenta, #7E22CE)",
                fontSize: 16,
                fontWeight: 800,
                boxSizing: "border-box",
                marginBottom: 16,
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setModalKoreksiObat(null)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#475569",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loadingKoreksiCepat}
                onClick={handleSimpanKoreksiModal}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--magenta, #7E22CE)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: loadingKoreksiCepat ? "not-allowed" : "pointer",
                  opacity: loadingKoreksiCepat ? 0.7 : 1,
                }}
              >
                {loadingKoreksiCepat ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </KasirShell>
  );
}
