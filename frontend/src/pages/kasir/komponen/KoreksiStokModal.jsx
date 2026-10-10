import React, { useState } from "react";
import { api } from "../../../lib/api";
import { tambahLogPerubahan } from "../../../lib/auditLog";

export default function KoreksiStokModal({ obat, user, onBerhasil, onClose }) {
  if (!obat) return null;

  const [stokFisik, setStokFisik] = useState(String(obat.sisa ?? obat.stok ?? 0));
  const [keterangan, setKeterangan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stokSistem = Number(obat.sisa ?? obat.stok ?? 0);
  const angkaFisik = stokFisik === "" ? 0 : Number(stokFisik);
  const selisih = angkaFisik - stokSistem;

  async function handleSubmit(e) {
    e.preventDefault();
    if (stokFisik === "") {
      setError("Stok fisik wajib diisi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api("/obat/opname", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              obat_id: obat.id,
              stok_fisik: angkaFisik,
              keterangan: keterangan || "Koreksi opname fisik",
            },
          ],
        }),
      });

      const namaAkun = user?.nama || user?.username || (user?.role === "admin" ? "Admin" : "Kasir");
      tambahLogPerubahan({
        nama_akun: namaAkun,
        role_akun: user?.role || "kasir",
        kategori: "Daftar Stok Obat",
        aksi: "Koreksi Stok Fisik",
        judul: obat.nama,
        sebelum: `${stokSistem} ${obat.satuan_dasar || "Unit"}`,
        sesudah: `${angkaFisik} ${obat.satuan_dasar || "Unit"}`,
        keterangan: keterangan || `Koreksi stok fisik (selisih: ${selisih >= 0 ? "+" : ""}${selisih})`,
      });

      onBerhasil({
        obatId: obat.id,
        stokBaru: angkaFisik,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Gagal menyimpan koreksi stok.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-faktur-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-faktur-box"
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1.5px solid #E2E8F0",
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#0F172A" }}>
              Koreksi / Opname Stok Fisik
            </h3>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{obat.nama}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "1px solid #CBD5E1",
              background: "#fff",
              cursor: "pointer",
              fontWeight: "bold",
              color: "#64748B",
            }}
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: "#FEF2F2",
                color: "#DC2626",
                fontSize: 12,
                marginBottom: 14,
                border: "1px solid #FECACA",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
              Stok Sistem Saat Ini
            </label>
            <div
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                background: "#F1F5F9",
                border: "1px solid #E2E8F0",
                fontSize: 14,
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              {stokSistem} {obat.satuan_dasar || "Unit"}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
              Stok Fisik Nyata (Hasil Hitung di Rak)
            </label>
            <input
              type="number"
              min="0"
              value={stokFisik}
              onChange={(e) => setStokFisik(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1.5px solid #CBD5E1",
                fontSize: 14,
                fontWeight: 700,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: selisih === 0 ? "#F8FAFC" : selisih < 0 ? "#FEF2F2" : "#ECFDF5",
              border: `1px solid ${selisih === 0 ? "#E2E8F0" : selisih < 0 ? "#FECACA" : "#A7F3D0"}`,
              marginBottom: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Selisih Stok:</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: selisih === 0 ? "#475569" : selisih < 0 ? "#DC2626" : "#059669",
              }}
            >
              {selisih > 0 ? `+${selisih}` : selisih} {obat.satuan_dasar || "Unit"}
            </span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
              Keterangan / Alasan Koreksi
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Selisih opname fisik bulanan, barang rusak, dll..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1.5px solid #CBD5E1",
                fontSize: 12.5,
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                background: "#fff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                background: "var(--magenta, #7E22CE)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Menyimpan..." : "Simpan Koreksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
