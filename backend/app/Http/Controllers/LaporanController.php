<?php

namespace App\Http\Controllers;

use App\Models\Obat;
use App\Models\Penjualan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LaporanController extends Controller
{
    /**
     * GET /api/laporan
     * Khusus admin — kasir tidak boleh akses (dijaga middleware role:admin).
     */
    public function index(Request $r)
    {
        $periode = $r->periode ?: 'hari-ini';
        [$mulai, $selesai] = $this->rentangTanggal($periode);

        $hariIni = now()->toDateString();
        $tujuhHariLalu = now()->subDays(6)->toDateString();
        $batasExp = now()->addDays(90)->toDateString();

        $queryPeriode = Penjualan::where('status', 'lunas')->whereBetween('tanggal', [$mulai, $selesai]);

        // --- KPI mengikuti periode yang dipilih ---
        $totalPenjualan = (clone $queryPeriode)->sum('total');
        $jumlahTransaksi = (clone $queryPeriode)->count();
        $rataRata = $jumlahTransaksi > 0 ? $totalPenjualan / $jumlahTransaksi : 0;

        // --- Breakdown metode pembayaran (untuk progress bar) ---
        $metodeBreakdown = (clone $queryPeriode)
            ->select('metode_bayar', DB::raw('COUNT(*) as jumlah'), DB::raw('SUM(total) as total'))
            ->groupBy('metode_bayar')
            ->get()
            ->map(fn ($m) => [
                'metode' => $m->metode_bayar,
                'jumlah' => (int) $m->jumlah,
                'total' => (float) $m->total,
                'persen' => $jumlahTransaksi > 0 ? round($m->jumlah / $jumlahTransaksi * 100) : 0,
            ]);

        // --- Grafik 7 hari — SELALU trend 7 hari terakhir, tidak ikut filter periode ---
        $grafik = DB::table('penjualan')
            ->selectRaw("tanggal, COUNT(*) as jml_transaksi, SUM(total) as omzet")
            ->where('status', 'lunas')
            ->where('tanggal', '>=', $tujuhHariLalu)
            ->groupBy('tanggal')
            ->orderBy('tanggal')
            ->get();

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

        $kadaluwarsa = Obat::whereNull('deleted_at')
            ->whereNotNull('tanggal_exp')
            ->whereBetween('tanggal_exp', [$hariIni, $batasExp])
            ->orderBy('tanggal_exp')
            ->get(['id', 'nama', 'satuan_dasar', 'stok', 'nomor_batch', 'tanggal_exp']);

        // --- Tabel transaksi ikut periode yang dipilih ---
        $transaksi = (clone $queryPeriode)
            ->withCount('items')
            ->orderByDesc('id')
            ->limit(200)
            ->get(['id', 'no_struk', 'nama_kasir', 'nama_pembeli', 'subtotal',
                    'diskon', 'total', 'metode_bayar', 'sumber', 'created_at']);

        return [
            'periode' => $periode,
            'kpi' => [
                'total_penjualan' => (float) $totalPenjualan,
                'jumlah_transaksi' => $jumlahTransaksi,
                'rata_rata' => round($rataRata),
            ],
            'metode_breakdown' => $metodeBreakdown,
            'grafik_7_hari' => $grafik7Hari,
            'kadaluwarsa' => $kadaluwarsa,
            'transaksi' => $transaksi,
        ];
    }

    private function rentangTanggal(string $periode): array
    {
        return match ($periode) {
            'minggu-ini' => [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()],
            'bulan-ini' => [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()],
            'bulan-lalu' => [now()->subMonth()->startOfMonth()->toDateString(), now()->subMonth()->endOfMonth()->toDateString()],
            default => [now()->toDateString(), now()->toDateString()], // hari-ini
        };
    }
}
