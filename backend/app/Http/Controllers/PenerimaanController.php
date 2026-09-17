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
            'items.*.qty' => 'required|numeric|min:0.01',
            'items.*.kemasan' => 'nullable|numeric|min:0.01',
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

                $hargaBeliSebelumnya = $satuan->harga_beli;
                $hargaJualBaru = isset($it['harga_jual_baru']) && $it['harga_jual_baru'] > 0
                    ? (float) $it['harga_jual_baru']
                    : (float) $satuan->harga_jual;
                $marginPersen = $hargaJualBaru > 0
                    ? round((($hargaJualBaru - $it['harga_beli']) / $hargaJualBaru) * 100, 2)
                    : null;

                $kemasan = isset($it['kemasan']) && $it['kemasan'] > 0
                    ? (float) $it['kemasan']
                    : ($it['qty'] * $satuan->faktor);

                $itemsSiap[] = [
                    'obat_id' => $obat->id,
                    'obat_satuan_id' => $satuan->id,
                    'nama_obat' => $obat->nama,
                    'nama_satuan' => $satuan->nama_satuan,
                    'faktor' => $satuan->faktor,
                    'qty' => $it['qty'],
                    'kemasan' => $kemasan,
                    'harga_beli' => $it['harga_beli'],
                    'diskon' => $diskonItem,
                    'subtotal' => $subtotalItem,
                    'nomor_batch' => $it['nomor_batch'] ?? null,
                    'tanggal_exp' => $it['tanggal_exp'] ?? null,
                    'harga_beli_sebelumnya' => $hargaBeliSebelumnya,
                    'harga_jual_saat_itu' => $hargaJualBaru,
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

                // Stok masuk dihitung dari kemasan (total unit dasar), fallback ke qty * faktor
                $stokMasuk = isset($item['kemasan']) && $item['kemasan'] > 0
                    ? (int) $item['kemasan']
                    : (int) ($item['qty'] * $item['faktor']);

                // 1. Stok bertambah lewat StokService (tercatat di stok_mutasi & menambah stok di Data Obat)
                $stok->ubah(
                    $item['obat_id'],
                    $stokMasuk,
                    'masuk',
                    'penerimaan',
                    $penerimaan->id
                );

                // 2. Harga beli satuan di Data Obat dihitung per unit stok yang masuk:
                // Misal: Terima 6 Box @ Rp100.000 (total Rp600.000), Kemasan masuk 60 Strip.
                // Maka harga beli di Data Obat otomatis Rp600.000 / 60 = Rp10.000 per Strip.
                $hargaBeliPerUnitMasuk = ($stokMasuk > 0 && $item['qty'] > 0)
                    ? round(($item['qty'] * $item['harga_beli']) / $stokMasuk)
                    : $item['harga_beli'];

                $updateSatuan = [
                    'harga_beli' => $hargaBeliPerUnitMasuk,
                    'harga_beli_sebelumnya' => $item['harga_beli_sebelumnya'],
                ];
                if (!empty($item['harga_jual_saat_itu']) && $item['harga_jual_saat_itu'] > 0) {
                    $updateSatuan['harga_jual'] = $item['harga_jual_saat_itu'];
                }

                ObatSatuan::where('id', $item['obat_satuan_id'])->update($updateSatuan);

                // 3. Nomor batch & tanggal exp di Data Obat ikut update
                if ($item['nomor_batch']) {
                    \App\Models\Obat::where('id', $item['obat_id'])->update([
                        'nomor_batch' => $item['nomor_batch'],
                        'tanggal_exp' => $item['tanggal_exp'],
                    ]);

                    // 4. Catat juga di obat_batch
                    ObatBatch::updateOrCreate(
                        ['obat_id' => $item['obat_id'], 'nomor_batch' => $item['nomor_batch']],
                        [
                            'tanggal_exp' => $item['tanggal_exp'],
                            'qty_masuk' => $stokMasuk,
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

        if ($r->filled('search')) {
            $search = trim($r->search);
            $q->where(function ($query) use ($search) {
                $query->where('no_faktur', 'like', "%{$search}%")
                    ->orWhere('nama_supplier', 'like', "%{$search}%")
                    ->orWhereHas('items', function ($itemQ) use ($search) {
                        $itemQ->where('nama_obat', 'like', "%{$search}%")
                            ->orWhere('nomor_batch', 'like', "%{$search}%");
                    });
            });
        }

        if ($r->filled('dari_tanggal') && $r->filled('sampai_tanggal')) {
            $q->whereBetween('tanggal_terima', [$r->dari_tanggal, $r->sampai_tanggal]);
        } elseif ($r->filled('dari_tanggal')) {
            $q->whereDate('tanggal_terima', '>=', $r->dari_tanggal);
        } elseif ($r->filled('sampai_tanggal')) {
            $q->whereDate('tanggal_terima', '<=', $r->sampai_tanggal);
        } elseif ($r->filled('periode')) {
            match ($r->periode) {
                'hari-ini' => $q->whereDate('tanggal_terima', now()->toDateString()),
                'minggu-ini' => $q->whereBetween('tanggal_terima', [now()->startOfWeek(), now()->endOfWeek()]),
                'bulan-ini' => $q->whereMonth('tanggal_terima', now()->month)->whereYear('tanggal_terima', now()->year),
                'bulan-lalu' => $q->whereMonth('tanggal_terima', now()->subMonth()->month)
                                  ->whereYear('tanggal_terima', now()->subMonth()->year),
                default => null,
            };
        }

        return $q->withCount('items')->with('items')->orderByDesc('tanggal_terima')->orderByDesc('id')->limit(1000)->get();
    }

    /** GET /api/penerimaan/{id} — detail lengkap untuk modal Riwayat */
    public function show(Penerimaan $penerimaan)
    {
        return $penerimaan->load('items');
    }

    /** PUT /api/penerimaan/{penerimaan}/toggle-bayar — tandai lunas atau belum lunas (seperti checklist buku register) */
    public function toggleBayar(Penerimaan $penerimaan)
    {
        $baru = $penerimaan->status_bayar === 'lunas' ? 'belum' : 'lunas';
        $penerimaan->update([
            'status_bayar' => $baru,
            'tanggal_bayar' => $baru === 'lunas' ? now()->toDateString() : null,
        ]);

        return response()->json([
            'message' => "Faktur {$penerimaan->no_faktur} ditandai " . ($baru === 'lunas' ? 'LUNAS (Sudah Dibayar)' : 'BELUM LUNAS'),
            'penerimaan' => $penerimaan->fresh()->load('items'),
        ]);
    }
}
