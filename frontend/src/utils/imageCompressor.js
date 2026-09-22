/**
 * Kompres gambar di sisi klien (browser) sebelum diunggah ke server.
 * Mengurangi ukuran file dari 3-8 MB (kamera HP) menjadi ~100-200 KB
 * sehingga hemat penyimpanan server dan membuat proses upload instan.
 *
 * @param {File} file - Objek file gambar dari input file
 * @param {Object} options - Pengaturan kompresi (maxWidth, maxHeight, quality)
 * @returns {Promise<string>} Base64 data URL hasil kompresi
 */
export function compressImage(file, options = {}) {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("File yang dipilih bukan gambar"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.onload = () => {
        let { width, height } = img;

        // Hitung rasio resize agar proporsional
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Kompresi ke format JPEG kualitas 0.8
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
