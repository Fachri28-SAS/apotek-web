/**
 * Symbol logo Bima Farma — disalin PERSIS dari bima-farma-landing.html asli.
 * Render komponen ini SEKALI saja di App.jsx (paling atas, sebelum <Routes>).
 * Di halaman manapun, pakai logonya lewat:
 *   <svg className="brand-mark"><use href="#cross-mark" /></svg>       (versi warna penuh)
 *   <svg className="cross-outline"><use href="#cross-outline" /></svg> (versi outline putih)
 *
 * Catatan penting: kapsul atas & bawah pakai SATU warna ungu yang sama
 * (#A64BC7) — bukan dua shade beda. Itu yang bikin logo menyatu mulus
 * tanpa garis pemisah di tengah.
 */
export default function CrossDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="cross-mark" viewBox="0 0 100 100">
          <rect x="34" y="3" width="30" height="46" rx="15" fill="#A64BC7" />
          <rect x="34" y="51" width="30" height="46" rx="15" fill="#A64BC7" />
          <rect x="3" y="34" width="46" height="30" rx="15" fill="#39A048" />
        </symbol>
        <symbol id="cross-outline" viewBox="0 0 100 100">
          <rect x="34" y="3" width="30" height="46" rx="15" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.9" />
          <rect x="34" y="51" width="30" height="46" rx="15" fill="none" stroke="#ffffff" strokeWidth="3" />
          <rect x="3" y="34" width="46" height="30" rx="15" fill="none" stroke="#ffffff" strokeWidth="3" />
        </symbol>
      </defs>
    </svg>
  );
}
