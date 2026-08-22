<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kolom nama_* dan harga_* adalah SNAPSHOT.
     * Struk 6 bulan lalu wajib tampil apa adanya walau harga sudah berubah.
     *
     * harga_asli != harga_jual  ->  kasir mengubah harga manual,
     * struk otomatis mencetak "Harga asli RpX -> diubah kasir jadi RpY".
     */
    public function up(): void
    {
        Schema::create('penjualan_item', function (Blueprint $table) {
            $table->id();
            $table->foreignId('penjualan_id')->constrained('penjualan')->cascadeOnDelete();
            $table->foreignId('obat_id')->nullable()->constrained('obat')->nullOnDelete();
            $table->foreignId('obat_satuan_id')->nullable()->constrained('obat_satuan')->nullOnDelete();

            $table->string('nama_obat');
            $table->string('nama_satuan', 30);
            $table->string('nomor_batch', 50)->nullable();
            $table->unsignedInteger('faktor')->default(1);

            $table->integer('qty');
            $table->decimal('harga_asli', 15, 2);      // harga dari database saat itu
            $table->decimal('harga_jual', 15, 2);      // harga yang benar-benar dipakai
            $table->decimal('tuslah', 15, 2)->default(0);
            $table->decimal('subtotal', 15, 2);

            $table->index('obat_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penjualan_item');
    }
};
