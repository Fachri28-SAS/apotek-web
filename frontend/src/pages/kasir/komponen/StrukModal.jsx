import { useState, useEffect } from "react";
import { rupiah } from "../../../utils/format";

/**
 * Helper menghasilkan HTML struk yang presisi untuk printer thermal EPPOS EP58M (58mm) & 80mm.
 * Dirancang khusus agar teks kanan (harga, subtotal, total) TIDAK TERPOTONG ke samping
 * dan ada feed space di bagian bawah agar saat merobek kertas di cutter fisik tidak merobek tulisan.
 */
function buatHtmlStruk(data, ukuranKertas = "58mm") {
  const is58 = ukuranKertas === "58mm";
  // EPPOS EP58M: Lebar kertas 58mm, printable area 48mm (384 dots).
  // Menggunakan safe width 46.5mm agar bebas dari dead-zone roller dan tepi kanan tidak terpotong.
  const printWidth = is58 ? "46.5mm" : "72mm";
  const pageSize = is58 ? "58mm auto" : "80mm auto";
  const baseFontSize = is58 ? "9.5px" : "11px";
  const headerFontSize = is58 ? "12px" : "14px";
  const subFontSize = is58 ? "8.5px" : "10px";
  const bottomFeed = is58 ? "18mm" : "20mm";

  const tglObj = data.created_at || data.tanggal ? new Date(data.created_at || data.tanggal) : new Date();
  const tanggal = !isNaN(tglObj.getTime())
    ? tglObj.toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  const totalQty = (data.items || []).reduce((s, it) => s + Number(it.qty || 1), 0);
  const totalDiskonItem = (data.items || []).reduce((s, it) => s + Number(it.diskon || 0), 0);
  const totalDiskonSemua = Number(data.diskon || 0);
  const diskonTransaksi = Math.max(totalDiskonSemua - totalDiskonItem, 0);

  const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/logo-bima-farma.png` : "/logo-bima-farma.png";

  const itemsHtml = (data.items || [])
    .map((it) => {
      const itemSubtotalKotor = Number(it.qty) * Number(it.harga_jual) + Number(it.tuslah || 0);
      const itemDiskon = Number(it.diskon || 0);
      const itemSubtotalBersih = Math.max(itemSubtotalKotor - itemDiskon, 0);

      return `
        <div style="margin-bottom: 5px;">
          <div style="font-weight: 700; font-size: ${baseFontSize}; text-transform: uppercase; word-break: break-word; line-height: 1.25;">
            ${it.nama_obat || "Obat"} ${it.nama_satuan ? `(${it.nama_satuan})` : ""}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: ${baseFontSize}; margin-top: 1px;">
            <span>${it.qty} × ${Number(it.harga_jual || 0).toLocaleString("id-ID")}</span>
            <span style="font-weight: 700; text-align: right; white-space: nowrap; flex-shrink: 0;">
              ${itemSubtotalBersih.toLocaleString("id-ID")}
            </span>
          </div>
          ${
            itemDiskon > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: ${subFontSize}; color: #000;">
              <span>*Diskon item</span>
              <span style="font-weight: 700;">-${itemDiskon.toLocaleString("id-ID")}</span>
            </div>
          `
              : ""
          }
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Struk-${data.no_struk || "BimaFarma"}</title>
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
            margin: 0 auto;
            padding: 1.5mm 1mm 0 1mm;
            font-family: 'Consolas', 'Courier New', Courier, monospace, sans-serif;
            font-size: ${baseFontSize};
            line-height: 1.25;
            color: #000000;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .struk-center {
            text-align: center;
          }
          .struk-garis-dash {
            border: none;
            border-top: 1px dashed #000000;
            margin: 4px 0;
            width: 100%;
          }
          .struk-baris {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 2px;
            margin-bottom: 2px;
            width: 100%;
          }
          .struk-baris > span:first-child {
            word-break: break-word;
            overflow-wrap: break-word;
            min-width: 0;
          }
          .struk-baris > span:last-child {
            text-align: right;
            white-space: nowrap;
            flex-shrink: 0;
            font-weight: 700;
          }
          .struk-logo {
            max-height: 28px;
            max-width: 120px;
            object-fit: contain;
            margin: 0 auto 3px auto;
            display: block;
            filter: grayscale(100%) contrast(200%);
            image-rendering: pixelated;
          }
        </style>
      </head>
      <body>
        <!-- Header Apotek -->
        <div class="struk-center">
          <img src="${logoUrl}" class="struk-logo" alt="Logo" onerror="this.style.display='none'" />
          <div style="font-size: ${headerFontSize}; font-weight: 800; letter-spacing: 0.5px;">APOTEK BIMA FARMA</div>
          <div style="font-size: ${subFontSize}; line-height: 1.25; margin-top: 1px;">
            Jl. Tanimulya Raya No. 1, Ngamprah<br />
            Kab. Bandung Barat · WA: 0812-2360-4900
          </div>
        </div>

        <div class="struk-garis-dash"></div>

        <!-- Meta Informasi Transaksi -->
        <div class="struk-baris">
          <span>No. Struk</span>
          <span>${data.no_struk || "-"}</span>
        </div>
        <div class="struk-baris">
          <span>Waktu</span>
          <span style="font-size: ${subFontSize};">${tanggal}</span>
        </div>
        <div class="struk-baris">
          <span>Kasir</span>
          <span>${data.nama_kasir || "Kasir"}</span>
        </div>
        <div class="struk-baris">
          <span>Pembeli</span>
          <span>${data.nama_pembeli || "Umum"}</span>
        </div>
        <div class="struk-baris">
          <span>Bayar</span>
          <span style="text-transform: uppercase;">${data.metode_bayar === "tunai" ? "TUNAI" : data.metode_bayar || "TUNAI"}</span>
        </div>

        <div class="struk-garis-dash"></div>

        <!-- Rincian Produk Obat -->
        <div>
          ${itemsHtml}
        </div>

        <div class="struk-garis-dash"></div>

        <!-- Rincian Total Belanja -->
        <div class="struk-baris" style="font-weight: 800; font-size: ${is58 ? "10.5px" : "12px"}; margin-top: 2px;">
          <span>TOTAL (${totalQty} ITEM)</span>
          <span>${Number(data.total || 0).toLocaleString("id-ID")}</span>
        </div>

        ${
          diskonTransaksi > 0
            ? `
          <div class="struk-baris" style="font-size: ${subFontSize};">
            <span>Diskon Tambahan</span>
            <span>-${diskonTransaksi.toLocaleString("id-ID")}</span>
          </div>
        `
            : ""
        }

        <div class="struk-baris" style="font-size: ${baseFontSize};">
          <span>${data.metode_bayar === "tunai" ? "Uang Diterima" : "Nominal Bayar"}</span>
          <span>
            ${
              data.metode_bayar === "tunai"
                ? Number(data.uang_diterima || data.total).toLocaleString("id-ID")
                : Number(data.total || 0).toLocaleString("id-ID")
            }
          </span>
        </div>

        ${
          data.metode_bayar === "tunai"
            ? `
          <div class="struk-baris" style="font-size: ${baseFontSize}; font-weight: 700;">
            <span>Kembalian</span>
            <span>${Number(data.kembalian || 0).toLocaleString("id-ID")}</span>
          </div>
        `
            : `
          <div class="struk-baris" style="font-size: ${baseFontSize}; font-weight: 700;">
            <span>Status</span>
            <span>LUNAS</span>
          </div>
        `
        }

        <div class="struk-garis-dash"></div>

        <!-- Footer Struk -->
        <div class="struk-center" style="font-size: ${subFontSize}; line-height: 1.35; margin-top: 4px;">
          <div style="font-weight: 700;">Terima Kasih Atas Kunjungan Anda</div>
          <div>Semoga Lekas Sembuh!</div>
          <div style="font-size: 7.5px; margin-top: 2px;">Barang yg sudah dibeli tdk dapat ditukar/dikembalikan</div>
          <div style="font-weight: 700; margin-top: 2px;">CS Apotek: 0838-5662-5271</div>
        </div>

        <!-- FEED SPACE: Ruang kosong 18mm agar kertas melewati pisau cutter fisik printer EPPOS -->
        <div style="height: ${bottomFeed}; width: 100%;" aria-hidden="true"></div>
      </body>
    </html>
  `;
}

/**
 * Mencetak struk kasir secara bersih menggunakan iframe terisolasi
 * Disesuaikan khusus untuk printer thermal (58mm EPPOS EP58M / Panda / MiniPOS dsb)
 */
function cetakStruk(data, ukuranKertas = "58mm") {
  if (!data) return;

  const is58 = ukuranKertas === "58mm";
  const htmlStruk = buatHtmlStruk(data, ukuranKertas);

  let iframe = document.getElementById("print-struk-frame");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "print-struk-frame";
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = is58 ? "48mm" : "72mm";
    iframe.style.height = "250mm";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlStruk);
  doc.close();

  setTimeout(() => {
    try {
      const isMobile =
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (window.innerWidth <= 768 && "ontouchstart" in window);
      if (isMobile) {
        window.print();
        return;
      }
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.warn("Iframe print gagal, fallback ke window.print:", err);
      window.print();
    }
  }, 250);
}

export default function StrukModal({ data, onClose, autoPrint = false }) {
  // Pilihan ukuran kertas (default 58mm sesuai printer EPPOS EP58M kasir)
  const [ukuranKertas, setUkuranKertas] = useState(() => {
    return localStorage.getItem("struk_ukuran_kertas") || "58mm";
  });

  function gantiUkuran(val) {
    setUkuranKertas(val);
    localStorage.setItem("struk_ukuran_kertas", val);
  }

  useEffect(() => {
    // Hanya cetak otomatis jika autoPrint secara eksplisit bernilai true
    if (data && autoPrint) {
      const timer = setTimeout(() => {
        cetakStruk(data, ukuranKertas);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [data, autoPrint, ukuranKertas]);

  if (!data) return null;

  const tglObj = data.created_at || data.tanggal ? new Date(data.created_at || data.tanggal) : new Date();
  const tanggal = !isNaN(tglObj.getTime())
    ? tglObj.toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  const totalQty = (data.items || []).reduce((s, it) => s + Number(it.qty || 1), 0);
  const totalDiskonItem = (data.items || []).reduce((s, it) => s + Number(it.diskon || 0), 0);
  const totalDiskonSemua = Number(data.diskon || 0);
  const diskonTransaksi = Math.max(totalDiskonSemua - totalDiskonItem, 0);

  const is58 = ukuranKertas === "58mm";

  return (
    <div
      className="struk-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="struk-modal" style={{ maxWidth: 360 }}>
        <div className="struk-modal-head">
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Pratinjau Struk Kasir</h3>
          <button className="kasir-logout-btn" onClick={onClose} aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Pemilih Ukuran Kertas Printer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 18px",
            borderBottom: "1px solid var(--line)",
            background: "#F8FAFC",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11.5, color: "var(--ink)", fontWeight: 800 }}>Ukuran Printer</span>
            <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>
              {is58 ? "Cocok untuk EPPOS EP58M" : "Thermal 80mm"}
            </span>
          </div>

          <div style={{ display: "inline-flex", gap: 4, background: "#E2E8F0", padding: 3, borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => gantiUkuran("58mm")}
              style={{
                border: "none",
                background: ukuranKertas === "58mm" ? "var(--magenta)" : "transparent",
                color: ukuranKertas === "58mm" ? "#fff" : "var(--ink)",
                fontWeight: 700,
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Standar Printer Thermal EPPOS EP58M / 58mm"
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
                padding: "5px 12px",
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

        {/* Simulasi Tampilan Kertas Thermal Realistis */}
        <div style={{ background: "#F1F5F9", padding: "16px 12px", overflowY: "auto", maxHeight: "65vh" }}>
          <div
            className="struk-cetak"
            style={{
              width: is58 ? 255 : 320,
              margin: "0 auto",
              padding: "16px 10px 22px 10px",
              background: "#FFFFFF",
              borderRadius: 6,
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              border: "1px solid #CBD5E1",
              fontFamily: "'Consolas', 'Courier New', Courier, monospace",
              fontSize: is58 ? 10 : 11.5,
              lineHeight: 1.25,
              color: "#000000",
            }}
          >
            {/* Header Logo Resmi Apotek Bima Farma */}
            <div className="struk-center" style={{ marginBottom: 4 }}>
              <img
                src="/logo-bima-farma.png"
                alt="Logo Apotek Bima Farma"
                style={{
                  maxHeight: 28,
                  maxWidth: "85%",
                  objectFit: "contain",
                  margin: "0 auto 3px auto",
                  display: "block",
                  filter: "grayscale(100%) contrast(200%)",
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <div style={{ fontSize: is58 ? 12 : 14, fontWeight: 800, letterSpacing: 0.5 }}>
                APOTEK BIMA FARMA
              </div>
              <div style={{ fontSize: is58 ? 8.5 : 10, color: "#111", lineHeight: 1.25, marginTop: 1 }}>
                Jl. Tanimulya Raya No. 1, Ngamprah<br />
                Kab. Bandung Barat · WA: 0812-2360-4900
              </div>
            </div>

            <div className="struk-garis-dash" />

            {/* Meta Informasi Struk 2 Kolom */}
            <div className="struk-baris">
              <span>No. Struk</span>
              <span>{data.no_struk || "-"}</span>
            </div>
            <div className="struk-baris">
              <span>Waktu</span>
              <span style={{ fontSize: is58 ? 8.5 : 10 }}>{tanggal}</span>
            </div>
            <div className="struk-baris">
              <span>Kasir</span>
              <span>{data.nama_kasir || "Kasir"}</span>
            </div>
            <div className="struk-baris">
              <span>Pembeli</span>
              <span>{data.nama_pembeli || "Umum"}</span>
            </div>
            <div className="struk-baris">
              <span>Bayar</span>
              <span style={{ textTransform: "uppercase" }}>
                {data.metode_bayar === "tunai" ? "TUNAI" : data.metode_bayar || "TUNAI"}
              </span>
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
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: is58 ? 10 : 11,
                        textTransform: "uppercase",
                        wordBreak: "break-word",
                        lineHeight: 1.25,
                      }}
                    >
                      {it.nama_obat} {it.nama_satuan ? `(${it.nama_satuan})` : ""}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        fontSize: is58 ? 9.5 : 11,
                        marginTop: 1,
                      }}
                    >
                      <span>
                        {it.qty} × {Number(it.harga_jual).toLocaleString("id-ID")}
                      </span>
                      <span style={{ fontWeight: 700, textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {itemSubtotalBersih.toLocaleString("id-ID")}
                      </span>
                    </div>
                    {itemDiskon > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: is58 ? 8.5 : 9.5,
                          color: "#000",
                        }}
                      >
                        <span>*Diskon item</span>
                        <span style={{ fontWeight: 700 }}>-{itemDiskon.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="struk-garis-dash" />

            {/* Rincian Total */}
            <div
              className="struk-baris"
              style={{ fontWeight: 800, fontSize: is58 ? 10.5 : 12, marginTop: 2 }}
            >
              <span>TOTAL ({totalQty} ITEM)</span>
              <span>{Number(data.total).toLocaleString("id-ID")}</span>
            </div>

            {diskonTransaksi > 0 && (
              <div className="struk-baris" style={{ fontSize: is58 ? 8.5 : 10 }}>
                <span>Diskon Tambahan</span>
                <span>-{diskonTransaksi.toLocaleString("id-ID")}</span>
              </div>
            )}

            <div className="struk-baris" style={{ fontSize: is58 ? 9.5 : 11 }}>
              <span>{data.metode_bayar === "tunai" ? "Uang Diterima" : "Nominal Bayar"}</span>
              <span>
                {data.metode_bayar === "tunai"
                  ? Number(data.uang_diterima || data.total).toLocaleString("id-ID")
                  : Number(data.total).toLocaleString("id-ID")}
              </span>
            </div>

            {data.metode_bayar === "tunai" ? (
              <div className="struk-baris" style={{ fontSize: is58 ? 9.5 : 11, fontWeight: 700 }}>
                <span>Kembalian</span>
                <span>{Number(data.kembalian || 0).toLocaleString("id-ID")}</span>
              </div>
            ) : (
              <div className="struk-baris" style={{ fontSize: is58 ? 9.5 : 11, fontWeight: 700 }}>
                <span>Status</span>
                <span>LUNAS</span>
              </div>
            )}

            <div className="struk-garis-dash" />

            {/* Footer Ucapan Terima Kasih */}
            <div
              className="struk-center"
              style={{ fontSize: is58 ? 8.5 : 9.5, color: "#000", marginTop: 4, lineHeight: 1.35 }}
            >
              <div style={{ fontWeight: 700 }}>Terima Kasih Atas Kunjungan Anda</div>
              <div>Semoga Lekas Sembuh!</div>
              <div style={{ fontSize: is58 ? 7.5 : 8.5, marginTop: 2 }}>
                Barang yg sudah dibeli tdk dapat ditukar/dikembalikan
              </div>
              <div style={{ marginTop: 2, fontWeight: 700 }}>CS Apotek: 0838-5662-5271</div>
            </div>

            {/* Indikator Ruang Feed Kertas di Preview */}
            <div
              style={{
                height: 20,
                borderTop: "1px dotted #CBD5E1",
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 8.5,
                color: "#94A3B8",
              }}
            >
              ✂ Ruang potong kertas EPPOS
            </div>
          </div>
        </div>

        <div className="struk-actions" style={{ padding: "12px 18px", background: "#FFFFFF" }}>
          <button className="btn-outline" onClick={onClose}>
            Tutup
          </button>
          <button
            className="btn-primary"
            onClick={() => cetakStruk(data, ukuranKertas)}
            style={{ fontWeight: 800 }}
          >
            🖨️ Cetak ke EPPOS ({ukuranKertas})
          </button>
        </div>
      </div>

      {/* CSS Cetak Thermal & Fallback Browser Print */}
      <style>{`
        .struk-garis-dash {
          border: none;
          border-top: 1px dashed #000000;
          margin: 4px 0;
          width: 100%;
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
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .struk-modal {
            position: static !important;
            display: block !important;
            visibility: visible !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .struk-modal-head, .struk-actions, .struk-overlay > div:first-child > div:nth-child(2) {
            display: none !important;
          }
          .struk-cetak, .struk-cetak * {
            visibility: visible !important;
          }
          .struk-cetak {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${is58 ? "46.5mm" : "72mm"} !important;
            max-width: ${is58 ? "46.5mm" : "72mm"} !important;
            padding: 1mm 1mm 18mm 1mm !important;
            font-family: 'Consolas', 'Courier New', Courier, monospace !important;
            font-size: ${is58 ? "9.5px" : "11px"} !important;
            color: #000000 !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
