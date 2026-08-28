import { rupiah } from "../../../utils/format";
import Spinner from "../../../components/Spinner";

const METODE = [
  { key: "tunai", label: "Tunai" },
  { key: "qris", label: "QRIS" },
  { key: "transfer", label: "Transfer" },
];

export default function PaymentPanel({ tab, onChange, subtotal, total, kembalian, onSubmit, loading, disabled }) {
  const kurang = tab.metodeBayar === "tunai" && Number(tab.uangDiterima || 0) < total;

  return (
    <div className="payment-panel">
      <div className="payment-field">
        <label>Nama Pembeli (opsional)</label>
        <input
          type="text"
          value={tab.namaPembeli}
          onChange={(e) => onChange("namaPembeli", e.target.value)}
          placeholder="Contoh: Bu Siti"
        />
      </div>

      <div className="payment-field">
        <label>No. Invoice (opsional — kosong = otomatis)</label>
        <input
          type="text"
          value={tab.noInvoice}
          onChange={(e) => onChange("noInvoice", e.target.value)}
        />
      </div>

      <div className="payment-field">
        <label>Catatan (opsional)</label>
        <textarea
          rows={2}
          value={tab.catatan}
          onChange={(e) => onChange("catatan", e.target.value)}
        />
      </div>

      <div className="payment-row">
        <span>Subtotal</span>
        <strong>{rupiah(subtotal)}</strong>
      </div>

      <div className="payment-field">
        <label>Diskon (Rp)</label>
        <input
          type="number"
          min="0"
          value={tab.diskon}
          onChange={(e) => onChange("diskon", Math.max(0, parseFloat(e.target.value) || 0))}
        />
      </div>

      <div className="payment-row payment-total">
        <span>Total</span>
        <strong>{rupiah(total)}</strong>
      </div>

      <div className="payment-field">
        <label>Metode Pembayaran</label>
        <div className="metode-chips">
          {METODE.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`metode-chip ${tab.metodeBayar === m.key ? "active" : ""}`}
              onClick={() => onChange("metodeBayar", m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {tab.metodeBayar === "tunai" && (
        <>
          <div className="payment-field">
            <label>Uang Diterima</label>
            <input
              type="number"
              min="0"
              value={tab.uangDiterima}
              onChange={(e) => onChange("uangDiterima", e.target.value)}
            />
          </div>
          <div className="payment-row">
            <span>Kembalian</span>
            <strong style={{ color: kurang ? "#B3261E" : "var(--green-dark)" }}>
              {kurang ? "Uang kurang" : rupiah(kembalian)}
            </strong>
          </div>
        </>
      )}

      <button
        type="button"
        className={`payment-submit ${loading ? "btn-loading-state" : ""}`}
        onClick={onSubmit}
        disabled={disabled || loading || kurang}
      >
        {loading ? (
          <Spinner size={18} color="#FFFFFF" text="Memproses Transaksi…" />
        ) : (
          "Simpan & Cetak Struk"
        )}
      </button>
    </div>
  );
}
