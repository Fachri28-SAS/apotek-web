<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Standar MySQL/MariaDB untuk memperluas opsi ENUM status pembayaran
        DB::statement("ALTER TABLE pembayaran MODIFY COLUMN status ENUM('pending', 'menunggu_verifikasi', 'sukses', 'kurang_bayar', 'gagal', 'expired', 'refund') NOT NULL DEFAULT 'pending'");

        Schema::table('pembayaran', function (Blueprint $table) {
            if (!Schema::hasColumn('pembayaran', 'catatan_verifikasi')) {
                $table->string('catatan_verifikasi')->nullable()->after('nominal_klaim_customer');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            if (Schema::hasColumn('pembayaran', 'catatan_verifikasi')) {
                $table->dropColumn('catatan_verifikasi');
            }
        });

        DB::statement("ALTER TABLE pembayaran MODIFY COLUMN status ENUM('pending', 'sukses', 'gagal', 'expired', 'refund') NOT NULL DEFAULT 'pending'");
    }
};
