<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ObatController;
use Illuminate\Support\Facades\Route;

// ---- PUBLIK: tidak perlu login ----
// Toko Online & pencarian obat di Kasir sama-sama pakai ini
Route::get('/obat', [ObatController::class, 'index']);
Route::get('/obat/{obat}', [ObatController::class, 'show']);

Route::post('/login', [AuthController::class, 'login']);

// ---- WAJIB LOGIN (kasir & admin) ----
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Kasir & admin dua-duanya boleh — operasional harian
    Route::middleware('role:admin,kasir')->group(function () {
        Route::post('/obat/opname', [ObatController::class, 'opname']);
    });

    // HANYA admin — sesuai kesepakatan "kasir hanya bisa jualan"
    Route::middleware('role:admin')->group(function () {
        Route::post('/obat', [ObatController::class, 'store']);
        Route::put('/obat/{obat}', [ObatController::class, 'update']);
        Route::delete('/obat/{obat}', [ObatController::class, 'destroy']);
        // nanti: Route::get('/laporan', [LaporanController::class, 'index']);
    });
});
