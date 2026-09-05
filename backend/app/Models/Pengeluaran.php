<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pengeluaran extends Model
{
    protected $table = 'pengeluaran';

    protected $fillable = [
        'tanggal',
        'kategori',
        'nama_pengeluaran',
        'nominal',
        'metode_bayar',
        'keterangan',
        'user_id',
        'nama_kasir',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'nominal' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
