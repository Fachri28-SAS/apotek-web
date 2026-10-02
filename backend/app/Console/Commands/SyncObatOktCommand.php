<?php

namespace App\Console\Commands;

use Database\Seeders\UpdateObatOktSeeder;
use Illuminate\Console\Command;

class SyncObatOktCommand extends Command
{
    protected $signature = 'obat:sync-okt';
    protected $description = 'Sync database obat dan stok fisik sesuai laporan Oktober 2026';

    public function handle()
    {
        $this->info("Menjalankan sinkronisasi data obat dan stok Oktober 2026...");
        $seeder = new UpdateObatOktSeeder();
        $seeder->setCommand($this);
        $res = $seeder->run();
        $this->info(json_encode($res, JSON_PRETTY_PRINT));
        return 0;
    }
}
