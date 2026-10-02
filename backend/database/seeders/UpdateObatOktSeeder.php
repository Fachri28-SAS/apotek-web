<?php

namespace Database\Seeders;

use App\Models\Obat;
use App\Models\ObatSatuan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class UpdateObatOktSeeder extends Seeder
{
    public function run(): array
    {
        $jsonPath = database_path('data/obat_okt_2026.json');
        if (!File::exists($jsonPath)) {
            $msg = "File obat_okt_2026.json tidak ditemukan di {$jsonPath}";
            if (isset($this->command)) $this->command->error($msg);
            return ['error' => $msg];
        }

        $items = json_decode(File::get($jsonPath), true);
        $totalItems = count($items);
        if (isset($this->command)) $this->command->info("Memproses pembaruan {$totalItems} obat dari Laporan Oktober 2026...");

        $updatedCount = 0;
        $insertedCount = 0;

        DB::transaction(function () use ($items, &$updatedCount, &$insertedCount) {
            // Load all current obat indexed by normalized name
            $existingObat = Obat::all();
            $obatMap = [];
            foreach ($existingObat as $o) {
                $norm = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $o->nama));
                if (!isset($obatMap[$norm])) {
                    $obatMap[$norm] = $o;
                }
            }

            $matchedIds = [];

            foreach ($items as $item) {
                $nama = trim($item['nama']);
                $norm = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $nama));
                $satuan = $item['satuan'] ?: 'Pcs';
                $stok = (int) ($item['stok'] ?? 0);
                $stokMin = (int) ($item['stok_minimum'] ?? 10);
                $beli = (float) ($item['harga_beli'] ?? 0);
                $jual = (float) ($item['harga_jual'] ?? 0);
                $kategori = $item['kategori'] ?? null;

                $targetObat = $obatMap[$norm] ?? null;

                if ($targetObat) {
                    // Update existing
                    $targetObat->update([
                        'stok' => $stok,
                        'satuan_dasar' => $satuan,
                        'stok_minimum' => $stokMin,
                        'deskripsi' => $kategori ?: $targetObat->deskripsi,
                    ]);

                    // Update default satuan
                    $satuanModel = ObatSatuan::where('obat_id', $targetObat->id)
                        ->where(function ($q) use ($satuan) {
                            $q->where('is_default', true)
                              ->orWhere('nama_satuan', $satuan);
                        })->first();

                    if ($satuanModel) {
                        $satuanModel->update([
                            'harga_beli_sebelumnya' => $satuanModel->harga_beli,
                            'harga_beli' => $beli,
                            'harga_jual' => $jual,
                        ]);
                    } else {
                        ObatSatuan::create([
                            'obat_id' => $targetObat->id,
                            'nama_satuan' => $satuan,
                            'faktor' => 1,
                            'harga_beli' => $beli,
                            'harga_jual' => $jual,
                            'is_default' => true,
                            'urutan' => 0,
                        ]);
                    }

                    $matchedIds[] = $targetObat->id;
                    $updatedCount++;
                } else {
                    // Insert new
                    $newObat = Obat::create([
                        'nama' => $nama,
                        'satuan_dasar' => $satuan,
                        'stok' => $stok,
                        'stok_minimum' => $stokMin,
                        'deskripsi' => $kategori,
                        'perlu_resep' => false,
                        'aktif_dijual' => true,
                        'tampil_online' => true,
                    ]);

                    ObatSatuan::create([
                        'obat_id' => $newObat->id,
                        'nama_satuan' => $satuan,
                        'faktor' => 1,
                        'harga_beli' => $beli,
                        'harga_jual' => $jual,
                        'is_default' => true,
                        'urutan' => 0,
                    ]);

                    $matchedIds[] = $newObat->id;
                    $insertedCount++;
                }
            }

            // Set stok = 0 for obat that were not in the physical count
            Obat::whereNotIn('id', $matchedIds)->update(['stok' => 0]);
        });

        $res = [
            'status' => 'success',
            'message' => 'Data obat & stok berhasil diperbarui sesuai laporan Oktober 2026',
            'updated' => $updatedCount,
            'inserted' => $insertedCount,
            'total' => $totalItems,
        ];

        if (isset($this->command)) {
            $this->command->info("Selesai! {$updatedCount} obat diperbarui, {$insertedCount} obat baru ditambahkan.");
        }

        return $res;
    }
}
