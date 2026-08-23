import { useState, useEffect } from "react";
import { AuthContext } from "./auth-context";
import { login as apiLogin, logout as apiLogout, getMe, isLoggedIn } from "../lib/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Nilai awal ditentukan langsung dari ada/tidaknya token, BUKAN lewat
  // setState di dalam useEffect. Kalau pakai setState sinkron di effect,
  // React memperingatkan soal "cascading renders" (render berantai) —
  // cara ini menghindarinya sekaligus lebih cepat 1 render.
  const [loading, setLoading] = useState(() => isLoggedIn());

  useEffect(() => {
    if (!isLoggedIn()) return; // tidak ada token, tidak perlu cek ke server

    getMe()
      .then(setUser)
      .catch(() => setUser(null)) // token basi/invalid, dianggap logout
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password, ingat = true) {
    const u = await apiLogin(username, password, ingat);
    setUser(u);
    return u;
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
