<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LaporanController;
use App\Http\Controllers\ObatController;
use App\Http\Controllers\ObatReferensiController;
use App\Http\Controllers\PenerimaanController;
use App\Http\Controllers\PembayaranOnlineController;
use App\Http\Controllers\PenjualanController;
use App\Http\Controllers\TokoController;
use App\Http\Controllers\StokMutasiController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// =====================================================================
// PUBLIK — tidak perlu login sama sekali
// Dipakai Toko Online, dan juga dipakai Kasir untuk cari obat (sebelum
// kasir/admin login pun data ini boleh diakses, karena tidak sensitif).
// =====================================================================
Route::get('/obat', [ObatController::class, 'index']);
Route::get('/obat/{obat}', [ObatController::class, 'show']);
Route::get('/suppliers', [SupplierController::class, 'index']);
Route::get('/obat-referensi', [ObatReferensiController::class, 'index']);

// ---- Toko Online — publik, checkout tanpa akun ----
Route::post('/toko/checkout', [TokoController::class, 'checkout']);

// ---- Tracking Pesanan & Upload Bukti Publik (via kode_tracking) ----
Route::get('/pesanan/{kode_tracking}', [TokoController::class, 'showByTracking']);
Route::get('/pesanan/{kode_tracking}/status', [TokoController::class, 'statusByTracking']);
Route::post('/pesanan/{kode_tracking}/bukti', [TokoController::class, 'uploadBuktiByTracking']);

Route::post('/login', [AuthController::class, 'login']);

// =====================================================================
// WAJIB LOGIN — kasir & admin
// =====================================================================
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/ganti-password', [AuthController::class, 'gantiPassword']);

    // ---- Kasir & admin DUA-DUANYA boleh — operasional harian ----
    Route::middleware('role:admin,kasir')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::post('/obat/opname', [ObatController::class, 'opname']);
        Route::get('/stok-mutasi', [StokMutasiController::class, 'index']);
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/penerimaan', [PenerimaanController::class, 'store']);
        Route::get('/penerimaan', [PenerimaanController::class, 'index']);
        Route::get('/penerimaan/{penerimaan}', [PenerimaanController::class, 'show']);
        Route::post('/obat', [ObatController::class, 'store']);
        Route::put('/obat/{obat}', [ObatController::class, 'update']);
        Route::delete('/obat/{obat}', [ObatController::class, 'destroy']);
        Route::delete('/obat/{obat}/satuan/{satuan}', [ObatController::class, 'hapusSatuan']);
        Route::get('/obat-sampah', [ObatController::class, 'sampah']);
        Route::post('/obat/{id}/pulihkan', [ObatController::class, 'pulihkan']);
        Route::delete('/obat/{id}/permanen', [ObatController::class, 'hapusPermanen']);
        Route::post('/penjualan', [PenjualanController::class, 'store']);
        Route::get('/penjualan', [PenjualanController::class, 'index']);
        Route::get('/penjualan/{penjualan}', [PenjualanController::class, 'show']);
        Route::get('/pembayaran-online', [PembayaranOnlineController::class, 'index']);
        Route::get('/pembayaran-online/counter', [PembayaranOnlineController::class, 'counter']);
        Route::post('/pembayaran-online/{pembayaran}/konfirmasi', [PembayaranOnlineController::class, 'konfirmasi']);
        Route::post('/pembayaran-online/{pembayaran}/kurang-bayar', [PembayaranOnlineController::class, 'kurangBayar']);
        Route::post('/pembayaran-online/{pembayaran}/tolak', [PembayaranOnlineController::class, 'tolak']);
    });

    // ---- HANYA admin — cuma Laporan yang eksklusif admin ----
    Route::middleware('role:admin')->group(function () {
        Route::get('/laporan', [LaporanController::class, 'index']);
    });
});
