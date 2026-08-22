<?php

namespace App\Services;

use App\Models\Obat;
use App\Models\StokMutasi;
use Illuminate\Support\Facades\DB;

/**
 * SATU-SATUNYA jalan untuk mengubah obat.stok. Jangan pernah lakukan
 * $obat->update(['stok' => ...]) langsung di controller mana pun —
 * selalu lewat method ubah() di sini, supaya:
 *   1. Tercatat di stok_mutasi (buku besar, bisa ditelusuri kapan saja)
 *   2. Aman dari race condition (2 kasir jual stok terakhir bersamaan)
 */
class StokService
{
    /**
     * @param int $obatId
     * @param int $qty       Positif = nambah stok, negatif = mengurangi.
     *                       Kalau qty dalam satuan Strip/Box, KALIKAN dulu
     *                       dengan faktor sebelum panggil method ini.
     * @param string $tipe   masuk|keluar|penyesuaian|retur|batal|kadaluwarsa
     */
    public function ubah(
        int $obatId,
        int $qty,
        string $tipe,
        ?string $refType = null,
        ?int $refId = null,
        ?string $keterangan = null
    ): Obat {
        return DB::transaction(function () use ($obatId, $qty, $tipe, $refType, $refId, $keterangan) {

            // lockForUpdate mengunci baris ini sampai transaksi selesai —
            // ini yang mencegah 2 kasir menjual obat terakhir secara bersamaan.
            $obat = Obat::where('id', $obatId)->lockForUpdate()->firstOrFail();

            $sebelum = $obat->stok;
            $sesudah = $sebelum + $qty;

            if ($sesudah < 0) {
                throw new \RuntimeException(
                    "Stok {$obat->nama} tidak cukup (sisa {$sebelum} {$obat->satuan_dasar})."
                );
            }

            $obat->update(['stok' => $sesudah]);

            StokMutasi::create([
                'obat_id' => $obatId,
                'tipe' => $tipe,
                'qty' => $qty,
                'stok_sebelum' => $sebelum,
                'stok_sesudah' => $sesudah,
                'ref_type' => $refType,
                'ref_id' => $refId,
                'user_id' => auth()->id(),
                'keterangan' => $keterangan,
            ]);

            return $obat->fresh();
        });
    }

    /**
     * Khusus Stok Opname: hitung selisih otomatis dari stok fisik yang
     * diinput, lalu catat sebagai tipe 'penyesuaian'.
     */
    public function opname(int $obatId, int $stokFisik, ?string $keterangan = null): Obat
    {
        $obat = Obat::findOrFail($obatId);
        $selisih = $stokFisik - $obat->stok;

        if ($selisih === 0) {
            return $obat; // tidak ada perubahan, tidak perlu catat mutasi kosong
        }

        return $this->ubah($obatId, $selisih, 'penyesuaian', 'stok_opname', null, $keterangan);
    }
}
