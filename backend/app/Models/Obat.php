<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Obat extends Model
{
    use SoftDeletes;

    protected $table = 'obat';

    // Tanpa ini, accessor rentang_harga, sisa_hari_exp & gambar_url TIDAK ikut muncul
    // saat model dikonversi ke JSON — cuma bisa diakses lewat PHP.
    protected $appends = ['rentang_harga', 'sisa_hari_exp', 'gambar_url'];

    protected $fillable = [
        'kode', 'nama', 'kemasan', 'satuan_dasar', 'stok', 'stok_minimum',
        'batch_aktif_id', 'nomor_batch', 'tanggal_exp', 'supplier_id',
        'perlu_resep', 'aktif_dijual', 'tampil_online', 'deskripsi', 'gambar',
    ];

    protected $casts = [
        'tanggal_exp' => 'date',
        'perlu_resep' => 'boolean',
        'aktif_dijual' => 'boolean',
        'tampil_online' => 'boolean',
    ];

    public function satuan()
    {
        // urut berdasar kolom `urutan`, satuan default (tablet/pcs) muncul duluan
        return $this->hasMany(ObatSatuan::class)->orderBy('urutan');
    }

    public function batches()
    {
        return $this->hasMany(ObatBatch::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Berapa hari lagi sampai kadaluwarsa. Null kalau tidak ada tanggal exp
     * (obat seperti alat kesehatan yang tidak expired).
     */
    public function getSisaHariExpAttribute(): ?int
    {
        if (!$this->tanggal_exp) return null;
        return (int) now()->startOfDay()->diffInDays($this->tanggal_exp, false);
    }

    /**
     * Rentang harga jual untuk ditampilkan di tabel Data Obat.
     * Obat 1 satuan -> "Rp8.000". Obat multi-satuan -> "Rp800–Rp75.000".
     */
    public function getRentangHargaAttribute(): string
    {
        $harga = $this->satuan->pluck('harga_jual');
        if ($harga->isEmpty()) return '-';
        $min = $harga->min();
        $max = $harga->max();
        $fmt = fn ($n) => 'Rp' . number_format($n, 0, ',', '.');
        return $min == $max ? $fmt($min) : $fmt($min) . '–' . $fmt($max);
    }

    public function getGambarUrlAttribute(): ?string
    {
        if (!$this->gambar) return null;
        if (str_starts_with($this->gambar, 'http://') || str_starts_with($this->gambar, 'https://')) {
            return $this->gambar;
        }
        return asset('storage/' . $this->gambar);
    }
}
