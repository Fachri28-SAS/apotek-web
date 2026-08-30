<?php

namespace App\Http\Controllers;

use App\Models\Pembayaran;
use App\Services\StokService;
use Illuminate\Http\Request;

class PembayaranOnlineController extends Controller
{
    /**
     * GET /api/pembayaran-online
     * Dipolling tiap 5 detik oleh menu "Pembayaran Online" di Kasir.
     *
     * Sekalian membersihkan pesanan yang sudah lewat 24 jam tanpa bukti —
     * dicek di sini (bukan cuma andalkan scheduler) supaya tetap jalan
     * walau cron belum sempat di-setup di server.
     */
    public function index()
    {
        $this->batalkanYangKadaluwarsa();

        return Pembayaran::with('penjualan')
            ->where('status', 'pending')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'jumlah' => $p->jumlah,
                'sudah_upload_bukti' => !is_null($p->bukti_path),
                'bukti_url' => $p->bukti_path ? asset('storage/' . $p->bukti_path) : null,
                'nominal_klaim_customer' => $p->nominal_klaim_customer,
                'expired_at' => $p->expired_at,
                'created_at' => $p->created_at,
                'penjualan' => [
                    'id' => $p->penjualan->id,
                    'no_struk' => $p->penjualan->no_struk,
                    'nama_pembeli' => $p->penjualan->nama_pembeli,
                    'telepon_pembeli' => $p->penjualan->telepon_pembeli,
                    'total' => $p->penjualan->total,
                    'items_count' => $p->penjualan->items()->count(),
                ],
            ]);
    }

    /**
     * POST /api/pembayaran-online/{pembayaran}/konfirmasi
     * Kasir klik "Sudah Bayar" — INI baru saatnya stok dipotong.
     */
    public function konfirmasi(Pembayaran $pembayaran, StokService $stok)
    {
        if ($pembayaran->status !== 'pending') {
            abort(422, 'Pembayaran ini sudah tidak berstatus pending.');
        }
        if (!$pembayaran->bukti_path) {
            abort(422, 'Customer belum upload bukti transfer, belum bisa dikonfirmasi.');
        }

        $penjualan = $pembayaran->penjualan()->with('items')->first();

        foreach ($penjualan->items as $item) {
            $stok->ubah(
                $item->obat_id,
                -($item->qty * $item->faktor),
                'keluar',
                'penjualan',
                $penjualan->id
            );
        }

        $penjualan->update(['status' => 'lunas']);
        $pembayaran->update(['status' => 'sukses', 'paid_at' => now()]);

        return $penjualan->fresh()->load('items');
    }

    /**
     * POST /api/pembayaran-online/{pembayaran}/tolak
     * Kasir tolak (misal nominal di bukti tidak sesuai).
     */
    public function tolak(Request $r, Pembayaran $pembayaran)
    {
        if ($pembayaran->status !== 'pending') {
            abort(422, 'Pembayaran ini sudah tidak berstatus pending.');
        }

        $pembayaran->update(['status' => 'gagal']);
        $pembayaran->penjualan()->update(['status' => 'batal']);

        return ['message' => 'Pesanan ditolak dan dibatalkan.'];
    }

    private function batalkanYangKadaluwarsa(): void
    {
        Pembayaran::where('status', 'pending')
            ->whereNull('bukti_path')
            ->where('expired_at', '<', now())
            ->each(function ($p) {
                $p->update(['status' => 'expired']);
                $p->penjualan()->update(['status' => 'batal']);
            });
    }
}
