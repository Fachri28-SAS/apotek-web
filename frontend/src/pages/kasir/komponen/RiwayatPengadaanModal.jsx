import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { rupiah } from "../../../utils/format";

export default function RiwayatPengadaanModal({ obat, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!obat?.id) return;
    setLoading(true);
    setError("");

    api(`/obat/${obat.id}/riwayat-pengadaan`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || "Gagal memuat riwayat pengadaan.");
      })
      .finally(() => setLoading(false));
  }, [obat]);

  if (!obat) return null;

  const list = data?.riwayat || [];
  const totalQtyMasuk = list.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(18, 12, 28, 0.75)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: 20,
          maxWidth: 820,
          width: "100%",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "20px 26px 16px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FAF5FF",
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--magenta-dark)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              📜 Asal-Usul & Riwayat Pengadaan Obat
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: "var(--ink)", margin: "4px 0 0" }}>
              {obat.nama}
            </h2>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
              Supplier Terakhir / Utama: <strong>{data?.obat?.supplier_utama || "-"}</strong>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 8, background: "#fff" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* Ringkasan KPI Mini */}
        <div
          style={{
            padding: "14px 26px",
            background: "#fff",
            borderBottom: "1px solid var(--line)",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 600 }}>Total Faktur Masuk</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>{list.length} Faktur</div>
          </div>
          <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 600 }}>Total Diterima</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--magenta-dark)", marginTop: 2 }}>
              {totalQtyMasuk.toLocaleString("id-ID")} {obat.satuan_dasar}
            </div>
          </div>
          <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 600 }}>Harga Beli Terakhir</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--green-dark)", marginTop: 2 }}>
              {list[0] ? rupiah(list[0].harga_beli) : "-"}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "10px 26px", fontSize: 12.5, fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Tabel Riwayat Masuk */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 26px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--ink-soft)", fontSize: 13.5 }}>
              Memuat riwayat pengadaan obat…
            </div>
          ) : list.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-soft)", fontSize: 13.5 }}>
              Belum ada riwayat faktur penerimaan untuk obat ini (stok awal atau belum pernah diinput via Penerimaan Barang).
            </div>
          ) : (
            <table className="obat-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th>Tanggal Terima</th>
                  <th>Supplier / PBF</th>
                  <th>No. Faktur</th>
                  <th>Batch / Exp</th>
                  <th style={{ textAlign: "center" }}>Qty Masuk</th>
                  <th style={{ textAlign: "right" }}>Harga Beli</th>
                  <th style={{ textAlign: "right" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.tanggal_terima
                        ? new Date(item.tanggal_terima).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="obat-nama-cell">
                      <span style={{ fontWeight: 700 }}>{item.nama_supplier}</span>
                    </td>
                    <td className="obat-batch-cell">{item.no_faktur}</td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 700 }}>{item.nomor_batch || "-"}</span>
                        {item.tanggal_exp && (
                          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                            Exp: {item.tanggal_exp}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>
                      {item.qty} {item.nama_satuan}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {rupiah(item.harga_beli)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                      {rupiah(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: "14px 26px",
            borderTop: "1px solid var(--line)",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: "9px 22px", borderRadius: 10, fontSize: 13.5 }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
