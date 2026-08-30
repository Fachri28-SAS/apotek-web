import Logo from "./Logo";

export default function LoadingScreen({
  message = "Menyiapkan Sistem Kasir...",
  submessage = "Memuat modul apotek & sinkronisasi data...",
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "radial-gradient(circle at 50% 40%, #FFF9FE 0%, var(--bg) 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeIn 0.25s ease forwards",
      }}
    >
      {/* Halo Glow & Logo */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 90,
          height: 90,
          borderRadius: "50%",
          background: "var(--magenta-tint)",
          boxShadow: "0 10px 30px rgba(166, 75, 199, 0.2)",
          marginBottom: 22,
          animation: "pulseGlow 2s infinite ease-in-out",
        }}
      >
        <Logo variant="mark" size={48} />
      </div>

      {/* Brand Title */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: "0.18em",
            color: "var(--green)",
            marginBottom: 2,
          }}
        >
          APOTEK
        </div>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 24,
            fontWeight: 700,
            color: "var(--magenta-dark)",
            lineHeight: 1.1,
          }}
        >
          BIMA FARMA
        </div>
      </div>

      {/* Progress Bar Shimmer */}
      <div
        style={{
          width: 200,
          height: 5,
          borderRadius: 100,
          background: "var(--line)",
          overflow: "hidden",
          position: "relative",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "50%",
            borderRadius: 100,
            background: "linear-gradient(90deg, var(--magenta), var(--green))",
            animation: "progressShimmer 1.4s infinite ease-in-out",
          }}
        />
      </div>

      {/* Message Label */}
      <div
        style={{
          fontSize: 14.5,
          fontWeight: 700,
          color: "var(--ink)",
          marginBottom: 4,
        }}
      >
        {message}
      </div>

      {submessage && (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--ink-soft)",
          }}
        >
          {submessage}
        </div>
      )}
    </div>
  );
}
