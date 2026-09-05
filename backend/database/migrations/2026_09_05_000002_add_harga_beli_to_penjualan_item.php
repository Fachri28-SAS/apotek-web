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
        Schema::table('penjualan_item', function (Blueprint $table) {
            if (!Schema::hasColumn('penjualan_item', 'harga_beli')) {
                $table->decimal('harga_beli', 15, 2)->nullable()->after('qty');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('penjualan_item', function (Blueprint $table) {
            if (Schema::hasColumn('penjualan_item', 'harga_beli')) {
                $table->dropColumn('harga_beli');
            }
        });
    }
};
