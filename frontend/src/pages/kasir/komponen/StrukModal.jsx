import { useState, useEffect } from "react";
import { rupiah } from "../../../utils/format";

/**
 * Helper menghasilkan HTML struk yang presisi untuk printer thermal EPPOS EP58M (58mm) & 80mm.
 * Dirancang khusus agar teks kanan (harga, subtotal, total) TIDAK TERPOTONG ke samping
 * dan ada feed space di bagian bawah agar saat merobek kertas di cutter fisik tidak merobek tulisan.
 */
function buatHtmlStruk(data, ukuranKertas = "80mm", offsetKiri = 0) {
  const is50 = ukuranKertas === "50mm";
  const is58 = ukuranKertas === "58mm";
  const is80 = ukuranKertas === "80mm";

  // Lebar printable area untuk printer thermal:
  // Lebar printable area untuk printer thermal:
  // - 50mm: Safe width: 38mm
  // - 58mm: Safe width: 44mm
  // - 80mm: Kertas roll 80mm full width (padding kanan 8.5mm agar teks kanan presisi di tepi head tanpa terpotong)
  const printWidth = is50 ? "38mm" : is58 ? "44mm" : "100%";
  const pageSize = is50 ? "50mm auto" : is58 ? "58mm auto" : "80mm auto";
  const baseFontSize = is50 ? "10.5px" : is58 ? "11.5px" : "13.5px";
  const headerFontSize = is50 ? "13.5px" : is58 ? "15px" : "17px";
  const subFontSize = is50 ? "9px" : is58 ? "10px" : "11.5px";
  const bottomFeed = is50 ? "15mm" : is58 ? "18mm" : "25mm";

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
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 1.5mm 3.5mm 0 1.5mm !important;
            box-sizing: border-box !important;
            font-family: 'Consolas', 'Courier New', Courier, monospace, sans-serif;
            font-size: ${baseFontSize} !important;
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
            padding-right: 0px;
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
          <div style="font-size: ${headerFontSize}; font-weight: 800; letter-spacing: 0.5px;">APOTEK BIMA FARMA</div>
          <div style="font-size: ${subFontSize}; line-height: 1.25; margin-top: 1px;">
            Jl. Tanimulya Raya No. 1, Ngamprah<br />
            Kab. Bandung Barat · WA: 0812-2360-4900
          </div>
        </div>

        <div class="struk-garis-dash"></div>

        <!-- Meta Informasi Transaksi -->
        <div class="struk-baris">
          <span style="white-space: nowrap;">No. Struk</span>
          <span style="font-size: ${subFontSize}; font-family: monospace;">${data.no_struk || "-"}</span>
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
        <div class="struk-baris" style="font-weight: 800; font-size: ${is50 ? "11.5px" : is58 ? "13px" : "14px"}; margin-top: 2px;">
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
          <div style="font-weight: 700; margin-top: 2px;">CS Apotek: 0821-1966-1953</div>
          <div style="font-size: ${is50 ? "7.5px" : "8px"}; margin-top: 3px; letter-spacing: 0.2px;">[ POS System © Core Partners ]</div>
        </div>

        <!-- FEED SPACE: Ruang kosong agar kertas melewati pisau cutter fisik printer -->
        <div style="height: ${bottomFeed}; min-height: ${bottomFeed}; padding-top: 15mm; line-height: 1.5; font-size: 10px; color: transparent; user-select: none;">
          .<br />.<br />.<br />.<br />
        </div>
      </body>
    </html>
  `;
}

/**
 * Mencetak struk kasir secara bersih menggunakan iframe terisolasi
 * Disesuaikan khusus untuk printer thermal (58mm EPPOS EP58M / Panda / MiniPOS dsb)
 */
// Struk teks 48 kolom (80mm Font A) dikirim langsung ke aplikasi RawBT di HP Android
function cetakViaRawBT(data) {
  const W = 48;
  const rp = (n) => Number(n || 0).toLocaleString("id-ID");
  const tengah = (s) => {
    s = String(s).slice(0, W);
    return " ".repeat(Math.floor((W - s.length) / 2)) + s;
  };
  const baris = (kiri, kanan) => {
    kiri = String(kiri);
    kanan = String(kanan);
    const sisa = W - kanan.length;
    if (kiri.length > sisa - 1) kiri = kiri.slice(0, sisa - 1);
    return kiri + " ".repeat(W - kiri.length - kanan.length) + kanan;
  };
  const garis = "-".repeat(W);

  const tgl = new Date(data.created_at || data.tanggal || Date.now());
  const waktu = isNaN(tgl.getTime())
    ? "-"
    : tgl.toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const items = data.items || [];
  const totalQty = items.reduce((s, it) => s + Number(it.qty || 1), 0);
  const tunai = data.metode_bayar === "tunai" || !data.metode_bayar;

  const L = [];
  L.push("\x1B\x40"); // reset printer
  L.push("\x1B\x45\x01" + tengah("APOTEK BIMA FARMA") + "\x1B\x45\x00");
  L.push(tengah("Jl. Tanimulya Raya No. 1, Ngamprah"));
  L.push(tengah("Kab. Bandung Barat - WA: 0812-2360-4900"));
  L.push(garis);
  L.push(baris("No. Struk", data.no_struk || "-"));
  L.push(baris("Waktu", waktu));
  L.push(baris("Kasir", data.nama_kasir || "Kasir"));
  L.push(baris("Pembeli", data.nama_pembeli || "Umum"));
  L.push(baris("Bayar", tunai ? "TUNAI" : String(data.metode_bayar).toUpperCase()));
  L.push(garis);
  items.forEach((it) => {
    const sub = Math.max(Number(it.qty) * Number(it.harga_jual) + Number(it.tuslah || 0) - Number(it.diskon || 0), 0);
    L.push(`${it.nama_obat || "Obat"}${it.nama_satuan ? ` (${it.nama_satuan})` : ""}`.toUpperCase());
    L.push(baris(`${it.qty} x ${rp(it.harga_jual)}`, rp(sub)));
    if (Number(it.diskon) > 0) L.push(baris("*Diskon item", "-" + rp(it.diskon)));
  });
  L.push(garis);
  L.push("\x1B\x45\x01" + baris(`TOTAL (${totalQty} ITEM)`, rp(data.total)) + "\x1B\x45\x00");
  L.push(baris(tunai ? "Uang Diterima" : "Nominal Bayar", rp(tunai ? data.uang_diterima || data.total : data.total)));
  L.push(tunai ? baris("Kembalian", rp(data.kembalian)) : baris("Status", "LUNAS"));
  L.push(garis);
  L.push(tengah("Terima Kasih Atas Kunjungan Anda"));
  L.push(tengah("Semoga Lekas Sembuh!"));
  L.push(tengah("CS Apotek: 0821-1966-1953"));
  L.push("\n\n\n\n");
  L.push("\x1D\x56\x01"); // potong kertas (auto-cutter)

  const teks = L.join("\n");
  const base64 = btoa(unescape(encodeURIComponent(teks)));
  window.location.href = `intent:base64,${base64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}

function cetakStruk(data, ukuranKertas = "80mm", offsetKiri = 0) {
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
  iframe.style.width = is50 ? "39mm" : is58 ? "45mm" : "80mm";

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
        cetakViaRawBT(data);
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
  // Ukuran kertas & posisi cetak dikunci permanen ke 80mm (Auto-Cutter)
  const ukuranKertas = "80mm";
  const offsetKiri = 0;

  useEffect(() => {
    localStorage.setItem("struk_ukuran_kertas", "80mm");
    localStorage.setItem("struk_offset_kiri", "0");
  }, []);

  useEffect(() => {
    // Hanya cetak otomatis jika autoPrint secara eksplisit bernilai true
    if (data && autoPrint) {
      const timer = setTimeout(() => {
        cetakStruk(data, "80mm", 0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [data, autoPrint]);

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

  const is50 = false;
  const is58 = false;

  return (
    <div
      className="struk-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="struk-modal" style={{ maxWidth: 380 }}>
        <div className="struk-modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Pratinjau Struk Kasir</h3>
            <span style={{ fontSize: 10.5, color: "#166534", background: "#DCFCE7", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
              80 mm
            </span>
          </div>
          <button className="kasir-logout-btn" onClick={onClose} aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
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
              <div style={{ marginTop: 2, fontWeight: 700 }}>CS Apotek: 0821-1966-1953</div>
              <div style={{ fontSize: is58 ? 8 : 8.5, color: "#64748B", marginTop: 3, letterSpacing: "0.2px" }}>
                [ POS System © Core Partners ]
              </div>
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
               Ruang potong kertas EPPOS
            </div>
          </div>
        </div>

        <div className="struk-actions" style={{ padding: "12px 18px", background: "#FFFFFF" }}>
          <button className="btn-outline" onClick={onClose}>
            Tutup
          </button>
          <button
            className="btn-primary"
            onClick={() => cetakStruk(data, "80mm", 0)}
            style={{ fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2" /><rect x="8" y="14" width="8" height="7" rx="1" />
            </svg>
            Cetak Struk (80mm)
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
            size: 80mm auto;
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
            width: 100% !important;
            max-width: 100% !important;
            padding: 1.5mm 3.5mm ${is50 ? "15mm" : is58 ? "18mm" : "25mm"} 1.5mm !important;
            box-sizing: border-box !important;
            font-family: 'Consolas', 'Courier New', Courier, monospace !important;
            font-size: ${is50 ? "10.5px" : is58 ? "11.5px" : "13.5px"} !important;
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
