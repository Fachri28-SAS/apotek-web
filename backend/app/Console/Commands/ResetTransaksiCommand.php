<?php

namespace App\Console\Commands;

use App\Models\Pembayaran;
use App\Models\Penjualan;
use App\Models\PenjualanItem;
use App\Models\StokMutasi;
use App\Models\Penerimaan;
use App\Models\PenerimaanItem;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ResetTransaksiCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'apotek:reset-transaksi {--force : Lewati konfirmasi} {--all : Bersihkan juga riwayat penerimaan barang}';

    /**
     * The console command description.
     */
    protected $description = 'Mengosongkan seluruh riwayat penjualan, pembayaran, pengeluaran, dan mutasi stok uji coba tanpa menghapus data obat dan user.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->warn('=====================================================');
        $this->warn('  PERINGATAN: PEMBERSIHAN DATA TRANSAKSI UJI COBA   ');
        $this->warn('=====================================================');
        $this->line('Tabel yang akan dikosongkan:');
        $this->line(' - penjualan (Riwayat Kasir & Toko Online)');
        $this->line(' - penjualan_item (Daftar Obat Terjual)');
        $this->line(' - pembayaran (Data QRIS & Duitku)');
        $this->line(' - stok_mutasi (Riwayat Keluar Masuk Stok)');
        if (Schema::hasTable('pengeluaran')) {
            $this->line(' - pengeluaran (Riwayat Biaya Operasional)');
        }
        if (Schema::hasTable('perubahan_data')) {
            $this->line(' - perubahan_data (Audit Log Perubahan)');
        }
        if ($this->option('all')) {
            $this->line(' - penerimaan (Riwayat Faktur Masuk Supplier)');
            $this->line(' - penerimaan_item (Item Faktur Masuk)');
        }
        $this->line('');
        $this->info('Data master obat, batch, satuan, harga, dan akun login akan TETAP AMAN.');
        $this->line('');

        if (!$this->option('force')) {
            if (!$this->confirm('Apakah Anda yakin ingin mengosongkan semua riwayat transaksi uji coba ini?', true)) {
                $this->info('Proses pembersihan dibatalkan.');
                return Command::SUCCESS;
            }
        }

        $this->info('Sedang membersihkan database...');

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('pembayaran')->delete();
        DB::table('penjualan_item')->delete();
        DB::table('penjualan')->delete();
        DB::table('stok_mutasi')->delete();

        if (Schema::hasTable('pengeluaran')) {
            DB::table('pengeluaran')->delete();
        }
        if (Schema::hasTable('perubahan_data')) {
            DB::table('perubahan_data')->delete();
        }

        if ($this->option('all')) {
            DB::table('penerimaan_item')->delete();
            DB::table('penerimaan')->delete();
        }

        // Reset nomor urut ID transaksi agar mulai dari 1 lagi
        DB::statement('ALTER TABLE pembayaran AUTO_INCREMENT = 1;');
        DB::statement('ALTER TABLE penjualan_item AUTO_INCREMENT = 1;');
        DB::statement('ALTER TABLE penjualan AUTO_INCREMENT = 1;');
        DB::statement('ALTER TABLE stok_mutasi AUTO_INCREMENT = 1;');

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->info('✓ Berhasil! Semua data riwayat transaksi uji coba telah bersih 0.');
        $this->line('Data master obat, harga, dan akun kasir/admin tetap utuh dan siap digunakan.');

        return Command::SUCCESS;
    }
}
