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
                'username' => ['Akun kasir ini sedang nonaktif (setelah closing). Silakan minta Admin mengaktifkan kembali di menu Kelola Pengguna.'],
            ]);
        }

        // Cek jam operasional kasir
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

        try {
            \App\Http\Controllers\UserController::ensureLastSeenColumn();
            \Illuminate\Support\Facades\DB::table('users')
                ->where('id', $user->id)
                ->update(['last_seen_at' => now()]);
        } catch (\Throwable $e) {}

        // Aturan 1 Akun Hanya 1 Perangkat:
        // Cabut seluruh token sesi login sebelumnya agar perangkat lama otomatis logout
        $user->tokens()->delete();

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
                \Illuminate\Support\Facades\DB::table('users')
                    ->where('id', $u->id)
                    ->update(['last_seen_at' => now()->subSeconds(95)]);
            } catch (\Throwable $e) {}

            try {
                $u->currentAccessToken()?->delete();
            } catch (\Throwable $e) {}
        }
        return response()->json(['message' => 'Berhasil logout']);
    }

    public function me(Request $r)
    {
        return $r->user()->only(['id', 'nama', 'username', 'role']);
    }

    /**
     * POST /api/ganti-password
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

        // Cabut seluruh token sesi agar semua perangkat yang sedang login langsung ter-logout
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Kata sandi berhasil diperbarui. Seluruh sesi telah dikeluarkan, silakan masuk kembali.',
        ]);
    }
}
