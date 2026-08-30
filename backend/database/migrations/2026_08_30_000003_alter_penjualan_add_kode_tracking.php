<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('penjualan', function (Blueprint $table) {
            // Kode acak 8 karakter alfanumerik (uppercase) untuk akses publik tanpa login
            // Aman dan tidak bisa ditebak berurutan
            $table->string('kode_tracking', 12)->nullable()->unique()->after('no_struk');
            $table->index('kode_tracking');
        });
    }

    public function down(): void
    {
        Schema::table('penjualan', function (Blueprint $table) {
            $table->dropIndex(['kode_tracking']);
            $table->dropColumn('kode_tracking');
        });
    }
};
