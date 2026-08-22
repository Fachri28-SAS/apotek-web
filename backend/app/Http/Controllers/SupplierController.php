<?php

namespace App\Http\Controllers;

use App\Models\Supplier;

class SupplierController extends Controller
{
    public function index()
    {
        return Supplier::where('aktif', true)->orderBy('nama')->get();
    }
}
