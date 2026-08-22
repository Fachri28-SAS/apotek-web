<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Penjualan extends Model
{
    protected $table = 'penjualan';

    protected $fillable = [
        'no_struk', 'no_invoice', 'user_id', 'nama_kasir', 'nama_pembeli', 'catatan',
        'subtotal', 'total_tuslah', 'diskon', 'total', 'metode_bayar', 'uang_diterima',
        'kembalian', 'sumber', 'status', 'telepon_pembeli', 'alamat_kirim', 'tanggal',
    ];

    protected $casts = ['tanggal' => 'date'];

    public function items()
    {
        return $this->hasMany(PenjualanItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
