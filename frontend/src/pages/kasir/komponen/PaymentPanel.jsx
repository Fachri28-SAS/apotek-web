import { rupiah } from "../../../utils/format";

const METODE = [
  { key: "tunai", label: "Tunai" },
  { key: "qris", label: "QRIS" },
];

function formatRibuan(val) {
  if (val === "" || val === undefined || val === null) return "";
  const clean = String(val).replace(/\D/g, "");
  if (!clean) return "";
  return parseInt(clean, 10).toLocaleString("id-ID");
}

export default function PaymentPanel({
  tab,
  onChange,
  subtotal,
  subtotalKotor,
  totalDiskonItem,
  subtotalBersih,
  diskonTransaksi = 0,
  total,
  kembalian,
  onSubmit,
  loading,
  disabled,
}) {
  const kurang = tab.metodeBayar === "tunai" && Number(tab.uangDiterima || 0) < total;
  const tipeDiskonTransaksi = tab.diskonTipe || "rp";

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
        <span>Subtotal Item</span>
        <strong>{rupiah(subtotalKotor ?? subtotal ?? 0)}</strong>
      </div>

      {Number(totalDiskonItem || 0) > 0 && (
        <div className="payment-row" style={{ color: "#DC2626" }}>
          <span>Diskon Item</span>
          <strong>-{rupiah(totalDiskonItem)}</strong>
        </div>
      )}

      {/* Diskon Keseluruhan Transaksi */}
      <div className="payment-field">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <label style={{ margin: 0 }}>Diskon Transaksi</label>
          <div style={{ display: "flex", gap: 3 }}>
            <button
              type="button"
              onClick={() => onChange("diskonTipe", "rp")}
              style={{
                padding: "2px 8px",
                fontSize: 10.5,
                fontWeight: 700,
                borderRadius: 5,
                border: "1px solid var(--line)",
                background: tipeDiskonTransaksi === "rp" ? "var(--magenta)" : "#F3F4F6",
                color: tipeDiskonTransaksi === "rp" ? "#fff" : "var(--ink)",
                cursor: "pointer",
              }}
            >
              Rp
            </button>
            <button
              type="button"
              onClick={() => onChange("diskonTipe", "%")}
              style={{
                padding: "2px 8px",
                fontSize: 10.5,
                fontWeight: 700,
                borderRadius: 5,
                border: "1px solid var(--line)",
                background: tipeDiskonTransaksi === "%" ? "var(--magenta)" : "#F3F4F6",
                color: tipeDiskonTransaksi === "%" ? "#fff" : "var(--ink)",
                cursor: "pointer",
              }}
            >
              % (Persen)
            </button>
          </div>
        </div>
        <input
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={
            tipeDiskonTransaksi === "%"
              ? tab.diskonNilai === 0 || tab.diskonNilai === undefined
                ? ""
                : tab.diskonNilai
              : formatRibuan(tab.diskonNilai !== undefined ? tab.diskonNilai : tab.diskon)
          }
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            const val = raw ? parseInt(raw, 10) : 0;
            const finalVal = tipeDiskonTransaksi === "%" ? Math.min(100, val) : val;
            onChange("diskonNilai", finalVal);
          }}
        />
        {diskonTransaksi > 0 && tipeDiskonTransaksi === "%" && (
          <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 700, marginTop: 4, textAlign: "right" }}>
            Diskon {tab.diskonNilai}% = -{rupiah(diskonTransaksi)}
          </div>
        )}
      </div>

      <div className="payment-row payment-total">
        <span>Total Akhir</span>
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
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatRibuan(tab.uangDiterima)}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                onChange("uangDiterima", raw ? parseInt(raw, 10) : "");
              }}
            />
            <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                style={{
                  padding: "3px 8px",
                  fontSize: 11,
                  borderRadius: 6,
                  border: "1px solid var(--magenta)",
                  background: "#FAF5FF",
                  color: "var(--magenta-dark)",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                onClick={() => onChange("uangDiterima", total)}
              >
                Uang Pas
              </button>
              {[10000, 20000, 50000, 100000].map((nom) => (
                <button
                  key={nom}
                  type="button"
                  style={{
                    padding: "3px 8px",
                    fontSize: 11,
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    background: "#fff",
                    color: "var(--ink)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  onClick={() => onChange("uangDiterima", nom)}
                >
                  {nom.toLocaleString("id-ID")}
                </button>
              ))}
            </div>
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
        className="payment-submit"
        onClick={onSubmit}
        disabled={disabled || loading || kurang}
      >
        {loading ? "Menyimpan…" : "Simpan & Cetak Struk"}
      </button>
    </div>
  );
}
