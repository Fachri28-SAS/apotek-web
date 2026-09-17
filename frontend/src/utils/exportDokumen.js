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
