/**
 * Cetak Laporan Penerimaan Barang (Format resmi Apotek Bima Farma)
 * Mendukung cetak 1 faktur maupun cetak semua faktur sekaligus.
 */
export function cetakLaporanPenerimaan(fakturs = [], { dariTanggal, sampaiTanggal, namaUser = "admin" } = {}) {
  const listFaktur = Array.isArray(fakturs) ? fakturs : [fakturs];
  if (listFaktur.length === 0) {
    alert("Tidak ada data penerimaan untuk dicetak.");
    return;
  }

  // Format tanggal Indonesia
  function formatTglIndo(tglStr) {
    if (!tglStr) return "";
    const d = new Date(tglStr);
    if (isNaN(d.getTime())) return tglStr;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function formatAngka(num) {
    return Number(num || 0).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatRp(num) {
    if (num === null || num === undefined || isNaN(num)) return "Rp0";
    return "Rp" + Math.round(Number(num)).toLocaleString("id-ID");
  }

  // Siapkan baris item
  const baris = [];
  let noUrut = 1;
  let totalKeseluruhan = 0;

  listFaktur.forEach((faktur) => {
    const items = faktur.items || [];
    if (items.length === 0) {
      // Jika faktur tidak punya rincian item, tampilkan ringkasan faktur
      baris.push({
        no: noUrut++,
        namaSupplier: faktur.nama_supplier || "-",
        namaBarang: `Faktur: ${faktur.no_faktur}`,
        jumlah: "1,00",
        jumlahRetur: "0,00",
        totalBarang: "1,00",
        hargaSatuan: formatRp(faktur.subtotal || faktur.total),
        totalHarga: formatAngka(faktur.total),
      });
      totalKeseluruhan += Number(faktur.total || 0);
    } else {
      items.forEach((it) => {
        const qtyTerima = Number(it.qty || 1);
        const qtyKemasan = Number(it.kemasan ?? (it.qty * (it.faktor || 1)));
        const hargaSatuan = Number(it.harga_beli || 0);
        const subtotal = Number(it.subtotal ?? (qtyTerima * hargaSatuan - Number(it.diskon || 0)));

        baris.push({
          no: noUrut++,
          namaSupplier: faktur.nama_supplier || "-",
          namaBarang: it.nama_obat || "-",
          jumlah: formatAngka(qtyTerima),
          jumlahRetur: "0,00",
          totalBarang: formatAngka(qtyKemasan),
          hargaSatuan: formatRp(hargaSatuan),
          totalHarga: formatAngka(subtotal),
        });
        totalKeseluruhan += subtotal;
      });
    }
  });

  // Teks periode
  let periodeTeks = "";
  if (dariTanggal && sampaiTanggal) {
    periodeTeks = dariTanggal === sampaiTanggal
      ? formatTglIndo(dariTanggal)
      : `${formatTglIndo(dariTanggal)} s/d ${formatTglIndo(sampaiTanggal)}`;
  } else if (listFaktur.length === 1 && listFaktur[0].tanggal_terima) {
    periodeTeks = formatTglIndo(listFaktur[0].tanggal_terima);
  } else {
    periodeTeks = formatTglIndo(new Date().toISOString().slice(0, 10));
  }

  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Siapkan iframe untuk cetak tanpa merusak tampilan halaman
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

  const rowsHtml = baris
    .map(
      (b) => `
      <tr>
        <td style="text-align: center;">${b.no}</td>
        <td>${b.namaSupplier}</td>
        <td>${b.namaBarang}</td>
        <td style="text-align: right;">${b.jumlah}</td>
        <td style="text-align: right;">${b.jumlahRetur}</td>
        <td style="text-align: right;">${b.totalBarang}</td>
        <td style="text-align: right;">${b.hargaSatuan}</td>
        <td style="text-align: right;">${b.totalHarga}</td>
      </tr>
    `
    )
    .join("");

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>LAPORAN PENERIMAAN BARANG</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 12mm 12mm 12mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          .header-center {
            text-align: center;
            margin-bottom: 12px;
          }
          .nama-apotek {
            font-size: 15px;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          .alamat-apotek {
            font-size: 10px;
            margin-top: 3px;
            color: #222;
          }
          .judul-laporan {
            font-size: 13px;
            font-weight: bold;
            text-decoration: underline;
            margin-top: 10px;
            letter-spacing: 0.5px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 8px;
            font-weight: 500;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
          }
          th, td {
            border: 1px solid #666;
            padding: 4px 6px;
            vertical-align: middle;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-align: center;
          }
          .footer-row {
            margin-top: 14px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #333;
          }
          .total-box {
            margin-top: 6px;
            font-weight: bold;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="header-center">
          <div class="nama-apotek">APOTEK BIMA FARMA</div>
          <div class="alamat-apotek">Jl. Tanimulya Raya No.1 Desa Tanimulya Kec. Ngamprah, KAB. BANDUNG BARAT Kode Pos 40552 Telp. 081223604900</div>
          <div class="judul-laporan">LAPORAN PENERIMAAN BARANG</div>
        </div>

        <div class="meta-row">
          <div>Periode: <strong>${periodeTeks}</strong></div>
          <div>Dicetak: ${tanggalCetak}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 32px;">No.</th>
              <th style="text-align: left;">Nama Supplier</th>
              <th style="text-align: left;">Nama Barang</th>
              <th style="width: 65px; text-align: right;">Jumlah</th>
              <th style="width: 80px; text-align: right;">Jumlah Retur</th>
              <th style="width: 85px; text-align: right;">Total Barang</th>
              <th style="width: 95px; text-align: right;">Harga Satuan</th>
              <th style="width: 110px; text-align: right;">Total Harga</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7" style="text-align: right; font-weight: bold; background: #fafafa;">Grand Total :</td>
              <td style="text-align: right; font-weight: bold; background: #fafafa;">${formatAngka(totalKeseluruhan)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer-row">
          <div>Petugas: ${namaUser}</div>
          <div style="text-align: right;">Halaman 1</div>
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
