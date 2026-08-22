import { BrowserRouter, Routes, Route } from "react-router-dom";
import CrossDefs from "./components/CrossDefs";
import { AuthProvider } from "./context/AuthContext";
import RutePrivat from "./components/RutePrivat";

import Landing from "./pages/Landing";
import Toko from "./pages/Toko";
import Login from "./pages/Login";
import Dashboard from "./pages/kasir/Dashboard";
import Laporan from "./pages/kasir/Laporan";

function App() {
  return (
    <BrowserRouter>
      <CrossDefs />
      <AuthProvider>
        <Routes>
          {/* ---- Publik: tidak perlu login ---- */}
          <Route path="/" element={<Landing />} />
          <Route path="/toko" element={<Toko />} />
          <Route path="/login" element={<Login />} />

          {/* ---- Wajib login: kasir & admin ---- */}
          <Route path="/kasir" element={<RutePrivat><Dashboard /></RutePrivat>} />

          {/* ---- Wajib login DAN khusus admin ---- */}
          <Route
            path="/kasir/laporan"
            element={
              <RutePrivat rolesBoleh={["admin"]}>
                <Laporan />
              </RutePrivat>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
