<?php

namespace App\Console\Commands;

use App\Models\Pembayaran;
use App\Models\Penjualan;
use App\Models\PenjualanItem;
use App\Models\StokMutasi;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetTransaksiCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'apotek:reset-transaksi {--force : Lewati konfirmasi}';

    /**
     * The console command description.
     */
    protected $description = 'Mengosongkan seluruh riwayat penjualan, pembayaran, dan mutasi stok uji coba tanpa menghapus data obat dan user.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->warn('=====================================================');
        $this->warn('  PERINGATAN: PEMBERSIHAN DATA TRANSAKSI UJI COBA   ');
        $this->warn('=====================================================');
        $this->line('Tabel yang akan dikosongkan:');
        $this->line(' - penjualan (Riwayat Kasir & Toko)');
        $this->line(' - penjualan_item (Daftar Obat Terjual)');
        $this->line(' - pembayaran (Data QRIS & Bukti Transfer)');
        $this->line(' - stok_mutasi (Riwayat Keluar Masuk Stok Uji Coba)');
        $this->line('');
        $this->info('Data master obat, harga, dan akun login akan TETAP AMAN.');
        $this->line('');

        if (!$this->option('force')) {
            if (!$this->confirm('Apakah Anda yakin ingin mengosongkan semua riwayat transaksi uji coba ini?', true)) {
                $this->info('Proses pembersihan dibatalkan.');
                return Command::SUCCESS;
            }
        }

        $this->info('Sedang membersihkan database...');

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Pembayaran::truncate();
        PenjualanItem::truncate();
        Penjualan::truncate();
        StokMutasi::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->info(' Berhasil! Semua data transaksi uji coba telah kembali bersih 0.');
        $this->line('Dashboard kasir dan laporan penjualan sekarang siap digunakan untuk operasional resmi.');

        return Command::SUCCESS;
    }
}
