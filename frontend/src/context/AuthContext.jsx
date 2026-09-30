import { useState, useEffect } from "react";
import { AuthContext } from "./auth-context";
import { login as apiLogin, logout as apiLogout, getMe, isLoggedIn, setToken, api } from "../lib/api";

function getCachedUser() {
  if (typeof window === "undefined") return null;
  // HANYA baca dari sessionStorage agar saat browser/tab ditutup sesi otomatis terhapus
  const raw = sessionStorage.getItem("bimafarma_user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // Ambil snapshot user dari cache agar render instan tanpa jeda blank screen
  const [user, setUser] = useState(getCachedUser);
  const [loading, setLoading] = useState(() => isLoggedIn() && !getCachedUser());

  useEffect(() => {
    // Bersihkan sesi usang di localStorage dari versi sebelumnya jika ada
    try {
      localStorage.removeItem("bimafarma_user");
      localStorage.removeItem("bimafarma_token");
    } catch {
      // ignore
    }

    if (!isLoggedIn()) {
      setLoading(false);
      setUser(null);
      return;
    }

    // Sinkronisasi sesi dengan server di latar belakang jika ada token aktif
    getMe()
      .then((u) => {
        setUser(u);
        try {
          sessionStorage.setItem("bimafarma_user", JSON.stringify(u));
        } catch {
          // ignore
        }
      })
      .catch((err) => {
        // HANYA hapus sesi jika server memberikan 401 eksplisit (token invalid/expired di database).
        if (err?.status === 401) {
          setUser(null);
          setToken(null);
          try {
            sessionStorage.removeItem("bimafarma_user");
          } catch {
            // ignore
          }
        } else {
          console.warn("Sinkronisasi profil ditunda:", err?.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Heartbeat pengirim status aktif (ping online) setiap 30 detik
  useEffect(() => {
    if (!user) return;

    function kirimPing() {
      api("/user/ping", { method: "POST" }).catch(() => {});
    }

    kirimPing();
    const interval = setInterval(kirimPing, 30000);
    window.addEventListener("focus", kirimPing);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", kirimPing);
    };
  }, [user]);

  async function login(username, password) {
    const u = await apiLogin(username, password);
    setUser(u);
    try {
      sessionStorage.setItem("bimafarma_user", JSON.stringify(u));
      localStorage.removeItem("bimafarma_user");
    } catch {
      // ignore
    }
    setLoading(false);
    return u;
  }

  async function logout() {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setToken(null);
      try {
        sessionStorage.removeItem("bimafarma_user");
        localStorage.removeItem("bimafarma_user");
        localStorage.removeItem("bimafarma_token");
      } catch {
        // ignore
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
