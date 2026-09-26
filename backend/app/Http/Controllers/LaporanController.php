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
        if ($r->filled('dari_tanggal') && $r->filled('sampai_tanggal')) {
            $mulai = $r->dari_tanggal;
            $selesai = $r->sampai_tanggal;
            $periode = 'custom';
        } elseif ($r->filled('dari') && $r->filled('sampai')) {
            $mulai = $r->dari;
            $selesai = $r->sampai;
            $periode = 'custom';
        } else {
            $periode = $r->periode ?: 'hari-ini';
            [$mulai, $selesai] = $this->rentangTanggal($periode);
        }

        $hariIni = now()->toDateString();
        $tujuhHariLalu = now()->subDays(6)->toDateString();
        $batasExp = now()->addDays(90)->toDateString();

        $queryPeriode = Penjualan::whereIn('status', ['lunas', 'selesai'])->whereBetween('tanggal', [$mulai, $selesai]);

        // --- KPI mengikuti periode yang dipilih ---
        $totalPenjualan = (float) (clone $queryPeriode)->sum('total');
        $jumlahTransaksi = (clone $queryPeriode)->count();
        $rataRata = $jumlahTransaksi > 0 ? $totalPenjualan / $jumlahTransaksi : 0;

        // --- Hitung Total Modal (HPP) & Total Pendapatan (Laba) ---
        $penjualanIds = (clone $queryPeriode)->pluck('id');
        $totalModal = (float) (DB::table('penjualan_item')
            ->leftJoin('obat_satuan', 'penjualan_item.obat_satuan_id', '=', 'obat_satuan.id')
            ->whereIn('penjualan_item.penjualan_id', $penjualanIds)
            ->selectRaw('SUM(COALESCE(penjualan_item.harga_beli, obat_satuan.harga_beli, 0) * penjualan_item.qty) as modal')
            ->value('modal') ?? 0);

        $totalPendapatan = (float) ($totalPenjualan - $totalModal);
        $marginPersen = $totalModal > 0 ? round(($totalPendapatan / $totalModal) * 100, 1) : 0;

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
            ->whereIn('status', ['lunas', 'selesai'])
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

        // --- Tabel transaksi ikut periode yang dipilih beserta laba per transaksi ---
        $transaksi = (clone $queryPeriode)
            ->with(['items' => function ($q) {
                $q->select('id', 'penjualan_id', 'obat_satuan_id', 'qty', 'harga_beli', 'subtotal');
            }])
            ->orderByDesc('id')
            ->limit(2000)
            ->get(['id', 'no_struk', 'nama_kasir', 'nama_pembeli', 'subtotal',
                    'diskon', 'total', 'metode_bayar', 'sumber', 'created_at'])
            ->map(function ($t) {
                $modalTrx = (float) $t->items->sum(function ($item) {
                    return ($item->harga_beli ?? 0) * $item->qty;
                });
                $labaTrx = (float) ($t->total - $modalTrx);
                $marginTrx = $modalTrx > 0 ? round(($labaTrx / $modalTrx) * 100, 1) : 0;

                return [
                    'id' => $t->id,
                    'no_struk' => $t->no_struk,
                    'nama_kasir' => $t->nama_kasir,
                    'nama_pembeli' => $t->nama_pembeli,
                    'items_count' => $t->items->count(),
                    'subtotal' => (float) $t->subtotal,
                    'diskon' => (float) $t->diskon,
                    'total' => (float) $t->total,
                    'total_modal' => $modalTrx,
                    'total_pendapatan' => $labaTrx,
                    'margin_persen' => $marginTrx,
                    'metode_bayar' => $t->metode_bayar,
                    'sumber' => $t->sumber,
                    'created_at' => $t->created_at,
                ];
            });

        return [
            'periode' => $periode,
            'kpi' => [
                'total_penjualan' => (float) $totalPenjualan,
                'total_modal' => (float) $totalModal,
                'total_pendapatan' => (float) $totalPendapatan,
                'margin_persen' => (float) $marginPersen,
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
