<?php

namespace App\Http\Controllers;

use App\Models\StokMutasi;
use Illuminate\Http\Request;

class StokMutasiController extends Controller
{
    /**
     * GET /api/stok-mutasi?tipe=penyesuaian&periode=bulan-ini
     *
     * Dipakai halaman Stok Opname untuk menampilkan riwayat penyesuaian
     * yang pernah dilakukan — ini inti kebutuhan client: kalau stok fisik
     * beda dengan sistem, harus bisa ditelusuri kapan & siapa.
     */
    public function index(Request $r)
    {
        $q = StokMutasi::with(['obat:id,nama,satuan_dasar', 'user:id,nama']);

        if ($r->filled('tipe')) {
            $q->where('tipe', $r->tipe);
        }

        match ($r->periode) {
            'hari-ini' => $q->whereDate('created_at', now()->toDateString()),
            'minggu-ini' => $q->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]),
            'bulan-ini' => $q->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year),
            'bulan-lalu' => $q->whereMonth('created_at', now()->subMonth()->month)
                              ->whereYear('created_at', now()->subMonth()->year),
            default => null,
        };

        return $q->orderByDesc('id')->limit(100)->get();
    }
}
