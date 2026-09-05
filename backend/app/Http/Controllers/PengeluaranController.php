<?php

namespace App\Http\Controllers;

use App\Models\Penerimaan;
use App\Models\Pengeluaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PengeluaranController extends Controller
{
    /**
     * GET /api/pengeluaran
     * Mengambil daftar pengeluaran operasional dan rekap pembelian obat supplier.
     */
    public function index(Request $r)
    {
        $periode = $r->periode ?: 'hari-ini';
        [$mulai, $selesai] = $this->rentangTanggal($periode, $r->dari, $r->sampai);

        // 1. Query Pengeluaran Operasional
        $queryOperasional = Pengeluaran::whereBetween('tanggal', [$mulai, $selesai]);
        if ($r->kategori && $r->kategori !== 'semua') {
            $queryOperasional->where('kategori', $r->kategori);
        }

        $totalOperasional = (float) (clone $queryOperasional)->sum('nominal');
        $daftarOperasional = (clone $queryOperasional)
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->get();

        // 2. Query Pembelian Obat / Faktur Supplier (dari tabel penerimaan)
        $queryPenerimaan = Penerimaan::whereBetween('tanggal_terima', [$mulai, $selesai]);
        $totalPembelianSupplier = (float) (clone $queryPenerimaan)->sum('total');
        $fakturSupplier = (clone $queryPenerimaan)
            ->orderByDesc('tanggal_terima')
            ->orderByDesc('id')
            ->get(['id', 'nama_supplier', 'no_faktur', 'tanggal_terima', 'tanggal_jatuh_tempo', 'total', 'status_bayar']);

        // 3. Total Keseluruhan Pengeluaran
        $totalPengeluaran = $totalOperasional + $totalPembelianSupplier;

        // 4. Breakdown Kategori
        $kategoriSummary = (clone $queryOperasional)
            ->select('kategori', DB::raw('SUM(nominal) as total'), DB::raw('COUNT(*) as jumlah'))
            ->groupBy('kategori')
            ->get()
            ->keyBy('kategori');

        $breakdown = [];
        $daftarKategori = [
            'pembelian_obat' => ['label' => 'Pembelian Obat (Supplier)', 'total' => $totalPembelianSupplier, 'warna' => '#1A56B8'],
            'operasional' => ['label' => 'Operasional Harian', 'total' => (float) ($kategoriSummary['operasional']->total ?? 0), 'warna' => '#A64BC7'],
            'listrik_air' => ['label' => 'Listrik, Air & Internet', 'total' => (float) ($kategoriSummary['listrik_air']->total ?? 0), 'warna' => '#F59E0B'],
            'gaji' => ['label' => 'Gaji & Uang Makan', 'total' => (float) ($kategoriSummary['gaji']->total ?? 0), 'warna' => '#39A048'],
            'perlengkapan' => ['label' => 'ATK & Perlengkapan', 'total' => (float) ($kategoriSummary['perlengkapan']->total ?? 0), 'warna' => '#EC4899'],
            'sewa' => ['label' => 'Sewa & Gedung', 'total' => (float) ($kategoriSummary['sewa']->total ?? 0), 'warna' => '#6366F1'],
            'pemeliharaan' => ['label' => 'Perawatan & Kebersihan', 'total' => (float) ($kategoriSummary['pemeliharaan']->total ?? 0), 'warna' => '#14B8A6'],
            'lainnya' => ['label' => 'Lain-lain', 'total' => (float) ($kategoriSummary['lainnya']->total ?? 0), 'warna' => '#64748B'],
        ];

        foreach ($daftarKategori as $key => $item) {
            if ($item['total'] > 0) {
                $breakdown[] = [
                    'kategori' => $key,
                    'label' => $item['label'],
                    'total' => $item['total'],
                    'persen' => $totalPengeluaran > 0 ? round(($item['total'] / $totalPengeluaran) * 100, 1) : 0,
                    'warna' => $item['warna'],
                ];
            }
        }

        // Urutkan breakdown dari pengeluaran terbesar
        usort($breakdown, fn($a, $b) => $b['total'] <=> $a['total']);

        return response()->json([
            'periode' => $periode,
            'rentang' => ['mulai' => $mulai, 'selesai' => $selesai],
            'kpi' => [
                'total_pengeluaran' => $totalPengeluaran,
                'total_operasional' => $totalOperasional,
                'total_pembelian_obat' => $totalPembelianSupplier,
                'jumlah_catatan' => $daftarOperasional->count() + $fakturSupplier->count(),
            ],
            'breakdown' => $breakdown,
            'operasional' => $daftarOperasional,
            'penerimaan' => $fakturSupplier,
        ]);
    }

    /**
     * POST /api/pengeluaran
     * Menyimpan pengeluaran operasional baru.
     */
    public function store(Request $r)
    {
        $data = $r->validate([
            'tanggal' => 'required|date',
            'kategori' => 'required|string|in:operasional,listrik_air,gaji,perlengkapan,sewa,pemeliharaan,lainnya',
            'nama_pengeluaran' => 'required|string|max:255',
            'nominal' => 'required|numeric|min:1',
            'metode_bayar' => 'required|string|in:tunai,transfer,qris',
            'keterangan' => 'nullable|string|max:1000',
        ]);

        $user = $r->user();
        $data['user_id'] = $user ? $user->id : null;
        $data['nama_kasir'] = $user ? $user->nama : 'Kasir';

        $pengeluaran = Pengeluaran::create($data);

        return response()->json([
            'message' => 'Pengeluaran berhasil dicatat.',
            'data' => $pengeluaran,
        ], 201);
    }

    /**
     * DELETE /api/pengeluaran/{id}
     * Menghapus catatan pengeluaran operasional.
     */
    public function destroy($id)
    {
        $pengeluaran = Pengeluaran::findOrFail($id);
        $pengeluaran->delete();

        return response()->json([
            'message' => 'Catatan pengeluaran berhasil dihapus.',
        ]);
    }

    private function rentangTanggal(string $periode, ?string $dari = null, ?string $sampai = null): array
    {
        if ($periode === 'custom' && $dari && $sampai) {
            return [$dari, $sampai];
        }

        return match ($periode) {
            'minggu-ini' => [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()],
            'bulan-ini' => [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()],
            'bulan-lalu' => [now()->subMonth()->startOfMonth()->toDateString(), now()->subMonth()->endOfMonth()->toDateString()],
            default => [now()->toDateString(), now()->toDateString()], // hari-ini
        };
    }
}
