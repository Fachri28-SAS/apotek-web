<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ObatBatch extends Model
{
    protected $table = 'obat_batch';

    protected $fillable = [
        'obat_id', 'nomor_batch', 'tanggal_exp', 'stok', 'qty_masuk', 'tanggal_masuk', 'penerimaan_item_id',
    ];

    protected $casts = [
        'stok' => 'integer',
        'qty_masuk' => 'integer',
        'tanggal_exp' => 'date:Y-m-d',
        'tanggal_masuk' => 'date:Y-m-d',
    ];

    public function obat()
    {
        return $this->belongsTo(Obat::class);
    }
}
