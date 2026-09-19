import { rupiah } from "./format";

/**
 * Mengunduh Struk Digital sebagai file gambar PNG beresolusi tinggi ke galeri pembeli.
 */
export function unduhStrukDigitalPng(pesanan) {
  if (!pesanan) return;

  const status = pesanan.pembayaran?.status || pesanan.status_pembayaran || "pending";
  const statusPenjualan = pesanan.status_penjualan || pesanan.status || "pending";
  const isLunas = status === "sukses" || statusPenjualan === "selesai" || pesanan.catatan_verifikasi === "selesai";

  if (!isLunas) {
    alert("Struk resmi baru dapat diunduh setelah pembayaran diverifikasi dan dikonfirmasi lunas oleh kasir apotek.");
    return;
  }

  const width = 600;
  const items = pesanan.items || [];
  // Hitung perkiraan tinggi canvas berdasarkan jumlah item
  const baseHeight = 520;
  const itemHeight = 36;
  const height = baseHeight + (items.length * itemHeight);

  const canvas = document.createElement("canvas");
  const scale = 2; // Retina sharpness
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  // Background putih bersih dengan border halus
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // Border luar kartu struk
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Header Banner Atas
  ctx.fillStyle = "#701A75"; // Magenta Dark
  ctx.fillRect(10, 10, width - 20, 75);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 20px 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("APOTEK BIMA FARMA", width / 2, 42);

  ctx.font = "12px 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#F5D0FE";
  ctx.fillText("Jl. Tanimulya Raya No. 1, Ngamprah, Kab. Bandung Barat", width / 2, 62);
  ctx.fillText("Layanan WA / Konsultasi: 0812-2360-4900", width / 2, 77);

  // Status Badge LUNAS QRIS
  ctx.fillStyle = "#DCFCE7";
  ctx.strokeStyle = "#86EFAC";
  ctx.lineWidth = 1;
  const badgeY = 100;
  ctx.fillRect(width / 2 - 140, badgeY, 280, 32);
  ctx.strokeRect(width / 2 - 140, badgeY, 280, 32);

  ctx.fillStyle = "#166534";
  ctx.font = "bold 13px 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("✓ BUKTI PEMBAYARAN QRIS (LUNAS)", width / 2, badgeY + 21);

  // Meta Transaksi
  let y = 158;
  ctx.textAlign = "left";
  ctx.fillStyle = "#64748B";
  ctx.font = "12px 'Segoe UI', Roboto, sans-serif";

  function drawMetaRow(label, value, boldValue = false, valueColor = "#0F172A") {
    ctx.fillStyle = "#64748B";
    ctx.font = "12px 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(label, 30, y);

    ctx.fillStyle = valueColor;
    ctx.font = boldValue ? "bold 13px 'Segoe UI', Roboto, sans-serif" : "12px 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(value, width - 30, y);
    ctx.textAlign = "left";
    y += 22;
  }

  const tglTeks = pesanan.created_at
    ? new Date(pesanan.created_at).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("id-ID");

  drawMetaRow("No. Struk / Nota", pesanan.no_struk || "—", true);
  drawMetaRow("Kode Tracking", pesanan.kode_tracking || "—", true, "#701A75");
  drawMetaRow("Waktu Pemesanan", tglTeks);
  drawMetaRow("Nama Pembeli", pesanan.nama_pembeli || "Pelanggan Online");
  drawMetaRow("Nomor Telepon", pesanan.telepon_pembeli || "—");
  if (pesanan.alamat_kirim) {
    drawMetaRow("Alamat / Tujuan", pesanan.alamat_kirim.length > 35 ? pesanan.alamat_kirim.slice(0, 35) + "…" : pesanan.alamat_kirim);
  }

  // Garis putus-putus
  y += 5;
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(30, y);
  ctx.lineTo(width - 30, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 22;

  // Header Tabel Obat
  ctx.fillStyle = "#475569";
  ctx.font = "bold 12px 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("ITEM OBAT", 30, y);
  ctx.textAlign = "right";
  ctx.fillText("SUBTOTAL", width - 30, y);
  ctx.textAlign = "left";
  y += 18;

  // List Items
  for (const it of items) {
    const namaObat = it.nama_obat || it.nama || "Obat";
    const namaSatuan = it.nama_satuan || it.satuan || "Pcs";
    const qty = Number(it.qty || 1);
    const subtotal = Number(it.subtotal || (qty * (it.harga_jual || it.harga || 0)));

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 12.5px 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(namaObat, 30, y);

    ctx.textAlign = "right";
    ctx.fillText(rupiah(subtotal), width - 30, y);
    ctx.textAlign = "left";
    y += 16;

    ctx.fillStyle = "#64748B";
    ctx.font = "11.5px 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`${qty} ${namaSatuan} @ ${rupiah(it.harga_jual || it.harga || 0)}`, 30, y);
    y += 18;
  }

  // Garis Penutup Tabel
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(30, y);
  ctx.lineTo(width - 30, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 26;

  // Total Akhir
  const total = Number(pesanan.total || pesanan.subtotal || 0);
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 14px 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("TOTAL PEMBAYARAN", 30, y);

  ctx.textAlign = "right";
  ctx.fillStyle = "#701A75";
  ctx.font = "bold 20px 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(rupiah(total), width - 30, y);
  ctx.textAlign = "left";
  y += 32;

  // Kotak Catatan Pengambilan
  ctx.fillStyle = "#F8FAFC";
  ctx.strokeStyle = "#E2E8F0";
  ctx.fillRect(30, y, width - 60, 48);
  ctx.strokeRect(30, y, width - 60, 48);

  ctx.fillStyle = "#475569";
  ctx.font = "11px 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Tunjukkan struk digital ini atau sebutkan Kode Tracking", width / 2, y + 20);
  ctx.fillText("kepada apoteker/kasir saat mengambil obat di apotek.", width / 2, y + 36);

  // Trigger Download PNG
  const fileName = `Struk-BimaFarma-${pesanan.kode_tracking || pesanan.no_struk || "pesanan"}.png`;
  const link = document.createElement("a");
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Mencetak struk digital menggunakan browser print dialog
 */
export function cetakStrukDigital(pesanan) {
  if (!pesanan) return;

  const status = pesanan.pembayaran?.status || pesanan.status_pembayaran || "pending";
  const statusPenjualan = pesanan.status_penjualan || pesanan.status || "pending";
  const isLunas = status === "sukses" || statusPenjualan === "selesai" || pesanan.catatan_verifikasi === "selesai";

  if (!isLunas) {
    alert("Struk resmi baru dapat dicetak setelah pembayaran diverifikasi dan dikonfirmasi lunas oleh kasir apotek.");
    return;
  }

  const items = pesanan.items || [];
  const tglTeks = pesanan.created_at
    ? new Date(pesanan.created_at).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("id-ID");

  let iframe = document.getElementById("print-struk-digital-frame");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "print-struk-digital-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const itemsHtml = items
    .map(
      (it) => `
    <div style="margin-bottom: 6px;">
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
        <span>${it.nama_obat || it.nama || "Obat"}</span>
        <span>${rupiah(it.subtotal || (Number(it.qty || 1) * Number(it.harga_jual || it.harga || 0)))}</span>
      </div>
      <div style="font-size: 11px; color: #555;">
        ${it.qty || 1} ${it.nama_satuan || it.satuan || "Pcs"} @ ${rupiah(it.harga_jual || it.harga || 0)}
      </div>
    </div>
  `
    )
    .join("");

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Struk-${pesanan.kode_tracking || "Pesanan"}</title>
        <style>
          @page { margin: 8mm; size: auto; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 12px;
            color: #111;
            padding: 10px;
            max-width: 80mm;
            margin: 0 auto;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .dashed { border-top: 1px dashed #444; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .badge {
            display: inline-block;
            background: #DCFCE7;
            color: #166534;
            border: 1px solid #86EFAC;
            border-radius: 4px;
            padding: 4px 8px;
            font-weight: bold;
            font-size: 11px;
            margin: 6px 0;
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div style="font-size: 15px; font-weight: 800; color: #701A75;">APOTEK BIMA FARMA</div>
          <div style="font-size: 11px; color: #555; margin-top: 2px;">
            Jl. Tanimulya Raya No. 1, Ngamprah<br/>Kab. Bandung Barat &middot; WA: 0812-2360-4900
          </div>
          <div class="badge">✓ LUNAS VIA QRIS</div>
        </div>
        <div class="dashed"></div>
        <div class="row"><span>No. Struk</span><span class="bold">${pesanan.no_struk || "—"}</span></div>
        <div class="row"><span>Kode Tracking</span><span class="bold" style="color: #701A75;">${pesanan.kode_tracking || "—"}</span></div>
        <div class="row"><span>Waktu</span><span>${tglTeks}</span></div>
        <div class="row"><span>Pembeli</span><span>${pesanan.nama_pembeli || "Pelanggan Online"}</span></div>
        <div class="row"><span>No. HP</span><span>${pesanan.telepon_pembeli || "—"}</span></div>
        <div class="dashed"></div>
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 6px; color: #444;">RINCIAN OBAT</div>
        ${itemsHtml}
        <div class="dashed"></div>
        <div class="row" style="font-size: 14px; font-weight: bold;">
          <span>TOTAL</span>
          <span style="color: #701A75;">${rupiah(pesanan.total || pesanan.subtotal || 0)}</span>
        </div>
        <div class="dashed"></div>
        <div class="center" style="font-size: 10.5px; color: #666; margin-top: 8px;">
          Tunjukkan struk ini kepada kasir saat mengambil obat di apotek.<br/>
          Semoga lekas sembuh!
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
 * Membuka WhatsApp kasir dengan pesan terformat rapi
 */
export function kirimStrukWhatsApp(pesanan, noWaApotek = "6281223604900") {
  if (!pesanan) return;

  const items = pesanan.items || [];
  const listTeks = items
    .map((it) => `• ${it.nama_obat || it.nama} (${it.qty || 1} ${it.nama_satuan || it.satuan || "Pcs"})`)
    .join("\n");

  const pesan = `Halo Kasir Apotek Bima Farma, saya sudah transfer via QRIS untuk pesanan online:
📋 *No. Struk:* ${pesanan.no_struk || "-"}
🏷️ *Kode Tracking:* ${pesanan.kode_tracking || "-"}
👤 *Nama:* ${pesanan.nama_pembeli || "-"}
📞 *No. HP:* ${pesanan.telepon_pembeli || "-"}
💰 *Total:* ${rupiah(pesanan.total || pesanan.subtotal || 0)} (Lunas via QRIS)

*Obat yang Dipesan:*
${listTeks}

Mohon segera disiapkan ya. Terima kasih!`;

  window.open(`https://wa.me/${noWaApotek}?text=${encodeURIComponent(pesan)}`, "_blank");
}
