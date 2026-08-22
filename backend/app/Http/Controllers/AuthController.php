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

        // Token lama dihapus dulu — supaya 1 user 1 sesi aktif saja (opsional,
        // hapus baris ini kalau mau boleh login di beberapa device sekaligus)
        $user->tokens()->delete();

        $token = $user->createToken('sistem-kasir')->plainTextToken;

        return response()->json([
            'user' => $user->only(['id', 'nama', 'username', 'role']),
            'token' => $token,
        ]);
    }

    public function logout(Request $r)
    {
        $r->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Berhasil logout']);
    }

    public function me(Request $r)
    {
        return $r->user()->only(['id', 'nama', 'username', 'role']);
    }
}
