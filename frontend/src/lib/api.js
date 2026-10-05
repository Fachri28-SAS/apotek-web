const BASE_URL = (() => {
  if (typeof window !== "undefined") {
    if (window.location.hostname.includes("apotekbimafarma.com") || window.location.hostname.includes("vercel.app")) {
      return "https://www.apotekbimafarma.com/api";
    }
  }
  return import.meta.env.VITE_API_URL || "/api";
})();

function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("bimafarma_token") || localStorage.getItem("bimafarma_token");
}

function setToken(token) {
  if (!token) {
    try {
      sessionStorage.removeItem("bimafarma_token");
      localStorage.removeItem("bimafarma_token");
    } catch {
      // ignore
    }
    return;
  }

  try {
    sessionStorage.setItem("bimafarma_token", token);
    localStorage.setItem("bimafarma_token", token);
  } catch {
    // ignore
  }
}

async function api(path, options = {}) {
  const token = getToken();
  const controller = new AbortController();
  const isKatalog = path.startsWith("/obat") || path.startsWith("/laporan") || path.startsWith("/stok");
  const timeoutMs = options.timeout || (isKatalog ? 75000 : 45000);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      throw new Error("Koneksi ke server lambat / timeout. Sedang mencoba menghubungkan ulang...");
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
    setToken(null);
  }
}

export async function getMe() {
  return api("/me");
}

export function isLoggedIn() {
  return !!getToken();
}

export { api, setToken, getToken };
