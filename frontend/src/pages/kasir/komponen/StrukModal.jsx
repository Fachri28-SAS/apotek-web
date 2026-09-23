import { useState, useEffect } from "react";
import { rupiah } from "../../../utils/format";

/**
 * Cetak struk kasir secara bersih menggunakan iframe terisolasi
 * Disesuaikan khusus untuk printer thermal (58mm EPPOS/Panda/Epson dsb maupun 80mm)
 * agar teks kanan (harga & total) TIDAK TERPOTONG ke samping.
 */
function cetakStruk(noStruk, ukuranKertas = "58mm") {
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

  // 58mm memiliki printable width efektif 48mm (384 dots)
  // 80mm memiliki printable width efektif 72mm (576 dots)
  const is58 = ukuranKertas === "58mm";
  const printWidth = is58 ? "48mm" : "72mm";
  const pageSize = is58 ? "58mm auto" : "80mm auto";
  const baseFontSize = is58 ? "10px" : "11.5px";

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
            size: ${pageSize};
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: ${printWidth};
            max-width: ${printWidth};
            margin: 0;
            padding: 1.5mm 1mm;
            font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: ${baseFontSize};
            line-height: 1.25;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .struk-center {
            text-align: center;
          }
          .struk-garis-dash {
            border: none;
            border-top: 1px dashed #000;
            margin: 4px 0;
          }
          .struk-baris {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 4px;
            margin-bottom: 2.5px;
          }
          .struk-baris > span:first-child {
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .struk-baris > span:last-child {
            text-align: right;
            white-space: nowrap;
            flex-shrink: 0;
            font-weight: 700;
          }
          .struk-items-list {
            margin: 3px 0;
          }
          img {
            max-height: 32px;
            max-width: 85%;
            object-fit: contain;
            margin: 0 auto 3px auto;
            display: block;
            filter: grayscale(100%) contrast(150%);
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
  // Pilihan ukuran kertas (default 58mm sesuai printer EPPOS / thermal kasir)
  const [ukuranKertas, setUkuranKertas] = useState(() => {
    return localStorage.getItem("struk_ukuran_kertas") || "58mm";
  });

  function gantiUkuran(val) {
    setUkuranKertas(val);
    localStorage.setItem("struk_ukuran_kertas", val);
  }

  useEffect(() => {
    if (data && autoPrint) {
      const timer = setTimeout(() => {
        cetakStruk(data.no_struk, ukuranKertas);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [data, autoPrint, ukuranKertas]);

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

  const is58 = ukuranKertas === "58mm";

  return (
    <div className="struk-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="struk-modal" style={{ maxWidth: 380 }}>
        <div className="struk-modal-head">
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Pratinjau Struk Kasir</h3>
          <button className="kasir-logout-btn" onClick={onClose} aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* Pemilih Ukuran Kertas Printer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 18px 0 18px",
          borderBottom: "1px solid var(--line)",
          paddingBottom: 10,
        }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 700 }}>Ukuran Printer:</span>
          <div style={{ display: "inline-flex", gap: 4, background: "#F1F5F9", padding: 3, borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => gantiUkuran("58mm")}
              style={{
                border: "none",
                background: ukuranKertas === "58mm" ? "var(--magenta)" : "transparent",
                color: ukuranKertas === "58mm" ? "#fff" : "var(--ink)",
                fontWeight: 700,
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Standar Printer Thermal EPPOS / Kasir Apotek (58mm)"
            >
              58 mm (EPPOS)
            </button>
            <button
              type="button"
              onClick={() => gantiUkuran("80mm")}
              style={{
                border: "none",
                background: ukuranKertas === "80mm" ? "var(--magenta)" : "transparent",
                color: ukuranKertas === "80mm" ? "#fff" : "var(--ink)",
                fontWeight: 700,
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Printer Thermal Besar (80mm)"
            >
              80 mm
            </button>
          </div>
        </div>

        <div
          className="struk-cetak"
          style={{
            maxWidth: is58 ? 290 : 340,
            margin: "0 auto",
            padding: "16px 14px",
            fontFamily: "'Courier New', Courier, monospace, sans-serif",
            fontSize: is58 ? 11 : 12,
            lineHeight: 1.3,
            color: "#000",
          }}
        >
          {/* Header Logo Resmi Apotek Bima Farma */}
          <div className="struk-center" style={{ marginBottom: 4 }}>
            <img
              src="/logo-bima-farma.png"
              alt="Logo Apotek Bima Farma"
              style={{
                maxHeight: 34,
                maxWidth: "85%",
                objectFit: "contain",
                margin: "0 auto 4px auto",
                display: "block",
                filter: "grayscale(100%) contrast(150%)",
              }}
            />
            <div style={{ fontSize: 10, color: "#111", lineHeight: 1.25 }}>
              Jl. Tanimulya Raya No. 1, Ngamprah<br />
              Kab. Bandung Barat
            </div>
          </div>

          <div className="struk-garis-dash" />

          {/* Meta Informasi Struk 2 Kolom */}
          <div className="struk-baris">
            <span style={{ color: "#333" }}>Antrian / No</span>
            <span style={{ fontWeight: 700, textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>{data.no_struk}</span>
          </div>
          <div className="struk-baris">
            <span style={{ color: "#333" }}>Pembeli</span>
            <span style={{ textAlign: "right", wordBreak: "break-word" }}>{data.nama_pembeli || "Umum"}</span>
          </div>
          <div className="struk-baris">
            <span style={{ color: "#333" }}>Pembayaran</span>
            <span style={{ textTransform: "uppercase", textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
              {data.metode_bayar === "tunai" ? "Cash" : data.metode_bayar}
            </span>
          </div>
          <div className="struk-baris">
            <span style={{ color: "#333" }}>Tanggal</span>
            <span style={{ textAlign: "right", fontSize: 9.5, whiteSpace: "nowrap", flexShrink: 0 }}>{tanggal}</span>
          </div>
          <div className="struk-baris">
            <span style={{ color: "#333" }}>Kasir</span>
            <span style={{ textAlign: "right", wordBreak: "break-word" }}>{data.nama_kasir || "Kasir"}</span>
          </div>

          <div className="struk-garis-dash" />

          {/* Daftar Item & Diskon Per Item */}
          <div className="struk-items-list">
            {(data.items || []).map((it) => {
              const itemSubtotalKotor = Number(it.qty) * Number(it.harga_jual) + Number(it.tuslah || 0);
              const itemDiskon = Number(it.diskon || 0);
              const itemSubtotalBersih = Math.max(itemSubtotalKotor - itemDiskon, 0);

              return (
                <div key={it.id || it.key} style={{ marginBottom: 5 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", wordBreak: "break-word" }}>
                    {it.nama_obat} ({it.nama_satuan})
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 10.5 }}>
                    <span>{Number(it.harga_jual).toLocaleString("id-ID")} × {it.qty}</span>
                    <span style={{ fontWeight: 700, textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {itemSubtotalBersih.toLocaleString("id-ID")}
                    </span>
                  </div>
                  {itemDiskon > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#000" }}>
                      <span>Diskon</span>
                      <span style={{ fontWeight: 700 }}>-{itemDiskon.toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  {Number(it.harga_jual) !== Number(it.harga_asli) && (
                    <div style={{ fontSize: 9, color: "#555" }}>
                      *Harga asli {rupiah(it.harga_asli)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="struk-garis-dash" />

          {/* Rincian Total */}
          <div className="struk-baris" style={{ fontWeight: 800, fontSize: 11.5 }}>
            <span>TOTAL {totalQty} QTY</span>
            <span style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
              {Number(data.total).toLocaleString("id-ID")}
            </span>
          </div>

          {diskonTransaksi > 0 && (
            <div className="struk-baris" style={{ fontSize: 10.5 }}>
              <span>Diskon Tambahan</span>
              <span style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
                -{diskonTransaksi.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          <div className="struk-baris" style={{ fontSize: 10.5 }}>
            <span>Bayar</span>
            <span style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
              {data.metode_bayar === "tunai"
                ? Number(data.uang_diterima || data.total).toLocaleString("id-ID")
                : Number(data.total).toLocaleString("id-ID")}
            </span>
          </div>

          {data.metode_bayar === "tunai" && (
            <div className="struk-baris" style={{ fontSize: 10.5 }}>
              <span>Kembali</span>
              <span style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
                {Number(data.kembalian || 0).toLocaleString("id-ID")}
              </span>
            </div>
          )}

          <div className="struk-garis-dash" />

          {/* Footer Ucapan Terima Kasih */}
          <div className="struk-center" style={{ fontSize: 9.5, color: "#111", marginTop: 6, lineHeight: 1.35 }}>
            <div style={{ fontWeight: 700 }}>Terima kasih</div>
            <div>Barang yg sudah dibeli tidak dapat dikembalikan.</div>
            <div style={{ marginTop: 2, fontWeight: 700 }}>CS: 0838-5662-5271</div>
          </div>
        </div>

        <div className="struk-actions" style={{ padding: "12px 18px 18px 18px" }}>
          <button className="btn-outline" onClick={onClose}>Tutup</button>
          <button className="btn-primary" onClick={() => cetakStruk(data.no_struk, ukuranKertas)}>
            🖨️ Cetak Struk ({ukuranKertas})
          </button>
        </div>
      </div>

      {/* CSS Cetak Thermal & Printer Biasa */}
      <style>{`
        .struk-garis-dash {
          border: none;
          border-top: 1px dashed #4B5563;
          margin: 5px 0;
        }
        @media print {
          @page {
            margin: 0;
            size: ${is58 ? "58mm auto" : "80mm auto"};
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
            width: ${is58 ? "48mm" : "72mm"} !important;
            max-width: ${is58 ? "48mm" : "72mm"} !important;
            padding: 1.5mm 1mm !important;
            font-size: ${is58 ? "10px" : "11.5px"} !important;
            color: #000 !important;
            background: #fff !important;
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
