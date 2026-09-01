<?php

namespace App\Http\Controllers;

use App\Models\ObatSatuan;
use App\Models\Pembayaran;
use App\Models\Penjualan;
use App\Services\QrisService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TokoController extends Controller
{
    /**
     * POST /api/toko/checkout
     * PUBLIK — tidak perlu login (pembeli checkout tanpa akun).
     *
     * PENTING: harga diambil dari DATABASE server (obat_satuan.harga_jual),
     * BUKAN dari angka yang dikirim browser.
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

                // Obat resep TIDAK boleh dibeli langsung tanpa staf
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

            // Kode tracking acak 8 karakter alfanumerik (uppercase) unik untuk akses publik tanpa login
            $kodeTracking = Penjualan::generateKodeTracking();

            // Status 'pending' — STOK BELUM DIPOTONG sampai kasir konfirmasi Lunas
            $penjualan = Penjualan::create([
                'no_struk' => 'SEMENTARA-' . uniqid(),
                'kode_tracking' => $kodeTracking,
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
                'kode_tracking' => $kodeTracking,
                'no_struk' => $noStruk,
                'total' => $subtotal,
                'qris_dinamis' => QrisService::generateDynamic($subtotal),
            ], 201);
        });
    }

    /**
     * GET /api/pesanan/{kode_tracking}
     * PUBLIK — Detail pesanan untuk halaman /pesanan/:kodeTracking
     * Hanya bisa diakses dengan mengetahui kode_tracking yang tepat.
     */
    public function showByTracking(string $kode_tracking)
    {
        $penjualan = Penjualan::where('kode_tracking', strtoupper($kode_tracking))
            ->with(['items', 'pembayaran'])
            ->firstOrFail();

        $pembayaran = $penjualan->pembayaran;

        return response()->json([
            'kode_tracking' => $penjualan->kode_tracking,
            'no_struk' => $penjualan->no_struk,
            'nama_pembeli' => $penjualan->nama_pembeli,
            'telepon_pembeli' => $penjualan->telepon_pembeli,
            'alamat_kirim' => $penjualan->alamat_kirim,
            'total' => (float) $penjualan->total,
            'subtotal' => (float) $penjualan->subtotal,
            'status_penjualan' => $penjualan->status,
            'created_at' => $penjualan->created_at,
            'items' => $penjualan->items->map(fn ($it) => [
                'id' => $it->id,
                'nama_obat' => $it->nama_obat,
                'nama_satuan' => $it->nama_satuan,
                'qty' => (int) $it->qty,
                'harga_jual' => (float) $it->harga_jual,
                'subtotal' => (float) $it->subtotal,
            ]),
            'pembayaran' => $pembayaran ? [
                'id' => $pembayaran->id,
                'status' => $pembayaran->status,
                'jumlah' => (float) $pembayaran->jumlah,
                'nominal_klaim_customer' => $pembayaran->nominal_klaim_customer ? (float) $pembayaran->nominal_klaim_customer : null,
                'catatan_verifikasi' => $pembayaran->catatan_verifikasi,
                'qris_dinamis' => QrisService::generateDynamic($pembayaran->jumlah),
                'bukti_url' => $pembayaran->bukti_path ? asset('storage/' . $pembayaran->bukti_path) : null,
                'sudah_upload_bukti' => !empty($pembayaran->bukti_path),
                'expired_at' => $pembayaran->expired_at,
            ] : null,
        ]);
    }

    /**
     * GET /api/pesanan/{kode_tracking}/status
     * PUBLIK — Polling status super cepat dan ringan setiap 5 detik.
     */
    public function statusByTracking(string $kode_tracking)
    {
        $penjualan = Penjualan::where('kode_tracking', strtoupper($kode_tracking))
            ->with('pembayaran')
            ->firstOrFail();

        $pembayaran = $penjualan->pembayaran;

        return response()->json([
            'kode_tracking' => $penjualan->kode_tracking,
            'status_penjualan' => $penjualan->status,
            'status_pembayaran' => $pembayaran?->status ?? 'pending',
            'sudah_upload_bukti' => !empty($pembayaran?->bukti_path),
            'catatan_verifikasi' => $pembayaran?->catatan_verifikasi,
            'paid_at' => $pembayaran?->paid_at,
        ]);
    }

    /**
     * POST /api/pesanan/{kode_tracking}/bukti
     * PUBLIK — Upload bukti transfer QRIS via kode_tracking.
     */
    public function uploadBuktiByTracking(Request $r, string $kode_tracking)
    {
        $penjualan = Penjualan::where('kode_tracking', strtoupper($kode_tracking))
            ->with('pembayaran')
            ->firstOrFail();

        $pembayaran = $penjualan->pembayaran;
        if (!$pembayaran) {
            abort(404, 'Data pembayaran tidak ditemukan.');
        }

        if (!in_array($pembayaran->status, ['pending', 'menunggu_verifikasi', 'kurang_bayar'])) {
            abort(422, 'Pembayaran ini sudah tidak bisa diubah (sudah lunas atau dibatalkan).');
        }

        $data = $r->validate([
            'bukti_base64' => 'required|string',
            'nominal_klaim' => 'required|numeric|min:0',
        ]);

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
            'status' => 'menunggu_verifikasi',
            'catatan_verifikasi' => null, // Reset catatan jika customer upload ulang
        ]);

        return response()->json([
            'message' => 'Bukti pembayaran berhasil dikirim. Menunggu verifikasi kasir.',
            'status_pembayaran' => 'menunggu_verifikasi',
            'bukti_url' => asset('storage/bukti-pembayaran/' . $namaFile),
        ]);
    }

    /**
     * POST /api/toko/pembayaran/{pembayaran}/bukti (Legacy compatibility)
     */
    public function uploadBukti(Request $r, Pembayaran $pembayaran)
    {
        if (!in_array($pembayaran->status, ['pending', 'menunggu_verifikasi', 'kurang_bayar'])) {
            abort(422, 'Pembayaran ini sudah tidak bisa diubah (sudah diproses atau kadaluwarsa).');
        }

        $data = $r->validate([
            'bukti_base64' => 'required|string',
            'nominal_klaim' => 'required|numeric|min:0',
        ]);

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
            'status' => 'menunggu_verifikasi',
        ]);

        return ['message' => 'Bukti berhasil dikirim. Menunggu verifikasi kasir.'];
    }

    /**
     * GET /api/toko/pembayaran/{pembayaran} (Legacy compatibility)
     */
    public function statusPembayaran(Pembayaran $pembayaran)
    {
        return [
            'status' => $pembayaran->status,
            'sudah_upload_bukti' => !is_null($pembayaran->bukti_path),
            'catatan_verifikasi' => $pembayaran->catatan_verifikasi,
        ];
    }

    /**
     * GET /api/pesanan-cari?q=...
     * PUBLIK — Cari pesanan berdasarkan Kode Tracking ATAU Nomor HP/WhatsApp
     */
    public function cari(Request $r)
    {
        $q = trim((string) $r->input('q'));
        if (empty($q)) {
            return response()->json([]);
        }

        $cleanPhone = preg_replace('/[^0-9]/', '', $q);

        $penjualan = Penjualan::where('kode_tracking', strtoupper($q))
            ->orWhere('no_struk', strtoupper($q))
            ->when(strlen($cleanPhone) >= 4, function ($query) use ($cleanPhone) {
                $query->orWhere('telepon_pembeli', 'like', "%{$cleanPhone}%");
            })
            ->with(['pembayaran', 'items'])
            ->orderByDesc('id')
            ->limit(5)
            ->get();

        return response()->json($penjualan->map(fn ($p) => [
            'kode_tracking' => $p->kode_tracking,
            'no_struk' => $p->no_struk,
            'nama_pembeli' => $p->nama_pembeli,
            'telepon_pembeli' => $p->telepon_pembeli,
            'total' => (float) $p->total,
            'status_pembayaran' => $p->pembayaran?->status ?? 'pending',
            'created_at' => $p->created_at,
            'jumlah_item' => $p->items->sum('qty'),
        ]));
    }
}
