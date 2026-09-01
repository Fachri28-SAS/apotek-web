<?php

namespace App\Services;

class QrisService
{
    // String QRIS DANA Uji Coba: Kaizren, Pembuatan Web (bisa dioverride lewat .env QRIS_STRING)
    public const STATIC_QRIS = '00020101021126570011ID.DANA.WWW011893600915303433697102090343369710303UMI51440014ID.CO.QRIS.WWW0215ID10265758603290303UMI5204899953033605802ID5922Kaizren, Pembuatan Web6015Kab. Bandung Ba6105405526304EDBC';

    /**
     * Ubah QRIS Statis menjadi QRIS Dinamis dengan nominal tagihan terkunci (Standar EMVCo Bank Indonesia).
     */
    public static function generateDynamic(float|int $amount, ?string $staticQris = null): string
    {
        $baseQris = $staticQris ?: env('QRIS_STRING', self::STATIC_QRIS);
        $qris = str_replace('010211', '010212', $baseQris);
        // 2. Buat tag 54 (nominal transaksi)
        $amountStr = (string) (int) $amount;
        $amountLength = str_pad((string) strlen($amountStr), 2, '0', STR_PAD_LEFT);
        $tag54 = '54' . $amountLength . $amountStr;

        // 3. Sisipkan tag 54 tepat sebelum tag 58 (Country Code 5802ID)
        $pos58 = strpos($qris, '5802ID');
        if ($pos58 !== false) {
            $qris = substr($qris, 0, $pos58) . $tag54 . substr($qris, $pos58);
        }

        // 4. Potong checksum lama (tag 6304XXXX di akhir)
        $pos63 = strrpos($qris, '6304');
        if ($pos63 !== false) {
            $qrisWithoutChecksum = substr($qris, 0, $pos63 + 4);
        } else {
            $qrisWithoutChecksum = $qris . '6304';
        }

        // 5. Hitung CRC16-CCITT checksum
        $crc = self::crc16($qrisWithoutChecksum);
        return $qrisWithoutChecksum . strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
    }

    /**
     * Algoritma CRC16-CCITT (Polynomial 0x1021, Init 0xFFFF) standar EMVCo QRIS.
     */
    private static function crc16(string $data): int
    {
        $crc = 0xFFFF;
        for ($i = 0; $i < strlen($data); $i++) {
            $crc ^= (ord($data[$i]) << 8);
            for ($j = 0; $j < 8; $j++) {
                if ($crc & 0x8000) {
                    $crc = (($crc << 1) ^ 0x1021) & 0xFFFF;
                } else {
                    $crc = ($crc << 1) & 0xFFFF;
                }
            }
        }
        return $crc;
    }
}
