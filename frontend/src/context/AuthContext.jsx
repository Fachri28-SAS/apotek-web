import { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, logout as apiLogout, getMe, isLoggedIn } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true selama cek token lama saat refresh

  // Begitu app dibuka/di-refresh, cek apakah token lama masih valid
  useEffect(() => {
    if (!isLoggedIn()) {
      setLoading(false);
      return;
    }
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() harus dipakai di dalam <AuthProvider>");
  return ctx;
}
