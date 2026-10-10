import React from "react";
import { cetakDokumenA4, exportExcel, exportWord } from "../../../utils/exportDokumen";
import TombolExportGroup from "./TombolExportGroup";

export default function RincianMasukModal({ obat, dariTanggal, sampaiTanggal, onClose }) {
  if (!obat) return null;

  const rincian = obat.rincian_masuk || [];
  const totalQty = rincian.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  function formatTgl(str) {
    if (!str || str === "-") return "-";
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  }

  function handleCetakPdf() {
    cetakDokumenA4({
      judul: `RINCIAN OBAT MASUK - ${obat.nama.toUpperCase()}`,
      periode: `${formatTgl(dariTanggal)} s/d ${formatTgl(sampaiTanggal)}`,
      orientation: "portrait",
      headers: [
        { label: "No.", align: "center", width: "35px" },
        { label: "Tgl Masuk", align: "center", width: "85px" },
        { label: "Nama PBF (Supplier)", align: "left" },
        { label: "No Faktur", align: "left", width: "105px" },
        { label: "Tgl Faktur", align: "center", width: "85px" },
        { label: "Qty", align: "center", width: "50px" },
        { label: "Kemasan", align: "left", width: "75px" },
        { label: "Batch", align: "center", width: "80px" },
        { label: "Expired", align: "center", width: "80px" },
      ],
      rows: rincian.map((item, idx) => [
        idx + 1,
        formatTgl(item.tanggal_terima),
        item.nama_pbf || "-",
        item.no_faktur || "-",
        formatTgl(item.tgl_faktur || item.tanggal_terima),
        item.qty,
        item.nama_satuan || "Unit",
        item.nomor_batch || "-",
        formatTgl(item.tanggal_exp),
      ]),
      footers: [
        [
          { text: "TOTAL OBAT MASUK", colSpan: 5, align: "left" },
          { text: String(totalQty), align: "center" },
          { text: "", colSpan: 3, align: "center" },
        ],
      ],
    });
  }

  function handleExportExcel() {
    exportExcel({
      filename: `Rincian_Masuk_${obat.nama.replace(/\s+/g, "_")}`,
      judul: `RINCIAN OBAT MASUK - ${obat.nama.toUpperCase()}`,
      periode: `${formatTgl(dariTanggal)} s/d ${formatTgl(sampaiTanggal)}`,
      headers: [
        { label: "No.", align: "center" },
        { label: "Tgl Masuk", align: "center" },
        { label: "Nama PBF (Supplier)", align: "left" },
        { label: "No Faktur", align: "left" },
        { label: "Tgl Faktur", align: "center" },
        { label: "Qty", align: "center" },
        { label: "Kemasan", align: "left" },
        { label: "Batch", align: "center" },
        { label: "Expired", align: "center" },
      ],
      rows: rincian.map((item, idx) => [
        idx + 1,
        formatTgl(item.tanggal_terima),
        item.nama_pbf || "-",
        item.no_faktur || "-",
        formatTgl(item.tgl_faktur || item.tanggal_terima),
        item.qty,
        item.nama_satuan || "Unit",
        item.nomor_batch || "-",
        formatTgl(item.tanggal_exp),
      ]),
      footers: [
        [
          { text: "TOTAL OBAT MASUK", colSpan: 5, align: "left" },
          { text: String(totalQty), align: "center" },
          { text: "", colSpan: 3, align: "center" },
        ],
      ],
    });
  }

  function handleExportWord() {
    exportWord({
      filename: `Rincian_Masuk_${obat.nama.replace(/\s+/g, "_")}`,
      judul: `RINCIAN OBAT MASUK - ${obat.nama.toUpperCase()}`,
      periode: `${formatTgl(dariTanggal)} s/d ${formatTgl(sampaiTanggal)}`,
      headers: [
        { label: "No.", align: "center" },
        { label: "Tgl Masuk", align: "center" },
        { label: "Nama PBF (Supplier)", align: "left" },
        { label: "No Faktur", align: "left" },
        { label: "Tgl Faktur", align: "center" },
        { label: "Qty", align: "center" },
        { label: "Kemasan", align: "left" },
        { label: "Batch", align: "center" },
        { label: "Expired", align: "center" },
      ],
      rows: rincian.map((item, idx) => [
        idx + 1,
        formatTgl(item.tanggal_terima),
        item.nama_pbf || "-",
        item.no_faktur || "-",
        formatTgl(item.tgl_faktur || item.tanggal_terima),
        item.qty,
        item.nama_satuan || "Unit",
        item.nomor_batch || "-",
        formatTgl(item.tanggal_exp),
      ]),
      footers: [
        [
          { text: "TOTAL OBAT MASUK", colSpan: 5, align: "left" },
          { text: String(totalQty), align: "center" },
          { text: "", colSpan: 3, align: "center" },
        ],
      ],
    });
  }

  return (
    <div
      className="modal-faktur-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-faktur-box"
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 900,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: "1.5px solid var(--line, #E2E8F0)",
            background: "#F8FAFC",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>
              Rincian Obat Masuk: {obat.nama}
            </h3>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
              Periode: <strong>{formatTgl(dariTanggal)}</strong> s/d <strong>{formatTgl(sampaiTanggal)}</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <TombolExportGroup
              onCetakPdf={handleCetakPdf}
              onExportExcel={handleExportExcel}
              onExportWord={handleExportWord}
              disabled={rincian.length === 0}
            />
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                background: "#fff",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748B",
                fontWeight: "bold",
                fontSize: 16,
              }}
              title="Tutup"
            >
              x
            </button>
          </div>
        </div>

        {/* Info Ringkasan */}
        <div
          style={{
            padding: "12px 22px",
            background: "#F1F5F9",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            fontSize: 12.5,
          }}
        >
          <div>
            <span style={{ color: "#64748B" }}>Nama Obat: </span>
            <strong style={{ color: "#0F172A" }}>{obat.nama}</strong>
          </div>
          <div>
            <span style={{ color: "#64748B" }}>Kemasan / Satuan: </span>
            <strong style={{ color: "#0F172A" }}>{obat.satuan_dasar || "Unit"}</strong>
          </div>
          <div>
            <span style={{ color: "#64748B" }}>Total Masuk Periode: </span>
            <strong style={{ color: "#047857" }}>{obat.masuk || totalQty} {obat.satuan_dasar || "Unit"}</strong>
          </div>
          <div>
            <span style={{ color: "#64748B" }}>Jumlah Transaksi: </span>
            <strong style={{ color: "#0F172A" }}>{rincian.length} kali penerimaan</strong>
          </div>
        </div>

        {/* Tabel Rincian */}
        <div style={{ padding: "16px 22px", overflowY: "auto", flex: 1 }}>
          {rincian.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
              Tidak ada data obat masuk pada periode tanggal yang dipilih.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #CBD5E1" }}>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 35 }}>No</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 95 }}>Tgl Masuk</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Nama PBF (Supplier)</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", width: 110 }}>No Faktur</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 95 }}>Tgl Faktur</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 60 }}>Qty</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", width: 85 }}>Kemasan</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 90 }}>Batch</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 90 }}>Expired</th>
                </tr>
              </thead>
              <tbody>
                {rincian.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid #E2E8F0",
                      background: idx % 2 === 1 ? "#FAFAFA" : "#fff",
                    }}
                  >
                    <td style={{ padding: "8px 10px", textAlign: "center", color: "#64748B" }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600 }}>
                      {formatTgl(item.tanggal_terima)}
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#1E293B" }}>
                      {item.nama_pbf || "-"}
                    </td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11.5 }}>
                      {item.no_faktur || "-"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontSize: 11.5, color: "#334155" }}>
                      {formatTgl(item.tgl_faktur || item.tanggal_terima)}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#047857" }}>
                      {item.qty}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#475569" }}>
                      {item.nama_satuan || "Unit"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontSize: 11 }}>
                      {item.nomor_batch || "-"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontSize: 11 }}>
                      {formatTgl(item.tanggal_exp)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#F1F5F9", borderTop: "2px solid #CBD5E1", fontWeight: 800 }}>
                  <td colSpan={5} style={{ padding: "10px", textAlign: "right" }}>
                    TOTAL MASUK:
                  </td>
                  <td style={{ padding: "10px", textAlign: "center", color: "#047857" }}>
                    {totalQty}
                  </td>
                  <td colSpan={3} style={{ padding: "10px" }}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: "12px 22px",
            borderTop: "1.5px solid #E2E8F0",
            background: "#F8FAFC",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 18px",
              borderRadius: 8,
              border: "1px solid #CBD5E1",
              background: "#fff",
              color: "#334155",
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
