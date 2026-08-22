<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ObatBatch extends Model
{
    protected $table = 'obat_batch';

    protected $fillable = [
        'obat_id', 'nomor_batch', 'tanggal_exp', 'qty_masuk', 'tanggal_masuk', 'penerimaan_item_id',
    ];

    protected $casts = [
        'tanggal_exp' => 'date',
        'tanggal_masuk' => 'date',
    ];

    public function obat()
    {
        return $this->belongsTo(Obat::class);
    }
}
