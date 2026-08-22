<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * harga_beli_sebelumnya disimpan sebagai SNAPSHOT, bukan dihitung ulang.
     * Ini yang bikin badge "Naik Rp500 (+12%)" tetap benar
     * walau faktur dibuka lagi setahun kemudian.
     */
    public function up(): void
    {
        Schema::create('penerimaan_item', function (Blueprint $table) {
            $table->id();
            $table->foreignId('penerimaan_id')->constrained('penerimaan')->cascadeOnDelete();
            $table->foreignId('obat_id')->nullable()->constrained('obat')->nullOnDelete();
            $table->foreignId('obat_satuan_id')->nullable()->constrained('obat_satuan')->nullOnDelete();

            $table->string('nama_obat');
            $table->string('nama_satuan', 30);
            $table->unsignedInteger('faktor')->default(1);

            $table->integer('qty');
            $table->decimal('harga_beli', 15, 2);
            $table->decimal('diskon', 15, 2)->default(0);
            $table->decimal('subtotal', 15, 2);

            $table->string('nomor_batch', 50)->nullable();
            $table->date('tanggal_exp')->nullable();

            $table->decimal('harga_beli_sebelumnya', 15, 2)->nullable();  // indikator naik/turun
            $table->decimal('harga_jual_saat_itu', 15, 2)->nullable();    // kolom referensi
            $table->decimal('margin_persen', 6, 2)->nullable();

            $table->index('obat_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penerimaan_item');
    }
};
