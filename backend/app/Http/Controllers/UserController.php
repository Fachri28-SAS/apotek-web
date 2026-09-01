<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * GET /api/users
     * Dropdown kasir umum (id & nama)
     */
    public function index()
    {
        return User::where('aktif', true)->orderBy('nama')->get(['id', 'nama']);
    }

    /**
     * GET /api/users/kelola
     * Khusus Admin: Ambil semua user (aktif & nonaktif) dengan detail
     */
    public function kelola()
    {
        return User::orderByDesc('aktif')->orderBy('nama')->get(['id', 'nama', 'username', 'role', 'aktif', 'created_at']);
    }

    /**
     * POST /api/users
     * Khusus Admin: Buat akun kasir / admin baru
     */
    public function store(Request $r)
    {
        $data = $r->validate([
            'nama' => 'required|string|max:100',
            'username' => 'required|string|max:50|unique:users,username',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,kasir',
        ]);

        $user = User::create([
            'nama' => $data['nama'],
            'username' => strtolower(trim($data['username'])),
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'aktif' => true,
        ]);

        return response()->json([
            'message' => 'Akun pengguna berhasil dibuat.',
            'user' => $user->only(['id', 'nama', 'username', 'role', 'aktif', 'created_at']),
        ], 201);
    }

    /**
     * PUT /api/users/{user}
     * Khusus Admin: Update nama, username, role, atau toggle aktif
     */
    public function update(Request $r, User $user)
    {
        $data = $r->validate([
            'nama' => 'sometimes|string|max:100',
            'username' => ['sometimes', 'string', 'max:50', Rule::unique('users', 'username')->ignore($user->id)],
            'role' => 'sometimes|in:admin,kasir',
            'aktif' => 'sometimes|boolean',
            'password' => 'nullable|string|min:6',
        ]);

        if (isset($data['password']) && !empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        if (isset($data['username'])) {
            $data['username'] = strtolower(trim($data['username']));
        }

        $user->update($data);

        // Jika dinonaktifkan, cabut semua token aktif agar langsung logout
        if (isset($data['aktif']) && !$data['aktif']) {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'Data akun berhasil diperbarui.',
            'user' => $user->only(['id', 'nama', 'username', 'role', 'aktif', 'created_at']),
        ]);
    }

    /**
     * DELETE /api/users/{user}
     * Toggle nonaktifkan atau hapus
     */
    public function destroy(User $user)
    {
        // Jangan hapus akun sendiri jika sedang login
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Tidak bisa menonaktifkan akun sendiri yang sedang aktif.'], 422);
        }

        $user->update(['aktif' => false]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Akun berhasil dinonaktifkan.']);
    }
}
