import { BrowserRouter, Routes, Route } from "react-router-dom";
import CrossDefs from "./components/CrossDefs";
import { AuthProvider } from "./context/AuthContext";
import RutePrivat from "./components/RutePrivat";

import Landing from "./pages/Landing";
import Toko from "./pages/Toko";
import Login from "./pages/Login";
import Dashboard from "./pages/kasir/Dashboard";
import Kasir from "./pages/kasir/Kasir";
import DataObat from "./pages/kasir/DataObat";
import StokOpname from "./pages/kasir/StokOpname";
import Riwayat from "./pages/kasir/Riwayat";
import Penerimaan from "./pages/kasir/Penerimaan";
import RiwayatPenerimaan from "./pages/kasir/RiwayatPenerimaan";
import PembayaranOnline from "./pages/kasir/PembayaranOnline";
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
          <Route path="/kasir/jual" element={<RutePrivat><Kasir /></RutePrivat>} />
          <Route path="/kasir/obat" element={<RutePrivat><DataObat /></RutePrivat>} />
          <Route path="/kasir/opname" element={<RutePrivat><StokOpname /></RutePrivat>} />
          <Route path="/kasir/riwayat" element={<RutePrivat><Riwayat /></RutePrivat>} />
          <Route path="/kasir/penerimaan" element={<RutePrivat><Penerimaan /></RutePrivat>} />
          <Route path="/kasir/riwayat-penerimaan" element={<RutePrivat><RiwayatPenerimaan /></RutePrivat>} />
          <Route path="/kasir/pembayaran-online" element={<RutePrivat><PembayaranOnline /></RutePrivat>} />

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
