<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Obat satu-satuan dan multi-satuan pakai tabel yang SAMA.
     * Sirup botol  = 1 baris, faktor 1.
     * Paracetamol  = 3 baris: Tablet(1), Strip(10), Box(100).
     * Faktor SELALU relatif ke obat.satuan_dasar.
     */
    public function up(): void
    {
        Schema::create('obat_satuan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obat_id')->constrained('obat')->cascadeOnDelete();
            $table->string('nama_satuan', 30);
            $table->unsignedInteger('faktor')->default(1);
            $table->decimal('harga_beli', 15, 2)->default(0);
            $table->decimal('harga_jual', 15, 2)->default(0);
            $table->boolean('is_default')->default(false);   // satuan yang muncul duluan di kasir
            $table->unsignedTinyInteger('urutan')->default(0);
            $table->timestamps();

            $table->unique(['obat_id', 'nama_satuan']);
            $table->index(['obat_id', 'urutan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('obat_satuan');
    }
};
