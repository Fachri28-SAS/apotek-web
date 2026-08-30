/**
 * Helper untuk mengunduh QR Code SVG menjadi file gambar PNG berkualitas tinggi
 * yang siap dibaca oleh fitur "Scan dari Galeri" di aplikasi GoPay, BCA, Livin, DANA, OVO, ShopeePay, dll.
 */
export function unduhQrisPng({ svgId, namaFile = "qris-bima-farma.png", judul = "APOTEK BIMA FARMA", nominal = "" }) {
  const svgElement = document.getElementById(svgId);
  if (!svgElement) {
    // Fallback jika berupa gambar biasa
    const link = document.createElement("a");
    link.href = "/qris.png";
    link.download = namaFile;
    link.click();
    return;
  }

  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const URL = window.URL || window.webkitURL || window;
  const blobURL = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const padding = 24;
    const headerHeight = judul ? 50 : 0;
    const footerHeight = nominal ? 45 : 0;

    const canvas = document.createElement("canvas");
    canvas.width = img.width + padding * 2;
    canvas.height = img.height + padding * 2 + headerHeight + footerHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background putih bersih
    ctx.fillStyle = "#FFFFFF";
    ctx.roundRect
      ? ctx.roundRect(0, 0, canvas.width, canvas.height, 16)
      : ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fill();

    // Header Judul Apotek
    if (judul) {
      ctx.fillStyle = "#1E293B";
      ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(judul, canvas.width / 2, padding + 18);

      ctx.fillStyle = "#64748B";
      ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("QRIS Standar Bank Indonesia", canvas.width / 2, padding + 34);
    }

    // Gambar QR Code
    const qrY = padding + headerHeight;
    ctx.drawImage(img, padding, qrY);

    // Footer Nominal Terkunci
    if (nominal) {
      const footerY = qrY + img.height + 18;
      ctx.fillStyle = "#059669";
      ctx.font = "bold 13.5px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Nominal Terkunci: ${nominal}`, canvas.width / 2, footerY);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "10.5px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("Buka aplikasi e-wallet & pilih 'Scan dari Galeri'", canvas.width / 2, footerY + 16);
    }

    // Trigger Download
    const pngUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.download = namaFile;
    downloadLink.href = pngUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(blobURL);
  };

  img.src = blobURL;
}
