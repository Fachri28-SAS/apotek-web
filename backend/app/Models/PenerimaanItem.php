<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PenerimaanItem extends Model
{
    protected $table = 'penerimaan_item';

    // Tabel ini tidak punya kolom created_at/updated_at (lihat migration)
    public $timestamps = false;

    protected $fillable = [
        'penerimaan_id', 'obat_id', 'obat_satuan_id', 'nama_obat', 'nama_satuan', 'faktor',
        'qty', 'harga_beli', 'diskon', 'subtotal', 'nomor_batch', 'tanggal_exp',
        'harga_beli_sebelumnya', 'harga_jual_saat_itu', 'margin_persen',
    ];

    protected $casts = [
        'tanggal_exp' => 'date',
        'harga_beli' => 'float',
        'diskon' => 'float',
        'subtotal' => 'float',
        'harga_beli_sebelumnya' => 'float',
        'harga_jual_saat_itu' => 'float',
        'margin_persen' => 'float',
    ];

    public function penerimaan()
    {
        return $this->belongsTo(Penerimaan::class);
    }

    public function obat()
    {
        return $this->belongsTo(Obat::class);
    }
}
