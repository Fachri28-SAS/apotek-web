<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $defaults = [
            ['kunci' => 'jam_buka', 'nilai' => '07:00'],
            ['kunci' => 'jam_tutup', 'nilai' => '22:00'],
            ['kunci' => 'status_operasional_manual', 'nilai' => 'otomatis'],
            ['kunci' => 'pesan_tutup', 'nilai' => 'Mohon maaf, pemesanan online dan akses kasir sedang tutup di luar jam operasional (07.00 - 22.00 WIB). Silakan kembali saat jam operasional.'],
        ];

        foreach ($defaults as $d) {
            DB::table('pengaturan')->updateOrInsert(
                ['kunci' => $d['kunci']],
                ['nilai' => $d['nilai'], 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        DB::table('pengaturan')->whereIn('kunci', [
            'jam_buka',
            'jam_tutup',
            'status_operasional_manual',
            'pesan_tutup'
        ])->delete();
    }
};
