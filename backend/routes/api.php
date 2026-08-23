<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ObatController;
use App\Http\Controllers\ObatReferensiController;
use App\Http\Controllers\PenjualanController;
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

Route::post('/login', [AuthController::class, 'login']);

// =====================================================================
// WAJIB LOGIN — kasir & admin
// =====================================================================
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // ---- Kasir & admin DUA-DUANYA boleh — operasional harian ----
    Route::middleware('role:admin,kasir')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::post('/obat/opname', [ObatController::class, 'opname']);
        Route::get('/stok-mutasi', [StokMutasiController::class, 'index']);
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/obat', [ObatController::class, 'store']);
        Route::put('/obat/{obat}', [ObatController::class, 'update']);
        Route::delete('/obat/{obat}', [ObatController::class, 'destroy']);
        Route::post('/penjualan', [PenjualanController::class, 'store']);
        Route::get('/penjualan', [PenjualanController::class, 'index']);
        Route::get('/penjualan/{penjualan}', [PenjualanController::class, 'show']);
    });

    // ---- HANYA admin — cuma Laporan yang eksklusif admin ----
    Route::middleware('role:admin')->group(function () {
        // nanti: Route::get('/laporan', [LaporanController::class, 'index']);
    });
});
