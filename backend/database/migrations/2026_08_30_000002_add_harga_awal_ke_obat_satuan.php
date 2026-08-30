<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('obat_satuan', function (Blueprint $table) {
            // Harga waktu obat PERTAMA KALI didaftarkan — beda dari
            // harga_beli_sebelumnya yang bergeser tiap ada perubahan.
            // Ini tetap sama selamanya, kecuali dikoreksi manual lewat
            // jalur khusus (bukan form edit harga biasa).
            $table->decimal('harga_beli_awal', 15, 2)->nullable()->after('harga_beli_sebelumnya');
        });

        // Backfill data lama: obat yang sudah ada sebelum migration ini
        // dianggap harga sekarang = harga awalnya (baseline masuk akal
        // untuk data yang sudah terlanjur ada).
        DB::table('obat_satuan')->whereNull('harga_beli_awal')->update([
            'harga_beli_awal' => DB::raw('harga_beli'),
        ]);
    }

    public function down(): void
    {
        Schema::table('obat_satuan', function (Blueprint $table) {
            $table->dropColumn('harga_beli_awal');
        });
    }
};
