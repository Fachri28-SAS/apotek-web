import { useState, useEffect } from "react";
import { AuthContext } from "./auth-context";
import { login as apiLogin, logout as apiLogout, getMe, isLoggedIn, setToken } from "../lib/api";

function getCachedUser() {
  // Hanya ambil dari sessionStorage agar saat browser/tab ditutup, sesi langsung musnah
  const raw = sessionStorage.getItem("bimafarma_user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // Bersihkan sisa token/user lama yang mungkin pernah tersimpan di localStorage
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("bimafarma_token");
      localStorage.removeItem("bimafarma_user");
    } catch {
      // ignore
    }
  }

  // Ambil snapshot user dari cache agar render instan tanpa jeda blank screen
  const [user, setUser] = useState(getCachedUser);
  const [loading, setLoading] = useState(() => isLoggedIn() && !getCachedUser());

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoading(false);
      setUser(null);
      return;
    }

    // Sinkronisasi sesi dengan server di latar belakang jika ada token aktif di sessionStorage
    getMe()
      .then((u) => {
        setUser(u);
        sessionStorage.setItem("bimafarma_user", JSON.stringify(u));
      })
      .catch((err) => {
        // HANYA hapus sesi jika server memberikan 401 eksplisit (token invalid/expired di database).
        if (err?.status === 401) {
          setUser(null);
          setToken(null);
          sessionStorage.removeItem("bimafarma_user");
        } else {
          console.warn("Sinkronisasi profil ditunda:", err?.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const u = await apiLogin(username, password);
    setUser(u);
    sessionStorage.setItem("bimafarma_user", JSON.stringify(u));
    setLoading(false);
    return u;
  }

  async function logout() {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setToken(null);
      sessionStorage.removeItem("bimafarma_user");
      try {
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
