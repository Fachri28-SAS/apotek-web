import React from "react";

export default function TombolExportGroup({
  onCetakPdf,
  onExportExcel,
  onExportWord,
  disabled = false,
  labelCetak = "Cetak / PDF",
  labelExcel = "Excel",
  labelWord = "Word",
  className = "",
  style = {},
}) {
  return (
    <div
      className={`export-btn-group ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        ...style,
      }}
    >
      {/* 1. Tombol Cetak / PDF */}
      <button
        type="button"
        className="btn-export-cetak"
        onClick={onCetakPdf}
        disabled={disabled}
        title="Cetak format dokumen resmi A4 atau Simpan sebagai PDF"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 13px",
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 700,
          background: "#fff",
          color: "#1E293B",
          border: "1.5px solid #CBD5E1",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "all 0.15s ease",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: "#475569" }}>
          <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
          <path d="M6 14h12v8H6z" />
        </svg>
        <span>{labelCetak}</span>
      </button>

      {/* 2. Tombol Excel */}
      <button
        type="button"
        className="btn-export-excel"
        onClick={onExportExcel}
        disabled={disabled}
        title="Unduh laporan dalam format Microsoft Excel (.xls)"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 13px",
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 700,
          background: "#ECFDF5",
          color: "#065F46",
          border: "1.5px solid #A7F3D0",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "all 0.15s ease",
          boxShadow: "0 1px 2px rgba(16, 185, 129, 0.08)",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: "#059669" }}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span>{labelExcel}</span>
      </button>

      {/* 3. Tombol Word */}
      <button
        type="button"
        className="btn-export-word"
        onClick={onExportWord}
        disabled={disabled}
        title="Unduh laporan dalam format Microsoft Word (.doc)"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 13px",
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 700,
          background: "#EFF6FF",
          color: "#1E40AF",
          border: "1.5px solid #BFDBFE",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "all 0.15s ease",
          boxShadow: "0 1px 2px rgba(59, 130, 246, 0.08)",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: "#2563EB" }}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
        <span>{labelWord}</span>
      </button>
    </div>
  );
}
