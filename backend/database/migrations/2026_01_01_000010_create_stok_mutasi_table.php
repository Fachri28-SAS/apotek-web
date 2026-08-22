<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * BUKU BESAR STOK. Tidak pernah di-update, hanya ditambah baris.
     * qty positif = masuk, negatif = keluar. Selalu dalam satuan dasar.
     * Aturan main: obat.stok TIDAK BOLEH diubah tanpa menulis baris di sini.
     */
    public function up(): void
    {
        Schema::create('stok_mutasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obat_id')->constrained('obat')->cascadeOnDelete();
            $table->enum('tipe', ['masuk', 'keluar', 'penyesuaian', 'retur', 'batal', 'kadaluwarsa']);
            $table->integer('qty');              // boleh minus
            $table->integer('stok_sebelum');
            $table->integer('stok_sesudah');

            $table->string('ref_type', 40)->nullable();   // 'penjualan' | 'penerimaan' | 'manual'
            $table->unsignedBigInteger('ref_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('keterangan')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['obat_id', 'created_at']);
            $table->index(['ref_type', 'ref_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stok_mutasi');
    }
};
