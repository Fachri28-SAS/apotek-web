<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('penerimaan', function (Blueprint $table) {
            if (!Schema::hasColumn('penerimaan', 'petugas_bayar')) {
                $table->string('petugas_bayar', 100)->nullable()->after('tanggal_bayar');
            }
        });
    }

    public function down(): void
    {
        Schema::table('penerimaan', function (Blueprint $table) {
            if (Schema::hasColumn('penerimaan', 'petugas_bayar')) {
                $table->dropColumn('petugas_bayar');
            }
        });
    }
};
