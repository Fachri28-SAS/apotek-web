<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $fillable = ['nama', 'telepon', 'sales_nama', 'alamat', 'is_pkp', 'aktif'];

    public function obat()
    {
        return $this->hasMany(Obat::class);
    }
}
