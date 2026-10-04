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

        // Jika sebelumnya sempat dinonaktifkan, aktifkan kembali
        if (!$supplier->aktif) {
            $supplier->update(['aktif' => true]);
        }

        return response()->json($supplier, 201);
    }

    public function update(Request $r, Supplier $supplier)
    {
        $data = $r->validate([
            'nama' => 'required|string|max:255',
            'kontak' => 'nullable|string|max:100',
            'telepon' => 'nullable|string|max:50',
            'alamat' => 'nullable|string',
            'is_pkp' => 'boolean',
        ]);

        $namaLama = $supplier->nama;
        $namaBaru = trim($data['nama']);

        $supplier->update([
            'nama' => $namaBaru,
            'kontak' => $data['kontak'] ?? $supplier->kontak,
            'telepon' => $data['telepon'] ?? $supplier->telepon,
            'alamat' => $data['alamat'] ?? $supplier->alamat,
            'is_pkp' => $data['is_pkp'] ?? $supplier->is_pkp,
        ]);

        // Sinkronkan nama supplier di seluruh riwayat penerimaan
        if ($namaLama !== $namaBaru) {
            \App\Models\Penerimaan::where('supplier_id', $supplier->id)
                ->orWhere('nama_supplier', $namaLama)
                ->update(['nama_supplier' => $namaBaru]);
        }

        return response()->json($supplier);
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->update(['aktif' => false]);
        return response()->noContent();
    }
}
