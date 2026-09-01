import { useState } from "react";
import { api } from "../../../lib/api";

export default function GantiPasswordModal({ onClose, user }) {
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [passwordBaruConfirmation, setPasswordBaruConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!passwordLama) {
      setError("Kata sandi saat ini wajib diisi.");
      return;
    }
    if (passwordBaru.length < 6) {
      setError("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (passwordBaru !== passwordBaruConfirmation) {
      setError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      await api("/ganti-password", {
        method: "POST",
        body: JSON.stringify({
          password_lama: passwordLama,
          password_baru: passwordBaru,
          password_baru_confirmation: passwordBaruConfirmation,
        }),
      });
      setSukses(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Gagal mengubah kata sandi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420, width: "90vw", padding: "24px 26px" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🔐</span>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "var(--ink)" }}>Ganti Kata Sandi</h3>
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                Akun: <strong>{user?.nama}</strong> (@{user?.username})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: "var(--ink-soft)",
            }}
          >
            ✕
          </button>
        </div>

        {sukses ? (
          <div
            style={{
              background: "#DCFCE7",
              color: "#15803D",
              padding: "16px",
              borderRadius: 12,
              textAlign: "center",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            ✓ Kata sandi berhasil diubah!
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div
                style={{
                  background: "#FEE2E2",
                  color: "#DC2626",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 5, color: "var(--ink)" }}>
                Kata Sandi Saat Ini
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordLama}
                onChange={(e) => setPasswordLama(e.target.value)}
                placeholder="Masukkan kata sandi lama"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  fontSize: 13.5,
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 5, color: "var(--ink)" }}>
                Kata Sandi Baru
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                placeholder="Minimal 6 karakter"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  fontSize: 13.5,
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 5, color: "var(--ink)" }}>
                Ulangi Kata Sandi Baru
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordBaruConfirmation}
                onChange={(e) => setPasswordBaruConfirmation(e.target.value)}
                placeholder="Ketik ulang kata sandi baru"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  fontSize: 13.5,
                }}
                required
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer", color: "var(--ink-soft)" }}>
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              Tampilkan Kata Sandi
            </label>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                style={{ flex: 1, padding: "10px", borderRadius: 8 }}
                disabled={loading}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-full"
                disabled={loading}
                style={{
                  flex: 1.5,
                  padding: "10px",
                  borderRadius: 8,
                  background: "var(--magenta)",
                  color: "#fff",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {loading ? "Menyimpan…" : "Simpan Sandi Baru"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
