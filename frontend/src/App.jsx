import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CrossDefs from "./components/CrossDefs";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import RutePrivat from "./components/RutePrivat";

import Landing from "./pages/Landing";
import Toko from "./pages/Toko";
import TrackingPesanan from "./pages/TrackingPesanan";
import Login from "./pages/Login";
import Dashboard from "./pages/kasir/Dashboard";
import Kasir from "./pages/kasir/Kasir";
import DataObat from "./pages/kasir/DataObat";
import StokOpname from "./pages/kasir/StokOpname";
import Riwayat from "./pages/kasir/Riwayat";
import Penerimaan from "./pages/kasir/Penerimaan";
import RiwayatPenerimaan from "./pages/kasir/RiwayatPenerimaan";
import PembayaranPenerimaan from "./pages/kasir/PembayaranPenerimaan";
import PembayaranOnline from "./pages/kasir/PembayaranOnline";
import Laporan from "./pages/kasir/Laporan";
import LaporanPengeluaran from "./pages/kasir/LaporanPengeluaran";
import KelolaUser from "./pages/kasir/KelolaUser";

function App() {
  return (
    <BrowserRouter>
      <CrossDefs />
      <ErrorBoundary>
        <AuthProvider>
          <Routes>
            {/* ---- Publik: tidak perlu login ---- */}
            <Route path="/" element={<Landing />} />
            <Route path="/toko" element={<Toko />} />
            <Route path="/pesanan/:kodeTracking" element={<TrackingPesanan />} />

            {/* ---- Keamanan: Orang luar yang coba tebak /login atau /admin langsung ditolak ke beranda ---- */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/admin" element={<Navigate to="/" replace />} />

            {/* ---- Portal Rahasia Login Khusus Staf & Kasir ---- */}
            <Route path="/portal-bima" element={<Login />} />

            {/* ---- Wajib login: kasir & admin ---- */}
            <Route path="/kasir" element={<RutePrivat><Dashboard /></RutePrivat>} />
            <Route path="/kasir/jual" element={<RutePrivat><Kasir /></RutePrivat>} />
            <Route path="/kasir/obat" element={<RutePrivat><DataObat /></RutePrivat>} />
            <Route path="/kasir/opname" element={<RutePrivat><StokOpname /></RutePrivat>} />
            <Route path="/kasir/riwayat" element={<RutePrivat><Riwayat /></RutePrivat>} />
            <Route path="/kasir/penerimaan" element={<RutePrivat><Penerimaan /></RutePrivat>} />
            <Route path="/kasir/riwayat-penerimaan" element={<RutePrivat><RiwayatPenerimaan /></RutePrivat>} />
            <Route path="/kasir/pembayaran-penerimaan" element={<RutePrivat><PembayaranPenerimaan /></RutePrivat>} />
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
            <Route
              path="/kasir/pengeluaran"
              element={
                <RutePrivat rolesBoleh={["admin"]}>
                  <LaporanPengeluaran />
                </RutePrivat>
              }
            />
            <Route
              path="/kasir/users"
              element={
                <RutePrivat rolesBoleh={["admin"]}>
                  <KelolaUser />
                </RutePrivat>
              }
            />
          </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
