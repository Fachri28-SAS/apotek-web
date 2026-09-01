import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "var(--bg)",
            color: "var(--ink)",
            textAlign: "center",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#FEE2E2",
              color: "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 32, height: 32 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, marginBottom: 8, color: "var(--ink)" }}>
            Terjadi Kendala Tampilan
          </h2>
          <p style={{ color: "var(--ink-soft)", maxWidth: 440, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            {this.state.error?.message || "Halaman tidak dapat dimuat. Silakan muat ulang atau coba login kembali."}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {window.location.pathname.startsWith("/kasir") || window.location.pathname === "/login" ? (
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = "/login";
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 100,
                  border: "none",
                  background: "var(--magenta)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                }}
              >
                Reset &amp; Login Ulang
              </button>
            ) : (
              <button
                onClick={() => {
                  window.location.href = "/toko";
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 100,
                  border: "none",
                  background: "var(--magenta)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                }}
              >
                Kembali ke Toko
              </button>
            )}
            <button
              onClick={() => {
                if (window.caches) {
                  caches.keys().then((names) => {
                    for (let name of names) caches.delete(name);
                  });
                }
                window.location.reload(true);
              }}
              style={{
                padding: "10px 18px",
                borderRadius: 100,
                border: "1.5px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
