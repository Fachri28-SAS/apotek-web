<?php

namespace App\Http\Controllers;

use App\Models\ObatSatuan;
use App\Models\Penjualan;
use App\Services\StokService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PenjualanController extends Controller
{
    /**
     * POST /api/penjualan
     *
     * Body:
     * {
     *   "nama_pembeli": "Bu Siti" (opsional),
     *   "no_invoice": null (opsional, kosong = dibuat otomatis),
     *   "catatan": "" (opsional),
     *   "diskon": 0,
     *   "metode_bayar": "tunai" | "qris" | "transfer",
     *   "uang_diterima": 50000 (wajib kalau tunai),
     *   "items": [
     *     {
     *       "obat_id": 1, "obat_satuan_id": 2, "qty": 2,
     *       "harga_asli": 8000,   <- harga di database saat item ditambah ke keranjang
     *       "harga_jual": 8000,   <- harga final (beda dari harga_asli kalau kasir edit manual)
     *       "tuslah": 0
     *     }
     *   ]
     * }
     */
    public function store(Request $r, StokService $stok)
    {
        $data = $r->validate([
            'nama_pembeli' => 'nullable|string|max:255',
            'no_invoice' => 'nullable|string|max:50',
            'catatan' => 'nullable|string',
            'diskon' => 'nullable|numeric|min:0',
            'metode_bayar' => 'required|in:tunai,qris,transfer',
            'uang_diterima' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.obat_id' => 'required|exists:obat,id',
            'items.*.obat_satuan_id' => 'required|exists:obat_satuan,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.harga_asli' => 'required|numeric|min:0',
            'items.*.harga_jual' => 'required|numeric|min:0',
            'items.*.tuslah' => 'nullable|numeric|min:0',
            'items.*.diskon' => 'nullable|numeric|min:0',
        ]);

        if ($data['metode_bayar'] === 'tunai' && !isset($data['uang_diterima'])) {
            return response()->json([
                'message' => 'Uang diterima wajib diisi untuk metode Tunai.',
                'errors' => ['uang_diterima' => ['Wajib diisi untuk metode Tunai.']],
            ], 422);
        }

        return DB::transaction(function () use ($data, $r, $stok) {
            $subtotalBarang = 0;
            $totalTuslah = 0;
            $totalDiskonItem = 0;
            $itemsSiap = [];

            foreach ($data['items'] as $it) {
                $satuan = ObatSatuan::with('obat')->findOrFail($it['obat_satuan_id']);
                $obat = $satuan->obat;
                $tuslah = $it['tuslah'] ?? 0;
                $diskonItem = $it['diskon'] ?? 0;

                $subtotalBarang += $it['qty'] * $it['harga_jual'];
                $totalTuslah += $tuslah;
                $totalDiskonItem += $diskonItem;

                $itemSubtotal = max(($it['qty'] * $it['harga_jual'] + $tuslah) - $diskonItem, 0);

                $itemsSiap[] = [
                    'obat_id' => $obat->id,
                    'obat_satuan_id' => $satuan->id,
                    'nama_obat' => $obat->nama,
                    'nama_satuan' => $satuan->nama_satuan,
                    'nomor_batch' => $obat->nomor_batch,
                    'faktor' => $satuan->faktor,
                    'qty' => $it['qty'],
                    'harga_beli' => $satuan->harga_beli ?? 0,
                    'harga_asli' => $it['harga_asli'],
                    'harga_jual' => $it['harga_jual'],
                    'tuslah' => $tuslah,
                    'diskon' => $diskonItem,
                    'subtotal' => $itemSubtotal,
                ];
            }

            $diskonTransaksi = $data['diskon'] ?? 0;
            $totalDiskon = $totalDiskonItem + $diskonTransaksi;
            $total = max(($subtotalBarang + $totalTuslah) - $totalDiskon, 0);
            $kembalian = $data['metode_bayar'] === 'tunai'
                ? max(($data['uang_diterima'] ?? 0) - $total, 0)
                : 0;

            $penjualan = Penjualan::create([
                'no_struk' => 'SEMENTARA-' . uniqid(), // diganti sebentar lagi, cuma biar unique constraint tidak bentrok
                'no_invoice' => $data['no_invoice'] ?? null,
                'user_id' => $r->user()->id,
                'nama_kasir' => $r->user()->nama,
                'nama_pembeli' => $data['nama_pembeli'] ?? null,
                'catatan' => $data['catatan'] ?? null,
                'subtotal' => $subtotalBarang,
                'total_tuslah' => $totalTuslah,
                'diskon' => $totalDiskon,
                'total' => $total,
                'metode_bayar' => $data['metode_bayar'],
                'uang_diterima' => $data['uang_diterima'] ?? null,
                'kembalian' => $kembalian,
                'sumber' => 'kasir',
                'status' => 'lunas',
                'tanggal' => now()->toDateString(),
            ]);

            // No. struk final pakai ID biar unik & gampang ditelusuri urutannya
            $noStruk = 'BF-' . now()->format('Ymd') . '-' . str_pad($penjualan->id, 5, '0', STR_PAD_LEFT);
            $penjualan->update([
                'no_struk' => $noStruk,
                'no_invoice' => $penjualan->no_invoice ?: $noStruk,
            ]);

            foreach ($itemsSiap as $item) {
                $penjualan->items()->create($item);

                // Stok berkurang sesuai qty x faktor satuan.
                // Lewat StokService supaya tercatat di stok_mutasi & aman
                // dari 2 kasir menjual barang terakhir bersamaan.
                $stok->ubah(
                    $item['obat_id'],
                    -($item['qty'] * $item['faktor']),
                    'keluar',
                    'penjualan',
                    $penjualan->id
                );
            }

            return response()->json($penjualan->load('items'), 201);
        });
    }

    /** GET /api/penjualan — dipakai halaman Riwayat Penjualan nanti */
    public function index(Request $r)
    {
        // Cuma yang sudah lunas atau selesai — pesanan online yang masih 'pending'/'batal'
        // tidak dianggap "riwayat penjualan", karena belum benar-benar terjual.
        $q = Penjualan::whereIn('status', ['lunas', 'selesai']);

        if ($r->filled('sumber') && $r->sumber !== 'semua') {
            $q->where('sumber', $r->sumber); // 'kasir' atau 'online'
        }

        if ($r->filled('kasir_id')) {
            $q->where('user_id', $r->kasir_id);
        }

        match ($r->periode) {
            'hari-ini' => $q->whereDate('tanggal', now()->toDateString()),
            'minggu-ini' => $q->whereBetween('tanggal', [now()->startOfWeek(), now()->endOfWeek()]),
            'bulan-ini' => $q->whereMonth('tanggal', now()->month)->whereYear('tanggal', now()->year),
            'bulan-lalu' => $q->whereMonth('tanggal', now()->subMonth()->month)->whereYear('tanggal', now()->subMonth()->year),
            default => null,
        };

        return $q->withCount('items')->orderByDesc('id')->limit(200)->get();
    }

    /** GET /api/penjualan/{id} — buka ulang struk dari Riwayat */
    public function show(Penjualan $penjualan)
    {
        return $penjualan->load('items');
    }
}
