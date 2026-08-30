<?php

namespace App\Http\Controllers;

use App\Models\Obat;
use App\Models\ObatSatuan;
use App\Services\StokService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ObatController extends Controller
{
    /**
     * GET /api/obat
     * Dipakai oleh 3 tempat: Data Obat (semua field), Kasir (yang aktif_dijual
     * saja), Toko (yang aktif_dijual + tampil_online saja).
     *
     * Query params:
     *   ?search=parac        cari nama obat
     *   ?untuk=kasir          filter aktif_dijual=1
     *   ?untuk=toko           filter aktif_dijual=1 AND tampil_online=1
     *   ?limit=4              batasi jumlah (dipakai TokoPreview di Landing)
     */
    public function index(Request $r)
    {
        $q = Obat::with(['satuan', 'supplier'])->whereNull('deleted_at');

        if ($r->filled('search')) {
            $q->where('nama', 'like', '%' . $r->search . '%');
        }

        if ($r->filled('supplier_id')) {
            $q->where('supplier_id', $r->supplier_id);
        }

        if ($r->untuk === 'kasir') {
            $q->where('aktif_dijual', true);
        }
        if ($r->untuk === 'toko') {
            $q->where('aktif_dijual', true)->where('tampil_online', true);
        }

        $q->orderBy('nama');

        if ($r->filled('limit')) {
            $q->limit((int) $r->limit);
        }

        return $q->get();
    }

    public function show(Obat $obat)
    {
        return $obat->load(['satuan', 'batches', 'supplier']);
    }

    /**
     * POST /api/obat
     * Body:
     * {
     *   "nama": "Paracetamol 500mg",
     *   "kemasan": "Strip isi 10 tablet, Box isi 10 strip",
     *   "satuan_dasar": "Tablet",
     *   "stok_minimum": 200,
     *   "perlu_resep": false,
     *   "satuan": [
     *     {"nama_satuan":"Tablet","faktor":1,"harga_beli":500,"harga_jual":800,"is_default":true},
     *     {"nama_satuan":"Strip","faktor":10,"harga_beli":5000,"harga_jual":8000},
     *     {"nama_satuan":"Box","faktor":100,"harga_beli":45000,"harga_jual":75000}
     *   ]
     * }
     * Obat 1 satuan cukup kirim array `satuan` dengan 1 elemen, faktor:1.
     */
    public function store(Request $r)
    {
        $data = $r->validate([
            'kode' => 'nullable|string|max:50|unique:obat,kode',
            'nama' => 'required|string|max:255',
            'kemasan' => 'nullable|string',
            'satuan_dasar' => 'required|string|max:30',
            'stok' => 'nullable|integer|min:0',
            'stok_minimum' => 'required|integer|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'perlu_resep' => 'boolean',
            'aktif_dijual' => 'boolean',
            'tampil_online' => 'boolean',
            'satuan' => 'required|array|min:1',
            'satuan.*.nama_satuan' => 'required|string|max:30',
            'satuan.*.faktor' => 'required|integer|min:1',
            'satuan.*.harga_beli' => 'required|numeric|min:0',
            'satuan.*.harga_jual' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($data) {
            $obat = Obat::create([
                ...collect($data)->except('satuan')->toArray(),
                'stok' => $data['stok'] ?? 0,
            ]);

            foreach ($data['satuan'] as $i => $s) {
                $obat->satuan()->create([
                    ...$s,
                    'is_default' => $s['is_default'] ?? ($i === 0),
                    'urutan' => $i,
                    // Terkunci sekali di sini — harga waktu obat pertama
                    // kali didaftarkan, jadi acuan tren jangka panjang.
                    'harga_beli_awal' => $s['harga_beli'],
                ]);
            }

            return $obat->load('satuan');
        });
    }

    /**
     * Untuk varian satuan yang SUDAH ADA (kirim `id`), cuma harga yang
     * boleh diubah — faktor & nama_satuan sengaja tidak bisa diubah lewat
     * sini, karena kalau faktor berubah, konversi stok transaksi LAMA jadi
     * tidak konsisten. Kalau butuh satuan baru, kirim tanpa `id`.
     */
    public function update(Request $r, Obat $obat)
    {
        $data = $r->validate([
            'nama' => 'sometimes|string|max:255',
            'kemasan' => 'nullable|string',
            'nomor_batch' => 'nullable|string|max:50',
            'tanggal_exp' => 'nullable|date',
            'stok_minimum' => 'sometimes|integer|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'perlu_resep' => 'boolean',
            'aktif_dijual' => 'boolean',
            'tampil_online' => 'boolean',
            'satuan' => 'nullable|array',
        ]);

        $satuanInput = $data['satuan'] ?? null;
        unset($data['satuan']);

        $obat->update($data);

        foreach ($satuanInput ?? [] as $i => $s) {
            if (empty($s['nama_satuan'])) continue;

            // Dicocokkan berdasarkan NAMA satuan (dijamin unik per obat
            // oleh database), BUKAN berdasarkan `id` yang dikirim frontend.
            // Ini bikin proses ini kebal dari kasus id kosong/tidak
            // terkirim — tidak akan pernah salah bikin baris duplikat
            // untuk satuan yang sebenarnya sudah ada.
            $satuanLama = $obat->satuan()->where('nama_satuan', $s['nama_satuan'])->first();

            $updateData = [
                'harga_beli' => $s['harga_beli'] ?? 0,
                'harga_jual' => $s['harga_jual'] ?? 0,
            ];

            if ($satuanLama) {
                // Satuan SUDAH ADA — cuma harga yang boleh berubah.
                // Faktor sengaja tidak disentuh di sini (lihat catatan lama).
                $updateData['harga_beli_sebelumnya'] = $satuanLama->harga_beli;
                if (array_key_exists('harga_beli_awal', $s)) {
                    $updateData['harga_beli_awal'] = $s['harga_beli_awal'];
                }
            } else {
                // Satuan BENAR-BENAR BARU
                $updateData['faktor'] = $s['faktor'] ?? 1;
                $updateData['harga_beli_awal'] = $s['harga_beli'] ?? 0;
                $updateData['is_default'] = false;
                $updateData['urutan'] = 100 + $i;
            }

            $obat->satuan()->updateOrCreate(['nama_satuan' => $s['nama_satuan']], $updateData);
        }

        return $obat->load('satuan');
    }

    public function destroy(Obat $obat)
    {
        $obat->delete(); // soft delete, tidak hilang dari database
        return response()->noContent();
    }

    /**
     * GET /api/obat-sampah
     * Daftar obat yang sudah "dihapus" tapi masih ada di database
     * (soft delete). Bisa dipulihkan lagi dari sini.
     */
    public function sampah()
    {
        return Obat::onlyTrashed()->with('satuan')->orderByDesc('deleted_at')->get();
    }

    /**
     * POST /api/obat/{id}/pulihkan
     * Ambil kembali obat dari sampah. Pakai $id polos (bukan route-model-binding
     * otomatis) karena obat yang sudah di-soft-delete memang sengaja
     * disembunyikan dari binding biasa.
     */
    public function pulihkan($id)
    {
        $obat = Obat::onlyTrashed()->findOrFail($id);
        $obat->restore();
        return $obat->fresh()->load('satuan');
    }

    /**
     * DELETE /api/obat/{id}/permane
     * "Kosongkan sampah" — beneran hilang, TIDAK bisa dipulihkan lagi.
     */
    public function hapusPermanen($id)
    {
        $obat = Obat::onlyTrashed()->findOrFail($id);
        $obat->forceDelete();
        return response()->noContent();
    }

    /**
     * DELETE /api/obat/{obat}/satuan/{satuan}
     *
     * Aman dihapus meski sudah pernah dipakai transaksi — penjualan_item
     * & penerimaan_item sudah menyimpan SALINAN nama/harga (bukan cuma
     * nyambung lewat foreign key), jadi struk & riwayat lama tetap utuh
     * walau satuan aslinya sudah dihapus (FK-nya otomatis jadi NULL,
     * tidak ikut kehapus datanya — lihat migration nullOnDelete()).
     */
    public function hapusSatuan(Obat $obat, ObatSatuan $satuan)
    {
        if ($satuan->obat_id !== $obat->id) {
            abort(404);
        }
        if ($obat->satuan()->count() <= 1) {
            abort(422, 'Tidak bisa hapus satuan terakhir — obat harus punya minimal 1 satuan jual.');
        }
        $satuan->delete();
        return response()->noContent();
    }

    /**
     * POST /api/obat/opname
     * Endpoint untuk fitur Stok Opname yang baru disepakati (lihat BACKLOG.md).
     * Body:
     * {
     *   "items": [
     *     {"obat_id": 1, "stok_fisik": 1180, "keterangan": "selisih wajar"},
     *     {"obat_id": 5, "stok_fisik": 480, "keterangan": "3 strip rusak"}
     *   ]
     * }
     */
    public function opname(Request $r, StokService $stok)
    {
        $data = $r->validate([
            'items' => 'required|array|min:1',
            'items.*.obat_id' => 'required|exists:obat,id',
            'items.*.stok_fisik' => 'required|integer|min:0',
            'items.*.keterangan' => 'nullable|string',
        ]);

        $hasil = collect($data['items'])->map(
            fn ($item) => $stok->opname($item['obat_id'], $item['stok_fisik'], $item['keterangan'] ?? null)
        );

        return response()->json(['message' => 'Penyesuaian stok tersimpan', 'data' => $hasil]);
    }
}
