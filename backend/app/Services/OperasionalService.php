<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class OperasionalService
{
    /**
     * Ambil status operasional apotek saat ini
     */
    public static function getStatus(): array
    {
        $settings = DB::table('pengaturan')
            ->whereIn('kunci', [
                'jam_buka',
                'jam_tutup',
                'status_operasional_manual',
                'pesan_tutup'
            ])
            ->pluck('nilai', 'kunci');

        $jamBuka = $settings['jam_buka'] ?? '07:00';
        $jamTutup = $settings['jam_tutup'] ?? '22:00';
        $statusManual = $settings['status_operasional_manual'] ?? 'otomatis';
        $pesanTutup = $settings['pesan_tutup'] ?? "Mohon maaf, apotek sedang tutup di luar jam operasional ({$jamBuka} - {$jamTutup} WIB).";

        $now = Carbon::now('Asia/Jakarta');
        $currentTime = $now->format('H:i');

        if ($statusManual === 'buka') {
            $isOpen = true;
            $keterangan = 'Buka Manual (Paksa Buka oleh Admin)';
        } elseif ($statusManual === 'tutup') {
            $isOpen = false;
            $keterangan = 'Tutup Manual (Libur / Istirahat oleh Admin)';
        } else {
            // Otomatis berdasarkan jadwal jam buka s/d jam tutup
            if ($jamBuka <= $jamTutup) {
                $isOpen = ($currentTime >= $jamBuka && $currentTime < $jamTutup);
            } else {
                // Lewat tengah malam (misal 20:00 s/d 04:00)
                $isOpen = ($currentTime >= $jamBuka || $currentTime < $jamTutup);
            }
            $keterangan = $isOpen 
                ? "Buka Sesuai Jadwal ({$jamBuka} - {$jamTutup} WIB)" 
                : "Tutup Sesuai Jadwal (Buka kembali pukul {$jamBuka} WIB)";
        }

        return [
            'is_open' => (bool) $isOpen,
            'jam_buka' => $jamBuka,
            'jam_tutup' => $jamTutup,
            'status_manual' => $statusManual,
            'pesan_tutup' => $pesanTutup,
            'keterangan' => $keterangan,
            'waktu_server_wib' => $now->toIso8601String(),
            'jam_sekarang_wib' => $currentTime,
        ];
    }
}
