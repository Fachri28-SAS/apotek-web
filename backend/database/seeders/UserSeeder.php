<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'nama' => 'Admin Bima Farma',
            'username' => 'admin',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'aktif' => true,
        ]);

        User::create([
            'nama' => 'Yunita Maysarah',
            'username' => 'yunita',
            'password' => Hash::make('kasir123'),
            'role' => 'kasir',
            'aktif' => true,
        ]);

        $this->command->info('Akun tes dibuat — admin/admin123 dan yunita/kasir123');
    }
}
