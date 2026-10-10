import React, { useState, useEffect } from "react";
import { api } from "../../../lib/api";

export default function MutasiBukuModal({ obat, onClose }) {
  if (!obat) return null;

  const [mutasi, setMutasi] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/stok-mutasi?obat_id=${obat.id}&limit=50`)
      .then((data) => {
        const filtered = Array.isArray(data)
          ? data.filter((m) => !m.obat_id || Number(m.obat_id) === Number(obat.id))
          : [];
        setMutasi(filtered);
      })
      .catch(() => setMutasi([]))
      .finally(() => setLoading(false));
  }, [obat.id]);

  function formatTgl(str) {
    if (!str) return "-";
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
          maxWidth: 680,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1.5px solid #E2E8F0",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#0F172A" }}>
              Buku Kartu Stok / Mutasi: {obat.nama}
            </h3>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
              Stok Saat Ini: <strong>{obat.sisa ?? obat.stok ?? 0} {obat.satuan_dasar || "Unit"}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "1px solid #CBD5E1",
              background: "#fff",
              cursor: "pointer",
              fontWeight: "bold",
              color: "#64748B",
            }}
          >
            x
          </button>
        </div>

        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
              Memuat riwayat mutasi obat...
            </div>
          ) : mutasi.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
              Belum ada catatan mutasi stok untuk obat ini.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F1F5F9", borderBottom: "1.5px solid #CBD5E1" }}>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Waktu</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", width: 80 }}>Tipe</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", width: 80 }}>Jumlah</th>
                  <th style={{ padding: "7px 10px", textAlign: "left" }}>Keterangan</th>
                  <th style={{ padding: "7px 10px", textAlign: "left", width: 90 }}>Petugas</th>
                </tr>
              </thead>
              <tbody>
                {mutasi.map((m, idx) => {
                  const isMasuk = m.tipe === "masuk" || m.jumlah > 0;
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid #E2E8F0",
                        background: idx % 2 === 1 ? "#FAFAFA" : "#fff",
                      }}
                    >
                      <td style={{ padding: "7px 10px", color: "#64748B" }}>
                        {formatTgl(m.created_at)}
                      </td>
                      <td style={{ padding: "7px 10px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: isMasuk ? "#ECFDF5" : "#FEF2F2",
                            color: isMasuk ? "#059669" : "#DC2626",
                          }}
                        >
                          {m.tipe ? m.tipe.toUpperCase() : isMasuk ? "MASUK" : "KELUAR"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          textAlign: "center",
                          fontWeight: 700,
                          color: isMasuk ? "#059669" : "#DC2626",
                        }}
                      >
                        {isMasuk ? `+${Math.abs(m.jumlah)}` : `-${Math.abs(m.jumlah)}`}
                      </td>
                      <td style={{ padding: "7px 10px", color: "#1E293B" }}>
                        {m.keterangan || "-"}
                      </td>
                      <td style={{ padding: "7px 10px", color: "#64748B" }}>
                        {m.user?.nama || m.user?.username || "Sistem"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div
          style={{
            padding: "12px 20px",
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
              padding: "7px 16px",
              borderRadius: 8,
              border: "1px solid #CBD5E1",
              background: "#fff",
              fontWeight: 700,
              fontSize: 12,
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
