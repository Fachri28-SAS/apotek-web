<?php

namespace App\Console\Commands;

use App\Models\Pembayaran;
use Illuminate\Console\Command;

class BatalkanPembayaranExpired extends Command
{
    protected $signature = 'pembayaran:batalkan-expired';
    protected $description = 'Batalkan pesanan QRIS yang lewat 24 jam tanpa upload bukti transfer';

    public function handle(): void
    {
        $daftar = Pembayaran::where('status', 'pending')
            ->whereNull('bukti_path')
            ->where('expired_at', '<', now())
            ->get();

        foreach ($daftar as $p) {
            $p->update(['status' => 'expired']);
            $p->penjualan()->update(['status' => 'batal']);
        }

        $this->info("Berhasil batalkan {$daftar->count()} pesanan yang kadaluwarsa.");
    }
}
