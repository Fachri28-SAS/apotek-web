<?php

namespace Database\Seeders;

use App\Models\ObatReferensi;
use Illuminate\Database\Seeder;

class ObatReferensiSeeder extends Seeder
{
    public function run(): void
    {
        $daftar = [
            ['Paracetamol', 'bebas', false],
            ['Amoxicillin', 'keras', true],
            ['Ibuprofen', 'bebas terbatas', false],
            ['Cetirizine', 'bebas terbatas', false],
            ['Loratadine', 'bebas terbatas', false],
            ['Omeprazole', 'keras', true],
            ['Ranitidine', 'keras', true],
            ['Antasida DOEN', 'bebas', false],
            ['Amlodipine', 'keras', true],
            ['Captopril', 'keras', true],
            ['Metformin', 'keras', true],
            ['Glibenklamid', 'keras', true],
            ['Simvastatin', 'keras', true],
            ['Vitamin B Kompleks', 'bebas', false],
            ['Vitamin C', 'bebas', false],
            ['Vitamin D3', 'bebas', false],
            ['Zinc', 'bebas', false],
            ['Oralit / ORS', 'bebas', false],
            ['Domperidone', 'bebas terbatas', false],
            ['Loperamide', 'bebas terbatas', false],
            ['Dexamethasone', 'keras', true],
            ['Prednison', 'keras', true],
            ['CTM (Chlorpheniramine Maleate)', 'bebas terbatas', false],
            ['Guaifenesin', 'bebas', false],
            ['Bromhexine', 'bebas', false],
            ['Ambroxol', 'bebas terbatas', false],
            ['Salbutamol', 'keras', true],
            ['Asam Mefenamat', 'keras', true],
            ['Diclofenac', 'keras', true],
            ['Ondansetron', 'keras', true],
        ];

        foreach ($daftar as [$nama, $golongan, $resep]) {
            ObatReferensi::create(['nama' => $nama, 'golongan' => $golongan, 'perlu_resep' => $resep]);
        }

        $this->command->info('Berhasil isi ' . count($daftar) . ' nama obat referensi.');
    }
}
