<?php

namespace App\Http\Controllers;

use App\Models\Obat;
use App\Models\Penjualan;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard
     *
     * Sengaja 1 endpoint untuk semua panel, bukan 4 endpoint terpisah —
     * supaya halaman Dashboard cukup 1x request (lebih cepat, dan nanti
     * gampang di-polling tiap 10 detik tanpa membebani server).
     *
     * Catatan: kartu "Penjualan Hari Ini" & "Transaksi Hari Ini" sengaja
     * TIDAK ada di sini, sesuai spesifikasi awal.
     */
    public function index()
    {
        $hariIni = now()->toDateString();
        $batasExp = now()->addDays(90)->toDateString();

        // --- KPI 1: total item terjual hari ini (jumlah qty, bukan jumlah transaksi) ---
        $produkTerjual = (int) DB::table('penjualan_item')
            ->join('penjualan', 'penjualan.id', '=', 'penjualan_item.penjualan_id')
            ->whereDate('penjualan.tanggal', $hariIni)
            ->whereIn('penjualan.status', ['lunas', 'selesai'])
            ->sum('penjualan_item.qty');

        // --- KPI 2 & 3 ---
        $stokMenipis = Obat::whereNull('deleted_at')
            ->where('aktif_dijual', true)
            ->whereColumn('stok', '<', 'stok_minimum')
            ->orderByRaw('(stok / NULLIF(stok_minimum, 0)) ASC')
            ->limit(20)
            ->get(['id', 'nama', 'stok', 'stok_minimum', 'satuan_dasar']);

        $akanKadaluwarsa = Obat::whereNull('deleted_at')
            ->whereNotNull('tanggal_exp')
            ->whereBetween('tanggal_exp', [$hariIni, $batasExp])
            ->orderBy('tanggal_exp')
            ->limit(20)
            ->get(['id', 'nama', 'stok', 'satuan_dasar', 'nomor_batch', 'tanggal_exp']);

        // --- Panel: 5 transaksi terakhir hari ini ---
        $transaksiTerbaru = Penjualan::whereDate('tanggal', $hariIni)
            ->whereIn('status', ['lunas', 'selesai'])
            ->withCount('items')
            ->orderByDesc('id')
            ->limit(5)
            ->get(['id', 'no_struk', 'nama_kasir', 'nama_pembeli', 'total', 'metode_bayar', 'created_at']);

        // --- KPI Penjualan Hari Ini & Jumlah Transaksi Hari Ini ---
        $penjualanHariIni = (float) Penjualan::whereDate('tanggal', $hariIni)
            ->whereIn('status', ['lunas', 'selesai'])
            ->sum('total');

        $transaksiHariIniCount = Penjualan::whereDate('tanggal', $hariIni)
            ->whereIn('status', ['lunas', 'selesai'])
            ->count();

        return [
            'kpi' => [
                'produk_terjual' => $produkTerjual,
                'penjualan_hari_ini' => $penjualanHariIni,
                'transaksi_hari_ini' => $transaksiHariIniCount,
                'stok_menipis' => $stokMenipis->count(),
                'akan_kadaluwarsa' => $akanKadaluwarsa->count(),
            ],
            'transaksi_terbaru' => $transaksiTerbaru,
            'stok_menipis' => $stokMenipis,
            'akan_kadaluwarsa' => $akanKadaluwarsa,
        ];
    }
}
