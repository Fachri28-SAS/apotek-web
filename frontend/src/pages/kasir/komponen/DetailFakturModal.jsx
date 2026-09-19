import React from "react";
import { rupiah } from "../../../utils/format";
import { cetakSatuFakturA4, exportSatuFakturWord, exportSatuFakturExcel } from "../../../utils/exportDokumen";
import TombolExportGroup from "./TombolExportGroup";

export default function DetailFakturModal({ data, onClose, onLihatHutangSupplier }) {
  if (!data) return null;

  const isLunas = data.status_bayar === "lunas";

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
          maxWidth: 720,
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
            background: "#FAF5FF",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#4A044E", margin: 0 }}>
              Faktur Penerimaan {data.no_faktur}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: "#701A75" }}>
                Supplier: <strong>{data.nama_supplier}</strong>
              </span>
              {onLihatHutangSupplier && (
                <button
                  type="button"
                  onClick={() => onLihatHutangSupplier(data.nama_supplier)}
                  style={{
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: "1px solid #C084FC",
                    background: "#FAF5FF",
                    color: "#6B21A8",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  title="Lihat riwayat hutang dan faktur dari PT / Supplier ini"
                >
                  💳 Cek Hutang PT Ini
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <TombolExportGroup
              onCetakPdf={() => cetakSatuFakturA4(data)}
              onExportExcel={() => exportSatuFakturExcel(data)}
              onExportWord={() => exportSatuFakturWord(data)}
            />
            <button
              onClick={onClose}
              aria-label="Tutup"
              style={{
                background: "#F3E8FF",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#701A75",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 18, height: 18 }}>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: "20px 22px", overflowY: "auto" }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 12,
            }}
          >
            <div>
              <span style={{ color: "#64748B", display: "block" }}>Supplier</span>
              <strong style={{ color: "#1E293B" }}>{data.nama_supplier || "-"}</strong>
            </div>
            <div>
              <span style={{ color: "#64748B", display: "block" }}>Tgl Terima</span>
              <strong style={{ color: "#1E293B" }}>
                {data.tanggal_terima
                  ? new Date(data.tanggal_terima).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
                  : "-"}
              </strong>
            </div>
            <div>
              <span style={{ color: "#64748B", display: "block" }}>Jatuh Tempo</span>
              <strong style={{ color: "#1E293B" }}>
                {data.tanggal_jatuh_tempo
                  ? new Date(data.tanggal_jatuh_tempo).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
                  : "—"}
              </strong>
            </div>
            <div>
              <span style={{ color: "#64748B", display: "block" }}>Status Pembayaran</span>
              <strong style={{ color: isLunas ? "#15803D" : "#DC2626" }}>
                {isLunas ? "✓ Lunas" : "○ Belum Lunas"}
              </strong>
            </div>
          </div>

          {/* Tabel Obat */}
          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table className="obat-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Obat</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Kemasan</th>
                  <th style={{ textAlign: "right" }}>Harga Satuan</th>
                  <th style={{ textAlign: "right" }}>Diskon</th>
                  <th style={{ textAlign: "center" }}>Batch</th>
                  <th style={{ textAlign: "right" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((it) => (
                  <tr key={it.id}>
                    <td className="obat-nama-cell" style={{ fontWeight: 700 }}>{it.nama_obat}</td>
                    <td style={{ textAlign: "right" }}>{it.qty}</td>
                    <td style={{ textAlign: "right" }}>{it.kemasan ?? it.qty}</td>
                    <td className="obat-harga-cell" style={{ textAlign: "right" }}>{rupiah(it.harga_beli)}</td>
                    <td className="obat-harga-cell" style={{ textAlign: "right" }}>
                      {Number(it.diskon) > 0 ? rupiah(it.diskon) : "—"}
                    </td>
                    <td className="obat-batch-cell" style={{ textAlign: "center" }}>{it.nomor_batch || "—"}</td>
                    <td style={{ fontWeight: 700, textAlign: "right" }}>
                      {rupiah(it.subtotal ?? (Number(it.qty || 0) * Number(it.harga_beli || 0) - Number(it.diskon || 0)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ringkasan Biaya */}
          <div
            style={{
              marginTop: 18,
              marginLeft: "auto",
              maxWidth: 320,
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 12.5,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#64748B" }}>Subtotal</span>
              <span>{rupiah(data.subtotal)}</span>
            </div>
            {Number(data.diskon) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "#DC2626" }}>
                <span>Diskon Faktur</span>
                <span>-{rupiah(data.diskon)}</span>
              </div>
            )}
            {Number(data.ppn) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#64748B" }}>PPN</span>
                <span>{rupiah(data.ppn)}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1.5px solid #CBD5E1",
                paddingTop: 8,
                marginTop: 6,
                fontWeight: 800,
                fontSize: 14,
                color: "#0F172A",
              }}
            >
              <span>Total Tagihan</span>
              <span>{rupiah(data.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
