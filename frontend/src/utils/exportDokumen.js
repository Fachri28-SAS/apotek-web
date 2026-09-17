/**
 * Utility Cetak & Ekspor Dokumen Resmi (Apotek Bima Farma)
 * Mendukung:
 * 1. Cetak / Simpan PDF (A4 Portrait / Landscape via Browser Print Dialog)
 * 2. Ekspor Excel (.xls format Spreadsheet XML/HTML murni)
 * 3. Ekspor Word (.doc format Microsoft Word murni)
 */

const KOP_HTML = `
  <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #222; padding-bottom: 8px;">
    <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.5px; color: #111;">APOTEK BIMA FARMA</div>
    <div style="font-size: 11px; color: #333; margin-top: 3px; line-height: 1.4;">
      Jl. Tanimulya Raya No.1 Desa Tanimulya Kec. Ngamprah, KAB. BANDUNG BARAT<br/>
      Kode Pos 40552 &middot; Telp. 081223604900 &middot; Database: BIMAFARMA
    </div>
  </div>
`;

function getTanggalWaktuCetak() {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 1. CETAK DOKUMEN A4 (Bisa langsung diprint atau Simpan sebagai PDF)
 */
export function cetakDokumenA4({
  judul = "LAPORAN",
  periode = "",
  keterangan = "",
  headers = [],
  rows = [],
  footers = [],
  orientation = "portrait", // "portrait" | "landscape"
  namaUser = "Petugas Apotek",
}) {
  if (!rows || rows.length === 0) {
    alert("Tidak ada data untuk dicetak.");
    return;
  }

  let iframe = document.getElementById("cetak-dokumen-frame");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "cetak-dokumen-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const thHtml = headers
    .map(
      (h) =>
        `<th style="border: 1px solid #666; padding: 6px 8px; background-color: #f2f2f2; font-weight: bold; text-align: ${
          h.align || "left"
        }; width: ${h.width || "auto"};">${h.label}</th>`
    )
    .join("");

  const trHtml = rows
    .map((r) => {
      const tdList = r
        .map((col, idx) => {
          const align = headers[idx]?.align || "left";
          return `<td style="border: 1px solid #777; padding: 5px 8px; text-align: ${align}; vertical-align: middle;">${col ?? "-"}</td>`;
        })
        .join("");
      return `<tr>${tdList}</tr>`;
    })
    .join("");

  let tfootHtml = "";
  if (footers && footers.length > 0) {
    tfootHtml = `
      <tfoot>
        ${footers
          .map(
            (f) => `
          <tr style="background: #fafafa; font-weight: bold;">
            ${f
              .map(
                (c) =>
                  `<td colspan="${c.colspan || 1}" style="border: 1px solid #666; padding: 6px 8px; text-align: ${
                    c.align || "right"
                  };">${c.label ?? ""}</td>`
              )
              .join("")}
          </tr>
        `
          )
          .join("")}
      </tfoot>
    `;
  }

  const tanggalCetak = getTanggalWaktuCetak();

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${judul}</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: 10mm 12mm 12mm 12mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          .judul-laporan {
            font-size: 13px;
            font-weight: 800;
            text-align: center;
            text-decoration: underline;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
          }
          .meta-bar {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 10px;
            font-weight: 500;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
            margin-bottom: 14px;
          }
          .footer-info {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #444;
            border-top: 1px dashed #bbb;
            padding-top: 8px;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        ${KOP_HTML}
        <div class="judul-laporan">${judul.toUpperCase()}</div>

        <div class="meta-bar">
          <div>${keterangan ? `Keterangan: ${keterangan}` : `Total Data: ${rows.length} baris`}</div>
          <div>${periode ? `Periode: ${periode}` : ""}</div>
        </div>

        <table>
          <thead>
            <tr>${thHtml}</tr>
          </thead>
          <tbody>
            ${trHtml}
          </tbody>
          ${tfootHtml}
        </table>

        <div class="footer-info">
          <div>
            <div>Petugas / User: <strong>${namaUser}</strong></div>
            <div>Instansi: Apotek Bima Farma</div>
          </div>
          <div style="text-align: right;">
            <div>Dicetak Pada: <strong>${tanggalCetak}</strong></div>
            <div style="font-size: 9px; color: #888;">Dokumen Resmi Sistem Apotek Bima Farma</div>
          </div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 250);
}

/**
 * 2. EKSPOR KE EXCEL (.xls Spreadsheet dengan Kop & Format Tabel)
 */
export function exportExcel({
  filename = "laporan",
  judul = "LAPORAN",
  periode = "",
  keterangan = "",
  headers = [],
  rows = [],
  footers = [],
}) {
  if (!rows || rows.length === 0) {
    alert("Tidak ada data untuk diekspor ke Excel.");
    return;
  }

  const colSpan = headers.length || 6;

  const thHtml = headers
    .map(
      (h) =>
        `<th style="background-color: #2E7D32; color: #ffffff; font-weight: bold; border: 1px solid #1B5E20; padding: 6px 8px; text-align: ${
          h.align || "left"
        };">${h.label}</th>`
    )
    .join("");

  const trHtml = rows
    .map(
      (r, rIdx) => `
      <tr style="background-color: ${rIdx % 2 === 0 ? "#ffffff" : "#f9f9f9"};">
        ${r
          .map((col, idx) => {
            const align = headers[idx]?.align || "left";
            return `<td style="border: 1px solid #cccccc; padding: 5px 8px; text-align: ${align};">${col ?? "-"}</td>`;
          })
          .join("")}
      </tr>
    `
    )
    .join("");

  let tfootHtml = "";
  if (footers && footers.length > 0) {
    tfootHtml = `
      <tfoot>
        ${footers
          .map(
            (f) => `
          <tr style="background-color: #e8f5e9; font-weight: bold;">
            ${f
              .map(
                (c) =>
                  `<td colspan="${c.colspan || 1}" style="border: 1px solid #999999; padding: 6px 8px; text-align: ${
                    c.align || "right"
                  };">${c.label ?? ""}</td>`
              )
              .join("")}
          </tr>
        `
          )
          .join("")}
      </tfoot>
    `;
  }

  const tanggalCetak = getTanggalWaktuCetak();

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${judul.slice(0, 30)}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          td, th { font-family: Arial, sans-serif; font-size: 10pt; }
        </style>
      </head>
      <body>
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td colspan="${colSpan}" style="text-align: center; font-size: 14pt; font-weight: bold; color: #1B5E20;">
              APOTEK BIMA FARMA
            </td>
          </tr>
          <tr>
            <td colspan="${colSpan}" style="text-align: center; font-size: 9pt; color: #555;">
              Jl. Tanimulya Raya No.1 Desa Tanimulya Kec. Ngamprah, KAB. BANDUNG BARAT &middot; Telp. 081223604900
            </td>
          </tr>
          <tr>
            <td colspan="${colSpan}" style="text-align: center; font-size: 12pt; font-weight: bold; padding: 10px 0;">
              ${judul.toUpperCase()}
            </td>
          </tr>
          ${
            periode
              ? `<tr><td colspan="${colSpan}" style="font-size: 10pt; font-weight: bold; padding-bottom: 6px;">Periode: ${periode}</td></tr>`
              : ""
          }
          ${
            keterangan
              ? `<tr><td colspan="${colSpan}" style="font-size: 9pt; color: #444; padding-bottom: 8px;">Keterangan: ${keterangan}</td></tr>`
              : ""
          }
          <thead>
            <tr>${thHtml}</tr>
          </thead>
          <tbody>
            ${trHtml}
          </tbody>
          ${tfootHtml}
          <tr><td></td></tr>
          <tr>
            <td colspan="${colSpan}" style="font-size: 9pt; color: #666; font-style: italic;">
              Tanggal Ekspor: ${tanggalCetak} &middot; Apotek Bima Farma
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 3. EKSPOR KE WORD (.doc Dokumen Resmi dengan Kop & Format Tabel)
 */
export function exportWord({
  filename = "laporan",
  judul = "LAPORAN",
  periode = "",
  keterangan = "",
  headers = [],
  rows = [],
  footers = [],
  orientation = "portrait",
  namaUser = "Petugas Apotek",
}) {
  if (!rows || rows.length === 0) {
    alert("Tidak ada data untuk diekspor ke Word.");
    return;
  }

  const thHtml = headers
    .map(
      (h) =>
        `<th style="border: 1px solid #444444; background-color: #f0f0f0; padding: 6px 8px; font-weight: bold; text-align: ${
          h.align || "left"
        };">${h.label}</th>`
    )
    .join("");

  const trHtml = rows
    .map(
      (r) => `
      <tr>
        ${r
          .map((col, idx) => {
            const align = headers[idx]?.align || "left";
            return `<td style="border: 1px solid #666666; padding: 5px 8px; text-align: ${align};">${col ?? "-"}</td>`;
          })
          .join("")}
      </tr>
    `
    )
    .join("");

  let tfootHtml = "";
  if (footers && footers.length > 0) {
    tfootHtml = `
      <tfoot>
        ${footers
          .map(
            (f) => `
          <tr style="background-color: #f9f9f9; font-weight: bold;">
            ${f
              .map(
                (c) =>
                  `<td colspan="${c.colspan || 1}" style="border: 1px solid #444444; padding: 6px 8px; text-align: ${
                    c.align || "right"
                  };">${c.label ?? ""}</td>`
              )
              .join("")}
          </tr>
        `
          )
          .join("")}
      </tfoot>
    `;
  }

  const tanggalCetak = getTanggalWaktuCetak();

  const isLandscape = orientation === "landscape";
  const wordContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${judul}</title>
        <style>
          @page Section1 {
            size: ${isLandscape ? "841.9pt 595.3pt" : "595.3pt 841.9pt"};
            margin: 40pt 40pt 40pt 40pt;
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-page-orientation: ${isLandscape ? "landscape" : "portrait"};
          }
          div.Section1 {
            page: Section1;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            color: #111;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
            margin-top: 10pt;
            margin-bottom: 12pt;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${KOP_HTML}
          <div style="text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; margin-bottom: 8pt;">
            ${judul.toUpperCase()}
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 9.5pt; margin-bottom: 10pt;">
            <div>${keterangan ? `<strong>Keterangan:</strong> ${keterangan}` : `<strong>Total Data:</strong> ${rows.length} baris`}</div>
            <div style="text-align: right;">${periode ? `<strong>Periode:</strong> ${periode}` : ""}</div>
          </div>

          <table>
            <thead>
              <tr>${thHtml}</tr>
            </thead>
            <tbody>
              ${trHtml}
            </tbody>
            ${tfootHtml}
          </table>

          <div style="margin-top: 20pt; font-size: 9pt; color: #444; border-top: 1px solid #ccc; padding-top: 6pt;">
            <table border="0" style="width: 100%; border: none;">
              <tr>
                <td style="border: none; text-align: left;">
                  Petugas: <strong>${namaUser}</strong><br/>
                  Apotek Bima Farma
                </td>
                <td style="border: none; text-align: right;">
                  Dicetak: <strong>${tanggalCetak}</strong><br/>
                  Dokumen Resmi Sistem Apotek
                </td>
              </tr>
            </table>
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = new Blob([wordContent], { type: "application/msword;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatRpAngka(num) {
  if (num === null || num === undefined || isNaN(num)) return "Rp0";
  return "Rp" + Math.round(Number(num)).toLocaleString("id-ID");
}

function formatTglResmi(tglStr) {
  if (!tglStr) return "-";
  const d = new Date(tglStr);
  if (isNaN(d.getTime())) return tglStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * 4. CETAK 1 FAKTUR PENERIMAAN (Format Faktur Dokumen A4 Resmi)
 */
export function cetakSatuFakturA4(faktur, { namaUser = "Petugas Apotek" } = {}) {
  if (!faktur) return;

  let iframe = document.getElementById("cetak-dokumen-frame");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "cetak-dokumen-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const items = faktur.items || [];
  const itemsHtml = items.length === 0
    ? `<tr><td colspan="9" style="text-align: center; padding: 12px; color: #888;">Tidak ada rincian item barang</td></tr>`
    : items.map((it, idx) => {
        const qtyTerima = Number(it.qty || 1);
        const qtyKemasan = Number(it.kemasan ?? (qtyTerima * Number(it.faktor || 1)));
        const hargaSatuan = Number(it.harga_beli || 0);
        const subtotal = Number(it.subtotal ?? (qtyTerima * hargaSatuan - Number(it.diskon || 0)));
        return `
          <tr>
            <td style="text-align: center; border: 1px solid #777; padding: 5px 6px;">${idx + 1}</td>
            <td style="border: 1px solid #777; padding: 5px 8px; font-weight: bold;">${it.nama_obat || "-"}</td>
            <td style="text-align: center; border: 1px solid #777; padding: 5px 6px;">${it.nomor_batch || "-"}</td>
            <td style="text-align: center; border: 1px solid #777; padding: 5px 6px;">${it.tanggal_exp ? formatTglResmi(it.tanggal_exp) : "-"}</td>
            <td style="text-align: right; border: 1px solid #777; padding: 5px 6px;">${qtyTerima}</td>
            <td style="text-align: right; border: 1px solid #777; padding: 5px 6px;">${qtyKemasan}</td>
            <td style="text-align: right; border: 1px solid #777; padding: 5px 8px;">${formatRpAngka(hargaSatuan)}</td>
            <td style="text-align: right; border: 1px solid #777; padding: 5px 8px;">${Number(it.diskon) > 0 ? formatRpAngka(it.diskon) : "—"}</td>
            <td style="text-align: right; border: 1px solid #777; padding: 5px 8px; font-weight: bold;">${formatRpAngka(subtotal)}</td>
          </tr>
        `;
      }).join("");

  const tanggalCetak = getTanggalWaktuCetak();
  const isLunas = faktur.status_bayar === "lunas";

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Faktur Penerimaan ${faktur.no_faktur || ""}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          .judul-faktur {
            font-size: 13px;
            font-weight: 800;
            text-align: center;
            text-decoration: underline;
            margin-top: 4px;
            margin-bottom: 12px;
            letter-spacing: 0.5px;
          }
          .info-box {
            width: 100%;
            border: 1px solid #bbb;
            border-radius: 4px;
            background: #fdfdfd;
            padding: 8px 12px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            line-height: 1.6;
          }
          table.faktur-tabel {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
          }
          table.faktur-tabel th {
            background-color: #f0f0f0;
            font-weight: bold;
            border: 1px solid #666;
            padding: 6px 6px;
            text-align: center;
          }
          .ringkasan-box {
            margin-top: 10px;
            float: right;
            width: 280px;
            font-size: 11px;
            border: 1px solid #bbb;
            border-radius: 4px;
            padding: 8px 12px;
            background: #fafafa;
          }
          .ringkasan-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .ringkasan-total {
            border-top: 1.5px solid #444;
            padding-top: 5px;
            margin-top: 5px;
            font-size: 12px;
            font-weight: 800;
            color: #111;
          }
          .tanda-tangan-area {
            clear: both;
            padding-top: 30px;
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            text-align: center;
          }
          .ttd-col {
            width: 200px;
          }
          .ttd-space {
            height: 55px;
          }
        </style>
      </head>
      <body>
        ${KOP_HTML}
        <div class="judul-faktur">FAKTUR PENERIMAAN BARANG</div>

        <div class="info-box">
          <div>
            <div><strong>No. Faktur:</strong> ${faktur.no_faktur || "-"}</div>
            <div><strong>Supplier / PBF:</strong> ${faktur.nama_supplier || "-"}</div>
            <div><strong>Tanggal Terima:</strong> ${formatTglResmi(faktur.tanggal_terima)}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Status Pembayaran:</strong> <span style="color: ${isLunas ? "#15803D" : "#DC2626"}; font-weight: bold;">${isLunas ? "LUNAS" : "BELUM LUNAS"}</span></div>
            <div><strong>Jatuh Tempo:</strong> ${formatTglResmi(faktur.tanggal_jatuh_tempo)}</div>
            <div><strong>Pajak / PKP:</strong> ${faktur.is_pkp ? "PKP" : "Non-PKP"}</div>
          </div>
        </div>

        <table class="faktur-tabel">
          <thead>
            <tr>
              <th style="width: 28px;">No.</th>
              <th style="text-align: left;">Nama Obat / Barang</th>
              <th style="width: 75px;">No. Batch</th>
              <th style="width: 75px;">Expired</th>
              <th style="width: 45px; text-align: right;">Qty</th>
              <th style="width: 55px; text-align: right;">Kemasan</th>
              <th style="width: 80px; text-align: right;">Harga</th>
              <th style="width: 65px; text-align: right;">Diskon</th>
              <th style="width: 90px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="ringkasan-box">
          <div class="ringkasan-row">
            <span>Subtotal:</span>
            <span>${formatRpAngka(faktur.subtotal)}</span>
          </div>
          ${Number(faktur.diskon) > 0 ? `
          <div class="ringkasan-row">
            <span>Diskon Faktur:</span>
            <span>-${formatRpAngka(faktur.diskon)}</span>
          </div>` : ""}
          ${Number(faktur.ppn) > 0 ? `
          <div class="ringkasan-row">
            <span>PPN:</span>
            <span>${formatRpAngka(faktur.ppn)}</span>
          </div>` : ""}
          <div class="ringkasan-row ringkasan-total">
            <span>TOTAL TAGIHAN:</span>
            <span>${formatRpAngka(faktur.total)}</span>
          </div>
        </div>

        <div class="tanda-tangan-area">
          <div class="ttd-col">
            <div>Pengirim / PBF,</div>
            <div class="ttd-space"></div>
            <div>( ............................................ )</div>
          </div>
          <div class="ttd-col">
            <div>Bandung Barat, ${formatTglResmi(faktur.tanggal_terima)}<br/>Petugas Penerima Apotek,</div>
            <div class="ttd-space"></div>
            <div><strong>( ${namaUser} )</strong></div>
          </div>
        </div>

        <div style="margin-top: 20px; font-size: 9px; color: #888; border-top: 1px dashed #ccc; padding-top: 5px;">
          Dicetak Pada: ${tanggalCetak} &middot; Sistem Apotek Bima Farma &middot; Dokumen Penerimaan Barang Resmi
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 250);
}

/**
 * 5. EKSPOR 1 FAKTUR KE WORD (.doc Dokumen A4 Resmi)
 */
export function exportSatuFakturWord(faktur, { namaUser = "Petugas Apotek" } = {}) {
  if (!faktur) return;

  const items = faktur.items || [];
  const itemsHtml = items.map((it, idx) => {
    const qtyTerima = Number(it.qty || 1);
    const qtyKemasan = Number(it.kemasan ?? (qtyTerima * Number(it.faktor || 1)));
    const hargaSatuan = Number(it.harga_beli || 0);
    const subtotal = Number(it.subtotal ?? (qtyTerima * hargaSatuan - Number(it.diskon || 0)));
    return `
      <tr>
        <td style="text-align: center; border: 1px solid #666; padding: 5px 6px;">${idx + 1}</td>
        <td style="border: 1px solid #666; padding: 5px 8px; font-weight: bold;">${it.nama_obat || "-"}</td>
        <td style="text-align: center; border: 1px solid #666; padding: 5px 6px;">${it.nomor_batch || "-"}</td>
        <td style="text-align: center; border: 1px solid #666; padding: 5px 6px;">${it.tanggal_exp ? formatTglResmi(it.tanggal_exp) : "-"}</td>
        <td style="text-align: right; border: 1px solid #666; padding: 5px 6px;">${qtyTerima}</td>
        <td style="text-align: right; border: 1px solid #666; padding: 5px 6px;">${qtyKemasan}</td>
        <td style="text-align: right; border: 1px solid #666; padding: 5px 8px;">${formatRpAngka(hargaSatuan)}</td>
        <td style="text-align: right; border: 1px solid #666; padding: 5px 8px;">${Number(it.diskon) > 0 ? formatRpAngka(it.diskon) : "—"}</td>
        <td style="text-align: right; border: 1px solid #666; padding: 5px 8px; font-weight: bold;">${formatRpAngka(subtotal)}</td>
      </tr>
    `;
  }).join("");

  const isLunas = faktur.status_bayar === "lunas";
  const tanggalCetak = getTanggalWaktuCetak();

  const wordContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Faktur Penerimaan ${faktur.no_faktur}</title>
        <style>
          @page Section1 {
            size: 595.3pt 841.9pt;
            margin: 40pt 40pt 40pt 40pt;
          }
          div.Section1 { page: Section1; }
          body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 8pt; margin-bottom: 8pt; }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${KOP_HTML}
          <div style="text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; margin-bottom: 12pt;">
            FAKTUR PENERIMAAN BARANG
          </div>

          <table border="0" style="width: 100%; border: none; margin-bottom: 8pt;">
            <tr>
              <td style="border: none; width: 50%; font-size: 9.5pt; line-height: 1.5;">
                <strong>No. Faktur:</strong> ${faktur.no_faktur || "-"}<br/>
                <strong>Supplier / PBF:</strong> ${faktur.nama_supplier || "-"}<br/>
                <strong>Tanggal Terima:</strong> ${formatTglResmi(faktur.tanggal_terima)}
              </td>
              <td style="border: none; width: 50%; text-align: right; font-size: 9.5pt; line-height: 1.5;">
                <strong>Status Bayar:</strong> ${isLunas ? "LUNAS" : "BELUM LUNAS"}<br/>
                <strong>Jatuh Tempo:</strong> ${formatTglResmi(faktur.tanggal_jatuh_tempo)}<br/>
                <strong>Tipe Pajak:</strong> ${faktur.is_pkp ? "PKP" : "Non-PKP"}
              </td>
            </tr>
          </table>

          <table>
            <thead>
              <tr style="background-color: #f0f0f0; font-weight: bold;">
                <th style="border: 1px solid #666; padding: 6px; width: 30px; text-align: center;">No.</th>
                <th style="border: 1px solid #666; padding: 6px; text-align: left;">Nama Obat / Barang</th>
                <th style="border: 1px solid #666; padding: 6px; width: 70px; text-align: center;">No. Batch</th>
                <th style="border: 1px solid #666; padding: 6px; width: 70px; text-align: center;">Expired</th>
                <th style="border: 1px solid #666; padding: 6px; width: 45px; text-align: right;">Qty</th>
                <th style="border: 1px solid #666; padding: 6px; width: 55px; text-align: right;">Kemasan</th>
                <th style="border: 1px solid #666; padding: 6px; width: 75px; text-align: right;">Harga</th>
                <th style="border: 1px solid #666; padding: 6px; width: 65px; text-align: right;">Diskon</th>
                <th style="border: 1px solid #666; padding: 6px; width: 85px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="8" style="border: 1px solid #666; text-align: right; font-weight: bold; padding: 5px 8px;">Subtotal :</td>
                <td style="border: 1px solid #666; text-align: right; font-weight: bold; padding: 5px 8px;">${formatRpAngka(faktur.subtotal)}</td>
              </tr>
              ${Number(faktur.diskon) > 0 ? `
              <tr>
                <td colspan="8" style="border: 1px solid #666; text-align: right; padding: 5px 8px;">Diskon Faktur :</td>
                <td style="border: 1px solid #666; text-align: right; padding: 5px 8px;">-${formatRpAngka(faktur.diskon)}</td>
              </tr>` : ""}
              ${Number(faktur.ppn) > 0 ? `
              <tr>
                <td colspan="8" style="border: 1px solid #666; text-align: right; padding: 5px 8px;">PPN :</td>
                <td style="border: 1px solid #666; text-align: right; padding: 5px 8px;">${formatRpAngka(faktur.ppn)}</td>
              </tr>` : ""}
              <tr style="background-color: #f2f2f2; font-weight: bold;">
                <td colspan="8" style="border: 1px solid #666; text-align: right; padding: 6px 8px; font-size: 10.5pt;">TOTAL TAGIHAN :</td>
                <td style="border: 1px solid #666; text-align: right; padding: 6px 8px; font-size: 10.5pt;">${formatRpAngka(faktur.total)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 30pt;">
            <table border="0" style="width: 100%; border: none;">
              <tr>
                <td style="border: none; text-align: center; width: 50%;">
                  Pengirim / PBF,<br/><br/><br/><br/>
                  ( ............................................ )
                </td>
                <td style="border: none; text-align: center; width: 50%;">
                  Bandung Barat, ${formatTglResmi(faktur.tanggal_terima)}<br/>
                  Petugas Penerima Apotek,<br/><br/><br/><br/>
                  <strong>( ${namaUser} )</strong>
                </td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 20pt; font-size: 8.5pt; color: #888; border-top: 1px dashed #ccc; padding-top: 4pt;">
            Dicetak: ${tanggalCetak} &middot; Sistem Apotek Bima Farma
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = new Blob([wordContent], { type: "application/msword;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const noFakSafe = String(faktur.no_faktur || "faktur").replace(/[^a-zA-Z0-9-_]/g, "_");
  a.download = `faktur-${noFakSafe}-${new Date().toISOString().slice(0, 10)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 6. EKSPOR 1 FAKTUR KE EXCEL (.xls Spreadsheet Resmi)
 */
export function exportSatuFakturExcel(faktur) {
  if (!faktur) return;

  const items = faktur.items || [];
  const itemsHtml = items.map((it, idx) => {
    const qtyTerima = Number(it.qty || 1);
    const qtyKemasan = Number(it.kemasan ?? (qtyTerima * Number(it.faktor || 1)));
    const hargaSatuan = Number(it.harga_beli || 0);
    const subtotal = Number(it.subtotal ?? (qtyTerima * hargaSatuan - Number(it.diskon || 0)));
    return `
      <tr>
        <td style="text-align: center; border: 1px solid #ccc; padding: 5px;">${idx + 1}</td>
        <td style="border: 1px solid #ccc; padding: 5px; font-weight: bold;">${it.nama_obat || "-"}</td>
        <td style="text-align: center; border: 1px solid #ccc; padding: 5px;">${it.nomor_batch || "-"}</td>
        <td style="text-align: center; border: 1px solid #ccc; padding: 5px;">${it.tanggal_exp ? formatTglResmi(it.tanggal_exp) : "-"}</td>
        <td style="text-align: right; border: 1px solid #ccc; padding: 5px;">${qtyTerima}</td>
        <td style="text-align: right; border: 1px solid #ccc; padding: 5px;">${qtyKemasan}</td>
        <td style="text-align: right; border: 1px solid #ccc; padding: 5px;">${formatRpAngka(hargaSatuan)}</td>
        <td style="text-align: right; border: 1px solid #ccc; padding: 5px;">${Number(it.diskon) > 0 ? formatRpAngka(it.diskon) : "—"}</td>
        <td style="text-align: right; border: 1px solid #ccc; padding: 5px; font-weight: bold;">${formatRpAngka(subtotal)}</td>
      </tr>
    `;
  }).join("");

  const isLunas = faktur.status_bayar === "lunas";

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          td, th { font-family: Arial, sans-serif; font-size: 10pt; }
        </style>
      </head>
      <body>
        <table border="0" cellpadding="0" cellspacing="0">
          <tr><td colspan="9" style="text-align: center; font-size: 14pt; font-weight: bold; color: #1B5E20;">APOTEK BIMA FARMA</td></tr>
          <tr><td colspan="9" style="text-align: center; font-size: 9pt; color: #555;">Jl. Tanimulya Raya No.1 Desa Tanimulya Kec. Ngamprah, KAB. BANDUNG BARAT</td></tr>
          <tr><td colspan="9" style="text-align: center; font-size: 12pt; font-weight: bold; padding: 10px 0;">FAKTUR PENERIMAAN BARANG</td></tr>
          <tr>
            <td colspan="4" style="font-weight: bold;">No. Faktur: ${faktur.no_faktur}</td>
            <td colspan="5" style="text-align: right; font-weight: bold;">Status: ${isLunas ? "LUNAS" : "BELUM LUNAS"}</td>
          </tr>
          <tr>
            <td colspan="4">Supplier / PBF: ${faktur.nama_supplier}</td>
            <td colspan="5" style="text-align: right;">Tanggal Terima: ${formatTglResmi(faktur.tanggal_terima)}</td>
          </tr>
          <tr>
            <td colspan="4">Jatuh Tempo: ${formatTglResmi(faktur.tanggal_jatuh_tempo)}</td>
            <td colspan="5" style="text-align: right;">Tipe: ${faktur.is_pkp ? "PKP" : "Non-PKP"}</td>
          </tr>
          <tr><td></td></tr>
          <tr style="background-color: #2E7D32; color: #fff; font-weight: bold;">
            <th style="border: 1px solid #1B5E20; padding: 6px;">No.</th>
            <th style="border: 1px solid #1B5E20; padding: 6px; text-align: left;">Nama Obat / Barang</th>
            <th style="border: 1px solid #1B5E20; padding: 6px;">No. Batch</th>
            <th style="border: 1px solid #1B5E20; padding: 6px;">Expired</th>
            <th style="border: 1px solid #1B5E20; padding: 6px; text-align: right;">Qty</th>
            <th style="border: 1px solid #1B5E20; padding: 6px; text-align: right;">Kemasan</th>
            <th style="border: 1px solid #1B5E20; padding: 6px; text-align: right;">Harga</th>
            <th style="border: 1px solid #1B5E20; padding: 6px; text-align: right;">Diskon</th>
            <th style="border: 1px solid #1B5E20; padding: 6px; text-align: right;">Subtotal</th>
          </tr>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="8" style="border: 1px solid #ccc; text-align: right; font-weight: bold;">Subtotal :</td>
              <td style="border: 1px solid #ccc; text-align: right; font-weight: bold;">${formatRpAngka(faktur.subtotal)}</td>
            </tr>
            ${Number(faktur.diskon) > 0 ? `
            <tr>
              <td colspan="8" style="border: 1px solid #ccc; text-align: right;">Diskon Faktur :</td>
              <td style="border: 1px solid #ccc; text-align: right;">-${formatRpAngka(faktur.diskon)}</td>
            </tr>` : ""}
            ${Number(faktur.ppn) > 0 ? `
            <tr>
              <td colspan="8" style="border: 1px solid #ccc; text-align: right;">PPN :</td>
              <td style="border: 1px solid #ccc; text-align: right;">${formatRpAngka(faktur.ppn)}</td>
            </tr>` : ""}
            <tr style="background-color: #e8f5e9; font-weight: bold;">
              <td colspan="8" style="border: 1px solid #999; text-align: right; font-size: 11pt;">TOTAL TAGIHAN :</td>
              <td style="border: 1px solid #999; text-align: right; font-size: 11pt;">${formatRpAngka(faktur.total)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const noFakSafe = String(faktur.no_faktur || "faktur").replace(/[^a-zA-Z0-9-_]/g, "_");
  a.download = `faktur-${noFakSafe}-${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
