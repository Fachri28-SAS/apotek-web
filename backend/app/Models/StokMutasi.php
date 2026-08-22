<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StokMutasi extends Model
{
    protected $table = 'stok_mutasi';
    const UPDATED_AT = null; // buku besar, tidak pernah di-update

    protected $fillable = [
        'obat_id', 'tipe', 'qty', 'stok_sebelum', 'stok_sesudah',
        'ref_type', 'ref_id', 'user_id', 'keterangan',
    ];

    public function obat()
    {
        return $this->belongsTo(Obat::class);
    }
}
