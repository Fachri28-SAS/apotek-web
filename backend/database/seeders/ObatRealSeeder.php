<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class ObatRealSeeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = database_path('data/obat_real.json');
        if (!File::exists($jsonPath)) {
            $this->command->error("File obat_real.json tidak ditemukan di {$jsonPath}");
            return;
        }

        $items = json_decode(File::get($jsonPath), true);
        $total = count($items);
        $this->command->info("Memulai bulk import {$total} obat...");

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('obat_satuan')->truncate();
        DB::table('obat')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $now = now()->toDateTimeString();
        $obatData = [];
        $satuanData = [];

        foreach ($items as $idx => $item) {
            $id = $idx + 1;
            $satuanDasar = $item['satuan_dasar'] ?: 'Pcs';

            $obatData[] = [
                'id' => $id,
                'kode' => 'OBT-' . str_pad($id, 5, '0', STR_PAD_LEFT),
                'nama' => $item['nama'],
                'kemasan' => $satuanDasar,
                'satuan_dasar' => $satuanDasar,
                'stok' => (int) ($item['stok'] ?? 0),
                'stok_minimum' => (int) ($item['stok_minimum'] ?? 10),
                'perlu_resep' => false,
                'aktif_dijual' => true,
                'tampil_online' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $satuanData[] = [
                'obat_id' => $id,
                'nama_satuan' => $satuanDasar,
                'faktor' => 1,
                'harga_beli' => (float) ($item['harga_beli'] ?? 0),
                'harga_jual' => (float) ($item['harga_jual'] ?? 0),
                'is_default' => true,
                'urutan' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Bulk insert in chunks of 500 records for fast network transfer
        foreach (array_chunk($obatData, 500) as $chunk) {
            DB::table('obat')->insert($chunk);
        }

        foreach (array_chunk($satuanData, 500) as $chunk) {
            DB::table('obat_satuan')->insert($chunk);
        }

        $this->command->info("SELESAI! Berhasil mengimport {$total} obat dan satuan secara kilat.");
    }
}
