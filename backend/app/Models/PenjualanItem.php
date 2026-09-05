<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PenjualanItem extends Model
{
    protected $table = 'penjualan_item';

    // Tabel ini tidak punya kolom created_at/updated_at (lihat migration)
    public $timestamps = false;

    protected $fillable = [
        'penjualan_id', 'obat_id', 'obat_satuan_id', 'nama_obat', 'nama_satuan',
        'nomor_batch', 'faktor', 'qty', 'harga_beli', 'harga_asli', 'harga_jual', 'tuslah', 'diskon', 'subtotal',
    ];

    protected $casts = [
        'harga_beli' => 'float',
        'harga_asli' => 'float',
        'harga_jual' => 'float',
        'tuslah' => 'float',
        'diskon' => 'float',
        'subtotal' => 'float',
    ];

    public function penjualan()
    {
        return $this->belongsTo(Penjualan::class);
    }

    public function obat()
    {
        return $this->belongsTo(Obat::class);
    }
}
