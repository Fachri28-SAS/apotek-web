<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Dipakai di routes/api.php sebagai: ->middleware('role:admin')
 * atau untuk beberapa role sekaligus: ->middleware('role:admin,kasir')
 *
 * PENTING: ini yang menegakkan aturan "kasir tidak bisa lihat Laporan"
 * di level server. Menyembunyikan menu "Laporan" di sidebar React itu
 * cuma soal tampilan — tanpa middleware ini, kasir yang tahu URL endpoint
 * masih bisa akses langsung lewat Postman/browser. Keduanya wajib jalan
 * bersama: sembunyikan di UI (untuk UX) DAN blokir di server (untuk
 * keamanan sungguhan).
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = $request->user();

        if (!$user || !in_array($user->role, $roles, true)) {
            abort(403, 'Anda tidak punya akses ke fitur ini.');
        }

        return $next($request);
    }
}
