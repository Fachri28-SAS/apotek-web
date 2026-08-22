import { rupiah } from "../../../utils/format";

export default function CartTable({ items, onUbah, onHapus }) {
  if (items.length === 0) {
    return (
      <div className="cart-kosong">
        Keranjang masih kosong. Cari obat di kotak atas untuk mulai.
      </div>
    );
  }

  return (
    <table className="cart-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style={{ width: 96 }}>Qty</th>
          <th style={{ width: 120 }}>Harga</th>
          <th style={{ width: 100 }}>Tuslah</th>
          <th style={{ width: 120 }}>Subtotal</th>
          <th style={{ width: 40 }}></th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => {
          const subtotal = it.qty * it.harga_jual + it.tuslah;
          const hargaDiubah = it.harga_jual !== it.harga_asli;
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
              <td className="cart-subtotal">{rupiah(subtotal)}</td>
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
  );
}
