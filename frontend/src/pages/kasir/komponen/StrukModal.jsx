import { useEffect } from "react";
import { rupiah } from "../../../utils/format";

/**
 * Cetak struk kasir secara bersih menggunakan iframe terisolasi
 * agar kompatibel dengan printer thermal maupun printer biasa (Epson, dsb)
 * dan TIDAK menampilkan halaman kosong.
 */
function cetakStruk(noStruk) {
  const el = document.querySelector(".struk-cetak");
  if (!el) {
    window.print();
    return;
  }

  let iframe = document.getElementById("print-struk-frame");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "print-struk-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Struk-${noStruk}</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, monospace, sans-serif;
            font-size: 11.5px;
            color: #000;
            background: #fff;
            margin: 0 auto;
            padding: 8px 12px;
            width: 76mm;
            max-width: 100%;
          }
          .struk-center {
            text-align: center;
          }
          .struk-garis-dash {
            border: none;
            border-top: 1px dashed #333;
            margin: 6px 0;
          }
          .struk-baris {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .struk-items-list {
            margin: 4px 0;
          }
          img {
            max-height: 38px;
            max-width: 80%;
            object-fit: contain;
            margin: 0 auto 4px auto;
            display: block;
          }
        </style>
      </head>
      <body>
        ${el.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 250);
}

export default function StrukModal({ data, onClose, autoPrint = true }) {
  useEffect(() => {
    if (data && autoPrint) {
      const timer = setTimeout(() => {
        cetakStruk(data.no_struk);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [data, autoPrint]);

  if (!data) return null;

  const tanggal = new Date(data.created_at).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalQty = (data.items || []).reduce((s, it) => s + Number(it.qty || 1), 0);
  const totalDiskonItem = (data.items || []).reduce((s, it) => s + Number(it.diskon || 0), 0);
  const totalDiskonSemua = Number(data.diskon || 0);
  const diskonTransaksi = Math.max(totalDiskonSemua - totalDiskonItem, 0);

  return (
    <div className="struk-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="struk-modal">
        <div className="struk-modal-head">
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Pratinjau Struk Kasir</h3>
          <button className="kasir-logout-btn" onClick={onClose} aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="struk-cetak">
          {/* Header Logo Resmi Apotek Bima Farma */}
          <div className="struk-center" style={{ marginBottom: 6 }}>
            <img
              src="/logo-bima-farma.png"
              alt="Logo Apotek Bima Farma"
              style={{ maxHeight: 38, maxWidth: "80%", objectFit: "contain", margin: "0 auto 4px auto", display: "block" }}
            />
            <div style={{ fontSize: 11, color: "#4B5563", lineHeight: 1.3 }}>
              Jl. Tanimulya Raya No. 1, Ngamprah<br />
              Kab. Bandung Barat
            </div>
          </div>

          <div className="struk-garis-dash" />

          {/* Meta Informasi Struk 2 Kolom */}
          <div className="struk-baris"><span>Antrian / No</span><span style={{ fontWeight: 700 }}>{data.no_struk}</span></div>
          <div className="struk-baris"><span>Pembeli</span><span>{data.nama_pembeli || "Umum"}</span></div>
          <div className="struk-baris"><span>Pembayaran</span><span style={{ textTransform: "uppercase" }}>{data.metode_bayar === "tunai" ? "Cash" : data.metode_bayar}</span></div>
          <div className="struk-baris"><span>Tanggal</span><span>{tanggal}</span></div>
          <div className="struk-baris"><span>Kasir</span><span>{data.nama_kasir || "Kasir"}</span></div>

          <div className="struk-garis-dash" />

          {/* Daftar Item & Diskon Per Item */}
          <div className="struk-items-list">
            {(data.items || []).map((it) => {
              const itemSubtotalKotor = Number(it.qty) * Number(it.harga_jual) + Number(it.tuslah || 0);
              const itemDiskon = Number(it.diskon || 0);
              const itemSubtotalBersih = Math.max(itemSubtotalKotor - itemDiskon, 0);

              return (
                <div key={it.id || it.key} style={{ marginBottom: 7 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>
                    {it.nama_obat} ({it.nama_satuan})
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#1F2937" }}>
                    <span>{Number(it.harga_jual).toLocaleString("id-ID")} × {it.qty}</span>
                    <span style={{ fontWeight: 600 }}>{itemSubtotalBersih.toLocaleString("id-ID")}</span>
                  </div>
                  {itemDiskon > 0 && (
                    <div style={{ fontSize: 11, color: "#000", fontWeight: 700 }}>
                      -{itemDiskon.toLocaleString("id-ID")}
                    </div>
                  )}
                  {Number(it.harga_jual) !== Number(it.harga_asli) && (
                    <div style={{ fontSize: 9.5, color: "#6B7280" }}>
                      *Harga asli {rupiah(it.harga_asli)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="struk-garis-dash" />

          {/* Rincian Total */}
          <div className="struk-baris" style={{ fontWeight: 700 }}>
            <span>TOTAL {totalQty} QTY</span>
            <span>{Number(data.total).toLocaleString("id-ID")}</span>
          </div>

          {diskonTransaksi > 0 && (
            <div className="struk-baris" style={{ fontSize: 11 }}>
              <span>Diskon Tambahan</span>
              <span>-{diskonTransaksi.toLocaleString("id-ID")}</span>
            </div>
          )}

          <div className="struk-baris">
            <span>Bayar</span>
            <span>
              {data.metode_bayar === "tunai"
                ? Number(data.uang_diterima || data.total).toLocaleString("id-ID")
                : Number(data.total).toLocaleString("id-ID")}
            </span>
          </div>

          {data.metode_bayar === "tunai" && (
            <div className="struk-baris">
              <span>Kembali</span>
              <span>{Number(data.kembalian || 0).toLocaleString("id-ID")}</span>
            </div>
          )}

          <div className="struk-garis-dash" />

          {/* Footer Ucapan Terima Kasih */}
          <div className="struk-center" style={{ fontSize: 10.5, color: "#374151", marginTop: 8, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 600 }}>Terima kasih -</div>
            <div>Barang yg sudah dibeli tidak dapat dikembalikan.</div>
            <div style={{ marginTop: 3 }}>Customer Care : 0838-5662-5271</div>
          </div>
        </div>

        <div className="struk-actions">
          <button className="btn-outline" onClick={onClose}>Tutup</button>
          <button className="btn-primary" onClick={() => cetakStruk(data.no_struk)}>🖨️ Cetak Struk</button>
        </div>
      </div>

      {/* CSS Cetak Thermal & Printer Biasa */}
      <style>{`
        .struk-garis-dash {
          border: none;
          border-top: 1px dashed #4B5563;
          margin: 6px 0;
        }
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body * {
            visibility: hidden !important;
          }
          .struk-overlay {
            position: static !important;
            display: block !important;
            visibility: visible !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .struk-modal {
            position: static !important;
            display: block !important;
            visibility: visible !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .struk-modal-head, .struk-actions {
            display: none !important;
          }
          .struk-cetak, .struk-cetak * {
            visibility: visible !important;
          }
          .struk-cetak {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 76mm !important;
            max-width: 100% !important;
            padding: 4mm 6mm !important;
            font-size: 11px !important;
            color: #000 !important;
            background: #fff !important;
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
