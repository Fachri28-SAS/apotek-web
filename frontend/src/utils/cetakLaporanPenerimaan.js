/**
 * Cetak Laporan Penerimaan Barang & Buku Bayar Faktur PBF (Format resmi Apotek Bima Farma)
 */

function formatTglIndo(tglStr) {
  if (!tglStr) return "—";
  const d = new Date(tglStr);
  if (isNaN(d.getTime())) return tglStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatAngka(num) {
  return Number(num || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatRp(num) {
  if (num === null || num === undefined || isNaN(num)) return "Rp0";
  return "Rp" + Math.round(Number(num)).toLocaleString("id-ID");
}

function getIframe() {
  let iframe = document.getElementById("cetak-laporan-penerimaan-frame");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "cetak-laporan-penerimaan-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }
  return iframe;
}

/**
 * 1. CETAK BUKU PENERIMAAN BARANG FISIK (12 Kolom sesuai Foto 1)
 * Kolom: NO, Tanggal, No Faktur, PBF, Nama Barang, Jumlah, Satuan, EXP, No Batch, Harga Satuan (Rp), Jumlah (Rp), Jumlah + PPN 11%
 */
export function cetakBukuBarangMasuk(barisItem = [], { dariTanggal, sampaiTanggal, namaUser = "Petugas" } = {}) {
  if (!barisItem || barisItem.length === 0) {
    alert("Tidak ada data penerimaan barang untuk dicetak.");
    return;
  }

  let totalJumlahRp = 0;
  let totalJumlahPpnRp = 0;

  const rowsHtml = barisItem
    .map((b, idx) => {
      totalJumlahRp += Number(b.jumlahRp || 0);
      totalJumlahPpnRp += Number(b.jumlahPpnRp || 0);

      const tglStr = b.tanggal ? formatTglIndo(b.tanggal) : "—";
      const expStr = b.exp ? formatTglIndo(b.exp) : "—";

      return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="text-align: center; white-space: nowrap;">${tglStr}</td>
        <td style="text-align: left; font-weight: 600;">${b.noFaktur || "—"}</td>
        <td style="text-align: left;">${b.pbf || "—"}</td>
        <td style="text-align: left; font-weight: 600;">${b.namaBarang || "—"}</td>
        <td style="text-align: center;">${formatAngka(b.jumlah)}</td>
        <td style="text-align: center;">${b.satuan || "—"}</td>
        <td style="text-align: center; white-space: nowrap;">${expStr}</td>
        <td style="text-align: center;">${b.noBatch || "—"}</td>
        <td style="text-align: right;">${formatRp(b.hargaSatuan)}</td>
        <td style="text-align: right; font-weight: 600;">${formatRp(b.jumlahRp)}</td>
        <td style="text-align: right; font-weight: 700;">${formatRp(b.jumlahPpnRp)}</td>
      </tr>
    `;
    })
    .join("");

  const periodeTeks = dariTanggal && sampaiTanggal ? `${dariTanggal} s/d ${sampaiTanggal}` : "Semua Periode";
  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const iframe = getIframe();
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>BUKU PENERIMAAN BARANG FISIK</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 10mm 10mm 10mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          .header-center {
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
          }
          .nama-apotek {
            font-size: 15px;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          .alamat-apotek {
            font-size: 9.5px;
            margin-top: 2px;
            color: #222;
          }
          .judul-laporan {
            font-size: 12.5px;
            font-weight: bold;
            text-decoration: underline;
            margin-top: 6px;
            letter-spacing: 0.5px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-bottom: 6px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
          }
          th, td {
            border: 1px solid #444;
            padding: 4px 5px;
            vertical-align: middle;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
          }
          .footer-row {
            margin-top: 10px;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #333;
          }
        </style>
      </head>
      <body>
        <div class="header-center">
          <div class="nama-apotek">APOTEK BIMA FARMA</div>
          <div class="alamat-apotek">Jl. Tanimulya Raya No.1, Kec. Ngamprah, Kab. Bandung Barat &middot; Telp. 081223604900</div>
          <div class="judul-laporan">BUKU PENERIMAAN BARANG FISIK</div>
        </div>

        <div class="meta-row">
          <div>Periode: <strong>${periodeTeks}</strong> &middot; Total: <strong>${barisItem.length} Item Masuk</strong></div>
          <div>Dicetak: ${tanggalCetak} &middot; Petugas: ${namaUser}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 28px;">NO</th>
              <th style="width: 68px;">Tanggal</th>
              <th style="width: 80px;">No Faktur</th>
              <th style="width: 95px;">PBF</th>
              <th>Nama Barang</th>
              <th style="width: 48px;">Jumlah</th>
              <th style="width: 50px;">Satuan</th>
              <th style="width: 65px;">EXP</th>
              <th style="width: 65px;">No Batch</th>
              <th style="width: 78px;">Harga Satuan (Rp)</th>
              <th style="width: 82px;">Jumlah (Rp)</th>
              <th style="width: 90px;">Jumlah + PPN 11%</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f7f7f7; font-weight: bold;">
              <td colspan="10" style="text-align: right;">TOTAL KESELURUHAN :</td>
              <td style="text-align: right;">${formatRp(totalJumlahRp)}</td>
              <td style="text-align: right;">${formatRp(totalJumlahPpnRp)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer-row">
          <div>Apotek Bima Farma &middot; Arsip Buku Penerimaan</div>
          <div>Halaman 1</div>
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
 * 2. CETAK BUKU REGISTER PEMBAYARAN FAKTUR PBF (7 Kolom sesuai Foto 2)
 * Kolom: NO, Tgl, Nama PBF, Nomor Faktur, Besar Uang, Jumlah, Tgl Bayar
 */
export function cetakBukuBayarFaktur(grupList = [], { dariTanggal, sampaiTanggal, namaUser = "Petugas" } = {}) {
  if (!grupList || grupList.length === 0) {
    alert("Tidak ada data pembayaran faktur untuk dicetak.");
    return;
  }

  let totalBesarUang = 0;
  let rowsHtml = "";

  grupList.forEach((grup, gIdx) => {
    const fakturs = grup.fakturs || [];
    const rowSpan = fakturs.length || 1;
    const tglStr = grup.tanggal ? formatTglIndo(grup.tanggal) : "—";

    fakturs.forEach((faktur, fIdx) => {
      totalBesarUang += Number(faktur.total || 0);
      const isLunas = faktur.status_bayar === "lunas";
      const tglBayarStr = isLunas
        ? (faktur.tanggal_bayar ? formatTglIndo(faktur.tanggal_bayar) : "Lunas")
        : (faktur.tanggal_jatuh_tempo ? `Tempo: ${formatTglIndo(faktur.tanggal_jatuh_tempo)}` : "Belum");

      rowsHtml += `<tr>`;
      if (fIdx === 0) {
        rowsHtml += `
          <td rowspan="${rowSpan}" style="text-align: center; font-weight: bold;">${gIdx + 1}</td>
          <td rowspan="${rowSpan}" style="text-align: center; white-space: nowrap;">${tglStr}</td>
          <td rowspan="${rowSpan}" style="text-align: left; font-weight: bold;">${grup.namaSupplier || "—"}</td>
        `;
      }

      rowsHtml += `
        <td style="text-align: left;">${faktur.no_faktur || "—"}</td>
        <td style="text-align: right; font-weight: 600;">${formatRp(faktur.total)}</td>
      `;

      if (fIdx === 0) {
        rowsHtml += `
          <td rowspan="${rowSpan}" style="text-align: right; font-weight: bold;">${formatRp(grup.totalJumlah)}</td>
        `;
      }

      rowsHtml += `
        <td style="text-align: center; font-size: 9px; ${isLunas ? "color: #15803D; font-weight: bold;" : "color: #B91C1C;"}">
          ${tglBayarStr}
        </td>
      </tr>`;
    });
  });

  const periodeTeks = dariTanggal && sampaiTanggal ? `${dariTanggal} s/d ${sampaiTanggal}` : "Semua Periode";
  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const iframe = getIframe();
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>BUKU BAYAR FAKTUR PBF</title>
        <style>
          @page {
            size: A4 portrait;
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
          .header-center {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
          }
          .nama-apotek {
            font-size: 15px;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          .alamat-apotek {
            font-size: 10px;
            margin-top: 2px;
            color: #222;
          }
          .judul-laporan {
            font-size: 13px;
            font-weight: bold;
            text-decoration: underline;
            margin-top: 8px;
            letter-spacing: 0.5px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            margin-bottom: 8px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          th, td {
            border: 1px solid #444;
            padding: 5px 6px;
            vertical-align: middle;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
          }
          .footer-row {
            margin-top: 12px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #333;
          }
        </style>
      </head>
      <body>
        <div class="header-center">
          <div class="nama-apotek">APOTEK BIMA FARMA</div>
          <div class="alamat-apotek">Jl. Tanimulya Raya No.1, Kec. Ngamprah, Kab. Bandung Barat &middot; Telp. 081223604900</div>
          <div class="judul-laporan">BUKU REGISTER PEMBAYARAN FAKTUR PBF</div>
        </div>

        <div class="meta-row">
          <div>Periode: <strong>${periodeTeks}</strong></div>
          <div>Dicetak: ${tanggalCetak} &middot; Petugas: ${namaUser}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 38px;">NO</th>
              <th style="width: 80px;">Tgl</th>
              <th style="width: 130px;">Nama PBF</th>
              <th style="width: 120px;">Nomor Faktur</th>
              <th style="width: 110px;">Besar Uang</th>
              <th style="width: 110px;">Jumlah</th>
              <th style="width: 95px;">Tgl Bayar</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f7f7f7; font-weight: bold;">
              <td colspan="4" style="text-align: right;">TOTAL BESAR UANG :</td>
              <td style="text-align: right;">${formatRp(totalBesarUang)}</td>
              <td style="text-align: right;">${formatRp(totalBesarUang)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer-row">
          <div>Apotek Bima Farma &middot; Arsip Buku Pembayaran</div>
          <div>Halaman 1</div>
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

// Fallback nama lama
export const cetakLaporanPenerimaan = cetakBukuBarangMasuk;
