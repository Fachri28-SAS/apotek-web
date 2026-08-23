<?php

namespace App\Http\Controllers;

use App\Models\User;

class UserController extends Controller
{
    /**
     * GET /api/users
     * Dipakai dropdown "Filter per Kasir" di Riwayat Penjualan.
     * Sengaja cuma balikin id & nama — tidak ada email/role/password,
     * karena kasir biasa juga boleh akses endpoint ini.
     */
    public function index()
    {
        return User::where('aktif', true)->orderBy('nama')->get(['id', 'nama']);
    }
}
