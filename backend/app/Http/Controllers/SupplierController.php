<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index()
    {
        return Supplier::where('aktif', true)->orderBy('nama')->get();
    }

    public function store(Request $r)
    {
        $data = $r->validate([
            'nama' => 'required|string|max:255',
            'kontak' => 'nullable|string|max:100',
            'telepon' => 'nullable|string|max:50',
            'alamat' => 'nullable|string',
            'is_pkp' => 'boolean',
        ]);

        $supplier = Supplier::firstOrCreate(
            ['nama' => trim($data['nama'])],
            [
                'kontak' => $data['kontak'] ?? null,
                'telepon' => $data['telepon'] ?? null,
                'alamat' => $data['alamat'] ?? null,
                'is_pkp' => $data['is_pkp'] ?? false,
                'aktif' => true,
            ]
        );

        return response()->json($supplier, 201);
    }
}
