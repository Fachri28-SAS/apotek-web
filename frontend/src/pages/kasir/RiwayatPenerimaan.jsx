import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import { cetakBukuBarangMasuk } from "../../utils/cetakLaporanPenerimaan";
import { exportExcel, exportWord } from "../../utils/exportDokumen";
import KasirShell from "./KasirShell";
import DetailFakturModal from "./komponen/DetailFakturModal";
import EditPenerimaanModal from "./komponen/EditPenerimaanModal";
import TombolExportGroup from "./komponen/TombolExportGroup";

function getTglYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const now = new Date();
const awalBulanDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const hariIniDefault = getTglYmd(now);

export default function RiwayatPenerimaan() {
  const [daftar, setDaftar] = useState([]);
  const [dariTanggal, setDariTanggal] = useState(awalBulanDefault);
  const [sampaiTanggal, setSampaiTanggal] = useState(hariIniDefault);
  const [filterSupplier, setFilterSupplier] = useState("semua"); // "semua" | nama PT
  const [filterPetugas, setFilterPetugas] = useState("semua"); // "semua" | user_id
  const [daftarSupplierList, setDaftarSupplierList] = useState([]);
  const [daftarUserList, setDaftarUserList] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [penerimaanEdit, setPenerimaanEdit] = useState(null);
  const [notifSukses, setNotifSukses] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [modalPpnItem, setModalPpnItem] = useState(null);
  const [modalPpnRingkasan, setModalPpnRingkasan] = useState(false);

  // Ambil daftar supplier aktif
  useEffect(() => {
    api("/suppliers")
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setDaftarSupplierList(list);
      })
      .catch(() => {});
  }, []);

  // Ambil daftar akun pengguna/kasir
  useEffect(() => {
    api("/users")
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setDaftarUserList(list);
      })
      .catch(() => {});
  }, []);

  // Map ID user ke nama
  const userMap = {};
  daftarUserList.forEach((u) => {
    userMap[u.id] = u.nama || u.username;
  });

  function getNamaPetugas(faktur) {
    if (faktur.user?.nama) return faktur.user.nama;
    if (faktur.user?.username) return faktur.user.username;
    if (faktur.user_id && userMap[faktur.user_id]) return userMap[faktur.user_id];
    return "Admin (Sistem)";
  }

  // Ambil data faktur penerimaan
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dariTanggal) params.set("dari_tanggal", dariTanggal);
    if (sampaiTanggal) params.set("sampai_tanggal", sampaiTanggal);
    if (search.trim()) params.set("search", search.trim());
    if (filterSupplier && filterSupplier !== "semua") params.set("nama_supplier", filterSupplier);

    const timer = setTimeout(() => {
      api(`/penerimaan?${params}`)
        .then((d) => {
          setDaftar(d || []);
          setError("");
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [dariTanggal, sampaiTanggal, search, filterSupplier, refreshKey]);

  // Daftar nama supplier unik
  const supplierOptions = Array.from(
    new Set([
      ...daftarSupplierList.map((s) => s.nama).filter(Boolean),
      ...daftar.map((p) => p.nama_supplier).filter(Boolean),
    ])
  ).sort((a, b) => a.localeCompare(b));

  // Filter berdasarkan supplier dan petugas jika dipilih
  const daftarTampil = daftar.filter((p) => {
    if (filterSupplier !== "semua" && p.nama_supplier !== filterSupplier) return false;
    if (filterPetugas !== "semua" && String(p.user_id) !== String(filterPetugas)) return false;
    return true;
  });

  // Flatten faktur menjadi deretan baris per-item (sesuai Foto 1 Buku Penerimaan Barang Fisik)
  // Kolom: NO, Tanggal, No Faktur, PBF, Nama Barang, Jumlah, Satuan, EXP, No Batch, Harga Satuan (Rp), Jumlah (Rp), Jumlah + PPN, Petugas
  const barisItem = [];
  let noUrut = 1;

  daftarTampil.forEach((p) => {
    const items = p.items || [];
    const tarifPpn = p.is_pkp ? (Number(p.persen_ppn) > 0 ? Number(p.persen_ppn) : 11) : 0;
    const petugasNama = getNamaPetugas(p);

    if (items.length === 0) {
      const jmlRp = Number(p.total || 0);
      const nilaiPpn = p.is_pkp ? Math.round(jmlRp * (tarifPpn / 100)) : 0;
      const jmlPpn = jmlRp + nilaiPpn;
      barisItem.push({
        no: noUrut++,
        fakturId: p.id,
        faktur: p,
        tglInput: p.created_at || p.tanggal_terima,
        tanggal: p.tanggal_terima,
        noFaktur: p.no_faktur,
        pbf: p.nama_supplier,
        namaBarang: "(Faktur Tanpa Rincian Item)",
        jumlah: 1,
        satuan: "Faktur",
        exp: p.tanggal_jatuh_tempo,
        noBatch: "—",
        hargaSatuan: jmlRp,
        jumlahRp: jmlRp,
        jumlahPpnRp: jmlPpn,
        nilaiPpnRp: nilaiPpn,
        tarifPpn: tarifPpn,
        isPkp: p.is_pkp,
        petugas: petugasNama,
        userId: p.user_id,
      });
    } else {
      items.forEach((it) => {
        const qty = Number(it.qty || 0);
        const hargaBeli = Number(it.harga_beli || 0);
        const subtotalItem = Number(it.subtotal ?? (qty * hargaBeli - Number(it.diskon || 0)));
        const nilaiPpnItem = p.is_pkp ? Math.round(subtotalItem * (tarifPpn / 100)) : 0;
        const subtotalPpn = subtotalItem + nilaiPpnItem;

        barisItem.push({
          no: noUrut++,
          fakturId: p.id,
          faktur: p,
          tglInput: p.created_at || p.tanggal_terima,
          tanggal: p.tanggal_terima,
          noFaktur: p.no_faktur,
          pbf: p.nama_supplier,
          namaBarang: it.nama_obat || "—",
          jumlah: qty,
          satuan: it.nama_satuan || "—",
          exp: it.tanggal_exp,
          noBatch: it.nomor_batch || "—",
          hargaSatuan: hargaBeli,
          jumlahRp: subtotalItem,
          jumlahPpnRp: subtotalPpn,
          nilaiPpnRp: nilaiPpnItem,
          tarifPpn: tarifPpn,
          isPkp: p.is_pkp,
          rawItem: it,
          petugas: petugasNama,
          userId: p.user_id,
        });
      });
    }
  });

  // Pencarian lokal jika user mencari di baris item
  const barisItemTampil = search.trim()
    ? barisItem.filter((b) => {
        const term = search.toLowerCase();
        return (
          b.namaBarang.toLowerCase().includes(term) ||
          b.noFaktur.toLowerCase().includes(term) ||
          b.pbf.toLowerCase().includes(term) ||
          b.noBatch.toLowerCase().includes(term) ||
          (b.petugas && b.petugas.toLowerCase().includes(term))
        );
      })
    : barisItem;

  // Akumulasi KPI
  const totalJumlahSemua = barisItemTampil.reduce((s, b) => s + Number(b.jumlahRp || 0), 0);
  const totalJumlahPpnSemua = barisItemTampil.reduce((s, b) => s + Number(b.jumlahPpnRp || 0), 0);
  const totalNilaiPpnSemua = barisItemTampil.reduce((s, b) => s + Number(b.nilaiPpnRp || 0), 0);
  const totalFakturUnik = new Set(barisItemTampil.map((b) => b.fakturId)).size;
  const totalFakturPkp = new Set(barisItemTampil.filter((b) => b.isPkp).map((b) => b.fakturId)).size;

  // Format tanggal singkat (misal: 25.11.24 atau 25/11/2024)
  function formatTgl(tglStr) {
    if (!tglStr) return "—";
    const d = new Date(tglStr);
    if (isNaN(d.getTime())) return tglStr;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  // Pecah nomor faktur panjang agar otomatis turun ke bawah (multi-line) dengan rapi
  function formatNoFakturMultiLine(no) {
    if (!no) return "—";
    const s = String(no).trim();
    if (s.includes("/") && s.length > 9) {
      const parts = s.split("/");
      const mid = Math.ceil(parts.length / 2);
      const line1 = parts.slice(0, mid).join("/");
      const line2 = parts.slice(mid).join("/");
      return (
        <div style={{ lineHeight: 1.25, fontSize: 11, fontFamily: "monospace", fontWeight: 600, color: "var(--ink)", wordBreak: "break-all" }}>
          <div>{line1}/</div>
          <div>{line2}</div>
        </div>
      );
    }
    if (s.length > 10) {
      const mid = Math.ceil(s.length / 2);
      return (
        <div style={{ lineHeight: 1.25, fontSize: 11, fontFamily: "monospace", fontWeight: 600, color: "var(--ink)" }}>
          <div>{s.slice(0, mid)}</div>
          <div>{s.slice(mid)}</div>
        </div>
      );
    }
    return (
      <div style={{ lineHeight: 1.25, fontSize: 11.5, fontFamily: "monospace", fontWeight: 600, color: "var(--ink)", wordBreak: "break-all" }}>
        {s}
      </div>
    );
  }

  function siapkanDataExportPenerimaan() {
    const headers = [
      { label: "NO", align: "center", width: "35px" },
      { label: "Tgl Input", align: "center" },
      { label: "Nama PBF", align: "left" },
      { label: "No Faktur", align: "left" },
      { label: "Tgl Faktur", align: "center" },
      { label: "Nama Barang", align: "left" },
      { label: "Jumlah", align: "center" },
      { label: "Satuan", align: "center" },
      { label: "EXP", align: "center" },
      { label: "No Batch", align: "center" },
      { label: "Hrg Satuan", align: "right" },
      { label: "Jumlah", align: "right" },
      { label: "Total + PPN", align: "right" },
    ];

    const rows = barisItemTampil.map((b, idx) => [
      idx + 1,
      `${formatTgl(b.tglInput)}${b.petugas ? ` (${b.petugas})` : ""}`,
      b.pbf || "—",
      b.noFaktur || "—",
      formatTgl(b.tanggal),
      b.namaBarang || "—",
      b.jumlah,
      b.satuan || "—",
      b.exp ? formatTgl(b.exp) : "—",
      b.noBatch || "—",
      rupiah(b.hargaSatuan),
      rupiah(b.jumlahRp),
      rupiah(b.jumlahPpnRp),
    ]);

    const footers = [];

    const periodeTeks = dariTanggal && sampaiTanggal ? `${dariTanggal} s/d ${sampaiTanggal}` : "Semua Periode";

    return { headers, rows, footers, periodeTeks };
  }

  function handleExcel() {
    const { headers, rows, footers, periodeTeks } = siapkanDataExportPenerimaan();
    exportExcel({
      filename: `daftar-penerimaan-barang`,
      judul: "DAFTAR PENERIMAAN BARANG",
      periode: periodeTeks,
      keterangan: `APOTEK BIMA FARMA`,
      headers,
      rows,
      footers,
    });
  }

  function handleWord() {
    const { headers, rows, footers, periodeTeks } = siapkanDataExportPenerimaan();
    exportWord({
      filename: `daftar-penerimaan-barang`,
      judul: "DAFTAR PENERIMAAN BARANG",
      periode: periodeTeks,
      keterangan: `APOTEK BIMA FARMA`,
      headers,
      rows,
      footers,
      orientation: "landscape",
      namaUser: "Apoteker / Kasir",
    });
  }

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Data Penerimaan Barang</h1>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {notifSukses && (
        <div
          style={{
            margin: "0 0 16px 0",
            padding: "12px 18px",
            background: "#ECFDF5",
            border: "1.5px solid #6EE7B7",
            borderRadius: 12,
            color: "#065F46",
            fontSize: 13.5,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.08)",
          }}
        >
          <span style={{ fontSize: 16 }}>✅</span>
          <span>{notifSukses}</span>
        </div>
      )}



      <div className="panel">
        <div className="panel-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          {/* Kotak Pencarian */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 240, maxWidth: 360, background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: 12, padding: "8px 14px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 17, height: 17, color: "var(--ink-soft)" }}>
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama barang, PBF, no. faktur, batch…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13.5, width: "100%", color: "var(--ink)" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", padding: 0 }}>
                
              </button>
            )}
          </div>

          {/* Filter Rentang Tanggal, Supplier & Tombol Cetak */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="kalender-filter-group" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div className="kalender-item-wrap" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                <span>Dari:</span>
                <input
                  type="date"
                  value={dariTanggal}
                  onChange={(e) => setDariTanggal(e.target.value)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1.5px solid var(--line)",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div className="kalender-item-wrap" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                <span>Sampai:</span>
                <input
                  type="date"
                  value={sampaiTanggal}
                  onChange={(e) => setSampaiTanggal(e.target.value)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1.5px solid var(--line)",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Filter PT / Supplier */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              <span>PBF:</span>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: filterSupplier !== "semua" ? "1.5px solid var(--magenta)" : "1.5px solid var(--line)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  background: filterSupplier !== "semua" ? "#FAF5FF" : "#fff",
                  color: filterSupplier !== "semua" ? "var(--magenta-dark)" : "var(--ink)",
                  fontWeight: filterSupplier !== "semua" ? 700 : 500,
                  maxWidth: 180,
                  cursor: "pointer",
                }}
              >
                <option value="semua">Semua PBF / Supplier</option>
                {supplierOptions.map((sup) => (
                  <option key={sup} value={sup}>
                    {sup}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Petugas Input */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              <span>Petugas:</span>
              <select
                value={filterPetugas}
                onChange={(e) => setFilterPetugas(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: filterPetugas !== "semua" ? "1.5px solid #8B5CF6" : "1.5px solid var(--line)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  background: filterPetugas !== "semua" ? "#F5F3FF" : "#fff",
                  color: filterPetugas !== "semua" ? "#6D28D9" : "var(--ink)",
                  fontWeight: filterPetugas !== "semua" ? 700 : 500,
                  maxWidth: 180,
                  cursor: "pointer",
                }}
              >
                <option value="semua">Semua Petugas</option>
                {daftarUserList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama || u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <TombolExportGroup
              onCetakPdf={() => cetakBukuBarangMasuk(barisItemTampil, { dariTanggal, sampaiTanggal })}
              onExportExcel={handleExcel}
              onExportWord={handleWord}
              disabled={barisItemTampil.length === 0}
            />
          </div>
        </div>

        {loading ? (
          <div className="panel-kosong">Memuat buku penerimaan barang…</div>
        ) : barisItemTampil.length === 0 ? (
          <div className="panel-kosong">
            {search ? `Tidak ditemukan barang untuk pencarian "${search}".` : "Belum ada data barang masuk pada periode tanggal ini."}
          </div>
        ) : (
          <div className="obat-table-wrap">
            {/* Tabel Sesuai Buku Catatan Fisik: Ringkas, Pas Layar Penuh 100% Tanpa Lebih ke Kanan */}
            <table className="obat-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: 34, textAlign: "center", padding: "6px 2px" }}>NO</th>
                  <th style={{ width: 72, textAlign: "center", padding: "6px 2px" }}>Tgl Input</th>
                  <th style={{ width: "26%", minWidth: 130, padding: "6px 6px" }}>Nama PBF</th>
                  <th style={{ width: 68, maxWidth: 68, textAlign: "center", padding: "6px 2px" }}>No Faktur</th>
                  <th style={{ width: 68, textAlign: "center", padding: "6px 2px" }}>Tgl Faktur</th>
                  <th style={{ width: "19%", minWidth: 110, padding: "6px 6px" }}>Nama Barang</th>
                  <th style={{ width: 44, textAlign: "center", padding: "6px 2px" }}>Jumlah</th>
                  <th style={{ width: 48, textAlign: "center", padding: "6px 2px" }}>Satuan</th>
                  <th style={{ width: 64, textAlign: "center", padding: "6px 2px" }}>EXP</th>
                  <th style={{ width: 68, textAlign: "center", padding: "6px 2px" }}>No Batch</th>
                  <th style={{ width: 72, textAlign: "left", padding: "6px 4px" }}>Hrg Satuan</th>
                  <th style={{ width: 72, textAlign: "left", padding: "6px 4px" }}>Jumlah</th>
                  <th style={{ width: 84, textAlign: "left", padding: "6px 4px" }}>Jumlah + PPN</th>
                  <th style={{ width: 44, textAlign: "center", padding: "6px 2px" }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {barisItemTampil.map((b) => (
                  <tr
                    key={`${b.fakturId}_${b.no}`}
                    className="baris-klik"
                    onClick={() => setDetail(b.faktur)}
                    title="Klik baris untuk melihat rincian faktur lengkap"
                  >
                    {/* 1. NO */}
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--ink-soft)", padding: "6px 2px" }}>
                      {b.no}
                    </td>

                    {/* 2. Tgl Input & Petugas (Disatukan dalam 1 kolom ringkas) */}
                    <td style={{ textAlign: "center", whiteSpace: "nowrap", padding: "6px 2px" }}>
                      <div style={{ fontWeight: 600, fontSize: 11.5 }}>{formatTgl(b.tglInput)}</div>
                      {b.petugas && (
                        <div
                          style={{
                            marginTop: 2,
                            display: "inline-block",
                            padding: "1px 4px",
                            borderRadius: 4,
                            background: "#F5F3FF",
                            border: "1px solid #DDD6FE",
                            color: "#5B21B6",
                            fontSize: 9.5,
                            fontWeight: 700,
                            maxWidth: 68,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={b.petugas}
                        >
                          {b.petugas}
                        </div>
                      )}
                    </td>

                    {/* 3. Nama PBF (Ukuran kecil & 1 baris) */}
                    <td
                      style={{
                        fontWeight: 600,
                        color: "var(--ink)",
                        fontSize: 10.5,
                        whiteSpace: "nowrap",
                        padding: "6px 6px",
                      }}
                      title={b.pbf}
                    >
                      {b.pbf}
                    </td>

                    {/* 4. No Faktur (Otomatis pecah turun ke bawah / multi-line agar kolom tetap ramping) */}
                    <td className="obat-batch-cell" style={{ maxWidth: 68, padding: "6px 2px", verticalAlign: "middle", textAlign: "center" }}>
                      {formatNoFakturMultiLine(b.noFaktur)}
                    </td>

                    {/* 5. Tgl Faktur */}
                    <td style={{ textAlign: "center", fontWeight: 600, whiteSpace: "nowrap", padding: "6px 2px", fontSize: 11.5 }}>
                      {formatTgl(b.tanggal)}
                    </td>

                    {/* 6. Nama Barang */}
                    <td style={{ fontWeight: 700, color: "var(--magenta-dark)", wordBreak: "break-word", padding: "6px 6px" }}>
                      {b.namaBarang}
                    </td>

                    {/* 7. Jumlah */}
                    <td style={{ textAlign: "center", fontWeight: 700, padding: "6px 2px" }}>
                      {b.jumlah}
                    </td>

                    {/* 8. Satuan */}
                    <td style={{ textAlign: "center", color: "var(--ink-soft)", padding: "6px 2px" }}>
                      {b.satuan}
                    </td>

                    {/* 9. EXP */}
                    <td style={{ textAlign: "center", whiteSpace: "nowrap", fontSize: 11, padding: "6px 2px" }}>
                      {b.exp ? formatTgl(b.exp) : "—"}
                    </td>

                    {/* 10. No Batch */}
                    <td style={{ textAlign: "center", fontSize: 11, fontFamily: "monospace", color: "var(--ink-soft)", wordBreak: "break-all", padding: "6px 2px" }}>
                      {b.noBatch}
                    </td>

                    {/* 11. Hrg Satuan */}
                    <td style={{ textAlign: "left", fontSize: 11.5, whiteSpace: "nowrap", padding: "6px 4px" }}>
                      {rupiah(b.hargaSatuan)}
                    </td>

                    {/* 12. Jumlah (Rp) */}
                    <td style={{ textAlign: "left", fontWeight: 700, color: "var(--ink)", fontSize: 11.5, whiteSpace: "nowrap", padding: "6px 4px" }}>
                      {rupiah(b.jumlahRp)}
                    </td>

                    {/* 13. Total + PPN */}
                    <td
                      style={{ textAlign: "left", fontWeight: 800, color: "#6B21A8", fontSize: 11.5, whiteSpace: "nowrap", padding: "6px 4px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalPpnItem(b);
                      }}
                      title="Klik untuk melihat rincian PPN barang ini"
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 2,
                          cursor: "pointer",
                          padding: "2px 5px",
                          borderRadius: 6,
                          transition: "all 0.15s ease",
                          background: "#FAF5FF",
                          border: "1px solid #E9D5FF",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#F3E8FF";
                          e.currentTarget.style.borderColor = "#C084FC";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#FAF5FF";
                          e.currentTarget.style.borderColor = "#E9D5FF";
                        }}
                      >
                        <span style={{ fontSize: 11.5 }}>{rupiah(b.jumlahPpnRp)}</span>
                      </div>
                    </td>

                    {/* 14. Aksi Edit / Koreksi */}
                    <td style={{ textAlign: "center", padding: "4px 2px" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setPenerimaanEdit(b.faktur)}
                        title="Edit / Koreksi Faktur (Nama PBF, Besar Uang, Qty, dsb)"
                        style={{
                          padding: "4px 6px",
                          borderRadius: 6,
                          border: "1.5px solid #D8B4FE",
                          background: "#FAF5FF",
                          color: "#6B21A8",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#7E22CE";
                          e.currentTarget.style.borderColor = "#7E22CE";
                          e.currentTarget.style.color = "#FFFFFF";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#FAF5FF";
                          e.currentTarget.style.borderColor = "#D8B4FE";
                          e.currentTarget.style.color = "#6B21A8";
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 14, height: 14 }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#F8FAFC", borderTop: "2px solid #CBD5E1", fontWeight: 800 }}>
                  <td colSpan={11} style={{ textAlign: "right", padding: "10px 12px", fontSize: 12.5, color: "var(--ink-soft)" }}>
                    TOTAL ({barisItemTampil.length} Item) :
                  </td>
                  <td style={{ textAlign: "left", padding: "10px 4px", fontSize: 12, color: "var(--ink)" }}>
                    {rupiah(totalJumlahSemua)}
                  </td>
                  <td style={{ textAlign: "left", padding: "10px 4px", fontSize: 13.5, color: "#6B21A8", fontWeight: 800 }}>
                    {rupiah(totalJumlahPpnSemua)}
                  </td>
                  <td style={{ width: 44 }}></td>
                </tr>
              </tfoot>
            </table>

            {/* Ringkasan Jumlah Besar Uang di Pojok Kanan Bawah */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 14 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 22px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)",
                  border: "1.5px solid #D8B4FE",
                  boxShadow: "0 2px 10px rgba(147, 51, 234, 0.08)",
                }}
              >
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#6B21A8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Jumlah Besar Uang (Jumlah + PPN) &middot; {barisItemTampil.length} Item
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#581C87", marginTop: 2 }}>
                    {rupiah(totalJumlahPpnSemua)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Rincian PPN Barang Satuan */}
      {modalPpnItem && (
        <div
          className="modal-overlay"
          onClick={() => setModalPpnItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 480,
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.22)",
              animation: "slideDown 0.2s ease",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #7E22CE, #6B21A8)",
                padding: "16px 20px",
                color: "#fff",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#E9D5FF" }}>
                  Rincian Pajak Pertambahan Nilai (PPN)
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4 }}>
                  {modalPpnItem.namaBarang}
                </div>
                <div style={{ fontSize: 12, color: "#F3E8FF", marginTop: 2 }}>
                  Faktur #{modalPpnItem.noFaktur} &bull; {modalPpnItem.pbf}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPpnItem(null)}
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "none",
                  borderRadius: "50%",
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "18px 20px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  background: "#F8FAFC",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748B" }}>Kuantitas (Qty)</span>
                  <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                    {modalPpnItem.jumlah} {modalPpnItem.satuan}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748B" }}>Harga Beli Satuan</span>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                    {rupiah(modalPpnItem.hargaSatuan)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13.5,
                    paddingTop: 8,
                    borderTop: "1px dashed #CBD5E1",
                  }}
                >
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                    Dasar Pengenaan Pajak (DPP)
                  </span>
                  <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                    {rupiah(modalPpnItem.jumlahRp)}
                  </span>
                </div>
              </div>

              {/* Box Rincian PPN */}
              <div
                style={{
                  marginTop: 12,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: modalPpnItem.isPkp ? "#FAF5FF" : "#F8FAFC",
                  border: modalPpnItem.isPkp ? "1.5px solid #D8B4FE" : "1px solid #E2E8F0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: modalPpnItem.isPkp ? "#6B21A8" : "#475569" }}>
                    Besaran PPN
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: modalPpnItem.isPkp ? "#7E22CE" : "#475569" }}>
                    {modalPpnItem.isPkp ? `+${rupiah(modalPpnItem.nilaiPpnRp)}` : "Rp 0"}
                  </span>
                </div>
              </div>

              {/* Total Akhir */}
              <div
                style={{
                  marginTop: 12,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "#FDF4FF",
                  border: "1.5px solid #F0ABFC",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#86198F" }}>
                    TOTAL AKHIR (DPP + PPN)
                  </div>
                  <div style={{ fontSize: 11, color: "#A21CAF", marginTop: 1 }}>
                    Nilai yang dibayarkan ke Supplier
                  </div>
                </div>
                <div style={{ fontSize: 19, fontWeight: 900, color: "#701A75" }}>
                  {rupiah(modalPpnItem.jumlahPpnRp)}
                </div>
              </div>

              {/* Tombol Aksi */}
              <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    const f = modalPpnItem.faktur;
                    setModalPpnItem(null);
                    setDetail(f);
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 9,
                    border: "1.5px solid #E9D5FF",
                    background: "#FAF5FF",
                    color: "#6B21A8",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Lihat Faktur Lengkap 
                </button>
                <button
                  type="button"
                  onClick={() => setModalPpnItem(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 9,
                    border: "none",
                    background: "var(--magenta)",
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ringkasan Total PPN Keseluruhan */}
      {modalPpnRingkasan && (
        <div
          className="modal-overlay"
          onClick={() => setModalPpnRingkasan(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 520,
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.22)",
              animation: "slideDown 0.2s ease",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #7E22CE, #581C87)",
                padding: "18px 22px",
                color: "#fff",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#E9D5FF" }}>
                  Ringkasan Pajak Penerimaan Barang
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
                  Total PPN: {rupiah(totalNilaiPpnSemua)}
                </div>
                <div style={{ fontSize: 12, color: "#F3E8FF", marginTop: 2 }}>
                  Periode {formatTgl(dariTanggal)} s/d {formatTgl(sampaiTanggal)} &bull; {barisItemTampil.length} Item
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPpnRingkasan(false)}
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "none",
                  borderRadius: "50%",
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div style={{ background: "#F0FDF4", padding: "12px 14px", borderRadius: 12, border: "1px solid #BBF7D0" }}>
                  <div style={{ fontSize: 11.5, color: "#166534", fontWeight: 700 }}>Total DPP (Harga Bersih)</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#15803D", marginTop: 3 }}>
                    {rupiah(totalJumlahSemua)}
                  </div>
                </div>

                <div style={{ background: "#FAF5FF", padding: "12px 14px", borderRadius: 12, border: "1px solid #E9D5FF" }}>
                  <div style={{ fontSize: 11.5, color: "#6B21A8", fontWeight: 700 }}>Total PPN Masukan</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#7E22CE", marginTop: 3 }}>
                    +{rupiah(totalNilaiPpnSemua)}
                  </div>
                </div>
              </div>

              {/* Total Tagihan */}
              <div
                style={{
                  background: "#FDF4FF",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1.5px solid #F0ABFC",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#86198F" }}>
                    TOTAL TAGIHAN (JUMLAH + PPN)
                  </div>
                  <div style={{ fontSize: 11, color: "#A21CAF", marginTop: 1 }}>
                    Akumulasi seluruh faktur penerimaan
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#701A75" }}>
                  {rupiah(totalJumlahPpnSemua)}
                </div>
              </div>

              {/* Komposisi Faktur */}
              <div style={{ background: "#F8FAFC", padding: "12px 14px", borderRadius: 12, border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                  Status Pajak Faktur:
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ color: "#64748B" }}>Faktur PKP (Kena Pajak PPN):</span>
                  <span style={{ fontWeight: 700, color: "#6B21A8" }}>
                    {totalFakturPkp} Faktur
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ color: "#64748B" }}>Faktur Non-PKP (Bebas PPN):</span>
                  <span style={{ fontWeight: 700, color: "#64748B" }}>
                    {Math.max(0, totalFakturUnik - totalFakturPkp)} Faktur
                  </span>
                </div>
              </div>

              {/* Tombol Tutup */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setModalPpnRingkasan(false)}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 9,
                    border: "none",
                    background: "var(--magenta)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Faktur */}
      {detail && (
        <DetailFakturModal
          data={detail}
          onClose={() => setDetail(null)}
          onLihatHutangSupplier={() => {}}
          onEditFaktur={(f) => setPenerimaanEdit(f)}
          userMap={userMap}
        />
      )}

      {/* Modal Edit / Koreksi Penerimaan Barang */}
      {penerimaanEdit && (
        <EditPenerimaanModal
          penerimaan={penerimaanEdit}
          supplierList={daftarSupplierList}
          onClose={() => setPenerimaanEdit(null)}
          onSukses={(updated) => {
            setNotifSukses(`Faktur #${updated.no_faktur} (${updated.nama_supplier}) berhasil diperbarui!`);
            setTimeout(() => setNotifSukses(""), 6000);
            setRefreshKey((k) => k + 1);
          }}
          onHapus={() => {
            setNotifSukses("Faktur penerimaan berhasil dihapus.");
            setTimeout(() => setNotifSukses(""), 6000);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </KasirShell>
  );
}
