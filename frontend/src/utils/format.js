export function rupiah(n) {
  if (n === null || n === undefined || isNaN(n)) return "Rp0";
  return "Rp" + Math.round(Number(n)).toLocaleString("id-ID");
}

/**
 * Pembulatan ke atas kelipatan Rp 500
 * Contoh: 7.001 - 7.499 -> 7.500
 *         7.501 - 7.999 -> 8.000
 */
export function bulatkan500(angka) {
  if (!angka || isNaN(angka) || angka <= 0) return 0;
  return Math.ceil(angka / 500) * 500;
}

/**
 * Hitung harga jual otomatis berbasis Margin Apotek 25% + Pembulatan 500
 * Rumus Margin Apotek: Harga Jual = Harga Beli / (1 - 0.25) = Harga Beli / 0.75
 */
export function hitungHargaJualOtomatis(hargaBeli, persenMargin = 25) {
  const beli = Number(hargaBeli || 0);
  if (beli <= 0) return 0;
  const faktor = 1 - persenMargin / 100;
  if (faktor <= 0) return bulatkan500(beli);
  const hargaKotor = beli / faktor;
  return bulatkan500(hargaKotor);
}

/**
 * Hitung persentase margin laba atas modal/harga beli:
 * Pendapatan = Jual - Beli
 * Persentase = (Pendapatan / Beli) * 100
 * Contoh: Beli 75.000, Jual 100.000 -> (25.000 / 75.000) * 100 = 33.3%
 */
export function hitungMarginPersen(beli, jual) {
  const hJual = Number(jual || 0);
  const hBeli = Number(beli || 0);
  if (hBeli <= 0) return null;
  return Number((((hJual - hBeli) / hBeli) * 100).toFixed(1));
}

/**
 * Status alert warna margin:
 * - >= 25%: Hijau (Aman / Sehat, standar apotek 33.3%)
 * - 0% s/d < 25%: Kuning (Peringatan / Margin Tipis)
 * - < 0%: Merah (Bahaya / Jual Rugi!)
 */
export function getStatusMargin(marginPct) {
  if (marginPct === null || marginPct === undefined || isNaN(marginPct)) {
    return { status: "kosong", warna: "abu", teks: "-", label: "-" };
  }
  if (marginPct < 0) {
    return { status: "rugi", warna: "merah", teks: "Rugi", label: `${marginPct}% ⛔ Rugi` };
  }
  if (marginPct < 25) {
    return { status: "tipis", warna: "kuning", teks: "Tipis", label: `+${marginPct}% ⚠️ Tipis` };
  }
  return { status: "aman", warna: "hijau", teks: "Aman", label: `+${marginPct}%` };
}
