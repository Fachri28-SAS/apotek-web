<?php

namespace App\Http\Controllers;

use App\Models\ObatBatch;
use App\Models\ObatSatuan;
use App\Models\Penerimaan;
use App\Services\StokService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PenerimaanController extends Controller
{
    /**
     * POST /api/penerimaan
     *
     * Body:
     * {
     *   "supplier_id": 1, "nama_supplier": "PT Kimia Farma Trading",
     *   "no_faktur": "KF-2026-0088",
     *   "tanggal_terima": "2026-08-29",
     *   "tanggal_jatuh_tempo": "2026-09-29",
     *   "tempo_label": "1_bulan",
     *   "is_pkp": true,
     *   "diskon_faktur_rp": 0,
     *   "diskon_faktur_persen": 2,
     *   "items": [
     *     {
     *       "obat_id": 1, "obat_satuan_id": 3, "qty": 5,
     *       "harga_beli": 46000, "diskon": 0,
     *       "nomor_batch": "PCM-0230", "tanggal_exp": "2028-01-01"
     *     }
     *   ]
     * }
     */
    public function store(Request $r, StokService $stok)
    {
        $data = $r->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'nama_supplier' => 'required|string|max:255',
            'no_faktur' => 'required|string|max:60',
            'tanggal_terima' => 'required|date',
            'tanggal_jatuh_tempo' => 'nullable|date',
            'tempo_label' => 'nullable|in:1_bulan,2_bulan,3_bulan,6_bulan,1_tahun,custom',
            'is_pkp' => 'boolean',
            'diskon_faktur_rp' => 'nullable|numeric|min:0',
            'diskon_faktur_persen' => 'nullable|numeric|min:0|max:100',
            'items' => 'required|array|min:1',
            'items.*.obat_id' => 'required|exists:obat,id',
            'items.*.obat_satuan_id' => 'required|exists:obat_satuan,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.harga_beli' => 'required|numeric|min:0',
            'items.*.diskon' => 'nullable|numeric|min:0',
            'items.*.nomor_batch' => 'nullable|string|max:50',
            'items.*.tanggal_exp' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($data, $r, $stok) {
            $subtotal = 0;
            $itemsSiap = [];

            foreach ($data['items'] as $it) {
                $satuan = ObatSatuan::with('obat')->findOrFail($it['obat_satuan_id']);
                $obat = $satuan->obat;
                $diskonItem = $it['diskon'] ?? 0;
                $subtotalItem = $it['qty'] * $it['harga_beli'] - $diskonItem;
                $subtotal += $subtotalItem;

                // Harga sebelumnya = harga yang TERSIMPAN SEKARANG di obat_satuan,
                // sebelum ditimpa dengan harga baru dari faktur ini. Ini yang
                // jadi dasar badge "Naik/Turun/Tetap" di frontend.
                $hargaBeliSebelumnya = $satuan->harga_beli;
                $hargaJualSaatIni = $satuan->harga_jual;
                $marginPersen = $hargaJualSaatIni > 0
                    ? round((($hargaJualSaatIni - $it['harga_beli']) / $hargaJualSaatIni) * 100, 2)
                    : null;

                $itemsSiap[] = [
                    'obat_id' => $obat->id,
                    'obat_satuan_id' => $satuan->id,
                    'nama_obat' => $obat->nama,
                    'nama_satuan' => $satuan->nama_satuan,
                    'faktor' => $satuan->faktor,
                    'qty' => $it['qty'],
                    'harga_beli' => $it['harga_beli'],
                    'diskon' => $diskonItem,
                    'subtotal' => $subtotalItem,
                    'nomor_batch' => $it['nomor_batch'] ?? null,
                    'tanggal_exp' => $it['tanggal_exp'] ?? null,
                    'harga_beli_sebelumnya' => $hargaBeliSebelumnya,
                    'harga_jual_saat_itu' => $hargaJualSaatIni,
                    'margin_persen' => $marginPersen,
                ];
            }

            $diskonRp = $data['diskon_faktur_rp'] ?? 0;
            $diskonPersen = $data['diskon_faktur_persen'] ?? 0;
            $diskonTotal = $diskonRp + round($subtotal * $diskonPersen / 100);
            $subtotalSetelahDiskon = max($subtotal - $diskonTotal, 0);

            $isPkp = $data['is_pkp'] ?? false;
            $persenPpn = 11;
            $ppn = $isPkp ? round($subtotalSetelahDiskon * $persenPpn / 100) : 0;
            $total = $subtotalSetelahDiskon + $ppn;

            $penerimaan = \App\Models\Penerimaan::create([
                'supplier_id' => $data['supplier_id'] ?? null,
                'nama_supplier' => $data['nama_supplier'],
                'no_faktur' => $data['no_faktur'],
                'tanggal_terima' => $data['tanggal_terima'],
                'tanggal_jatuh_tempo' => $data['tanggal_jatuh_tempo'] ?? null,
                'tempo_label' => $data['tempo_label'] ?? 'custom',
                'is_pkp' => $isPkp,
                'persen_ppn' => $persenPpn,
                'subtotal' => $subtotal,
                'diskon_faktur_rp' => $diskonRp,
                'diskon_faktur_persen' => $diskonPersen,
                'subtotal_setelah_diskon' => $subtotalSetelahDiskon,
                'dpp' => $subtotalSetelahDiskon,
                'ppn' => $ppn,
                'total' => $total,
                'status_bayar' => 'belum',
                'user_id' => $r->user()->id,
            ]);

            foreach ($itemsSiap as $item) {
                $penerimaan->items()->create($item);

                // 1. Stok bertambah lewat StokService (tercatat di stok_mutasi)
                $stok->ubah(
                    $item['obat_id'],
                    $item['qty'] * $item['faktor'],
                    'masuk',
                    'penerimaan',
                    $penerimaan->id
                );

                // 2. Harga beli & jual di obat_satuan ikut update ke nilai terbaru.
                //    harga_beli_sebelumnya (variabel $item['harga_beli_sebelumnya']
                //    sudah dihitung di atas) ikut disimpan — ini sumber badge
                //    naik/turun di Data Obat.
                ObatSatuan::where('id', $item['obat_satuan_id'])->update([
                    'harga_beli' => $item['harga_beli'],
                    'harga_beli_sebelumnya' => $item['harga_beli_sebelumnya'],
                ]);

                // 3. Nomor batch & tanggal exp di Data Obat ikut update (skema kita
                //    simplifikasi cuma simpan batch AKTIF/TERBARU di tabel obat)
                if ($item['nomor_batch']) {
                    \App\Models\Obat::where('id', $item['obat_id'])->update([
                        'nomor_batch' => $item['nomor_batch'],
                        'tanggal_exp' => $item['tanggal_exp'],
                    ]);

                    // 4. Catat juga di obat_batch — supaya jadi pilihan dropdown
                    //    "Batch" di penerimaan berikutnya (histori batch obat ini)
                    ObatBatch::updateOrCreate(
                        ['obat_id' => $item['obat_id'], 'nomor_batch' => $item['nomor_batch']],
                        [
                            'tanggal_exp' => $item['tanggal_exp'],
                            'qty_masuk' => $item['qty'] * $item['faktor'],
                            'tanggal_masuk' => $data['tanggal_terima'],
                        ]
                    );
                }
            }

            return response()->json($penerimaan->load('items'), 201);
        });
    }

    /** GET /api/penerimaan — untuk halaman Riwayat Penerimaan */
    public function index(Request $r)
    {
        $q = Penerimaan::query();

        match ($r->periode) {
            'hari-ini' => $q->whereDate('tanggal_terima', now()->toDateString()),
            'minggu-ini' => $q->whereBetween('tanggal_terima', [now()->startOfWeek(), now()->endOfWeek()]),
            'bulan-ini' => $q->whereMonth('tanggal_terima', now()->month)->whereYear('tanggal_terima', now()->year),
            'bulan-lalu' => $q->whereMonth('tanggal_terima', now()->subMonth()->month)
                              ->whereYear('tanggal_terima', now()->subMonth()->year),
            default => null,
        };

        return $q->withCount('items')->orderByDesc('id')->limit(200)->get();
    }

    /** GET /api/penerimaan/{id} — detail lengkap untuk modal Riwayat */
    public function show(Penerimaan $penerimaan)
    {
        return $penerimaan->load('items');
    }
}
