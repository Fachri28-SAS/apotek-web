import React, { useState } from "react";
import { rupiah } from "../../utils/format";
import { unduhStrukDigitalPng, cetakStrukDigital, kirimStrukWhatsApp } from "../../utils/strukDigitalHelper";

export default function KartuStrukDigital({ pesanan, items = [] }) {
  const [downloading, setDownloading] = useState(false);

  if (!pesanan) return null;

  const dataLengkap = {
    ...pesanan,
    items: items.length > 0 ? items : (pesanan.items || []),
  };

  const status = pesanan.pembayaran?.status || pesanan.status_pembayaran || "menunggu_verifikasi";
  const statusPenjualan = pesanan.status_penjualan || pesanan.status || "pending";
  const isSelesai = statusPenjualan === "selesai" || pesanan.catatan_verifikasi === "selesai";
  const isLunas = status === "sukses" || isSelesai;

  const tglTeks = pesanan.created_at
    ? new Date(pesanan.created_at).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("id-ID");

  const total = Number(pesanan.total || pesanan.subtotal || 0);

  function handleUnduh() {
    if (!isLunas) {
      alert("Struk resmi baru dapat diunduh setelah pembayaran diverifikasi dan dikonfirmasi lunas oleh kasir.");
      return;
    }
    setDownloading(true);
    try {
      unduhStrukDigitalPng(dataLengkap);
    } catch (err) {
      console.error("Gagal unduh struk:", err);
      alert("Gagal mengunduh gambar struk. Anda dapat menggunakan opsi cetak.");
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 16,
        border: "1.5px solid var(--line, #E2E8F0)",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
        maxWidth: 520,
        margin: "16px auto",
      }}
    >
      {/* Header Struk */}
      <div
        style={{
          background: "linear-gradient(135deg, #701A75 0%, #4A044E 100%)",
          color: "#FFFFFF",
          padding: "18px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.5px" }}>
          APOTEK BIMA FARMA
        </div>
        <div style={{ fontSize: 11.5, color: "#F5D0FE", marginTop: 3 }}>
          Jl. Tanimulya Raya No. 1, Ngamprah, Kab. Bandung Barat
        </div>
        <div style={{ fontSize: 11, color: "#E879F9", marginTop: 2 }}>
          WA / Layanan: 0812-2360-4900
        </div>
      </div>

      {/* Badge Status */}
      <div style={{ padding: "14px 20px 0", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: isSelesai ? "#F0FDF4" : isLunas ? "#ECFDF5" : "#FEF3C7",
            color: isSelesai ? "#15803D" : isLunas ? "#065F46" : "#B45309",
            border: isSelesai ? "1px solid #86EFAC" : isLunas ? "1px solid #A7F3D0" : "1px solid #FDE68A",
          }}
        >
          <span>{isSelesai ? "🎉" : isLunas ? "✓" : "⏳"}</span>
          <span>
            {isSelesai
              ? "Pesanan Selesai / Sudah Diserahkan"
              : isLunas
              ? "Pembayaran Terkonfirmasi (QRIS Lunas)"
              : "Bukti Terkirim — Menunggu Verifikasi Kasir"}
          </span>
        </div>
      </div>

      {/* Rincian Struk */}
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
          <span style={{ color: "var(--ink-soft, #64748B)" }}>No. Struk:</span>
          <strong style={{ color: "var(--ink, #0F172A)" }}>{pesanan.no_struk || "—"}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
          <span style={{ color: "var(--ink-soft, #64748B)" }}>Kode Tracking:</span>
          <strong style={{ color: "var(--magenta-dark, #701A75)", letterSpacing: "0.5px" }}>
            {pesanan.kode_tracking || "—"}
          </strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
          <span style={{ color: "var(--ink-soft, #64748B)" }}>Waktu:</span>
          <span style={{ color: "var(--ink, #0F172A)" }}>{tglTeks}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
          <span style={{ color: "var(--ink-soft, #64748B)" }}>Pembeli:</span>
          <strong style={{ color: "var(--ink, #0F172A)" }}>{pesanan.nama_pembeli || "Pelanggan Online"}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 12 }}>
          <span style={{ color: "var(--ink-soft, #64748B)" }}>Metode:</span>
          <span style={{ color: "#166534", fontWeight: 700 }}>QRIS Apotek Bima Farma</span>
        </div>

        {/* Garis Pemisah */}
        <div style={{ borderTop: "1px dashed var(--line, #CBD5E1)", margin: "10px 0 14px" }} />

        {/* Daftar Item Obat */}
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft, #475569)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Rincian Obat Dipesan
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {dataLengkap.items.map((it, idx) => {
            const nama = it.nama_obat || it.nama || "Obat";
            const satuan = it.nama_satuan || it.satuan || "Pcs";
            const qty = Number(it.qty || 1);
            const harga = Number(it.harga_jual || it.harga || 0);
            const subtotal = Number(it.subtotal || (qty * harga));

            return (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 12.5 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--ink, #0F172A)" }}>{nama}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft, #64748B)", marginTop: 2 }}>
                    {qty} {satuan} @ {rupiah(harga)}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: "var(--ink, #0F172A)" }}>
                  {rupiah(subtotal)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Garis Pemisah Total */}
        <div style={{ borderTop: "1px dashed var(--line, #CBD5E1)", margin: "12px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink, #0F172A)" }}>TOTAL BAYAR</span>
          <span style={{ fontSize: 19, fontWeight: 800, color: "var(--magenta-dark, #701A75)" }}>
            {rupiah(total)}
          </span>
        </div>

        {/* KONDISI 1: JIKA SUDAH DIKONFIRMASI KASIR (LUNAS) */}
        {isLunas ? (
          <>
            <div
              style={{
                background: "#F0FDF4",
                border: "1.5px solid #86EFAC",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 11.5,
                color: "#166534",
                lineHeight: 1.45,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              🎉 <strong>Pembayaran Dikonfirmasi Kasir!</strong> Simpan gambar struk ini atau tunjukkan ke kasir Apotek Bima Farma saat mengambil obat.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={handleUnduh}
                disabled={downloading}
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #701A75 0%, #A21CAF 100%)",
                  color: "#FFFFFF",
                  border: "none",
                  cursor: downloading ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(112, 26, 117, 0.25)",
                }}
              >
                <span>📥</span>
                <span>{downloading ? "Menyiapkan Gambar…" : "Simpan Gambar Struk ke Galeri HP"}</span>
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => cetakStrukDigital(dataLengkap)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: "#F8FAFC",
                    color: "#334155",
                    border: "1.5px solid #CBD5E1",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span>🖨️</span>
                  <span>Cetak / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => kirimStrukWhatsApp(dataLengkap)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: "#ECFDF5",
                    color: "#065F46",
                    border: "1.5px solid #A7F3D0",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span>📲</span>
                  <span>Kirim ke WA Kasir</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* KONDISI 2: JIKA MASIH MENUNGGU VERIFIKASI KASIR */
          <div>
            <div
              style={{
                background: "#FEF3C7",
                border: "1.5px solid #FCD34D",
                borderRadius: 12,
                padding: "14px 16px",
                textAlign: "center",
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>⏳</div>
              <div style={{ fontWeight: 800, color: "#92400E", fontSize: 13.5 }}>
                Menunggu Konfirmasi Kasir
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#78350F", lineHeight: 1.45 }}>
                Bukti pembayaran Anda sudah masuk ke antrean kasir. Tombol <strong>Simpan Struk Resmi</strong> akan otomatis aktif setelah kasir apotek memverifikasi dan mengonfirmasi lunas pembayaran Anda.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                disabled
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: "#F1F5F9",
                  color: "#94A3B8",
                  border: "1.5px dashed #CBD5E1",
                  cursor: "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                title="Struk resmi baru bisa diunduh setelah dikonfirmasi lunas oleh kasir apotek"
              >
                <span>🔒</span>
                <span>Struk Resmi Tersedia Setelah Dikonfirmasi Kasir</span>
              </button>

              <button
                type="button"
                onClick={() => kirimStrukWhatsApp(dataLengkap)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#ECFDF5",
                  color: "#065F46",
                  border: "1.5px solid #A7F3D0",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>📲</span>
                <span>Hubungi / Konfirmasi ke WA Kasir (0812-2360-4900)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
