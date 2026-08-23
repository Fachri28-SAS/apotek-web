import { rupiah } from "../../../utils/format";

export default function StrukModal({ data, onClose }) {
  if (!data) return null;

  const tanggal = new Date(data.created_at).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="struk-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="struk-modal">
        <div className="struk-modal-head">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Struk Penjualan</h3>
          <button className="kasir-logout-btn" onClick={onClose} aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="struk-cetak">
          <div className="struk-center">
            <div className="struk-toko">APOTEK BIMA FARMA</div>
            <div>Jl. Tanimulya Raya No. 1, Ngamprah</div>
          </div>

          <div className="struk-garis" />

          <div className="struk-baris"><span>No. Struk</span><span>{data.no_struk}</span></div>
          <div className="struk-baris"><span>No. Invoice</span><span>{data.no_invoice}</span></div>
          <div className="struk-baris"><span>Tanggal</span><span>{tanggal}</span></div>
          <div className="struk-baris"><span>Kasir</span><span>{data.nama_kasir}</span></div>
          {data.nama_pembeli && (
            <div className="struk-baris"><span>Pembeli</span><span>{data.nama_pembeli}</span></div>
          )}

          <div className="struk-garis" />

          {data.items.map((it) => (
            <div key={it.id} className="struk-item">
              <div>{it.nama_obat}</div>
              <div className="struk-item-sub">
                {it.qty} {it.nama_satuan} × {rupiah(it.harga_jual)}
                {it.nomor_batch ? ` · Batch ${it.nomor_batch}` : ""}
              </div>
              {it.harga_jual !== it.harga_asli && (
                <div className="struk-item-note">
                  Harga asli {rupiah(it.harga_asli)} → diubah kasir jadi {rupiah(it.harga_jual)}
                </div>
              )}
              <div className="struk-item-subtotal">{rupiah(it.qty * it.harga_jual + it.tuslah)}</div>
            </div>
          ))}

          <div className="struk-garis" />

          <div className="struk-baris"><span>Subtotal</span><span>{rupiah(data.subtotal + data.total_tuslah)}</span></div>
          {data.diskon > 0 && (
            <div className="struk-baris"><span>Diskon</span><span>-{rupiah(data.diskon)}</span></div>
          )}
          <div className="struk-baris struk-total"><span>TOTAL</span><span>{rupiah(data.total)}</span></div>
          <div className="struk-baris"><span>Metode</span><span>{data.metode_bayar.toUpperCase()}</span></div>
          {data.metode_bayar === "tunai" && (
            <>
              <div className="struk-baris"><span>Tunai</span><span>{rupiah(data.uang_diterima)}</span></div>
              <div className="struk-baris"><span>Kembalian</span><span>{rupiah(data.kembalian)}</span></div>
            </>
          )}

          <div className="struk-garis" />
          <div className="struk-center struk-footer">Terima kasih atas kunjungan Anda</div>
        </div>

        <div className="struk-actions">
          <button className="btn-outline" onClick={onClose}>Tutup</button>
          <button className="btn-primary" onClick={() => window.print()}>Cetak Struk</button>
        </div>
      </div>

      {/* CSS khusus print: cuma .struk-cetak yang tercetak, ukuran mirip thermal 58mm */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .struk-cetak, .struk-cetak * { visibility: visible; }
          .struk-cetak {
            position: fixed; top: 0; left: 0;
            width: 58mm; padding: 4mm; font-size: 11px;
          }
          .struk-actions, .struk-overlay { position: static !important; }
        }
      `}</style>
    </div>
  );
}
