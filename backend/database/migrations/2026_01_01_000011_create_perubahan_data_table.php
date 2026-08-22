<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jantung polling. React kirim ?since_id=N, server balas apa saja yang berubah.
     * Diisi otomatis lewat Model Observer (bukan trigger MySQL).
     * Baris lama dihapus cron harian, tabel ini tidak boleh gemuk.
     */
    public function up(): void
    {
        Schema::create('perubahan_data', function (Blueprint $table) {
            $table->id();
            $table->string('tabel', 40);
            $table->unsignedBigInteger('row_id');
            $table->enum('aksi', ['insert', 'update', 'delete']);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['id', 'tabel']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perubahan_data');
    }
};
