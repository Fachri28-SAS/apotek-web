<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pembayaran extends Model
{
    protected $table = 'pembayaran';

    protected $fillable = [
        'penjualan_id', 'provider', 'order_id', 'transaction_id', 'snap_token',
        'metode', 'jumlah', 'status', 'raw_payload', 'bukti_path',
        'nominal_klaim_customer', 'catatan_verifikasi', 'paid_at', 'expired_at',
    ];

    protected $casts = [
        'raw_payload' => 'array',
        'paid_at' => 'datetime',
        'expired_at' => 'datetime',
    ];

    public function penjualan()
    {
        return $this->belongsTo(Penjualan::class);
    }
}
