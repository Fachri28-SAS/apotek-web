import { useState, useEffect } from "react";
import { AuthContext } from "./auth-context";
import { login as apiLogin, logout as apiLogout, getMe, isLoggedIn, setToken } from "../lib/api";

function getCachedUser() {
  const raw = localStorage.getItem("bimafarma_user") || sessionStorage.getItem("bimafarma_user");
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
    if (!isLoggedIn()) {
      setLoading(false);
      setUser(null);
      return;
    }

    // Sinkronisasi sesi dengan server di latar belakang
    getMe()
      .then((u) => {
        setUser(u);
        const storage = localStorage.getItem("bimafarma_token") ? localStorage : sessionStorage;
        storage.setItem("bimafarma_user", JSON.stringify(u));
      })
      .catch((err) => {
        // HANYA hapus sesi jika server memberikan 401 eksplisit (token invalid/expired di database).
        // Jangan hapus token jika error koneksi jaringan atau gangguan sementara.
        if (err?.status === 401) {
          setUser(null);
          setToken(null);
          localStorage.removeItem("bimafarma_user");
          sessionStorage.removeItem("bimafarma_user");
        } else {
          console.warn("Sinkronisasi profil ditunda:", err?.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password, ingat = true) {
    const u = await apiLogin(username, password, ingat);
    setUser(u);
    const storage = ingat ? localStorage : sessionStorage;
    storage.setItem("bimafarma_user", JSON.stringify(u));
    setLoading(false);
    return u;
  }

  async function logout() {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("bimafarma_user");
      sessionStorage.removeItem("bimafarma_user");
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
