<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penerimaan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->nullable()
                  ->constrained('suppliers')->nullOnDelete();
            $table->string('nama_supplier');                  // snapshot
            $table->string('no_faktur', 60);
            $table->date('tanggal_terima');
            $table->date('tanggal_jatuh_tempo')->nullable();
            $table->enum('tempo_label', ['1_bulan','2_bulan','3_bulan','6_bulan','1_tahun','custom'])
                  ->default('custom');

            $table->boolean('is_pkp')->default(false);
            $table->decimal('persen_ppn', 5, 2)->default(11); // simpan, jangan hardcode 11

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('diskon_faktur_rp', 15, 2)->default(0);
            $table->decimal('diskon_faktur_persen', 5, 2)->default(0);
            $table->decimal('subtotal_setelah_diskon', 15, 2)->default(0);
            $table->decimal('dpp', 15, 2)->default(0);        // sebelum pajak
            $table->decimal('ppn', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);

            $table->enum('status_bayar', ['belum', 'lunas'])->default('belum');
            $table->date('tanggal_bayar')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tanggal_terima']);
            $table->index(['supplier_id', 'no_faktur']);
            $table->index(['status_bayar', 'tanggal_jatuh_tempo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penerimaan');
    }
};
