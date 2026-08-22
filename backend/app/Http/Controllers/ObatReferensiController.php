<?php

namespace App\Http\Controllers;

use App\Models\ObatReferensi;

class ObatReferensiController extends Controller
{
    public function index()
    {
        return ObatReferensi::orderBy('nama')->get(['nama']);
    }
}
