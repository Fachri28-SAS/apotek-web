<?php

namespace App\Http\Controllers;

use App\Models\ObatSatuan;
use App\Models\Pembayaran;
use App\Models\Penjualan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TokoController extends Controller
{
    /**
     * POST /api/toko/checkout
     * PUBLIK — tidak perlu login (sesuai keputusan: pembeli checkout tanpa akun).
     *
     * PENTING: harga diambil dari DATABASE server (obat_satuan.harga_jual),
     * BUKAN dari angka yang dikirim browser. Beda dengan Kasir internal
     * (yang stafnya terpercaya boleh edit harga manual), endpoint publik
     * ini harus anggap semua input harga dari client tidak bisa dipercaya.
     */
    public function checkout(Request $r)
    {
        $data = $r->validate([
            'nama_pembeli' => 'required|string|max:255',
            'telepon_pembeli' => 'required|string|max:30',
            'alamat_kirim' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.obat_satuan_id' => 'required|exists:obat_satuan,id',
            'items.*.qty' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($data) {
            $subtotal = 0;
            $itemsSiap = [];

            foreach ($data['items'] as $it) {
                $satuan = ObatSatuan::with('obat')->findOrFail($it['obat_satuan_id']);
                $obat = $satuan->obat;

                // Obat resep TIDAK boleh dibeli langsung tanpa staf — sesuai spesifikasi
                if ($obat->perlu_resep) {
                    abort(422, "\"{$obat->nama}\" perlu resep dokter, tidak bisa dibeli langsung online. Hubungi apoteker kami.");
                }
                if (!$obat->aktif_dijual || !$obat->tampil_online) {
                    abort(422, "\"{$obat->nama}\" sedang tidak tersedia.");
                }

                $subtotalItem = $it['qty'] * $satuan->harga_jual;
                $subtotal += $subtotalItem;

                $itemsSiap[] = [
                    'obat_id' => $obat->id,
                    'obat_satuan_id' => $satuan->id,
                    'nama_obat' => $obat->nama,
                    'nama_satuan' => $satuan->nama_satuan,
                    'nomor_batch' => $obat->nomor_batch,
                    'faktor' => $satuan->faktor,
                    'qty' => $it['qty'],
                    'harga_asli' => $satuan->harga_jual,
                    'harga_jual' => $satuan->harga_jual,
                    'tuslah' => 0,
                    'subtotal' => $subtotalItem,
                ];
            }

            // Status 'pending' — STOK BELUM DIPOTONG sampai kasir konfirmasi
            // "Sudah Bayar". Ini yang mencegah stok minus/terkunci gara-gara
            // pesanan yang ujung-ujungnya tidak jadi dibayar.
            $penjualan = Penjualan::create([
                'no_struk' => 'SEMENTARA-' . uniqid(),
                'user_id' => null,
                'nama_kasir' => 'Toko Online',
                'nama_pembeli' => $data['nama_pembeli'],
                'telepon_pembeli' => $data['telepon_pembeli'],
                'alamat_kirim' => $data['alamat_kirim'] ?? null,
                'subtotal' => $subtotal,
                'total_tuslah' => 0,
                'diskon' => 0,
                'total' => $subtotal,
                'metode_bayar' => 'qris',
                'sumber' => 'online',
                'status' => 'pending',
                'tanggal' => now()->toDateString(),
            ]);

            $noStruk = 'BF-' . now()->format('Ymd') . '-' . str_pad($penjualan->id, 5, '0', STR_PAD_LEFT);
            $penjualan->update(['no_struk' => $noStruk, 'no_invoice' => $noStruk]);

            foreach ($itemsSiap as $item) {
                $penjualan->items()->create($item);
            }

            $pembayaran = Pembayaran::create([
                'penjualan_id' => $penjualan->id,
                'provider' => 'manual_qris',
                'order_id' => 'QRIS-' . $penjualan->id . '-' . Str::random(6),
                'metode' => 'qris',
                'jumlah' => $subtotal,
                'status' => 'pending',
                'expired_at' => now()->addHours(24),
            ]);

            return response()->json([
                'penjualan_id' => $penjualan->id,
                'pembayaran_id' => $pembayaran->id,
                'no_struk' => $noStruk,
                'total' => $subtotal,
            ], 201);
        });
    }

    /**
     * POST /api/toko/pembayaran/{pembayaran}/bukti
     * PUBLIK — customer upload bukti transfer setelah scan QRIS.
     * Body: { "bukti_base64": "data:image/jpeg;base64,...", "nominal_klaim": 50000 }
     */
    public function uploadBukti(Request $r, Pembayaran $pembayaran)
    {
        if ($pembayaran->status !== 'pending') {
            abort(422, 'Pembayaran ini sudah tidak bisa diubah (sudah diproses atau kadaluwarsa).');
        }

        $data = $r->validate([
            'bukti_base64' => 'required|string',
            'nominal_klaim' => 'required|numeric|min:0',
        ]);

        // Decode data URI (data:image/jpeg;base64,xxxxx) jadi file gambar asli
        if (!preg_match('/^data:image\/(\w+);base64,/', $data['bukti_base64'], $tipe)) {
            abort(422, 'Format gambar tidak valid.');
        }
        $ekstensi = $tipe[1];
        $isiFile = base64_decode(substr($data['bukti_base64'], strpos($data['bukti_base64'], ',') + 1));

        $namaFile = 'bukti-' . $pembayaran->id . '-' . time() . '.' . $ekstensi;
        Storage::disk('public')->put('bukti-pembayaran/' . $namaFile, $isiFile);

        $pembayaran->update([
            'bukti_path' => 'bukti-pembayaran/' . $namaFile,
            'nominal_klaim_customer' => $data['nominal_klaim'],
        ]);

        return ['message' => 'Bukti berhasil dikirim. Menunggu verifikasi kasir.'];
    }

    /**
     * GET /api/toko/pembayaran/{pembayaran}
     * PUBLIK — dipakai halaman Toko untuk polling status ("apakah sudah dikonfirmasi kasir?")
     */
    public function statusPembayaran(Pembayaran $pembayaran)
    {
        return [
            'status' => $pembayaran->status,
            'sudah_upload_bukti' => !is_null($pembayaran->bukti_path),
        ];
    }
}
