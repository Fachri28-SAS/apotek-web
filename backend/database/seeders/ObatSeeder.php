<?php

namespace Database\Seeders;

use App\Models\Obat;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class ObatSeeder extends Seeder
{
    public function run(): void
    {
        $kimiaFarma = Supplier::create(['nama' => 'PT Kimia Farma Trading', 'is_pkp' => true]);
        $enseval    = Supplier::create(['nama' => 'PT Enseval Putera Megatrading', 'is_pkp' => true]);
        $sumberSehat = Supplier::create(['nama' => 'CV Sumber Sehat', 'is_pkp' => false]);

        $daftar = [
            // --- Obat multi-satuan (Tablet/Kapsul -> Strip -> Box) ---
            ['nama' => 'Paracetamol 500mg', 'kemasan' => 'Strip isi 10 tablet, Box isi 10 strip',
                'satuan_dasar' => 'Tablet', 'stok' => 1200, 'min' => 200, 'batch' => 'PCM-0126', 'exp' => '2027-04-01', 'sup' => $kimiaFarma,
                'satuan' => [['Tablet', 1, 500, 800], ['Strip', 10, 5000, 8000], ['Box', 100, 45000, 75000]]],

            ['nama' => 'Obat Anti Mabuk Perjalanan', 'kemasan' => 'Strip isi 4 tablet, Box isi 10 strip',
                'satuan_dasar' => 'Tablet', 'stok' => 32, 'min' => 60, 'batch' => 'OAM-0119', 'exp' => '2027-02-01', 'sup' => $sumberSehat,
                'satuan' => [['Tablet', 1, 1000, 1600], ['Strip', 4, 4000, 6500], ['Box', 40, 38000, 62000]]],

            ['nama' => 'Obat Maag Tablet Kunyah', 'kemasan' => 'Strip isi 10 tablet, Box isi 10 strip',
                'satuan_dasar' => 'Tablet', 'stok' => 500, 'min' => 150, 'batch' => 'OMG-0207', 'exp' => '2026-11-01', 'sup' => $kimiaFarma,
                'satuan' => [['Tablet', 1, 600, 950], ['Strip', 10, 6000, 9500], ['Box', 100, 57000, 90000]]],

            ['nama' => 'Suplemen Daya Tahan Tubuh', 'kemasan' => 'Strip isi 6 kapsul, Box isi 10 strip',
                'satuan_dasar' => 'Kapsul', 'stok' => 30, 'min' => 72, 'batch' => 'SDT-0088', 'exp' => '2026-11-05', 'sup' => $enseval,
                'satuan' => [['Kapsul', 1, 3700, 5300], ['Strip', 6, 22000, 32000], ['Box', 60, 205000, 300000]]],

            // --- Obat 1 satuan (faktor selalu 1) ---
            ['nama' => 'Obat Herbal Masuk Angin', 'kemasan' => 'Sachet cair isi 5',
                'satuan_dasar' => 'Sachet', 'stok' => 40, 'min' => 15, 'batch' => 'OHM-0225', 'exp' => '2026-09-10', 'sup' => $sumberSehat,
                'satuan' => [['Sachet', 1, 14000, 21000]]],

            ['nama' => 'Obat Batuk Berdahak (OBH)', 'kemasan' => 'Sirup botol 100ml',
                'satuan_dasar' => 'Botol', 'stok' => 35, 'min' => 10, 'batch' => 'OBH-0310', 'exp' => '2026-10-05', 'sup' => $kimiaFarma,
                'satuan' => [['Botol', 1, 9000, 15000]]],

            ['nama' => 'Antiseptik Luka Cair', 'kemasan' => 'Botol 15ml',
                'satuan_dasar' => 'Botol', 'stok' => 25, 'min' => 10, 'batch' => 'ATS-0134', 'exp' => '2027-06-01', 'sup' => $sumberSehat,
                'satuan' => [['Botol', 1, 8000, 12000]]],

            ['nama' => 'Vitamin C 1000mg', 'kemasan' => 'Tabung isi 10 efervescent',
                'satuan_dasar' => 'Tabung', 'stok' => 60, 'min' => 20, 'batch' => 'VTC-0522', 'exp' => '2026-12-20', 'sup' => $enseval,
                'satuan' => [['Tabung', 1, 19000, 28000]]],

            ['nama' => 'Multivitamin Keluarga', 'kemasan' => 'Botol isi 30 tablet',
                'satuan_dasar' => 'Botol', 'stok' => 18, 'min' => 10, 'batch' => 'MVK-0345', 'exp' => '2027-05-01', 'sup' => $enseval,
                'satuan' => [['Botol', 1, 31000, 45000]]],

            ['nama' => 'Vitamin D3 1000IU', 'kemasan' => 'Botol isi 30 softgel',
                'satuan_dasar' => 'Botol', 'stok' => 22, 'min' => 10, 'batch' => 'VD3-0261', 'exp' => '2027-03-15', 'sup' => $enseval,
                'satuan' => [['Botol', 1, 27000, 38000]]],

            ['nama' => 'Termometer Digital', 'kemasan' => '1 unit + baterai',
                'satuan_dasar' => 'Unit', 'stok' => 14, 'min' => 5, 'batch' => 'TRM-0012', 'exp' => null, 'sup' => $sumberSehat,
                'satuan' => [['Unit', 1, 24000, 35000]]],

            ['nama' => 'Tensimeter Digital Lengan', 'kemasan' => '1 unit',
                'satuan_dasar' => 'Unit', 'stok' => 6, 'min' => 3, 'batch' => 'TSM-0007', 'exp' => null, 'sup' => $sumberSehat,
                'satuan' => [['Unit', 1, 160000, 210000]]],

            ['nama' => 'Masker Medis 3-Ply', 'kemasan' => 'Kotak isi 50',
                'satuan_dasar' => 'Kotak', 'stok' => 80, 'min' => 20, 'batch' => 'MSK-0910', 'exp' => '2028-01-01', 'sup' => $kimiaFarma,
                'satuan' => [['Kotak', 1, 21000, 30000]]],

            ['nama' => 'Minyak Telon Bayi', 'kemasan' => 'Botol 60ml',
                'satuan_dasar' => 'Botol', 'stok' => 30, 'min' => 10, 'batch' => 'MTB-0456', 'exp' => '2026-10-15', 'sup' => $sumberSehat,
                'satuan' => [['Botol', 1, 12000, 18000]]],

            ['nama' => 'Sunscreen SPF 50 PA+++', 'kemasan' => 'Tube 40ml',
                'satuan_dasar' => 'Tube', 'stok' => 16, 'min' => 8, 'batch' => 'SSC-0178', 'exp' => '2027-01-10', 'sup' => $enseval,
                'satuan' => [['Tube', 1, 30000, 42000]]],

            // --- Obat resep — harga NYATA, bukan 0 (bug di prototipe toko lama sudah diperbaiki) ---
            ['nama' => 'Amoxicillin 500mg', 'kemasan' => 'Strip isi 10 kapsul',
                'satuan_dasar' => 'Strip', 'stok' => 40, 'min' => 15, 'batch' => 'AMX-0021', 'exp' => '2027-02-20', 'sup' => $kimiaFarma,
                'resep' => true, 'satuan' => [['Strip', 1, 9000, 15000]]],

            ['nama' => 'Cefixime 100mg', 'kemasan' => 'Strip isi 10 kapsul',
                'satuan_dasar' => 'Strip', 'stok' => 25, 'min' => 10, 'batch' => 'CFX-0045', 'exp' => '2027-03-05', 'sup' => $enseval,
                'resep' => true, 'satuan' => [['Strip', 1, 14000, 22000]]],
        ];

        foreach ($daftar as $d) {
            $obat = Obat::create([
                'nama' => $d['nama'],
                'kemasan' => $d['kemasan'],
                'satuan_dasar' => $d['satuan_dasar'],
                'stok' => $d['stok'],
                'stok_minimum' => $d['min'],
                'nomor_batch' => $d['batch'],
                'tanggal_exp' => $d['exp'],
                'supplier_id' => $d['sup']->id,
                'perlu_resep' => $d['resep'] ?? false,
                'aktif_dijual' => true,
                'tampil_online' => true,
            ]);

            foreach ($d['satuan'] as $i => [$nama, $faktor, $beli, $jual]) {
                $obat->satuan()->create([
                    'nama_satuan' => $nama,
                    'faktor' => $faktor,
                    'harga_beli' => $beli,
                    'harga_jual' => $jual,
                    'is_default' => $i === 0,
                    'urutan' => $i,
                ]);
            }
        }

        $this->command->info('Berhasil isi ' . count($daftar) . ' obat + 3 supplier.');
    }
}
