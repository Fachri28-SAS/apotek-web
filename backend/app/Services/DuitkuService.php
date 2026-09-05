<?php

namespace App\Services;

use App\Models\Penjualan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class DuitkuService
{
    protected string $merchantCode;
    protected string $apiKey;
    protected string $env;
    protected string $callbackUrl;
    protected string $returnUrl;

    public function __construct()
    {
        $this->merchantCode = config('services.duitku.merchant_code', env('DUITKU_MERCHANT_CODE', 'DS35022'));
        $this->apiKey = config('services.duitku.api_key', env('DUITKU_API_KEY', '0e6af8e653479171bb494b31170fe11b'));
        $this->env = config('services.duitku.env', env('DUITKU_ENV', 'sandbox'));
        $this->callbackUrl = config('services.duitku.callback_url', env('DUITKU_CALLBACK_URL', 'https://apotekbimafarma.com/api/duitku/callback'));
        $this->returnUrl = config('services.duitku.return_url', env('DUITKU_RETURN_URL', 'https://apotekbimafarma.com/pesanan'));
    }

    public function getInquiryUrl(): string
    {
        return $this->env === 'production'
            ? 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry'
            : 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry';
    }

    /**
     * Buat invoice pembayaran Duitku untuk suatu transaksi Penjualan.
     */
    public function createInvoice(Penjualan $penjualan, ?string $paymentMethod = null): array
    {
        $amount = (int) round($penjualan->total);
        $merchantOrderId = $penjualan->no_struk ?: ('BF-' . $penjualan->id);

        // Signature: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
        $signature = md5($this->merchantCode . $merchantOrderId . $amount . $this->apiKey);

        $returnUrl = rtrim($this->returnUrl, '/') . '/' . $penjualan->kode_tracking;

        // Rincian produk item obat
        $productDetails = 'Pembelian Obat Apotek Bima Farma (' . $penjualan->items()->count() . ' item)';
        if ($firstItem = $penjualan->items()->first()) {
            $productDetails = $firstItem->nama_obat . ($penjualan->items()->count() > 1 ? ' dkk' : '');
        }

        $params = [
            'merchantCode' => $this->merchantCode,
            'paymentAmount' => $amount,
            'merchantOrderId' => $merchantOrderId,
            'productDetails' => $productDetails,
            'email' => 'customer@apotekbimafarma.com',
            'phoneNumber' => $penjualan->telepon_pembeli ?: '081234567890',
            'additionalParam' => $penjualan->kode_tracking,
            'merchantUserInfo' => $penjualan->nama_pembeli ?: 'Pelanggan Apotek',
            'customerVaName' => $penjualan->nama_pembeli ?: 'Pelanggan Apotek',
            'callbackUrl' => $this->callbackUrl,
            'returnUrl' => $returnUrl,
            'signature' => $signature,
            'expiryPeriod' => 1440, // 24 jam (dalam menit)
        ];

        // paymentMethod wajib di Duitku v2. Default ke 'SP' (QRIS Universal yang bisa discan semua bank & e-wallet)
        $params['paymentMethod'] = $paymentMethod ?: 'SP';

        Log::info('Duitku createInvoice Request', [
            'url' => $this->getInquiryUrl(),
            'order_id' => $merchantOrderId,
            'amount' => $amount,
            'payment_method' => $params['paymentMethod'],
        ]);

        $response = Http::timeout(25)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post($this->getInquiryUrl(), $params);

        if (!$response->successful()) {
            $errBody = $response->body();
            Log::error('Duitku API HTTP error', [
                'status' => $response->status(),
                'body' => $errBody,
            ]);
            $detailMsg = '';
            $errJson = json_decode($errBody, true);
            if (!empty($errJson['Message'])) {
                $detailMsg = ': ' . $errJson['Message'];
            } elseif (!empty($errJson['statusMessage'])) {
                $detailMsg = ': ' . $errJson['statusMessage'];
            }
            throw new Exception('Gagal menghubungi gateway Duitku (HTTP ' . $response->status() . $detailMsg . ')');
        }

        $resData = $response->json();
        Log::info('Duitku createInvoice Response', $resData ?: []);

        if (($resData['statusCode'] ?? '') !== '00') {
            $msg = $resData['statusMessage'] ?? 'Terjadi kesalahan pada respon Duitku';
            throw new Exception($msg);
        }

        return [
            'payment_url' => $resData['paymentUrl'] ?? null,
            'qr_string' => $resData['qrString'] ?? null,
            'reference' => $resData['reference'] ?? null,
            'merchant_order_id' => $merchantOrderId,
            'amount' => $amount,
            'status_code' => $resData['statusCode'],
        ];
    }

    /**
     * Verifikasi keaslian signature Callback Duitku.
     * Signature Callback: MD5(merchantCode + amount + merchantOrderId + apiKey)
     */
    public function verifyCallbackSignature(string $merchantCode, int|float|string $amount, string $merchantOrderId, string $signature): bool
    {
        $calculatedSignature = md5($this->merchantCode . (int) $amount . $merchantOrderId . $this->apiKey);
        return hash_equals($calculatedSignature, $signature);
    }
}
