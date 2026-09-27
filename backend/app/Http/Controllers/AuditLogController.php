<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AuditLogController extends Controller
{
    /**
     * Pastikan tabel audit_logs ada. Dipanggil otomatis saat pertama kali digunakan.
     */
    private function buatTabelJikaBelumAda()
    {
        if (!Schema::hasTable('audit_logs')) {
            DB::statement("
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    waktu DATETIME NOT NULL,
                    nama_akun VARCHAR(100) NOT NULL,
                    role_akun VARCHAR(50) NOT NULL DEFAULT 'kasir',
                    kategori VARCHAR(100) NOT NULL,
                    aksi VARCHAR(50) NOT NULL,
                    judul VARCHAR(255) NOT NULL,
                    sebelum TEXT,
                    sesudah TEXT,
                    keterangan TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_waktu (waktu),
                    INDEX idx_kategori (kategori)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
        }
    }

    /**
     * GET /api/audit-logs
     * Ambil 500 entri terbaru.
     */
    public function index()
    {
        $this->buatTabelJikaBelumAda();

        $rows = DB::table('audit_logs')
            ->orderByDesc('waktu')
            ->limit(500)
            ->get([
                'id',
                DB::raw("DATE_FORMAT(waktu, '%Y-%m-%dT%H:%i:%s.000Z') as waktu"),
                'nama_akun',
                'role_akun',
                'kategori',
                'aksi',
                'judul',
                'sebelum as detailLama',
                'sesudah as detailBaru',
                'keterangan',
            ]);

        return response()->json($rows);
    }

    /**
     * POST /api/audit-logs
     * Simpan satu entri log. Bisa dipanggil kasir maupun admin.
     */
    public function store(Request $r)
    {
        $this->buatTabelJikaBelumAda();

        $waktu     = $r->waktu ? new \DateTime($r->waktu) : now();
        $namaAkun  = $r->nama_akun ?? $r->petugas ?? 'Admin';
        $roleAkun  = $r->role_akun ?? 'kasir';
        $kategori  = $r->kategori ?? 'Umum';
        $aksi      = $r->aksi ?? 'Ubah';
        $judul     = $r->judul ?? $r->item ?? '-';
        $sebelum   = $r->sebelum !== null ? (string) $r->sebelum
                        : ($r->detailLama !== null ? (string) $r->detailLama : '-');
        $sesudah   = $r->sesudah !== null ? (string) $r->sesudah
                        : ($r->detailBaru !== null ? (string) $r->detailBaru : '-');
        $keterangan = $r->keterangan ?? '';

        $id = DB::table('audit_logs')->insertGetId([
            'waktu'      => $waktu,
            'nama_akun'  => $namaAkun,
            'role_akun'  => $roleAkun,
            'kategori'   => $kategori,
            'aksi'       => $aksi,
            'judul'      => $judul,
            'sebelum'    => $sebelum,
            'sesudah'    => $sesudah,
            'keterangan' => $keterangan,
        ]);

        return response()->json([
            'id'         => $id,
            'waktu'      => (new \DateTime($r->waktu ?? 'now'))->format('Y-m-d\TH:i:s.000\Z'),
            'nama_akun'  => $namaAkun,
            'role_akun'  => $roleAkun,
            'kategori'   => $kategori,
            'aksi'       => $aksi,
            'judul'      => $judul,
            'detailLama' => $sebelum,
            'detailBaru' => $sesudah,
            'keterangan' => $keterangan,
        ], 201);
    }

    /**
     * DELETE /api/audit-logs
     * Hapus semua log.
     */
    public function destroyAll()
    {
        $this->buatTabelJikaBelumAda();
        DB::table('audit_logs')->truncate();
        return response()->json(['success' => true, 'message' => 'Semua riwayat audit log telah dibersihkan.']);
    }
}
