<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * TAHAP 3. Dibuat sekarang supaya nanti tidak perlu ubah tabel penjualan.
     * raw_payload menyimpan notifikasi mentah dari Midtrans/Xendit
     * -- wajib, untuk bukti kalau ada sengketa pembayaran.
     */
    public function up(): void
    {
        Schema::create('pembayaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('penjualan_id')->constrained('penjualan')->cascadeOnDelete();
            $table->string('provider', 30)->default('midtrans');
            $table->string('order_id', 80)->unique();     // ID yang dikirim ke gateway
            $table->string('transaction_id', 80)->nullable();
            $table->text('snap_token')->nullable();
            $table->string('metode', 40)->nullable();     // qris / bca_va / gopay
            $table->decimal('jumlah', 15, 2);
            $table->enum('status', ['pending', 'sukses', 'gagal', 'expired', 'refund'])
                  ->default('pending');
            $table->json('raw_payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pembayaran');
    }
};
