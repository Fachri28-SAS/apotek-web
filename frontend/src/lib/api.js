/**
 * Semua pemanggilan API lewat sini, bukan fetch() langsung di komponen —
 * supaya header Authorization otomatis terpasang di mana pun, dan
 * base URL cuma perlu diubah di satu tempat kalau nanti pindah hosting.
 */
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  // Hanya ambil dari sessionStorage agar saat browser/tab ditutup, sesi otomatis musnah
  return sessionStorage.getItem("bimafarma_token");
}

function setToken(token) {
  // Bersihkan sisa token di localStorage agar tidak ada sesi tertinggal
  try {
    localStorage.removeItem("bimafarma_token");
  } catch {
    // ignore
  }

  if (!token) {
    sessionStorage.removeItem("bimafarma_token");
    return;
  }

  // Sesi HANYA disimpan di sessionStorage (musnah otomatis saat tab/browser di-close)
  sessionStorage.setItem("bimafarma_token", token);
}

/**
 * Wrapper fetch: otomatis nempelin token & handle error jadi pesan
 * yang bisa langsung ditampilkan ke user (bukan objek Error mentah).
 */
async function api(path, options = {}) {
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : null;

    if (!res.ok) {
      if (res.status === 401 && path === "/me") {
        setToken(null);
      }
      // Laravel validation error: {"message": "...", "errors": {"username": ["..."]}}
      const pesan =
        data?.errors ? Object.values(data.errors).flat()[0] : data?.message || "Terjadi kesalahan, coba lagi.";
      const err = new Error(pesan);
      err.status = res.status;
      throw err;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Koneksi ke server lambat / timeout. Coba periksa koneksi database.");
    }
    throw err;
  }
}

export async function login(username, password) {
  const data = await api("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function logout() {
  try {
    await api("/logout", { method: "POST" });
  } finally {
    setToken(null); // tetap hapus token lokal walau request logout gagal (misal internet putus)
  }
}

export async function getMe() {
  return api("/me");
}

export function isLoggedIn() {
  return !!getToken();
}

export { api, setToken, getToken };
