<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('obat_satuan', function (Blueprint $table) {
            // Dipakai buat badge naik/turun di Data Obat. Berbeda dari
            // penerimaan_item.harga_beli_sebelumnya (yang cuma snapshot
            // 1 faktur) — kolom ini di-update dari MANA PUN harga
            // berubah: baik lewat Penerimaan Barang, MAUPUN edit manual
            // langsung di Data Obat.
            $table->decimal('harga_beli_sebelumnya', 15, 2)->nullable()->after('harga_beli');
        });
    }

    public function down(): void
    {
        Schema::table('obat_satuan', function (Blueprint $table) {
            $table->dropColumn('harga_beli_sebelumnya');
        });
    }
};
