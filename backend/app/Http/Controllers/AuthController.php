<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/login
     * Body: { "username": "yunita", "password": "rahasia123" }
     *
     * Dipakai kasir & admin login ke Sistem Kasir. Pembeli di Toko Online
     * TIDAK lewat sini — checkout mereka tanpa akun (lihat BACKLOG.md).
     */
    public function login(Request $r)
    {
        $data = $r->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $data['username'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['Username atau password salah.'],
            ]);
        }

        if (!$user->aktif) {
            throw ValidationException::withMessages([
                'username' => ['Akun ini sudah dinonaktifkan. Hubungi admin.'],
            ]);
        }

        // Pembatasan jam operasional khusus role kasir (Admin tetap bebas login 24 jam)
        if ($user->role === 'kasir') {
            $operasional = \App\Services\OperasionalService::getStatus();
            if (!$operasional['is_open']) {
                throw ValidationException::withMessages([
                    'username' => [
                        "Akses login kasir ditutup di luar jam operasional ({$operasional['jam_buka']} - {$operasional['jam_tutup']} WIB). {$operasional['pesan_tutup']}"
                    ],
                ]);
            }
        }

        // Pertahankan sesi aktif agar tidak saling memutus / logout saat buka multi-tab atau refresh
        // $user->tokens()->delete();

        try {
            \App\Http\Controllers\UserController::ensureLastSeenColumn();
            $user->update(['last_seen_at' => now()]);
        } catch (\Throwable $e) {}

        $token = $user->createToken('sistem-kasir')->plainTextToken;

        return response()->json([
            'user' => $user->only(['id', 'nama', 'username', 'role']),
            'token' => $token,
        ]);
    }

    public function logout(Request $r)
    {
        $u = $r->user();
        if ($u) {
            try {
                \App\Http\Controllers\UserController::ensureLastSeenColumn();
                // Mundurkan 95 detik agar status langsung terhitung offline (karena ambang batas online adalah 90 detik)
                // Waktu terakhir aktif tetap tersimpan sehingga admin bisa melihat "Baru saja offline" / "x menit lalu"
                $u->update(['last_seen_at' => now()->subSeconds(95)]);
            } catch (\Throwable $e) {}
            $u->currentAccessToken()->delete();
        }
        return response()->json(['message' => 'Berhasil logout']);
    }

    public function me(Request $r)
    {
        return $r->user()->only(['id', 'nama', 'username', 'role']);
    }

    /**
     * POST /api/ganti-password
     * Kasir atau Admin ganti kata sandi sendiri
     */
    public function gantiPassword(Request $r)
    {
        $data = $r->validate([
            'password_lama' => 'required|string',
            'password_baru' => 'required|string|min:6|confirmed',
        ]);

        $user = $r->user();

        if (!Hash::check($data['password_lama'], $user->password)) {
            throw ValidationException::withMessages([
                'password_lama' => ['Kata sandi saat ini salah.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($data['password_baru']),
        ]);

        return response()->json([
            'message' => 'Kata sandi berhasil diperbarui.',
        ]);
    }
}
