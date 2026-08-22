<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('obat', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 50)->nullable()->unique();   // SKU / barcode
            $table->string('nama');
            $table->string('kemasan')->nullable();              // "Dus 10 strip @10 tablet"

            // --- STOK: satu angka, selalu dalam SATUAN DASAR ---
            $table->string('satuan_dasar', 30)->default('Pcs'); // Tablet / Botol / Tube
            $table->integer('stok')->default(0);
            $table->integer('stok_minimum')->default(10);

            // --- Batch aktif (denormalisasi dari obat_batch, biar query cepat) ---
            $table->foreignId('batch_aktif_id')->nullable();    // FK ditambah di migration batch
            $table->string('nomor_batch', 50)->nullable();
            $table->date('tanggal_exp')->nullable();

            $table->foreignId('supplier_id')->nullable()
                  ->constrained('suppliers')->nullOnDelete();   // PBF langganan, buat filter

            $table->boolean('perlu_resep')->default(false);
            $table->boolean('aktif_dijual')->default(true);     // OFF = hilang dari kasir
            $table->boolean('tampil_online')->default(true);    // OFF = hilang dari toko

            $table->text('deskripsi')->nullable();              // untuk toko online
            $table->string('gambar')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('nama');
            $table->index('tanggal_exp');
            $table->index(['aktif_dijual', 'deleted_at']);
        });

        // Daftar nama obat generik untuk datalist di form Tambah Obat
        Schema::create('obat_referensi', function (Blueprint $table) {
            $table->id();
            $table->string('nama')->unique();
            $table->string('golongan', 50)->nullable();   // bebas / bebas terbatas / keras
            $table->boolean('perlu_resep')->default(false);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('obat_referensi');
        Schema::dropIfExists('obat');
    }
};
