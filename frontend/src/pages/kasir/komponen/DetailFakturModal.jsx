import { rupiah } from "../../../utils/format";
import { cetakLaporanPenerimaan } from "../../../utils/cetakLaporanPenerimaan";

export default function DetailFakturModal({ data, onClose }) {
  if (!data) return null;

  return (
    <div className="struk-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="struk-modal" style={{ maxWidth: 640 }}>
        <div className="struk-modal-head">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Detail Faktur {data.no_faktur}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => cetakLaporanPenerimaan([data], { dariTanggal: data.tanggal_terima, sampaiTanggal: data.tanggal_terima })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                background: "var(--magenta)",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
              title="Cetak Laporan Penerimaan Barang untuk faktur ini"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <path d="M6 14h12v8H6z" />
              </svg>
              Cetak
            </button>
            <button className="kasir-logout-btn" onClick={onClose} aria-label="Tutup">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>

        <div style={{ padding: "20px 22px" }}>
          <div className="detail-faktur-info">
            <div><span>Supplier</span><strong>{data.nama_supplier}</strong></div>
            <div><span>Tanggal Terima</span><strong>{new Date(data.tanggal_terima).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</strong></div>
            <div><span>Jatuh Tempo</span><strong>{data.tanggal_jatuh_tempo ? new Date(data.tanggal_jatuh_tempo).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "—"}</strong></div>
            <div><span>Status</span><strong>{data.is_pkp ? "PKP" : "Non PKP"}</strong></div>
          </div>

          <table className="obat-table" style={{ marginTop: 16 }}>
            <thead>
              <tr><th>Obat</th><th>Terima</th><th>Kemasan</th><th>Harga Satuan</th><th>Diskon</th><th>Batch</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
              {(data.items || []).map((it) => (
                <tr key={it.id}>
                  <td className="obat-nama-cell">{it.nama_obat}</td>
                  <td>{it.qty}</td>
                  <td>{it.kemasan ?? it.qty}</td>
                  <td className="obat-harga-cell">{rupiah(it.harga_beli)}</td>
                  <td className="obat-harga-cell">{Number(it.diskon) > 0 ? rupiah(it.diskon) : "—"}</td>
                  <td className="obat-batch-cell">{it.nomor_batch || "—"}</td>
                  <td style={{ fontWeight: 700 }}>{rupiah(it.subtotal ?? (Number(it.qty || 0) * Number(it.harga_beli || 0) - Number(it.diskon || 0)))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="penerimaan-ringkasan" style={{ marginLeft: 0, maxWidth: "none" }}>
            <div className="payment-row"><span>Subtotal</span><span>{rupiah(data.subtotal)}</span></div>
            <div className="payment-row"><span>Diskon Faktur</span><span>-{rupiah(Math.max(0, Number(data.subtotal || 0) - Number(data.subtotal_setelah_diskon ?? data.subtotal ?? 0)))}</span></div>
            <div className="payment-row"><span>DPP</span><span>{rupiah(data.dpp ?? data.subtotal_setelah_diskon ?? data.subtotal)}</span></div>
            <div className="payment-row"><span>PPN</span><span>{rupiah(data.ppn)}</span></div>
            <div className="payment-row payment-total"><span>Total Tagihan</span><strong>{rupiah(data.total)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
