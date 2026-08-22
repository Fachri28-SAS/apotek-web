<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penjualan', function (Blueprint $table) {
            $table->id();
            $table->string('no_struk', 30)->unique();
            $table->string('no_invoice', 50)->nullable();
            $table->foreignId('user_id')->nullable()
                  ->constrained('users')->nullOnDelete();   // kasir bertugas
            $table->string('nama_kasir');                   // snapshot, tahan hapus user
            $table->string('nama_pembeli')->nullable();
            $table->text('catatan')->nullable();

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('total_tuslah', 15, 2)->default(0);
            $table->decimal('diskon', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);

            $table->enum('metode_bayar', ['tunai', 'qris', 'transfer'])->default('tunai');
            $table->decimal('uang_diterima', 15, 2)->nullable();
            $table->decimal('kembalian', 15, 2)->default(0);

            $table->enum('sumber', ['kasir', 'online'])->default('kasir');
            $table->enum('status', ['lunas', 'pending', 'batal'])->default('lunas');

            // Data pengiriman untuk pesanan online (null kalau dari kasir)
            $table->string('telepon_pembeli', 30)->nullable();
            $table->text('alamat_kirim')->nullable();

            $table->date('tanggal');                        // untuk GROUP BY laporan
            $table->timestamps();

            $table->index(['tanggal', 'status']);
            $table->index(['sumber', 'status']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penjualan');
    }
};
