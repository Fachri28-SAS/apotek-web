<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('pengeluaran')) {
            Schema::create('pengeluaran', function (Blueprint $table) {
                $table->id();
                $table->date('tanggal');
                $table->string('kategori', 50)->default('operasional');
                $table->string('nama_pengeluaran', 255);
                $table->decimal('nominal', 15, 2);
                $table->string('metode_bayar', 50)->default('tunai');
                $table->text('keterangan')->nullable();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('nama_kasir', 100)->nullable();
                $table->timestamps();

                $table->index('tanggal');
                $table->index('kategori');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pengeluaran');
    }
};
