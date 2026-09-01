<?php

namespace App\Http\Controllers;

use App\Models\Pembayaran;
use App\Services\StokService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PembayaranOnlineController extends Controller
{
    /**
     * GET /api/pembayaran-online
     * Dipolling tiap 5-10 detik oleh halaman Kasir "Pembayaran Online".
     */
    public function index(Request $r)
    {
        $this->batalkanYangKadaluwarsa();

        $query = Pembayaran::with(['penjualan.items'])
            ->whereIn('status', ['menunggu_verifikasi', 'pending', 'kurang_bayar']);

        if ($r->filled('status') && $r->status !== 'semua') {
            $query->where('status', $r->status);
        }

        $daftar = $query->orderByDesc('id')->get()->map(fn ($p) => [
            'id' => $p->id,
            'status' => $p->status,
            'jumlah' => (float) $p->jumlah,
            'sudah_upload_bukti' => !is_null($p->bukti_path),
            'bukti_url' => $p->bukti_path ? asset('storage/' . $p->bukti_path) : null,
            'nominal_klaim_customer' => $p->nominal_klaim_customer ? (float) $p->nominal_klaim_customer : null,
            'catatan_verifikasi' => $p->catatan_verifikasi,
            'expired_at' => $p->expired_at,
            'created_at' => $p->created_at,
            'penjualan' => $p->penjualan ? [
                'id' => $p->penjualan->id,
                'kode_tracking' => $p->penjualan->kode_tracking,
                'no_struk' => $p->penjualan->no_struk,
                'nama_pembeli' => $p->penjualan->nama_pembeli,
                'telepon_pembeli' => $p->penjualan->telepon_pembeli,
                'alamat_kirim' => $p->penjualan->alamat_kirim,
                'total' => (float) $p->penjualan->total,
                'items_count' => $p->penjualan->items->count(),
                'items' => $p->penjualan->items->map(fn ($it) => [
                    'id' => $it->id,
                    'nama_obat' => $it->nama_obat,
                    'nama_satuan' => $it->nama_satuan,
                    'qty' => (int) $it->qty,
                    'harga_jual' => (float) $it->harga_jual,
                    'subtotal' => (float) $it->subtotal,
                ]),
            ] : null,
        ]);

        return response()->json($daftar);
    }

    /**
     * GET /api/pembayaran-online/counter
     * Polling ringan untuk badge counter sidebar kasir.
     */
    public function counter()
    {
        $menungguVerifikasi = Pembayaran::where('status', 'menunggu_verifikasi')->count();
        $kurangBayar = Pembayaran::where('status', 'kurang_bayar')->count();
        $pending = Pembayaran::where('status', 'pending')->count();

        return response()->json([
            'menunggu_verifikasi' => $menungguVerifikasi,
            'kurang_bayar' => $kurangBayar,
            'pending' => $pending,
            'total_notifikasi' => $menungguVerifikasi,
        ]);
    }

    /**
     * POST /api/pembayaran-online/{pembayaran}/konfirmasi
     * Kasir klik "Konfirmasi Lunas" — Stok DIPOTONG di sini via StokService.
     */
    public function konfirmasi(Pembayaran $pembayaran, StokService $stok)
    {
        if (!in_array($pembayaran->status, ['pending', 'menunggu_verifikasi', 'kurang_bayar'])) {
            abort(422, 'Pembayaran ini sudah tidak berstatus pending / menunggu verifikasi.');
        }
        if (!$pembayaran->bukti_path) {
            abort(422, 'Customer belum upload bukti transfer, belum bisa dikonfirmasi.');
        }

        return DB::transaction(function () use ($pembayaran, $stok) {
            $penjualan = $pembayaran->penjualan()->with('items')->firstOrFail();

            // Potong stok masing-masing item sesuai qty x faktor satuan
            foreach ($penjualan->items as $item) {
                $stok->ubah(
                    $item->obat_id,
                    -($item->qty * $item->faktor),
                    'keluar',
                    'penjualan',
                    $penjualan->id,
                    "Pesanan Online: {$penjualan->no_struk}"
                );
            }

            $kasir = auth()->user();
            $namaKasir = $kasir ? $kasir->nama : 'Kasir';

            $penjualan->update([
                'status' => 'lunas',
                'user_id' => $kasir?->id,
                'nama_kasir' => $namaKasir,
            ]);
            $pembayaran->update([
                'status' => 'sukses',
                'paid_at' => now(),
                'catatan_verifikasi' => "Dikonfirmasi oleh: {$namaKasir}",
            ]);

            return response()->json([
                'message' => 'Pembayaran berhasil dikonfirmasi lunas dan stok telah dipotong.',
                'penjualan' => $penjualan->fresh()->load('items'),
                'pembayaran' => $pembayaran->fresh(),
            ]);
        });
    }

    /**
     * POST /api/pembayaran-online/{pembayaran}/kurang-bayar
     * Kasir klik "Tandai Kurang Bayar" (misal transfer cuma separuh harga).
     */
    public function kurangBayar(Request $r, Pembayaran $pembayaran)
    {
        if (!in_array($pembayaran->status, ['pending', 'menunggu_verifikasi', 'kurang_bayar'])) {
            abort(422, 'Pembayaran ini sudah tidak bisa diubah statusnya.');
        }

        $data = $r->validate([
            'catatan' => 'nullable|string|max:255',
        ]);

        $catatan = $data['catatan'] ?? 'Nominal pembayaran yang ditransfer kurang / tidak sesuai.';

        $pembayaran->update([
            'status' => 'kurang_bayar',
            'catatan_verifikasi' => $catatan,
        ]);

        return response()->json([
            'message' => 'Pesanan berhasil ditandai kurang bayar.',
            'pembayaran' => $pembayaran->fresh(),
        ]);
    }

    /**
     * POST /api/pembayaran-online/{pembayaran}/tolak
     * Kasir tolak dan batalkan pesanan (misal bukti transfer palsu).
     */
    public function tolak(Request $r, Pembayaran $pembayaran)
    {
        if (!in_array($pembayaran->status, ['pending', 'menunggu_verifikasi', 'kurang_bayar'])) {
            abort(422, 'Pembayaran ini sudah tidak bisa diubah statusnya.');
        }

        $data = $r->validate([
            'catatan' => 'nullable|string|max:255',
        ]);

        $catatan = $data['catatan'] ?? 'Pesanan ditolak oleh kasir.';

        $pembayaran->update([
            'status' => 'gagal',
            'catatan_verifikasi' => $catatan,
        ]);

        if ($pembayaran->penjualan) {
            $pembayaran->penjualan()->update(['status' => 'batal']);
        }

        return response()->json([
            'message' => 'Pesanan ditolak dan dibatalkan.',
            'pembayaran' => $pembayaran->fresh(),
        ]);
    }

    private function batalkanYangKadaluwarsa(): void
    {
        Pembayaran::where('status', 'pending')
            ->whereNull('bukti_path')
            ->where('expired_at', '<', now())
            ->each(function ($p) {
                $p->update(['status' => 'expired']);
                if ($p->penjualan) {
                    $p->penjualan->update(['status' => 'batal']);
                }
            });
    }
}
