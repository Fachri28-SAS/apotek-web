/**
 * Logo Bima Farma: 3 kapsul membentuk salib tanpa lengan kanan.
 * Atas & bawah ungu, kiri hijau — bentuk unik sesuai identitas asli.
 *
 * variant="mark"  -> cuma ikonnya (dipakai di halo dekoratif, favicon-like)
 * variant="full"  -> ikon + teks "APOTEK BIMA FARMA" (dipakai di navbar/footer)
 */
export default function Logo({ variant = "full", size = 40 }) {
  const Mark = (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* pil vertikal tunggal — SATU warna ungu, atas-bawah menyatu tanpa seam */}
      <rect x="18" y="3" width="12" height="42" rx="6" fill="var(--magenta)" />
      {/* kapsul kiri — hijau, TIDAK ADA lengan kanan */}
      <rect x="3" y="18" width="23" height="12" rx="6" fill="var(--green)" />
    </svg>
  );

  if (variant === "mark") return Mark;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {Mark}
      <div style={{ lineHeight: 1.1 }}>
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "var(--green-dark)",
          }}
        >
          APOTEK
        </div>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--magenta-dark)",
          }}
        >
          BIMA FARMA
        </div>
      </div>
    </div>
  );
}
