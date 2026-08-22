<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ObatSatuan extends Model
{
    protected $table = 'obat_satuan';

    protected $fillable = [
        'obat_id', 'nama_satuan', 'faktor', 'harga_beli', 'harga_jual', 'is_default', 'urutan',
    ];

    public function obat()
    {
        return $this->belongsTo(Obat::class);
    }
}
