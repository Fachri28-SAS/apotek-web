<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Penjualan extends Model
{
    protected $table = 'penjualan';

    protected $fillable = [
        'no_struk', 'no_invoice', 'kode_tracking', 'user_id', 'nama_kasir', 'nama_pembeli', 'catatan',
        'subtotal', 'total_tuslah', 'diskon', 'total', 'metode_bayar', 'uang_diterima',
        'kembalian', 'sumber', 'status', 'telepon_pembeli', 'alamat_kirim', 'tanggal',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'subtotal' => 'float',
        'total_tuslah' => 'float',
        'diskon' => 'float',
        'total' => 'float',
        'uang_diterima' => 'float',
        'kembalian' => 'float',
    ];

    /**
     * Generate kode tracking acak 8 karakter alfanumerik (uppercase) yang unik.
     */
    public static function generateKodeTracking(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (self::where('kode_tracking', $code)->exists());

        return $code;
    }

    public function items()
    {
        return $this->hasMany(PenjualanItem::class);
    }

    public function pembayaran()
    {
        return $this->hasOne(Pembayaran::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

