<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Batch di sini bersifat CATATAN, bukan pemegang stok.
     * Gunanya: dropdown batch di penerimaan, nomor batch di struk,
     * dan alert kadaluwarsa.
     * Kalau suatu hari butuh stok per batch, tinggal tambah kolom `stok` di sini.
     */
    public function up(): void
    {
        Schema::create('obat_batch', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obat_id')->constrained('obat')->cascadeOnDelete();
            $table->string('nomor_batch', 50);
            $table->date('tanggal_exp')->nullable();
            $table->integer('qty_masuk')->default(0);        // dalam satuan dasar
            $table->date('tanggal_masuk')->nullable();
            $table->unsignedBigInteger('penerimaan_item_id')->nullable();
            $table->timestamps();

            $table->unique(['obat_id', 'nomor_batch']);
            $table->index(['obat_id', 'tanggal_exp']);
        });

        Schema::table('obat', function (Blueprint $table) {
            $table->foreign('batch_aktif_id')->references('id')->on('obat_batch')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('obat', function (Blueprint $table) {
            $table->dropForeign(['batch_aktif_id']);
        });
        Schema::dropIfExists('obat_batch');
    }
};
