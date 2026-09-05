<?php

namespace App\Http\Controllers;

use App\Models\Penjualan;
use App\Models\Pembayaran;
use App\Services\DuitkuService;
use App\Services\StokService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class DuitkuController extends Controller
{
    /**
     * POST /api/duitku/create/{kodeTracking}
     * PUBLIK — Buat transaksi invoice Duitku untuk pesanan online.
     */
    public function createInvoice(Request $request, string $kodeTracking, DuitkuService $duitku)
    {
        $penjualan = Penjualan::where('kode_tracking', strtoupper($kodeTracking))
            ->with(['items', 'pembayaran'])
            ->firstOrFail();

        if ($penjualan->status === 'lunas') {
            return response()->json([
                'status' => 'already_paid',
                'message' => 'Pesanan ini sudah lunas.',
                'kode_tracking' => $penjualan->kode_tracking,
            ]);
        }

        try {
            $paymentMethod = $request->input('payment_method'); // opsional (mis. 'NQ', 'SP', 'BC')
            $hasil = $duitku->createInvoice($penjualan, $paymentMethod);

            // Simpan / update data pembayaran ke tabel pembayaran
            $pembayaran = Pembayaran::firstOrNew(['penjualan_id' => $penjualan->id]);
            $pembayaran->fill([
                'provider' => 'duitku',
                'order_id' => $hasil['merchant_order_id'],
                'transaction_id' => $hasil['reference'],
                'snap_token' => $hasil['payment_url'],
                'qris_dinamis' => $hasil['qr_string'] ?: $pembayaran->qris_dinamis,
                'metode' => $paymentMethod ?: 'qris_duitku',
                'jumlah' => $hasil['amount'],
                'status' => 'pending',
                'expired_at' => now()->addHours(24),
            ]);
            $pembayaran->save();

            return response()->json([
                'status' => 'success',
                'payment_url' => $hasil['payment_url'],
                'qr_string' => $hasil['qr_string'] ?? null,
                'reference' => $hasil['reference'],
                'order_id' => $hasil['merchant_order_id'],
                'total' => $hasil['amount'],
                'kode_tracking' => $penjualan->kode_tracking,
            ]);
        } catch (Exception $e) {
            Log::error('Duitku createInvoice Error', [
                'kode_tracking' => $kodeTracking,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage() ?: 'Gagal membuat pembayaran Duitku',
            ], 500);
        }
    }

    /**
     * POST /api/duitku/callback
     * PUBLIK — Webhook Duitku saat pembayaran selesai dilakukan pelanggan.
     */
    public function callback(Request $request, DuitkuService $duitku, StokService $stok)
    {
        $merchantCode = $request->input('merchantCode', '');
        $amount = $request->input('amount', 0);
        $merchantOrderId = $request->input('merchantOrderId', '');
        $signature = $request->input('signature', '');
        $resultCode = $request->input('resultCode', '');
        $reference = $request->input('reference', '');
        $additionalParam = $request->input('additionalParam', ''); // kode_tracking

        Log::info('Duitku Callback Received', $request->all());

        // 1. Verifikasi Signature
        if (!$duitku->verifyCallbackSignature($merchantCode, $amount, $merchantOrderId, $signature)) {
            Log::warning('Duitku Callback: Signature Tidak Valid!', [
                'merchantOrderId' => $merchantOrderId,
                'signature_diterima' => $signature,
            ]);
            return response()->json(['status' => 'error', 'message' => 'Bad Signature'], 400);
        }

        // 2. Cari Transaksi Penjualan
        $penjualan = Penjualan::where('no_struk', $merchantOrderId)
            ->orWhere('kode_tracking', strtoupper($additionalParam))
            ->with(['items', 'pembayaran'])
            ->first();

        if (!$penjualan) {
            Log::error('Duitku Callback: Penjualan tidak ditemukan', ['merchantOrderId' => $merchantOrderId]);
            return response()->json(['status' => 'error', 'message' => 'Order Not Found'], 404);
        }

        // 3. Proses Pembayaran Sukses (resultCode == "00")
        if ($resultCode === '00') {
            DB::transaction(function () use ($penjualan, $reference, $request, $stok) {
                // Update / buat record Pembayaran
                $pembayaran = Pembayaran::firstOrNew(['penjualan_id' => $penjualan->id]);
                $pembayaran->fill([
                    'provider' => 'duitku',
                    'transaction_id' => $reference,
                    'status' => 'sukses',
                    'paid_at' => now(),
                    'raw_payload' => $request->all(),
                ]);
                $pembayaran->save();

                // Jika penjualan belum berstatus lunas, ubah dan potong stok
                if ($penjualan->status !== 'lunas') {
                    $penjualan->update(['status' => 'lunas']);

                    foreach ($penjualan->items as $item) {
                        $stok->ubah(
                            $item->obat_id,
                            -($item->qty * $item->faktor),
                            'keluar',
                            'penjualan',
                            $penjualan->id,
                            "Duitku Otomatis: {$penjualan->no_struk}"
                        );
                    }
                }
            });

            Log::info("Duitku Callback: Penjualan {$penjualan->no_struk} sukses lunas otomatis.");
            return response('OK', 200)->header('Content-Type', 'text/plain');
        }

        // 4. Pembayaran Gagal / Dibatalkan
        $pembayaran = Pembayaran::firstOrNew(['penjualan_id' => $penjualan->id]);
        $pembayaran->fill([
            'status' => 'gagal',
            'raw_payload' => $request->all(),
        ]);
        $pembayaran->save();

        Log::info("Duitku Callback: Penjualan {$penjualan->no_struk} berstatus gagal/batal ({$resultCode}).");
        return response('OK', 200)->header('Content-Type', 'text/plain');
    }
}
