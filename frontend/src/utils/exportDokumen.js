/**
 * Cetak & Ekspor Dokumen Resmi (Apotek Bima Farma)
 * Format standar bisnis: ringkas, padat, langsung ke data tanpa teks berlebih.
 */

const KOP_HTML = `
  <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 6px;">
    <div style="font-size: 15px; font-weight: bold; letter-spacing: 0.5px; color: #000;">APOTEK BIMA FARMA</div>
    <div style="font-size: 10.5px; color: #222; margin-top: 2px;">
      Jl. Tanimulya Raya No.1, Kec. Ngamprah, Kab. Bandung Barat &middot; Telp: 081223604900
    </div>
  </div>
`;

function getWaktuCetak() {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatRp(num) {
  if (num === null || num === undefined || isNaN(num)) return "Rp0";
  return "Rp" + Math.round(Number(num)).toLocaleString("id-ID");
}

function formatTgl(str) {
  if (!str) return "-";
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * 1. CETAK DOKUMEN / LAPORAN A4 (PDF)
 */
export function cetakDokumenA4({
  judul = "LAPORAN",
  periode = "",
  headers = [],
  rows = [],
  footers = [],
  orientation = "portrait",
  namaUser = "Petugas",
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
        `<th style="border: 1px solid #333; padding: 5px 6px; background-color: #f2f2f2; font-weight: bold; text-align: ${
          h.align || "left"
        }; width: ${h.width || "auto"};">${h.label}</th>`
    )
    .join("");

  const trHtml = rows
    .map((r) => {
      const tdList = r
        .map((col, idx) => {
          const align = headers[idx]?.align || "left";
          return `<td style="border: 1px solid #555; padding: 4px 6px; text-align: ${align};">${col ?? "-"}</td>`;
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
                  `<td colspan="${c.colspan || 1}" style="border: 1px solid #333; padding: 5px 6px; text-align: ${
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

  const tglCetak = getWaktuCetak();

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
            font-size: 10.5px;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          .judul-dokumen {
            font-size: 12px;
            font-weight: bold;
            text-align: center;
            text-decoration: underline;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-bottom: 8px;
            color: #222;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 12px;
          }
          .footer-sign {
            margin-top: 14px;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #333;
          }
        </style>
      </head>
      <body>
        ${KOP_HTML}
        <div class="judul-dokumen">${judul}</div>

        <div class="meta-row">
          <div>${periode ? `Periode: <strong>${periode}</strong>` : `Jumlah Data: ${rows.length}`}</div>
          <div>Tanggal Cetak: ${tglCetak}</div>
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

        <div class="footer-sign">
          <div>Petugas: ${namaUser}</div>
          <div>Apotek Bima Farma</div>
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
 * 2. EKSPOR LAPORAN KE EXCEL (.xls)
 */
export function exportExcel({
  filename = "laporan",
  judul = "LAPORAN",
  periode = "",
  headers = [],
  rows = [],
  footers = [],
}) {
  if (!rows || rows.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const colSpan = headers.length || 6;

  const thHtml = headers
    .map(
      (h) =>
        `<th style="background-color: #2E7D32; color: #fff; font-weight: bold; border: 1px solid #1B5E20; padding: 6px; text-align: ${
          h.align || "left"
        };">${h.label}</th>`
    )
    .join("");

  const trHtml = rows
    .map(
      (r, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? "#fff" : "#f9f9f9"};">
        ${r
          .map((col, cIdx) => {
            const align = headers[cIdx]?.align || "left";
            return `<td style="border: 1px solid #ccc; padding: 5px; text-align: ${align};">${col ?? "-"}</td>`;
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
                  `<td colspan="${c.colspan || 1}" style="border: 1px solid #999; padding: 5px; text-align: ${
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

  const content = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>td, th { font-family: Arial, sans-serif; font-size: 10pt; }</style>
      </head>
      <body>
        <table border="0">
          <tr><td colspan="${colSpan}" style="text-align: center; font-size: 13pt; font-weight: bold;">APOTEK BIMA FARMA</td></tr>
          <tr><td colspan="${colSpan}" style="text-align: center; font-size: 9pt; color: #444;">Jl. Tanimulya Raya No.1, Kec. Ngamprah, Kab. Bandung Barat</td></tr>
          <tr><td colspan="${colSpan}" style="text-align: center; font-size: 11pt; font-weight: bold; padding: 8px 0;">${judul.toUpperCase()}</td></tr>
          ${periode ? `<tr><td colspan="${colSpan}" style="font-size: 9.5pt; font-weight: bold;">Periode: ${periode}</td></tr>` : ""}
          <thead><tr>${thHtml}</tr></thead>
          <tbody>${trHtml}</tbody>
          ${tfootHtml}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 3. EKSPOR LAPORAN KE WORD (.doc)
 */
export function exportWord({
  filename = "laporan",
  judul = "LAPORAN",
  periode = "",
  headers = [],
  rows = [],
  footers = [],
  orientation = "portrait",
  namaUser = "Petugas",
}) {
  if (!rows || rows.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const thHtml = headers
    .map(
      (h) =>
        `<th style="border: 1px solid #444; background-color: #f0f0f0; padding: 5px; font-weight: bold; text-align: ${
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
            return `<td style="border: 1px solid #666; padding: 4px 6px; text-align: ${align};">${col ?? "-"}</td>`;
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
                  `<td colspan="${c.colspan || 1}" style="border: 1px solid #444; padding: 5px 6px; text-align: ${
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

  const isLandscape = orientation === "landscape";
  const content = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${judul}</title>
        <style>
          @page Section1 {
            size: ${isLandscape ? "841.9pt 595.3pt" : "595.3pt 841.9pt"};
            margin: 36pt;
          }
          div.Section1 { page: Section1; }
          body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
          table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 8pt; margin-bottom: 10pt; }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${KOP_HTML}
          <div style="text-align: center; font-size: 12pt; font-weight: bold; text-decoration: underline; margin-bottom: 6pt;">
            ${judul.toUpperCase()}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9.5pt; margin-bottom: 6pt;">
            <div>${periode ? `Periode: <strong>${periode}</strong>` : ""}</div>
            <div style="text-align: right;">Tanggal: ${getWaktuCetak()}</div>
          </div>
          <table>
            <thead><tr>${thHtml}</tr></thead>
            <tbody>${trHtml}</tbody>
            ${tfootHtml}
          </table>
          <div style="margin-top: 16pt; font-size: 9pt;">
            Petugas: <strong>${namaUser}</strong> &middot; Apotek Bima Farma
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = new Blob([content], { type: "application/msword;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 4. CETAK 1 FAKTUR PENERIMAAN (A4 Portrait)
 */
export function cetakSatuFakturA4(faktur, { namaUser = "Petugas" } = {}) {
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
  const itemsHtml = items.map((it, idx) => `
    <tr>
      <td style="text-align: center; border: 1px solid #555; padding: 4px 6px;">${idx + 1}</td>
      <td style="border: 1px solid #555; padding: 4px 8px; font-weight: bold;">${it.nama_obat || "-"}</td>
      <td style="text-align: center; border: 1px solid #555; padding: 4px 6px;">${it.nomor_batch || "-"}</td>
      <td style="text-align: center; border: 1px solid #555; padding: 4px 6px;">${formatTgl(it.tanggal_exp)}</td>
      <td style="text-align: right; border: 1px solid #555; padding: 4px 6px;">${it.qty || 1}</td>
      <td style="text-align: right; border: 1px solid #555; padding: 4px 6px;">${it.kemasan ?? it.qty ?? 1}</td>
      <td style="text-align: right; border: 1px solid #555; padding: 4px 8px;">${formatRp(it.harga_beli)}</td>
      <td style="text-align: right; border: 1px solid #555; padding: 4px 8px;">${Number(it.diskon) > 0 ? formatRp(it.diskon) : "—"}</td>
      <td style="text-align: right; border: 1px solid #555; padding: 4px 8px; font-weight: bold;">${formatRp(it.subtotal ?? (Number(it.qty || 1) * Number(it.harga_beli || 0)))}</td>
    </tr>
  `).join("");

  const isLunas = faktur.status_bayar === "lunas";

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Faktur ${faktur.no_faktur || ""}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; }
          .judul { font-size: 13px; font-weight: bold; text-align: center; text-decoration: underline; margin: 8px 0 12px; }
          .info-table { width: 100%; border: none; margin-bottom: 10px; font-size: 11px; }
          .info-table td { border: none; padding: 2px 0; vertical-align: top; }
          table.data { width: 100%; border-collapse: collapse; font-size: 10.5px; }
          table.data th { background: #f2f2f2; border: 1px solid #444; padding: 5px; text-align: center; font-weight: bold; }
          .total-box { margin-top: 10px; float: right; width: 260px; font-size: 11px; }
          .total-row { display: flex; justify-content: space-between; padding: 2px 0; }
          .total-grand { border-top: 1.5px solid #000; font-weight: bold; font-size: 12px; margin-top: 4px; padding-top: 4px; }
          .ttd-wrap { clear: both; padding-top: 28px; display: flex; justify-content: space-between; text-align: center; font-size: 10.5px; }
          .ttd-box { width: 180px; }
          .ttd-gap { height: 50px; }
        </style>
      </head>
      <body>
        ${KOP_HTML}
        <div class="judul">FAKTUR PENERIMAAN BARANG</div>
        <table class="info-table">
          <tr>
            <td style="width: 55%;">
              <strong>No. Faktur:</strong> ${faktur.no_faktur || "-"}<br/>
              <strong>Supplier:</strong> ${faktur.nama_supplier || "-"}<br/>
              <strong>Tgl Terima:</strong> ${formatTgl(faktur.tanggal_terima)}
            </td>
            <td style="width: 45%; text-align: right;">
              <strong>Status:</strong> ${isLunas ? "LUNAS" : "BELUM LUNAS"}<br/>
              <strong>Jatuh Tempo:</strong> ${formatTgl(faktur.tanggal_jatuh_tempo)}<br/>
              <strong>Tipe:</strong> ${faktur.is_pkp ? "PKP" : "Non-PKP"}
            </td>
          </tr>
        </table>
        <table class="data">
          <thead>
            <tr>
              <th style="width: 25px;">No.</th>
              <th style="text-align: left;">Nama Obat</th>
              <th style="width: 75px;">Batch</th>
              <th style="width: 75px;">Exp</th>
              <th style="width: 40px; text-align: right;">Qty</th>
              <th style="width: 50px; text-align: right;">Kemasan</th>
              <th style="width: 80px; text-align: right;">Harga</th>
              <th style="width: 60px; text-align: right;">Diskon</th>
              <th style="width: 90px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="total-box">
          <div class="total-row"><span>Subtotal:</span><span>${formatRp(faktur.subtotal)}</span></div>
          ${Number(faktur.diskon) > 0 ? `<div class="total-row"><span>Diskon:</span><span>-${formatRp(faktur.diskon)}</span></div>` : ""}
          ${Number(faktur.ppn) > 0 ? `<div class="total-row"><span>PPN:</span><span>${formatRp(faktur.ppn)}</span></div>` : ""}
          <div class="total-row total-grand"><span>Total:</span><span>${formatRp(faktur.total)}</span></div>
        </div>
        <div class="ttd-wrap">
          <div class="ttd-box">Pengirim / Supplier,<div class="ttd-gap"></div>( .................................. )</div>
          <div class="ttd-box">Penerima,<div class="ttd-gap"></div><strong>( ${namaUser} )</strong></div>
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
 * 5. EKSPOR 1 FAKTUR KE WORD (.doc)
 */
export function exportSatuFakturWord(faktur, { namaUser = "Petugas" } = {}) {
  if (!faktur) return;

  const items = faktur.items || [];
  const itemsHtml = items.map((it, idx) => `
    <tr>
      <td style="text-align: center; border: 1px solid #666; padding: 4px;">${idx + 1}</td>
      <td style="border: 1px solid #666; padding: 4px 6px; font-weight: bold;">${it.nama_obat || "-"}</td>
      <td style="text-align: center; border: 1px solid #666; padding: 4px;">${it.nomor_batch || "-"}</td>
      <td style="text-align: center; border: 1px solid #666; padding: 4px;">${formatTgl(it.tanggal_exp)}</td>
      <td style="text-align: right; border: 1px solid #666; padding: 4px;">${it.qty || 1}</td>
      <td style="text-align: right; border: 1px solid #666; padding: 4px;">${it.kemasan ?? it.qty ?? 1}</td>
      <td style="text-align: right; border: 1px solid #666; padding: 4px 6px;">${formatRp(it.harga_beli)}</td>
      <td style="text-align: right; border: 1px solid #666; padding: 4px 6px;">${Number(it.diskon) > 0 ? formatRp(it.diskon) : "—"}</td>
      <td style="text-align: right; border: 1px solid #666; padding: 4px 6px; font-weight: bold;">${formatRp(it.subtotal ?? (Number(it.qty || 1) * Number(it.harga_beli || 0)))}</td>
    </tr>
  `).join("");

  const isLunas = faktur.status_bayar === "lunas";
  const content = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Faktur ${faktur.no_faktur}</title>
        <style>
          @page Section1 { size: 595.3pt 841.9pt; margin: 36pt; }
          div.Section1 { page: Section1; }
          body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 6pt; margin-bottom: 6pt; }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${KOP_HTML}
          <div style="text-align: center; font-size: 12pt; font-weight: bold; text-decoration: underline; margin-bottom: 8pt;">
            FAKTUR PENERIMAAN BARANG
          </div>
          <table border="0" style="width: 100%; border: none;">
            <tr>
              <td style="border: none; width: 50%; font-size: 9.5pt;">
                <strong>No. Faktur:</strong> ${faktur.no_faktur || "-"}<br/>
                <strong>Supplier:</strong> ${faktur.nama_supplier || "-"}<br/>
                <strong>Tgl Terima:</strong> ${formatTgl(faktur.tanggal_terima)}
              </td>
              <td style="border: none; width: 50%; text-align: right; font-size: 9.5pt;">
                <strong>Status:</strong> ${isLunas ? "LUNAS" : "BELUM LUNAS"}<br/>
                <strong>Jatuh Tempo:</strong> ${formatTgl(faktur.tanggal_jatuh_tempo)}<br/>
                <strong>Tipe:</strong> ${faktur.is_pkp ? "PKP" : "Non-PKP"}
              </td>
            </tr>
          </table>
          <table>
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #666; padding: 5px; width: 25px;">No.</th>
                <th style="border: 1px solid #666; padding: 5px; text-align: left;">Nama Obat</th>
                <th style="border: 1px solid #666; padding: 5px; width: 70px;">Batch</th>
                <th style="border: 1px solid #666; padding: 5px; width: 70px;">Exp</th>
                <th style="border: 1px solid #666; padding: 5px; width: 40px; text-align: right;">Qty</th>
                <th style="border: 1px solid #666; padding: 5px; width: 50px; text-align: right;">Kemasan</th>
                <th style="border: 1px solid #666; padding: 5px; width: 75px; text-align: right;">Harga</th>
                <th style="border: 1px solid #666; padding: 5px; width: 60px; text-align: right;">Diskon</th>
                <th style="border: 1px solid #666; padding: 5px; width: 85px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr><td colspan="8" style="border: 1px solid #666; text-align: right; font-weight: bold; padding: 4px;">Subtotal :</td><td style="border: 1px solid #666; text-align: right; font-weight: bold; padding: 4px;">${formatRp(faktur.subtotal)}</td></tr>
              ${Number(faktur.diskon) > 0 ? `<tr><td colspan="8" style="border: 1px solid #666; text-align: right; padding: 4px;">Diskon :</td><td style="border: 1px solid #666; text-align: right; padding: 4px;">-${formatRp(faktur.diskon)}</td></tr>` : ""}
              ${Number(faktur.ppn) > 0 ? `<tr><td colspan="8" style="border: 1px solid #666; text-align: right; padding: 4px;">PPN :</td><td style="border: 1px solid #666; text-align: right; padding: 4px;">${formatRp(faktur.ppn)}</td></tr>` : ""}
              <tr style="background-color: #f2f2f2; font-weight: bold;"><td colspan="8" style="border: 1px solid #666; text-align: right; padding: 5px; font-size: 10pt;">TOTAL :</td><td style="border: 1px solid #666; text-align: right; padding: 5px; font-size: 10pt;">${formatRp(faktur.total)}</td></tr>
            </tfoot>
          </table>
          <div style="margin-top: 24pt;">
            <table border="0" style="width: 100%; border: none;">
              <tr>
                <td style="border: none; text-align: center; width: 50%;">Pengirim / Supplier,<br/><br/><br/><br/>( ..................................... )</td>
                <td style="border: none; text-align: center; width: 50%;">Penerima,<br/><br/><br/><br/><strong>( ${namaUser} )</strong></td>
              </tr>
            </table>
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = new Blob([content], { type: "application/msword;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const noFakSafe = String(faktur.no_faktur || "faktur").replace(/[^a-zA-Z0-9-_]/g, "_");
  a.download = `faktur-${noFakSafe}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 6. EKSPOR 1 FAKTUR KE EXCEL (.xls)
 */
export function exportSatuFakturExcel(faktur) {
  if (!faktur) return;

  const items = faktur.items || [];
  const itemsHtml = items.map((it, idx) => `
    <tr>
      <td style="text-align: center; border: 1px solid #ccc; padding: 4px;">${idx + 1}</td>
      <td style="border: 1px solid #ccc; padding: 4px; font-weight: bold;">${it.nama_obat || "-"}</td>
      <td style="text-align: center; border: 1px solid #ccc; padding: 4px;">${it.nomor_batch || "-"}</td>
      <td style="text-align: center; border: 1px solid #ccc; padding: 4px;">${formatTgl(it.tanggal_exp)}</td>
      <td style="text-align: right; border: 1px solid #ccc; padding: 4px;">${it.qty || 1}</td>
      <td style="text-align: right; border: 1px solid #ccc; padding: 4px;">${it.kemasan ?? it.qty ?? 1}</td>
      <td style="text-align: right; border: 1px solid #ccc; padding: 4px;">${formatRp(it.harga_beli)}</td>
      <td style="text-align: right; border: 1px solid #ccc; padding: 4px;">${Number(it.diskon) > 0 ? formatRp(it.diskon) : "—"}</td>
      <td style="text-align: right; border: 1px solid #ccc; padding: 4px; font-weight: bold;">${formatRp(it.subtotal ?? (Number(it.qty || 1) * Number(it.harga_beli || 0)))}</td>
    </tr>
  `).join("");

  const isLunas = faktur.status_bayar === "lunas";
  const content = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>td, th { font-family: Arial, sans-serif; font-size: 10pt; }</style>
      </head>
      <body>
        <table border="0">
          <tr><td colspan="9" style="text-align: center; font-size: 13pt; font-weight: bold; color: #1B5E20;">APOTEK BIMA FARMA</td></tr>
          <tr><td colspan="9" style="text-align: center; font-size: 9pt; color: #555;">Jl. Tanimulya Raya No.1, Kec. Ngamprah, Kab. Bandung Barat</td></tr>
          <tr><td colspan="9" style="text-align: center; font-size: 11pt; font-weight: bold; padding: 6px 0;">FAKTUR PENERIMAAN BARANG</td></tr>
          <tr>
            <td colspan="4" style="font-weight: bold;">No. Faktur: ${faktur.no_faktur}</td>
            <td colspan="5" style="text-align: right; font-weight: bold;">Status: ${isLunas ? "LUNAS" : "BELUM LUNAS"}</td>
          </tr>
          <tr>
            <td colspan="4">Supplier: ${faktur.nama_supplier}</td>
            <td colspan="5" style="text-align: right;">Tgl Terima: ${formatTgl(faktur.tanggal_terima)}</td>
          </tr>
          <tr>
            <td colspan="4">Jatuh Tempo: ${formatTgl(faktur.tanggal_jatuh_tempo)}</td>
            <td colspan="5" style="text-align: right;">Tipe: ${faktur.is_pkp ? "PKP" : "Non-PKP"}</td>
          </tr>
          <tr><td></td></tr>
          <tr style="background-color: #2E7D32; color: #fff; font-weight: bold;">
            <th style="border: 1px solid #1B5E20; padding: 5px;">No.</th>
            <th style="border: 1px solid #1B5E20; padding: 5px; text-align: left;">Nama Obat</th>
            <th style="border: 1px solid #1B5E20; padding: 5px;">Batch</th>
            <th style="border: 1px solid #1B5E20; padding: 5px;">Exp</th>
            <th style="border: 1px solid #1B5E20; padding: 5px; text-align: right;">Qty</th>
            <th style="border: 1px solid #1B5E20; padding: 5px; text-align: right;">Kemasan</th>
            <th style="border: 1px solid #1B5E20; padding: 5px; text-align: right;">Harga</th>
            <th style="border: 1px solid #1B5E20; padding: 5px; text-align: right;">Diskon</th>
            <th style="border: 1px solid #1B5E20; padding: 5px; text-align: right;">Subtotal</th>
          </tr>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr><td colspan="8" style="border: 1px solid #ccc; text-align: right; font-weight: bold;">Subtotal :</td><td style="border: 1px solid #ccc; text-align: right; font-weight: bold;">${formatRp(faktur.subtotal)}</td></tr>
            ${Number(faktur.diskon) > 0 ? `<tr><td colspan="8" style="border: 1px solid #ccc; text-align: right;">Diskon :</td><td style="border: 1px solid #ccc; text-align: right;">-${formatRp(faktur.diskon)}</td></tr>` : ""}
            ${Number(faktur.ppn) > 0 ? `<tr><td colspan="8" style="border: 1px solid #ccc; text-align: right;">PPN :</td><td style="border: 1px solid #ccc; text-align: right;">${formatRp(faktur.ppn)}</td></tr>` : ""}
            <tr style="background-color: #e8f5e9; font-weight: bold;"><td colspan="8" style="border: 1px solid #999; text-align: right; font-size: 11pt;">TOTAL :</td><td style="border: 1px solid #999; text-align: right; font-size: 11pt;">${formatRp(faktur.total)}</td></tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const noFakSafe = String(faktur.no_faktur || "faktur").replace(/[^a-zA-Z0-9-_]/g, "_");
  a.download = `faktur-${noFakSafe}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
