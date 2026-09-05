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
     * Mengambil daftar pesanan toko online yang SUDAH LUNAS (via Duitku).
     */
    public function index(Request $r)
    {
        $this->batalkanYangKadaluwarsa();

        // Hanya pesanan yang pembayaran SUDAH SUKSES / LUNAS
        $query = Pembayaran::with(['penjualan.items'])
            ->where('status', 'sukses');

        $tab = $r->input('tab', 'perlu_disiapkan');

        if ($tab === 'perlu_disiapkan') {
            $query->where(function ($q) {
                $q->whereNull('catatan_verifikasi')
                  ->orWhere('catatan_verifikasi', '!=', 'selesai');
            });
        } elseif ($tab === 'selesai') {
            $query->where('catatan_verifikasi', 'selesai');
        }

        $daftar = $query->orderByDesc('id')->get()->map(fn ($p) => [
            'id' => $p->id,
            'status' => $p->status,
            'status_pembayaran' => $p->status,
            'status_penjualan' => $p->catatan_verifikasi === 'selesai' ? 'selesai' : ($p->penjualan?->status ?? 'lunas'),
            'metode' => $p->metode ?: 'Duitku',
            'provider' => $p->provider,
            'jumlah' => (float) $p->jumlah,
            'paid_at' => $p->paid_at ?? $p->updated_at,
            'created_at' => $p->created_at,
            'penjualan' => $p->penjualan ? [
                'id' => $p->penjualan->id,
                'kode_tracking' => $p->penjualan->kode_tracking,
                'no_struk' => $p->penjualan->no_struk,
                'nama_pembeli' => $p->penjualan->nama_pembeli,
                'telepon_pembeli' => $p->penjualan->telepon_pembeli,
                'alamat_kirim' => $p->penjualan->alamat_kirim,
                'status' => $p->catatan_verifikasi === 'selesai' ? 'selesai' : $p->penjualan->status,
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
     * Polling ringan untuk badge counter sidebar kasir: pesanan lunas yang perlu disiapkan.
     */
    public function counter()
    {
        $perluDisiapkan = Pembayaran::where('status', 'sukses')
            ->where(function ($q) {
                $q->whereNull('catatan_verifikasi')
                  ->orWhere('catatan_verifikasi', '!=', 'selesai');
            })
            ->count();

        return response()->json([
            'menunggu_verifikasi' => $perluDisiapkan,
            'perlu_disiapkan' => $perluDisiapkan,
            'total_notifikasi' => $perluDisiapkan,
        ]);
    }

    /**
     * POST /api/pembayaran-online/{pembayaran}/tandai-selesai
     * Kasir menandai obat sudah disiapkan / sudah diserahkan kepada pembeli.
     */
    public function tandaiSelesai(Pembayaran $pembayaran, StokService $stok)
    {
        $penjualan = $pembayaran->penjualan;
        if (!$penjualan) {
            abort(404, 'Data penjualan tidak ditemukan.');
        }

        // Tandai status selesai pada pembayaran tanpa merusak enum penjualan.status
        $pembayaran->update([
            'catatan_verifikasi' => 'selesai',
        ]);

        // Pastikan penjualan berstatus 'lunas' agar selalu tampil di Riwayat Penjualan & Laporan
        if ($penjualan->status !== 'lunas') {
            $kasir = auth()->user();
            $penjualan->update([
                'status' => 'lunas',
                'user_id' => $kasir?->id ?? $penjualan->user_id,
                'nama_kasir' => $penjualan->nama_kasir ?: ($kasir?->nama ?? 'Kasir'),
            ]);

            // Potong stok jika belum terpotong
            foreach ($penjualan->items as $item) {
                $stok->ubah(
                    $item->obat_id,
                    -($item->qty * $item->faktor),
                    'keluar',
                    'penjualan',
                    $penjualan->id,
                    "Pesanan Online Selesai: {$penjualan->no_struk}"
                );
            }
        }

        return response()->json([
            'message' => 'Pesanan berhasil ditandai selesai / sudah diserahkan ke pembeli.',
            'penjualan' => $penjualan->fresh()->load('items'),
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
