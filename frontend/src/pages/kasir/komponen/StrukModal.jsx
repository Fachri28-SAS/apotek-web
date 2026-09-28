import { useState, useEffect } from "react";
import { rupiah } from "../../../utils/format";

/**
 * Helper menghasilkan HTML struk yang presisi untuk printer thermal EPPOS EP58M (58mm) & 80mm.
 * Dirancang khusus agar teks kanan (harga, subtotal, total) TIDAK TERPOTONG ke samping
 * dan ada feed space di bagian bawah agar saat merobek kertas di cutter fisik tidak merobek tulisan.
 */
function buatHtmlStruk(data, ukuranKertas = "58mm", offsetKiri = -4) {
  const is50 = ukuranKertas === "50mm";
  const is58 = ukuranKertas === "58mm";
  const is80 = ukuranKertas === "80mm";

  // Lebar printable area aman agar tepi kanan tidak terpotong:
  // - 50mm: kertas roll 50mm, area head cetak ~40mm. Safe width: 38mm.
  // - 58mm: kertas roll 58mm (EPPOS EP58M), area head cetak ~48mm. Safe width: 44mm.
  // - 80mm: kertas roll 80mm, area head cetak ~72mm. Safe width: 72mm.
  const printWidth = is50 ? "38mm" : is58 ? "44mm" : "72mm";
  const pageSize = is50 ? "50mm auto" : is58 ? "58mm auto" : "80mm auto";
  const baseFontSize = is50 ? "10.5px" : is58 ? "11.5px" : "13px";
  const headerFontSize = is50 ? "13.5px" : is58 ? "15px" : "17px";
  const subFontSize = is50 ? "9px" : is58 ? "10px" : "11.5px";
  const bottomFeed = is50 ? "15mm" : is58 ? "18mm" : "20mm";

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
        <div style="margin-bottom: 4px;">
          <div style="font-weight: 700; font-size: ${baseFontSize}; text-transform: uppercase; word-break: break-word; line-height: 1.25;">
            ${it.nama_obat || "Obat"} ${it.nama_satuan ? `(${it.nama_satuan})` : ""}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: ${baseFontSize}; margin-top: 1px;">
            <span style="white-space: nowrap;">${it.qty} × ${Number(it.harga_jual || 0).toLocaleString("id-ID")}</span>
            <span style="font-weight: 700; text-align: right; white-space: nowrap; flex-shrink: 0; margin-left: 4px;">
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
            margin: 0 !important;
            size: ${pageSize};
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: ${printWidth} !important;
            max-width: ${printWidth} !important;
            margin: 0 !important;
            margin-left: ${offsetKiri}mm !important;
            padding: 1mm 0 0 0 !important;
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
        <div class="struk-baris" style="font-weight: 800; font-size: ${is50 ? "11.5px" : is58 ? "13px" : "15px"}; margin-top: 2px;">
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
          <div style="font-size: ${is50 ? "8px" : "8.8px"}; margin-top: 2px;">Barang yg sudah dibeli tdk dapat ditukar/dikembalikan</div>
          <div style="font-weight: 700; margin-top: 2px;">CS Apotek: 0821-2702-6272</div>
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
function cetakStruk(data, ukuranKertas = "58mm", offsetKiri = -4) {
  if (!data) return;

  const is50 = ukuranKertas === "50mm";
  const is58 = ukuranKertas === "58mm";
  const htmlStruk = buatHtmlStruk(data, ukuranKertas, offsetKiri);

  let iframe = document.getElementById("print-struk-frame");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "print-struk-frame";
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.height = "250mm";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }
  iframe.style.width = is50 ? "39mm" : is58 ? "45mm" : "74mm";

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
  // Pilihan ukuran kertas (default 58mm untuk EPPOS)
  const [ukuranKertas, setUkuranKertas] = useState(() => {
    return localStorage.getItem("struk_ukuran_kertas") || "58mm";
  });

  // Offset posisi horizontal kertas (default -4mm agar langsung pas di printer EPPOS dan tidak menjorok ke kanan)
  const [offsetKiri, setOffsetKiri] = useState(() => {
    const saved = localStorage.getItem("struk_offset_kiri");
    return saved !== null ? Number(saved) : -4;
  });

  function gantiUkuran(val) {
    setUkuranKertas(val);
    localStorage.setItem("struk_ukuran_kertas", val);
  }

  function gantiOffset(val) {
    setOffsetKiri(val);
    localStorage.setItem("struk_offset_kiri", val);
  }

  useEffect(() => {
    // Hanya cetak otomatis jika autoPrint secara eksplisit bernilai true
    if (data && autoPrint) {
      const timer = setTimeout(() => {
        cetakStruk(data, ukuranKertas, offsetKiri);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [data, autoPrint, ukuranKertas, offsetKiri]);

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

  const is50 = ukuranKertas === "50mm";
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
            padding: "8px 18px",
            borderBottom: "1px solid var(--line)",
            background: "#F8FAFC",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, color: "var(--ink)", fontWeight: 800 }}>Ukuran Kertas</span>
            <span style={{ fontSize: 9.5, color: "var(--ink-soft)" }}>
              {is50 ? "50mm Mini Roll" : is58 ? "58mm (EPPOS Standar)" : "Thermal 80mm"}
            </span>
          </div>

          <div style={{ display: "inline-flex", gap: 3, background: "#E2E8F0", padding: 3, borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => gantiUkuran("58mm")}
              style={{
                border: "none",
                background: ukuranKertas === "58mm" ? "var(--magenta)" : "transparent",
                color: ukuranKertas === "58mm" ? "#fff" : "var(--ink)",
                fontWeight: 700,
                fontSize: 10.5,
                padding: "4px 8px",
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
              onClick={() => gantiUkuran("50mm")}
              style={{
                border: "none",
                background: ukuranKertas === "50mm" ? "var(--magenta)" : "transparent",
                color: ukuranKertas === "50mm" ? "#fff" : "var(--ink)",
                fontWeight: 700,
                fontSize: 10.5,
                padding: "4px 8px",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Kertas Thermal Roll 50mm"
            >
              50 mm
            </button>
            <button
              type="button"
              onClick={() => gantiUkuran("80mm")}
              style={{
                border: "none",
                background: ukuranKertas === "80mm" ? "var(--magenta)" : "transparent",
                color: ukuranKertas === "80mm" ? "#fff" : "var(--ink)",
                fontWeight: 700,
                fontSize: 10.5,
                padding: "4px 8px",
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

        {/* Pemilih Posisi Cetak (Geser Kiri/Kanan) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 18px",
            borderBottom: "1px solid var(--line)",
            background: "#F1F5F9",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--ink)" }}>Posisi Cetak</span>
            <span style={{ fontSize: 9.5, color: "var(--ink-soft)" }}>
              {offsetKiri < 0
                ? `Geser ${Math.abs(offsetKiri)}mm ke Kiri (Pas di EPPOS)`
                : offsetKiri === 0
                ? "Tengah / Normal (0mm)"
                : `Geser ${offsetKiri}mm ke Kanan`}
            </span>
          </div>

          <div style={{ display: "inline-flex", gap: 2, background: "#E2E8F0", padding: 2, borderRadius: 6 }}>
            {[
              { val: -5, label: "◀ -5mm" },
              { val: -4, label: "◀ -4mm" },
              { val: -2, label: "◀ -2mm" },
              { val: 0, label: "Normal" },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => gantiOffset(p.val)}
                style={{
                  border: "none",
                  background: offsetKiri === p.val ? "var(--magenta)" : "transparent",
                  color: offsetKiri === p.val ? "#fff" : "var(--ink)",
                  fontWeight: 700,
                  fontSize: 10,
                  padding: "4px 6px",
                  borderRadius: 5,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Simulasi Tampilan Kertas Thermal Realistis */}
        <div style={{ background: "#F1F5F9", padding: "16px 12px", overflowY: "auto", maxHeight: "65vh" }}>
          <div
            className="struk-cetak"
            style={{
              width: is50 ? 215 : is58 ? 255 : 320,
              margin: "0 auto",
              padding: is50 ? "12px 6px 18px 6px" : "16px 10px 22px 10px",
              background: "#FFFFFF",
              borderRadius: 6,
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              border: "1px solid #CBD5E1",
              fontFamily: "'Consolas', 'Courier New', Courier, monospace",
              fontSize: is50 ? 10.5 : is58 ? 11.5 : 13,
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
                  maxHeight: 32,
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
              <div style={{ fontSize: is50 ? 13.5 : is58 ? 15 : 17, fontWeight: 800, letterSpacing: 0.5 }}>
                APOTEK BIMA FARMA
              </div>
              <div style={{ fontSize: is50 ? 9 : is58 ? 10 : 11.5, color: "#111", lineHeight: 1.25, marginTop: 1 }}>
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
                        fontSize: is58 ? 11.5 : 13,
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
                        fontSize: is58 ? 11 : 12.5,
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
                          fontSize: is58 ? 9.5 : 10.5,
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
              style={{ fontWeight: 800, fontSize: is58 ? 13 : 15, marginTop: 2 }}
            >
              <span>TOTAL ({totalQty} ITEM)</span>
              <span>{Number(data.total).toLocaleString("id-ID")}</span>
            </div>

            {diskonTransaksi > 0 && (
              <div className="struk-baris" style={{ fontSize: is58 ? 9.5 : 11 }}>
                <span>Diskon Tambahan</span>
                <span>-{diskonTransaksi.toLocaleString("id-ID")}</span>
              </div>
            )}

            <div className="struk-baris" style={{ fontSize: is58 ? 11 : 12.5 }}>
              <span>{data.metode_bayar === "tunai" ? "Uang Diterima" : "Nominal Bayar"}</span>
              <span>
                {data.metode_bayar === "tunai"
                  ? Number(data.uang_diterima || data.total).toLocaleString("id-ID")
                  : Number(data.total).toLocaleString("id-ID")}
              </span>
            </div>

            {data.metode_bayar === "tunai" ? (
              <div className="struk-baris" style={{ fontSize: is58 ? 11.5 : 13, fontWeight: 700 }}>
                <span>Kembalian</span>
                <span>{Number(data.kembalian || 0).toLocaleString("id-ID")}</span>
              </div>
            ) : (
              <div className="struk-baris" style={{ fontSize: is58 ? 11.5 : 13, fontWeight: 700 }}>
                <span>Status</span>
                <span>LUNAS</span>
              </div>
            )}

            <div className="struk-garis-dash" />

            {/* Footer Ucapan Terima Kasih */}
            <div
              className="struk-center"
              style={{ fontSize: is58 ? 10 : 11.5, color: "#000", marginTop: 4, lineHeight: 1.35 }}
            >
              <div style={{ fontWeight: 700 }}>Terima Kasih Atas Kunjungan Anda</div>
              <div>Semoga Lekas Sembuh!</div>
              <div style={{ fontSize: is58 ? 8.8 : 9.5, marginTop: 2 }}>
                Barang yg sudah dibeli tdk dapat ditukar/dikembalikan
              </div>
              <div style={{ marginTop: 2, fontWeight: 700 }}>CS Apotek: 0821-2702-6272</div>
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

        {/* Banner Tips Chrome Margin EPPOS */}
        <div
          style={{
            margin: "12px 18px 0",
            padding: "9px 13px",
            background: "#FEF3C7",
            border: "1px solid #FDE68A",
            borderRadius: 8,
            fontSize: 11,
            color: "#92400E",
            lineHeight: 1.45,
          }}
        >
          💡 <strong>Tips Printer EPPOS agar teks tidak mepet kanan:</strong><br />
          Saat jendela print Chrome muncul ➔ Klik <strong>Setelan lainnya (More settings)</strong> ➔ Ubah <strong>Margin (Margins)</strong> ke <strong>"Tidak ada" (None)</strong>.
        </div>

        <div className="struk-actions" style={{ padding: "12px 18px", background: "#FFFFFF" }}>
          <button className="btn-outline" onClick={onClose}>
            Tutup
          </button>
          <button
            className="btn-primary"
            onClick={() => cetakStruk(data, ukuranKertas, offsetKiri)}
            style={{ fontWeight: 800 }}
          >
            🖨️ Cetak Struk ({ukuranKertas}{offsetKiri !== 0 ? ` ${offsetKiri}mm` : ""})
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
            margin: 0 !important;
            size: ${is50 ? "50mm auto" : is58 ? "58mm auto" : "80mm auto"};
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
            margin: 0 !important;
            margin-left: ${offsetKiri}mm !important;
            width: ${is50 ? "38mm" : is58 ? "44mm" : "72mm"} !important;
            max-width: ${is50 ? "38mm" : is58 ? "44mm" : "72mm"} !important;
            padding: 1mm 1mm ${is50 ? "15mm" : is58 ? "18mm" : "20mm"} 0.5mm !important;
            font-family: 'Consolas', 'Courier New', Courier, monospace !important;
            font-size: ${is50 ? "10.5px" : is58 ? "11.5px" : "13px"} !important;
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
