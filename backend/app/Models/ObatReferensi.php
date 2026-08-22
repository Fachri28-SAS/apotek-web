<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ObatReferensi extends Model
{
    public $timestamps = false;

    protected $fillable = ['nama', 'golongan', 'perlu_resep'];

    protected $casts = ['perlu_resep' => 'boolean'];
}
