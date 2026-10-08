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

        $transaksi = (clone $queryPeriode)
            ->with(['items.obatSatuan'])
            ->orderByDesc('id')
            ->limit(2000)
            ->get(['id', 'no_struk', 'nama_kasir', 'nama_pembeli', 'subtotal',
                    'diskon', 'total', 'metode_bayar', 'sumber', 'created_at'])
            ->map(function ($t) {
                $trxModal = 0;
                $selisihSubtotal = 0;

                foreach ($t->items as $item) {
                    $satuan = $item->obatSatuan;
                    $hargaBeliItem = ($satuan && $satuan->harga_beli > 0)
                        ? (float) $satuan->harga_beli
                        : (float) ($item->harga_beli ?? 0);

                    $hargaJualItem = ($satuan && $satuan->harga_jual > 0)
                        ? (float) $satuan->harga_jual
                        : (float) ($item->harga_jual ?? 0);

                    $subtotalLama = (float) $item->subtotal;
                    $subtotalBaru = max(($item->qty * $hargaJualItem + ($item->tuslah ?? 0)) - ($item->diskon ?? 0), 0);
                    $selisihSubtotal += ($subtotalBaru - $subtotalLama);

                    $trxModal += ($hargaBeliItem * $item->qty);
                }

                $trxTotalJual = max((float) $t->total + $selisihSubtotal, 0);
                $labaTrx = (float) ($trxTotalJual - $trxModal);
                $marginTrx = $trxModal > 0 ? round(($labaTrx / $trxModal) * 100, 1) : 0;

                return [
                    'id' => $t->id,
                    'no_struk' => $t->no_struk,
                    'nama_kasir' => $t->nama_kasir,
                    'nama_pembeli' => $t->nama_pembeli,
                    'items_count' => $t->items->count(),
                    'subtotal' => max((float) $t->subtotal + $selisihSubtotal, 0),
                    'diskon' => (float) $t->diskon,
                    'total' => $trxTotalJual,
                    'total_modal' => $trxModal,
                    'total_pendapatan' => $labaTrx,
                    'margin_persen' => $marginTrx,
                    'metode_bayar' => $t->metode_bayar,
                    'sumber' => $t->sumber,
                    'created_at' => $t->created_at,
                ];
            });

        $totalPenjualan = (float) $transaksi->sum('total');
        $totalModal = (float) $transaksi->sum('total_modal');
        $totalPendapatan = (float) ($totalPenjualan - $totalModal);
        $marginPersen = $totalModal > 0 ? round(($totalPendapatan / $totalModal) * 100, 1) : 0;
        $jumlahTransaksi = $transaksi->count();
        $rataRata = $jumlahTransaksi > 0 ? round($totalPenjualan / $jumlahTransaksi) : 0;

        $metodeBreakdown = $transaksi
            ->groupBy('metode_bayar')
            ->map(function ($items, $metode) use ($jumlahTransaksi) {
                return [
                    'metode' => $metode,
                    'jumlah' => $items->count(),
                    'total' => (float) $items->sum('total'),
                    'persen' => $jumlahTransaksi > 0 ? round($items->count() / $jumlahTransaksi * 100) : 0,
                ];
            })
            ->values();

        // Tren 7 hari terakhir
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
