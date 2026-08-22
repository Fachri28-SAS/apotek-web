import KasirShell from "./KasirShell";

export default function Laporan() {
  return (
    <KasirShell>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Laporan</h1>
      <p style={{ color: "var(--ink-soft)" }}>
        Halaman ini cuma bisa dibuka admin. Kalau kamu login sebagai kasir
        dan tetap bisa baca tulisan ini, berarti ada yang salah dengan
        pembatasan role — cek lagi <code>RutePrivat</code> di App.jsx.
      </p>
    </KasirShell>
  );
}
