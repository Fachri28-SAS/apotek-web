import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import { cetakBukuBarangMasuk } from "../../utils/cetakLaporanPenerimaan";
import { exportExcel, exportWord } from "../../utils/exportDokumen";
import KasirShell from "./KasirShell";
import DetailFakturModal from "./komponen/DetailFakturModal";
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
  const [daftarSupplierList, setDaftarSupplierList] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
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
  }, [dariTanggal, sampaiTanggal, search, filterSupplier]);

  // Daftar nama supplier unik
  const supplierOptions = Array.from(
    new Set([
      ...daftarSupplierList.map((s) => s.nama).filter(Boolean),
      ...daftar.map((p) => p.nama_supplier).filter(Boolean),
    ])
  ).sort((a, b) => a.localeCompare(b));

  // Filter berdasarkan supplier jika dipilih
  const daftarTampil = daftar.filter((p) => {
    if (filterSupplier !== "semua" && p.nama_supplier !== filterSupplier) return false;
    return true;
  });

  // Flatten faktur menjadi deretan baris per-item (sesuai Foto 1 Buku Penerimaan Barang Fisik)
  // Kolom: NO, Tanggal, No Faktur, PBF, Nama Barang, Jumlah, Satuan, EXP, No Batch, Harga Satuan (Rp), Jumlah (Rp), Jumlah + PPN
  const barisItem = [];
  let noUrut = 1;

  daftarTampil.forEach((p) => {
    const items = p.items || [];
    const tarifPpn = p.is_pkp ? (Number(p.persen_ppn) > 0 ? Number(p.persen_ppn) : 11) : 0;

    if (items.length === 0) {
      const jmlRp = Number(p.total || 0);
      const nilaiPpn = p.is_pkp ? Math.round(jmlRp * (tarifPpn / 100)) : 0;
      const jmlPpn = jmlRp + nilaiPpn;
      barisItem.push({
        no: noUrut++,
        fakturId: p.id,
        faktur: p,
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
          b.noBatch.toLowerCase().includes(term)
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

  function siapkanDataExportPenerimaan() {
    const headers = [
      { label: "NO", align: "center", width: "35px" },
      { label: "Tanggal", align: "center" },
      { label: "No Faktur", align: "left" },
      { label: "PBF", align: "left" },
      { label: "Nama Barang", align: "left" },
      { label: "Jumlah", align: "center" },
      { label: "Satuan", align: "center" },
      { label: "EXP", align: "center" },
      { label: "No Batch", align: "center" },
      { label: "Harga Satuan (Rp)", align: "right" },
      { label: "Jumlah (Rp)", align: "right" },
      { label: "Jumlah + PPN", align: "right" },
    ];

    const rows = barisItemTampil.map((b, idx) => [
      idx + 1,
      formatTgl(b.tanggal),
      b.noFaktur || "—",
      b.pbf || "—",
      b.namaBarang || "—",
      b.jumlah,
      b.satuan || "—",
      b.exp ? formatTgl(b.exp) : "—",
      b.noBatch || "—",
      rupiah(b.hargaSatuan),
      rupiah(b.jumlahRp),
      rupiah(b.jumlahPpnRp),
    ]);

    const footers = [
      [
        { label: `TOTAL (${rows.length} ITEM) :`, colspan: 10, align: "right" },
        { label: rupiah(totalJumlahSemua), align: "right" },
        { label: rupiah(totalJumlahPpnSemua), align: "right" },
      ],
    ];

    const periodeTeks = dariTanggal && sampaiTanggal ? `${dariTanggal} s/d ${sampaiTanggal}` : "Semua Periode";

    return { headers, rows, footers, periodeTeks };
  }

  function handleExcel() {
    const { headers, rows, footers, periodeTeks } = siapkanDataExportPenerimaan();
    exportExcel({
      filename: `buku-penerimaan-barang-fisik`,
      judul: "BUKU PENERIMAAN BARANG FISIK",
      periode: periodeTeks,
      keterangan: `Rekapitulasi Fisik Barang Masuk per Item`,
      headers,
      rows,
      footers,
    });
  }

  function handleWord() {
    const { headers, rows, footers, periodeTeks } = siapkanDataExportPenerimaan();
    exportWord({
      filename: `buku-penerimaan-barang-fisik`,
      judul: "BUKU PENERIMAAN BARANG FISIK",
      periode: periodeTeks,
      keterangan: `Rekapitulasi Fisik Barang Masuk per Item`,
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
          <h1 style={{ fontSize: 24 }}>Buku Penerimaan Barang Fisik</h1>
          <p className="halaman-sub">
            {loading
              ? "Memuat data obat masuk…"
              : `${barisItemTampil.length} baris barang · ${totalFakturUnik} faktur · Total Nilai: ${rupiah(totalJumlahSemua)}`}
          </p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      {/* Ringkasan KPI Barang Masuk */}
      <div className="kpi-grid-4" style={{ marginBottom: 16 }}>
        <div style={{ background: "#fff", padding: "14px 18px", borderRadius: 14, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Total Item Masuk</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", marginTop: 4 }}>
            {barisItemTampil.length} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-soft)" }}>Barang</span>
          </div>
        </div>
        <div style={{ background: "#fff", padding: "14px 18px", borderRadius: 14, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Total Faktur Masuk</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--magenta-dark)", marginTop: 4 }}>
            {totalFakturUnik} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-soft)" }}>Faktur</span>
          </div>
        </div>
        <div style={{ background: "#F0FDF4", padding: "14px 18px", borderRadius: 14, border: "1px solid #BBF7D0" }}>
          <div style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>Total Jumlah (Rp)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#15803D", marginTop: 4 }}>
            {rupiah(totalJumlahSemua)}
          </div>
        </div>
        <div
          onClick={() => setModalPpnRingkasan(true)}
          title="Klik untuk melihat rincian kalkulasi total PPN"
          style={{
            background: "#FAF5FF",
            padding: "14px 18px",
            borderRadius: 14,
            border: "1px solid #E9D5FF",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#C084FC";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(126, 34, 206, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#E9D5FF";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#6B21A8", fontWeight: 600 }}>Total Jumlah + PPN</div>
            <span
              style={{
                fontSize: 10.5,
                background: "#E9D5FF",
                color: "#6B21A8",
                padding: "2px 6px",
                borderRadius: 6,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              Rincian PPN 🔍
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#7E22CE", marginTop: 4 }}>
            {rupiah(totalJumlahPpnSemua)}
          </div>
          <div style={{ fontSize: 11.5, color: "#7E22CE", fontWeight: 700, marginTop: 4 }}>
            {totalNilaiPpnSemua > 0 ? `Termasuk PPN: +${rupiah(totalNilaiPpnSemua)}` : "Semua Faktur Non-PKP"}
          </div>
        </div>
      </div>

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
                ✕
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
            {/* Tabel 12 Kolom Sesuai Buku Catatan Fisik Foto 1 */}
            <table className="obat-table" style={{ minWidth: 1050, fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: "center" }}>NO</th>
                  <th style={{ width: 85, textAlign: "center" }}>Tanggal</th>
                  <th style={{ width: 110 }}>No Faktur</th>
                  <th style={{ width: 130 }}>PBF</th>
                  <th style={{ minWidth: 180 }}>Nama Barang</th>
                  <th style={{ width: 65, textAlign: "center" }}>Jumlah</th>
                  <th style={{ width: 70, textAlign: "center" }}>Satuan</th>
                  <th style={{ width: 85, textAlign: "center" }}>EXP</th>
                  <th style={{ width: 95, textAlign: "center" }}>No Batch</th>
                  <th style={{ width: 120, textAlign: "right" }}>Harga Satuan (Rp)</th>
                  <th style={{ width: 125, textAlign: "right" }}>Jumlah (Rp)</th>
                  <th style={{ width: 155, textAlign: "right" }}>Jumlah + PPN</th>
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
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--ink-soft)" }}>
                      {b.no}
                    </td>

                    {/* 2. Tanggal */}
                    <td style={{ textAlign: "center", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {formatTgl(b.tanggal)}
                    </td>

                    {/* 3. No Faktur */}
                    <td className="obat-batch-cell" style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {b.noFaktur}
                    </td>

                    {/* 4. PBF */}
                    <td style={{ fontWeight: 700, color: "var(--ink)" }}>
                      {b.pbf}
                    </td>

                    {/* 5. Nama Barang */}
                    <td style={{ fontWeight: 700, color: "var(--magenta-dark)" }}>
                      {b.namaBarang}
                    </td>

                    {/* 6. Jumlah */}
                    <td style={{ textAlign: "center", fontWeight: 700 }}>
                      {b.jumlah}
                    </td>

                    {/* 7. Satuan */}
                    <td style={{ textAlign: "center", color: "var(--ink-soft)" }}>
                      {b.satuan}
                    </td>

                    {/* 8. EXP */}
                    <td style={{ textAlign: "center", whiteSpace: "nowrap", fontSize: 12 }}>
                      {b.exp ? formatTgl(b.exp) : "—"}
                    </td>

                    {/* 9. No Batch */}
                    <td style={{ textAlign: "center", fontSize: 12, fontFamily: "monospace", color: "var(--ink-soft)" }}>
                      {b.noBatch}
                    </td>

                    {/* 10. Harga Satuan (Rp) */}
                    <td style={{ textAlign: "right" }}>
                      {rupiah(b.hargaSatuan)}
                    </td>

                    {/* 11. Jumlah (Rp) */}
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--ink)" }}>
                      {rupiah(b.jumlahRp)}
                    </td>

                    {/* 12. Jumlah + PPN */}
                    <td
                      style={{ textAlign: "right", fontWeight: 800, color: "#6B21A8" }}
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
                          gap: 5,
                          cursor: "pointer",
                          padding: "5px 9px",
                          borderRadius: 8,
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
                        <span style={{ fontSize: 13 }}>{rupiah(b.jumlahPpnRp)}</span>
                        <span style={{ fontSize: 10, color: "#7E22CE" }} title="Klik untuk rincian PPN">🔍</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#FAF5FF", fontWeight: 800, borderTop: "2px solid #E9D5FF" }}>
                  <td colSpan={10} style={{ textAlign: "right", padding: "10px 14px", color: "var(--ink)" }}>
                    TOTAL KESELURUHAN ({barisItemTampil.length} Item) :
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 14px", color: "#15803D", fontSize: 14 }}>
                    {rupiah(totalJumlahSemua)}
                  </td>
                  <td
                    style={{ textAlign: "right", padding: "10px 14px", color: "#6B21A8", fontSize: 14, cursor: "pointer" }}
                    onClick={() => setModalPpnRingkasan(true)}
                    title="Klik untuk melihat rincian total PPN"
                  >
                    <div>{rupiah(totalJumlahPpnSemua)}</div>
                    <div style={{ fontSize: 11, color: "#7E22CE", fontWeight: 700 }}>
                      +{rupiah(totalNilaiPpnSemua)} PPN 🔍
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
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
                ✕
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
                  Lihat Faktur Lengkap 📄
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
                ✕
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
        />
      )}
    </KasirShell>
  );
}
