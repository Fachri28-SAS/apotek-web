<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Penerimaan extends Model
{
    protected $table = 'penerimaan';

    protected $fillable = [
        'supplier_id', 'nama_supplier', 'no_faktur', 'tanggal_terima', 'tanggal_jatuh_tempo',
        'tempo_label', 'is_pkp', 'persen_ppn', 'subtotal', 'diskon_faktur_rp',
        'diskon_faktur_persen', 'subtotal_setelah_diskon', 'dpp', 'ppn', 'total',
        'status_bayar', 'tanggal_bayar', 'user_id',
    ];

    protected $casts = [
        'tanggal_terima' => 'date',
        'tanggal_jatuh_tempo' => 'date',
        'tanggal_bayar' => 'date',
        'is_pkp' => 'boolean',
    ];

    public function items()
    {
        return $this->hasMany(PenerimaanItem::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}
