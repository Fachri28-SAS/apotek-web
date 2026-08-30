<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            // Path file bukti transfer yang di-upload customer.
            // NULL = customer belum upload bukti sama sekali ("Menunggu Pembayaran").
            // Ada isi = sudah upload, tinggal tunggu kasir cek ("Menunggu Verifikasi").
            $table->string('bukti_path')->nullable()->after('raw_payload');
            $table->decimal('nominal_klaim_customer', 15, 2)->nullable()->after('bukti_path');
        });
    }

    public function down(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            $table->dropColumn(['bukti_path', 'nominal_klaim_customer']);
        });
    }
};
