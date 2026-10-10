<?php

namespace App\Http\Controllers;

use App\Models\Obat;
use App\Models\PenerimaanItem;
use App\Models\PenjualanItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DaftarStokObatController extends Controller
{
    /**
     * GET /api/daftar-stok-obat
     * 
     * Query:
     *   dari_tanggal=YYYY-MM-DD
     *   sampai_tanggal=YYYY-MM-DD
     *   search=nama_obat
     */
    public function index(Request $r)
    {
        $dariTanggal = $r->filled('dari_tanggal') ? $r->dari_tanggal : now()->startOfMonth()->toDateString();
        $sampaiTanggal = $r->filled('sampai_tanggal') ? $r->sampai_tanggal : now()->toDateString();
        $search = $r->filled('search') ? trim($r->search) : '';

        // 1. Ambil seluruh data obat aktif
        $obatQuery = Obat::with(['satuan']);
        if ($search !== '') {
            $obatQuery->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('kode', 'like', "%{$search}%");
            });
        }
        $daftarObat = $obatQuery->orderBy('nama')->get();

        if ($daftarObat->isEmpty()) {
            return response()->json([
                'dari_tanggal' => $dariTanggal,
                'sampai_tanggal' => $sampaiTanggal,
                'total_item' => 0,
                'data' => [],
            ]);
        }

        $obatIds = $daftarObat->pluck('id')->toArray();

        // 2. Ambil seluruh penerimaan obat dalam rentang tanggal
        $penerimaanItems = PenerimaanItem::with('penerimaan')
            ->whereIn('obat_id', $obatIds)
            ->whereHas('penerimaan', function ($q) use ($dariTanggal, $sampaiTanggal) {
                $q->whereBetween('tanggal_terima', [$dariTanggal, $sampaiTanggal]);
            })
            ->get();

        // Group rincian masuk per obat_id
        $masukPerObat = [];
        foreach ($penerimaanItems as $pi) {
            $pen = $pi->penerimaan;
            if (!$pen) continue;

            $isiKemasan = isset($pi->kemasan) && $pi->kemasan > 0
                ? (float) $pi->kemasan
                : (float) ($pi->faktor ?: 1);
            $qtyDasar = (int) round($pi->qty * $isiKemasan);

            $masukPerObat[$pi->obat_id][] = [
                'penerimaan_id' => $pen->id,
                'tanggal_terima' => $pen->tanggal_terima ? \Carbon\Carbon::parse($pen->tanggal_terima)->format('Y-m-d') : '-',
                'tgl_faktur' => $pen->tanggal_terima ? \Carbon\Carbon::parse($pen->tanggal_terima)->format('Y-m-d') : '-',
                'nama_pbf' => $pen->nama_supplier ?: '-',
                'no_faktur' => $pen->no_faktur ?: '-',
                'qty' => (float) $pi->qty,
                'qty_dasar' => $qtyDasar,
                'nama_satuan' => $pi->nama_satuan ?: 'Unit',
                'kemasan' => $isiKemasan,
                'harga_beli' => (float) $pi->harga_beli,
                'diskon' => (float) ($pi->diskon ?: 0),
                'nomor_batch' => $pi->nomor_batch ?: '-',
                'tanggal_exp' => $pi->tanggal_exp ? \Carbon\Carbon::parse($pi->tanggal_exp)->format('Y-m-d') : '-',
                'subtotal' => (float) $pi->subtotal,
            ];
        }

        // 3. Ambil seluruh penjualan obat dalam rentang tanggal (status lunas / selesai)
        $penjualanItems = PenjualanItem::with('penjualan')
            ->whereIn('obat_id', $obatIds)
            ->whereHas('penjualan', function ($q) use ($dariTanggal, $sampaiTanggal) {
                $q->whereIn('status', ['lunas', 'selesai'])
                  ->whereBetween('tanggal', [$dariTanggal, $sampaiTanggal]);
            })
            ->get();

        // Group rincian keluar per obat_id
        $keluarPerObat = [];
        foreach ($penjualanItems as $pji) {
            $penj = $pji->penjualan;
            if (!$penj) continue;

            $faktor = (float) ($pji->faktor ?: 1);
            $qtyDasar = (int) round($pji->qty * $faktor);

            $keluarPerObat[$pji->obat_id][] = [
                'penjualan_id' => $penj->id,
                'tanggal' => $penj->tanggal ? \Carbon\Carbon::parse($penj->tanggal)->format('Y-m-d') : ($penj->created_at ? $penj->created_at->format('Y-m-d') : '-'),
                'jam' => $penj->created_at ? $penj->created_at->format('H:i') : '-',
                'no_struk' => $penj->no_struk ?: '-',
                'sumber' => $penj->sumber ?: 'kasir',
                'nama_kasir' => $penj->nama_kasir ?: 'Kasir',
                'nama_pembeli' => $penj->nama_pembeli ?: '-',
                'qty' => (float) $pji->qty,
                'qty_dasar' => $qtyDasar,
                'nama_satuan' => $pji->nama_satuan ?: 'Unit',
                'harga_jual' => (float) $pji->harga_jual,
                'subtotal' => (float) $pji->subtotal,
            ];
        }

        // 4. Ambil data penerimaan terakhir untuk setiap obat (faktur terakhir, tgl faktur, batch, exp)
        $penerimaanTerakhir = PenerimaanItem::with('penerimaan')
            ->whereIn('obat_id', $obatIds)
            ->whereNotNull('penerimaan_id')
            ->orderByDesc('id')
            ->get()
            ->groupBy('obat_id')
            ->map(function ($items) {
                return $items->first();
            });

        // 5. Susun hasil akhir sesuai format kolom Excel
        $hasil = [];
        $no = 1;

        foreach ($daftarObat as $obat) {
            $rincianMasuk = $masukPerObat[$obat->id] ?? [];
            $rincianKeluar = $keluarPerObat[$obat->id] ?? [];

            // Hitung total masuk & keluar dalam satuan dasar
            $totalMasukDasar = 0;
            foreach ($rincianMasuk as $rm) {
                $totalMasukDasar += $rm['qty_dasar'];
            }

            $totalKeluarDasar = 0;
            foreach ($rincianKeluar as $rk) {
                $totalKeluarDasar += $rk['qty_dasar'];
            }

            // Penerimaan terakhir
            $trxTerakhir = $penerimaanTerakhir[$obat->id] ?? null;
            $noFaktur = $trxTerakhir && $trxTerakhir->penerimaan ? $trxTerakhir->penerimaan->no_faktur : '-';
            $tglFaktur = $trxTerakhir && $trxTerakhir->penerimaan && $trxTerakhir->penerimaan->tanggal_terima
                ? \Carbon\Carbon::parse($trxTerakhir->penerimaan->tanggal_terima)->format('Y-m-d')
                : '-';

            $batchTerakhir = ($trxTerakhir && $trxTerakhir->nomor_batch)
                ? $trxTerakhir->nomor_batch
                : ($obat->nomor_batch ?: '-');

            $expTerakhir = ($trxTerakhir && $trxTerakhir->tanggal_exp)
                ? \Carbon\Carbon::parse($trxTerakhir->tanggal_exp)->format('Y-m-d')
                : ($obat->tanggal_exp ? \Carbon\Carbon::parse($obat->tanggal_exp)->format('Y-m-d') : '-');

            // Format deskripsi kemasan
            $satuanUtama = $obat->satuan->first();
            $namaKemasan = $satuanUtama ? $satuanUtama->nama_satuan : ($obat->satuan_dasar ?: 'Unit');

            // Hitung stok
            $sisaAktual = (int) ($obat->stok ?? 0);
            $stokAwal = max($sisaAktual - $totalMasukDasar + $totalKeluarDasar, 0);
            $jml = $stokAwal + $totalMasukDasar;
            $sisa = $jml - $totalKeluarDasar;

            $hasil[] = [
                'no' => $no++,
                'id' => $obat->id,
                'nama' => $obat->nama,
                'kode' => $obat->kode,
                'no_faktur' => $noFaktur,
                'tgl_faktur' => $tglFaktur,
                'batch' => $batchTerakhir,
                'kemasan' => $namaKemasan,
                'satuan_dasar' => $obat->satuan_dasar ?: 'Unit',
                'stok' => $stokAwal,
                'masuk' => $totalMasukDasar,
                'jml' => $jml,
                'keluar' => $totalKeluarDasar,
                'sisa' => $sisa,
                'ekp' => $expTerakhir,
                'harga_beli' => $satuanUtama ? (float) $satuanUtama->harga_beli : 0,
                'harga_jual' => $satuanUtama ? (float) $satuanUtama->harga_jual : 0,
                'rincian_masuk' => $rincianMasuk,
                'rincian_keluar' => $rincianKeluar,
            ];
        }

        return response()->json([
            'dari_tanggal' => $dariTanggal,
            'sampai_tanggal' => $sampaiTanggal,
            'total_item' => count($hasil),
            'data' => $hasil,
        ]);
    }
}
