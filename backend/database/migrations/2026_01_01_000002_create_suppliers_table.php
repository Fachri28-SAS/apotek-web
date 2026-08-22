<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('nama');                       // Nama PBF / distributor
            $table->string('telepon', 30)->nullable();
            $table->string('sales_nama')->nullable();     // nama sales yang biasa datang
            $table->text('alamat')->nullable();
            $table->boolean('is_pkp')->default(false);    // default PPN saat buat faktur
            $table->boolean('aktif')->default(true);
            $table->timestamps();

            $table->index('nama');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
