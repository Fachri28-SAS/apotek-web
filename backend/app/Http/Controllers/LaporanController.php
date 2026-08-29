<?php

namespace App\Http\Controllers;

use App\Models\Penjualan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LaporanController extends Controller
{
    /**
     * GET /api/laporan
     * Query params:
     * - periode: 'hari-ini' | 'kemarin' | '7-hari' | 'bulan-ini' | 'bulan-lalu' | 'tahun-ini' | 'custom'
     * - dari_tanggal: 'YYYY-MM-DD' (jika custom)
     * - sampai_tanggal: 'YYYY-MM-DD' (jika custom)
     * - kasir_id: ID user kasir (opsional)
     */
    public function index(Request $r)
    {
        $query = Penjualan::where('status', 'lunas');

        // Filter Kasir
        if ($r->filled('kasir_id')) {
            $query->where('user_id', $r->kasir_id);
        }

        // Filter Rentang Tanggal / Periode
        $periode = $r->get('periode', 'bulan-ini');
        $labelPeriode = "Bulan Ini";

        switch ($periode) {
            case 'hari-ini':
                $query->whereDate('tanggal', now()->toDateString());
                $labelPeriode = "Hari Ini (" . now()->translatedFormat('d M Y') . ")";
                break;
            case 'kemarin':
                $kemarin = now()->subDay()->toDateString();
                $query->whereDate('tanggal', $kemarin);
                $labelPeriode = "Kemarin (" . now()->subDay()->translatedFormat('d M Y') . ")";
                break;
            case '7-hari':
                $query->whereBetween('tanggal', [now()->subDays(6)->toDateString(), now()->toDateString()]);
                $labelPeriode = "7 Hari Terakhir";
                break;
            case 'bulan-ini':
                $query->whereMonth('tanggal', now()->month)
                      ->whereYear('tanggal', now()->year);
                $labelPeriode = now()->translatedFormat('F Y');
                break;
            case 'bulan-lalu':
                $bulanLalu = now()->subMonth();
                $query->whereMonth('tanggal', $bulanLalu->month)
                      ->whereYear('tanggal', $bulanLalu->year);
                $labelPeriode = $bulanLalu->translatedFormat('F Y');
                break;
            case 'tahun-ini':
                $query->whereYear('tanggal', now()->year);
                $labelPeriode = "Tahun " . now()->year;
                break;
            case 'custom':
                if ($r->filled('dari_tanggal') && $r->filled('sampai_tanggal')) {
                    $query->whereBetween('tanggal', [$r->dari_tanggal, $r->sampai_tanggal]);
                    $labelPeriode = date('d/m/Y', strtotime($r->dari_tanggal)) . " - " . date('d/m/Y', strtotime($r->sampai_tanggal));
                }
                break;
            default:
                break;
        }

        // Clone query untuk sub-kalkulasi
        $penjualanIds = (clone $query)->pluck('id');

        // 1. Ringkasan Finansial Utama
        $ringkasan = (clone $query)->selectRaw('
            COALESCE(SUM(total), 0) as total_omzet,
            COALESCE(SUM(subtotal), 0) as total_subtotal,
            COALESCE(SUM(diskon), 0) as total_diskon,
            COALESCE(SUM(total_tuslah), 0) as total_tuslah,
            COUNT(id) as total_transaksi
        ')->first();

        // 2. Hitung HPP (Modal Pokok), Total Item, dan Laba Kotor
        $itemStats = DB::table('penjualan_item')
            ->leftJoin('obat_satuan', 'penjualan_item.obat_satuan_id', '=', 'obat_satuan.id')
            ->whereIn('penjualan_item.penjualan_id', $penjualanIds)
            ->selectRaw('
                COALESCE(SUM(penjualan_item.qty), 0) as total_item_terjual,
                COALESCE(SUM(penjualan_item.qty * COALESCE(obat_satuan.harga_beli, 0)), 0) as total_hpp
            ')->first();

        $totalOmzet = (float) ($ringkasan->total_omzet ?? 0);
        $totalHpp = (float) ($itemStats->total_hpp ?? 0);
        $labaKotor = max($totalOmzet - $totalHpp, 0);
        $marginPct = $totalOmzet > 0 ? round(($labaKotor / $totalOmzet) * 100, 1) : 0;
        $totalTransaksi = (int) ($ringkasan->total_transaksi ?? 0);
        $rataTransaksi = $totalTransaksi > 0 ? round($totalOmzet / $totalTransaksi, 0) : 0;

        // 3. Breakdown Metode Pembayaran
        $metodeBayar = (clone $query)
            ->select('metode_bayar', DB::raw('COUNT(id) as jumlah'), DB::raw('SUM(total) as total'))
            ->groupBy('metode_bayar')
            ->get()
            ->map(function ($m) use ($totalOmzet) {
                return [
                    'metode' => $m->metode_bayar,
                    'jumlah_transaksi' => (int) $m->jumlah,
                    'total' => (float) $m->total,
                    'persentase' => $totalOmzet > 0 ? round(($m->total / $totalOmzet) * 100, 1) : 0,
                ];
            });

        // 4. Top 10 Obat Terlaris
        $topObat = DB::table('penjualan_item')
            ->leftJoin('obat_satuan', 'penjualan_item.obat_satuan_id', '=', 'obat_satuan.id')
            ->whereIn('penjualan_item.penjualan_id', $penjualanIds)
            ->select(
                'penjualan_item.nama_obat',
                'penjualan_item.nama_satuan',
                DB::raw('SUM(penjualan_item.qty) as total_qty'),
                DB::raw('SUM(penjualan_item.subtotal) as total_omzet'),
                DB::raw('SUM(penjualan_item.subtotal - (penjualan_item.qty * COALESCE(obat_satuan.harga_beli, 0))) as estimasi_laba')
            )
            ->groupBy('penjualan_item.nama_obat', 'penjualan_item.nama_satuan')
            ->orderByDesc('total_qty')
            ->limit(10)
            ->get();

        // 5. Kinerja Kasir
        $kinerjaKasir = (clone $query)
            ->select('user_id', 'nama_kasir', DB::raw('COUNT(id) as total_transaksi'), DB::raw('SUM(total) as total_omzet'))
            ->groupBy('user_id', 'nama_kasir')
            ->orderByDesc('total_omzet')
            ->get();

        // 6. Transaksi Terbaru / Rincian
        $transaksi = (clone $query)
            ->withCount('items')
            ->orderByDesc('id')
            ->limit(100)
            ->get(['id', 'no_struk', 'tanggal', 'created_at', 'nama_kasir', 'nama_pembeli', 'metode_bayar', 'subtotal', 'diskon', 'total']);

        return response()->json([
            'label_periode' => $labelPeriode,
            'kpi' => [
                'total_omzet' => $totalOmzet,
                'total_hpp' => $totalHpp,
                'laba_kotor' => $labaKotor,
                'margin_persen' => $marginPct,
                'total_transaksi' => $totalTransaksi,
                'total_item_terjual' => (int) ($itemStats->total_item_terjual ?? 0),
                'rata_transaksi' => (float) $rataTransaksi,
                'total_diskon' => (float) ($ringkasan->total_diskon ?? 0),
            ],
            'metode_pembayaran' => $metodeBayar,
            'top_obat' => $topObat,
            'kinerja_kasir' => $kinerjaKasir,
            'transaksi' => $transaksi,
        ]);
    }
}
