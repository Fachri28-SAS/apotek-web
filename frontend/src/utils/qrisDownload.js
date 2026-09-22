export const STATIC_QRIS_BIMA_FARMA =
  "00020101021126610014COM.GO-JEK.WWW01189360091433873061180210G3873061180303UKE51440014ID.CO.QRIS.WWW0215ID10243577536480303UKE5204591253033605802ID5925APOTEK BIMA FARMA, NGAMPR6013BANDUNG BARAT61054055262070703A016304ABD9";

/**
 * Algoritma CRC16-CCITT (Polynomial 0x1021, Init 0xFFFF) standar EMVCo QRIS.
 */
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Generate string QRIS dinamis dengan nominal tagihan terkunci sesuai standar EMVCo Bank Indonesia.
 */
export function generateDynamicQris(amount, staticQris = STATIC_QRIS_BIMA_FARMA) {
  if (!amount || Number(amount) <= 0) return staticQris;
  let qris = staticQris.replace("010211", "010212");
  const amountStr = Math.round(Number(amount)).toString();
  const amountLength = amountStr.length.toString().padStart(2, "0");
  const tag54 = "54" + amountLength + amountStr;

  const pos58 = qris.indexOf("5802ID");
  if (pos58 !== -1) {
    qris = qris.substring(0, pos58) + tag54 + qris.substring(pos58);
  }

  const pos63 = qris.lastIndexOf("6304");
  const qrisWithoutChecksum = pos63 !== -1 ? qris.substring(0, pos63 + 4) : qris + "6304";
  return qrisWithoutChecksum + crc16(qrisWithoutChecksum);
}

/**
 * Helper untuk mengunduh QR Code SVG menjadi file gambar PNG berkualitas tinggi (High-Res)
 * yang siap dibaca dengan cepat dan akurat oleh fitur "Scan dari Galeri" di aplikasi
 * GoPay, BCA, Livin, BRImo, BNI, DANA, OVO, ShopeePay, dll.
 */
export function unduhQrisPng({ svgId, namaFile = "qris-bima-farma.png", judul = "APOTEK BIMA FARMA, NGAMPRAH", nominal = "" }) {
  const svgElement = document.getElementById(svgId);
  if (!svgElement) {
    const link = document.createElement("a");
    link.href = "/qris-bima-farma.png";
    link.download = namaFile;
    link.click();
    return;
  }

  const svgWidth = parseInt(svgElement.getAttribute("width") || "240", 10);
  const svgHeight = parseInt(svgElement.getAttribute("height") || "240", 10);
  // Penskalaan resolusi tinggi (2.5x) agar QR code sangat tajam di layar HP
  const scale = 2.5;
  const qrW = svgWidth * scale;
  const qrH = svgHeight * scale;

  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const URL = window.URL || window.webkitURL || window;
  const blobURL = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const padding = 36;
    const headerHeight = judul ? 80 : 0;
    const footerHeight = nominal ? 90 : 30;

    const canvas = document.createElement("canvas");
    canvas.width = qrW + padding * 2;
    canvas.height = qrH + padding * 2 + headerHeight + footerHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background putih bersih
    ctx.fillStyle = "#FFFFFF";
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, canvas.height, 24);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Header Judul Apotek
    if (judul) {
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 26px 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(judul, canvas.width / 2, padding + 28);

      ctx.fillStyle = "#64748B";
      ctx.font = "16px 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("NMID: ID1024357753648 • QRIS Standar Bank Indonesia", canvas.width / 2, padding + 56);
    }

    // Gambar QR Code dengan pixel tajam
    const qrY = padding + headerHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, padding, qrY, qrW, qrH);

    // Footer Nominal Terkunci
    if (nominal) {
      const footerY = qrY + qrH + 34;
      ctx.fillStyle = "#059669";
      ctx.font = "bold 24px 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Nominal Terkunci: ${nominal}`, canvas.width / 2, footerY);

      ctx.fillStyle = "#64748B";
      ctx.font = "15px 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Buka m-Banking / E-Wallet & pilih 'Scan dari Galeri'", canvas.width / 2, footerY + 28);
    }

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
