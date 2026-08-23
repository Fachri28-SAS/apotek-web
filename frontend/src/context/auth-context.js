import { createContext } from "react";

/**
 * Sengaja dipisah ke file .js sendiri (bukan .jsx yang berisi komponen)
 * supaya Vite Fast Refresh bekerja optimal — aturannya: satu file hanya
 * boleh meng-export komponen React saja.
 */
export const AuthContext = createContext(null);
