import { rupiah } from "../../../utils/format";

export function hitungDiskonItem(it) {
  const base = Number(it.qty || 1) * Number(it.harga_jual || 0);
  if (!it.diskon_nilai || it.diskon_nilai <= 0) return 0;
  if (it.diskon_tipe === "%") {
    return Math.round((base * Math.min(100, it.diskon_nilai)) / 100);
  }
  return Math.min(Number(it.diskon_nilai), base);
}

export default function CartTable({ items, onUbah, onHapus }) {
  if (items.length === 0) {
    return (
      <div className="cart-kosong">
        Keranjang masih kosong. Cari obat di kotak atas untuk mulai.
      </div>
    );
  }

  return (
    <>
      {/* ---------- TAMPILAN MOBILE: LIST CARDS DENGAN QTY MINI (SESUAI PREVIEW) ---------- */}
      <div className="mobile-only" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Keranjang ({items.length} item)</span>
        </div>
        {items.map((it) => {
          const diskonNominal = hitungDiskonItem(it);
          const subtotalKotor = it.qty * it.harga_jual + (it.tuslah || 0);
          const subtotal = Math.max(subtotalKotor - diskonNominal, 0);

          return (
            <div className="list-card" key={it.key} style={{ cursor: "default" }}>
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="9" width="18" height="6" rx="3" />
                  <path d="M8 9v6M16 9v6" />
                </svg>
              </div>
              <div className="body">
                <div className="t1">{it.nama_obat}</div>
                <div className="t2">
                  {rupiah(it.harga_jual)} · {it.nama_satuan} {it.nomor_batch ? `· Batch ${it.nomor_batch}` : ""}
                </div>

                {/* Input Diskon Item di Mobile */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 700 }}>Diskon:</span>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "stretch",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      overflow: "hidden",
                      background: "#fff",
                    }}
                    onWheel={(e) => {
                      e.preventDefault();
                      const arah = e.deltaY < 0 ? 1 : -1;
                      const step = (it.diskon_tipe || "rp") === "%" ? 1 : 500;
                      const valLama = Number(it.diskon_nilai || 0);
                      const max = (it.diskon_tipe || "rp") === "%" ? 100 : 999999999;
                      onUbah(it.key, "diskon_nilai", Math.max(0, Math.min(max, valLama + arah * step)));
                    }}
                  >
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      max={(it.diskon_tipe || "rp") === "%" ? 100 : undefined}
                      value={it.diskon_nilai === 0 || it.diskon_nilai === undefined ? "" : it.diskon_nilai}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        onUbah(it.key, "diskon_nilai", val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          const step = (it.diskon_tipe || "rp") === "%" ? 1 : 500;
                          const valLama = Number(it.diskon_nilai || 0);
                          const max = (it.diskon_tipe || "rp") === "%" ? 100 : 999999999;
                          onUbah(it.key, "diskon_nilai", Math.min(max, valLama + step));
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          const step = (it.diskon_tipe || "rp") === "%" ? 1 : 500;
                          const valLama = Number(it.diskon_nilai || 0);
                          onUbah(it.key, "diskon_nilai", Math.max(0, valLama - step));
                        }
                      }}
                      style={{
                        width: 60,
                        padding: "3px 6px",
                        fontSize: 12,
                        border: "none",
                        outline: "none",
                        textAlign: "right",
                        fontWeight: 700,
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", width: 18, borderLeft: "1px solid var(--line)", background: "#F8FAFC" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const step = (it.diskon_tipe || "rp") === "%" ? 1 : 500;
                          const valLama = Number(it.diskon_nilai || 0);
                          const max = (it.diskon_tipe || "rp") === "%" ? 100 : 999999999;
                          onUbah(it.key, "diskon_nilai", Math.min(max, valLama + step));
                        }}
                        style={{ flex: 1, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontSize: 8, color: "var(--ink)", lineHeight: 1 }}
                        title="Tambah diskon (Bisa scroll mouse ke atas)"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const step = (it.diskon_tipe || "rp") === "%" ? 1 : 500;
                          const valLama = Number(it.diskon_nilai || 0);
                          onUbah(it.key, "diskon_nilai", Math.max(0, valLama - step));
                        }}
                        style={{ flex: 1, border: "none", borderTop: "1px solid var(--line)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontSize: 8, color: "var(--ink)", lineHeight: 1 }}
                        title="Kurang diskon (Bisa scroll mouse ke bawah)"
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUbah(it.key, "diskon_tipe", (it.diskon_tipe || "rp") === "%" ? "rp" : "%")}
                      style={{
                        padding: "3px 7px",
                        fontSize: 11,
                        fontWeight: 800,
                        border: "none",
                        borderLeft: "1px solid var(--line)",
                        background: (it.diskon_tipe || "rp") === "%" ? "var(--magenta)" : "#F3F4F6",
                        color: (it.diskon_tipe || "rp") === "%" ? "#fff" : "var(--ink)",
                        cursor: "pointer",
                      }}
                    >
                      {(it.diskon_tipe || "rp") === "%" ? "%" : "Rp"}
                    </button>
                  </div>
                  {diskonNominal > 0 && (
                    <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 700 }}>
                      (-{rupiah(diskonNominal)})
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginTop: 6 }}>
                  Subtotal: <span style={{ color: "var(--magenta-dark)" }}>{rupiah(subtotal)}</span>
                </div>
              </div>
              <div className="qty-mini">
                <button type="button" onClick={() => onUbah(it.key, "qty", Math.max(1, it.qty - 1))}>−</button>
                <span>{it.qty}</span>
                <button type="button" onClick={() => onUbah(it.key, "qty", it.qty + 1)}>+</button>
                <button
                  type="button"
                  onClick={() => onHapus(it.key)}
                  style={{
                    color: "#DC2626",
                    borderColor: "#FECACA",
                    background: "#FEF2F2",
                    marginLeft: 2,
                    fontSize: 11,
                  }}
                  title="Hapus"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- TAMPILAN DESKTOP: TABEL KASIR LENGKAP ---------- */}
      <div className="obat-table-wrap desktop-only">
        <table className="cart-table" style={{ minWidth: 620 }}>
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ width: 90 }}>Qty</th>
              <th style={{ width: 110 }}>Harga</th>
              <th style={{ width: 90 }}>Tuslah</th>
              <th style={{ width: 130 }}>Diskon Item</th>
              <th style={{ width: 115, textAlign: "right" }}>Subtotal</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const diskonNominal = hitungDiskonItem(it);
              const subtotalKotor = it.qty * it.harga_jual + (it.tuslah || 0);
              const subtotal = Math.max(subtotalKotor - diskonNominal, 0);
              const hargaDiubah = it.harga_jual !== it.harga_asli;
              const tipeDiskon = it.diskon_tipe || "rp";

              return (
                <tr key={it.key}>
                  <td>
                    <div className="cart-item-nama">{it.nama_obat}</div>
                    <div className="cart-item-sub">
                      {it.nama_satuan}
                      {it.nomor_batch ? ` · Batch ${it.nomor_batch}` : ""}
                    </div>
                    {hargaDiubah && (
                      <div className="cart-item-note">
                        Harga asli {rupiah(it.harga_asli)} → diubah kasir
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="qty-stepper">
                      <button type="button" onClick={() => onUbah(it.key, "qty", Math.max(1, it.qty - 1))}>−</button>
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) => onUbah(it.key, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <button type="button" onClick={() => onUbah(it.key, "qty", it.qty + 1)}>+</button>
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="cart-input-angka"
                      value={it.harga_jual}
                      onChange={(e) => onUbah(it.key, "harga_jual", Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="cart-input-angka"
                      value={it.tuslah}
                      onChange={(e) => onUbah(it.key, "tuslah", Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "stretch",
                          border: "1.5px solid var(--line)",
                          borderRadius: 8,
                          overflow: "hidden",
                          background: "#fff",
                          width: "100%",
                          minWidth: 86,
                        }}
                        onWheel={(e) => {
                          e.preventDefault();
                          const arah = e.deltaY < 0 ? 1 : -1;
                          const step = tipeDiskon === "%" ? 1 : 500;
                          const valLama = Number(it.diskon_nilai || 0);
                          const max = tipeDiskon === "%" ? 100 : 999999999;
                          onUbah(it.key, "diskon_nilai", Math.max(0, Math.min(max, valLama + arah * step)));
                        }}
                      >
                        <input
                          type="number"
                          style={{
                            width: "100%",
                            textAlign: "right",
                            padding: "6px 6px",
                            border: "none",
                            outline: "none",
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "inherit",
                          }}
                          placeholder="0"
                          min="0"
                          max={tipeDiskon === "%" ? 100 : undefined}
                          value={it.diskon_nilai === 0 || it.diskon_nilai === undefined ? "" : it.diskon_nilai}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            onUbah(it.key, "diskon_nilai", val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowUp") {
                              e.preventDefault();
                              const step = tipeDiskon === "%" ? 1 : 500;
                              const valLama = Number(it.diskon_nilai || 0);
                              const max = tipeDiskon === "%" ? 100 : 999999999;
                              onUbah(it.key, "diskon_nilai", Math.min(max, valLama + step));
                            } else if (e.key === "ArrowDown") {
                              e.preventDefault();
                              const step = tipeDiskon === "%" ? 1 : 500;
                              const valLama = Number(it.diskon_nilai || 0);
                              onUbah(it.key, "diskon_nilai", Math.max(0, valLama - step));
                            }
                          }}
                          title="Bisa ketik angka, scroll mouse, atau klik tombol tanda panah"
                        />
                        <div style={{ display: "flex", flexDirection: "column", width: 18, borderLeft: "1px solid var(--line)", background: "#F8FAFC" }}>
                          <button
                            type="button"
                            onClick={() => {
                              const step = tipeDiskon === "%" ? 1 : 500;
                              const valLama = Number(it.diskon_nilai || 0);
                              const max = tipeDiskon === "%" ? 100 : 999999999;
                              onUbah(it.key, "diskon_nilai", Math.min(max, valLama + step));
                            }}
                            style={{ flex: 1, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontSize: 8, color: "var(--ink)", lineHeight: 1 }}
                            title="Tambah diskon (Bisa scroll mouse ke atas)"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const step = tipeDiskon === "%" ? 1 : 500;
                              const valLama = Number(it.diskon_nilai || 0);
                              onUbah(it.key, "diskon_nilai", Math.max(0, valLama - step));
                            }}
                            style={{ flex: 1, border: "none", borderTop: "1px solid var(--line)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontSize: 8, color: "var(--ink)", lineHeight: 1 }}
                            title="Kurang diskon (Bisa scroll mouse ke bawah)"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUbah(it.key, "diskon_tipe", tipeDiskon === "%" ? "rp" : "%")}
                        style={{
                          padding: "6px 8px",
                          fontSize: 10.5,
                          fontWeight: 700,
                          borderRadius: 8,
                          border: "1px solid var(--line)",
                          background: tipeDiskon === "%" ? "var(--magenta)" : "#F3F4F6",
                          color: tipeDiskon === "%" ? "#fff" : "var(--ink)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        title="Klik untuk ganti mode diskon (Rp / %)"
                      >
                        {tipeDiskon === "%" ? "%" : "Rp"}
                      </button>
                    </div>
                    {diskonNominal > 0 && (
                      <div style={{ fontSize: 10.5, color: "#DC2626", fontWeight: 700, marginTop: 2, textAlign: "right" }}>
                        -{rupiah(diskonNominal)}
                      </div>
                    )}
                  </td>
                  <td className="cart-subtotal" style={{ textAlign: "right" }}>
                    <div>{rupiah(subtotal)}</div>
                    {diskonNominal > 0 && (
                      <div style={{ fontSize: 10, textDecoration: "line-through", color: "var(--ink-soft)" }}>
                        {rupiah(subtotalKotor)}
                      </div>
                    )}
                  </td>
                  <td>
                    <button type="button" className="cart-hapus-btn" onClick={() => onHapus(it.key)} aria-label="Hapus item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
