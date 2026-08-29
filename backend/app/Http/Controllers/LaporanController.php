<?php

namespace App\Http\Controllers;

use App\Models\Obat;
use App\Models\Penjualan;
use Illuminate\Support\Facades\DB;

class LaporanController extends Controller
{
    /**
     * GET /api/laporan
     * Khusus admin — kasir tidak boleh akses (dijaga middleware role:admin).
     */
    public function index()
    {
        $hariIni = now()->toDateString();
        $tujuhHariLalu = now()->subDays(6)->toDateString();
        $batasExp = now()->addDays(90)->toDateString();

        // --- KPI ---
        $penjualan7Hari = Penjualan::where('status', 'lunas')
            ->where('tanggal', '>=', $tujuhHariLalu)
            ->sum('total');

        $transaksiHariIni = Penjualan::where('status', 'lunas')
            ->whereDate('tanggal', $hariIni)
            ->count();

        $totalHariIni = Penjualan::where('status', 'lunas')
            ->whereDate('tanggal', $hariIni)
            ->sum('total');

        $rataRata = $transaksiHariIni > 0 ? $totalHariIni / $transaksiHariIni : 0;

        // --- Grafik 7 hari ---
        $grafik = DB::table('penjualan')
            ->selectRaw("tanggal, COUNT(*) as jml_transaksi, SUM(total) as omzet")
            ->where('status', 'lunas')
            ->where('tanggal', '>=', $tujuhHariLalu)
            ->groupBy('tanggal')
            ->orderBy('tanggal')
            ->get();

        // Isi tanggal yang kosong (tidak ada transaksi) supaya grafik 7 bar lengkap
        $grafik7Hari = [];
        for ($i = 6; $i >= 0; $i--) {
            $tgl = now()->subDays($i)->toDateString();
            $data = $grafik->firstWhere('tanggal', $tgl);
            $grafik7Hari[] = [
                'tanggal' => $tgl,
                'label' => now()->subDays($i)->translatedFormat('D, d M'),
                'omzet' => $data ? (float) $data->omzet : 0,
                'jml_transaksi' => $data ? (int) $data->jml_transaksi : 0,
            ];
        }

        // --- Obat mendekati kadaluwarsa ---
        $kadaluwarsa = Obat::whereNull('deleted_at')
            ->whereNotNull('tanggal_exp')
            ->whereBetween('tanggal_exp', [$hariIni, $batasExp])
            ->orderBy('tanggal_exp')
            ->get(['id', 'nama', 'satuan_dasar', 'stok', 'nomor_batch', 'tanggal_exp']);

        // --- Transaksi hari ini (untuk tabel + export CSV) ---
        $transaksi = Penjualan::where('status', 'lunas')
            ->whereDate('tanggal', $hariIni)
            ->withCount('items')
            ->orderByDesc('id')
            ->get(['id', 'no_struk', 'nama_kasir', 'nama_pembeli', 'subtotal',
                    'diskon', 'total', 'metode_bayar', 'created_at']);

        return [
            'kpi' => [
                'penjualan_7_hari' => (float) $penjualan7Hari,
                'transaksi_hari_ini' => $transaksiHariIni,
                'rata_rata' => round($rataRata),
            ],
            'grafik_7_hari' => $grafik7Hari,
            'kadaluwarsa' => $kadaluwarsa,
            'transaksi_hari_ini' => $transaksi,
        ];
    }
}
