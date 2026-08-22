<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengaturan', function (Blueprint $table) {
            $table->string('kunci', 60)->primary();
            $table->text('nilai')->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        // Jangan hardcode di kode. Nama apotek & PPN bisa berubah.
        DB::table('pengaturan')->insert([
            ['kunci' => 'nama_apotek',     'nilai' => 'Apotek Bima Farma'],
            ['kunci' => 'alamat',          'nilai' => 'Jalan Tanimulya Raya No. 1, Haji Gofur, Ngamprah, Kabupaten Bandung Barat'],
            ['kunci' => 'jam_operasional', 'nilai' => 'Setiap hari, 07.00-22.00 WIB'],
            ['kunci' => 'telepon',         'nilai' => ''],
            ['kunci' => 'prefix_struk',    'nilai' => 'BF'],
            ['kunci' => 'persen_ppn',      'nilai' => '11'],
            ['kunci' => 'hari_alert_exp',  'nilai' => '90'],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('pengaturan');
    }
};
