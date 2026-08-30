<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ObatSatuan extends Model
{
    protected $table = 'obat_satuan';

    protected $fillable = [
        'obat_id', 'nama_satuan', 'faktor', 'harga_beli', 'harga_beli_sebelumnya',
        'harga_beli_awal', 'harga_jual', 'is_default', 'urutan',
    ];

    protected $casts = [
        'harga_beli' => 'float',
        'harga_beli_sebelumnya' => 'float',
        'harga_beli_awal' => 'float',
        'harga_jual' => 'float',
    ];

    public function obat()
    {
        return $this->belongsTo(Obat::class);
    }
}
