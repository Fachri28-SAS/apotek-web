<?php

namespace App\Services;

class QrisService
{
    // String QRIS Statis Asli Apotek Bima Farma (dari Gopay / GoBiz)
    public const STATIC_QRIS = '00020101021126610014COM.GO-JEK.WWW01189360091433873061180210G3873061180303UKE51440014ID.CO.QRIS.WWW0215ID10243577536480303UKE5204591253033605802ID5925APOTEK BIMA FARMA, NGAMPR6013BANDUNG BARAT61054055262070703A016304ABD9';

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
