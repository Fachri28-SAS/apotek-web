import { useState, useMemo } from "react";
import { api } from "../../../lib/api";
import { rupiah } from "../../../utils/format";
import { tambahLogPerubahan } from "../../../lib/auditLog";
import { useAuth } from "../../../context/useAuth";

export default function EditPenerimaanModal({
  penerimaan,
  supplierList = [],
  onClose,
  onSukses,
  onHapus,
}) {
  const { user } = useAuth();

  const [namaSupplier, setNamaSupplier] = useState(penerimaan.nama_supplier || "");
  const [supplierId, setSupplierId] = useState(penerimaan.supplier_id || "");
  const [updateMasterPbf, setUpdateMasterPbf] = useState(true);

  const [noFaktur, setNoFaktur] = useState(penerimaan.no_faktur || "");
  const [tanggalTerima, setTanggalTerima] = useState(
    penerimaan.tanggal_terima ? penerimaan.tanggal_terima.substring(0, 10) : ""
  );
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState(
    penerimaan.tanggal_jatuh_tempo ? penerimaan.tanggal_jatuh_tempo.substring(0, 10) : ""
  );
  const [isPkp, setIsPkp] = useState(Boolean(penerimaan.is_pkp));
  const [diskonFakturRp, setDiskonFakturRp] = useState(Number(penerimaan.diskon_faktur_rp || 0));
  const [diskonFakturPersen, setDiskonFakturPersen] = useState(Number(penerimaan.diskon_faktur_persen || 0));

  // Items editable
  const [items, setItems] = useState(() => {
    return (penerimaan.items || []).map((it) => ({
      id: it.id,
      nama_obat: it.nama_obat || "Obat",
      nama_satuan: it.nama_satuan || "Satuan",
      qty: Number(it.qty || 1),
      harga_beli: Number(it.harga_beli || 0),
      diskon: Number(it.diskon || 0),
      nomor_batch: it.nomor_batch || "",
      tanggal_exp: it.tanggal_exp ? it.tanggal_exp.substring(0, 10) : "",
    }));
  });

  const [loading, setLoading] = useState(false);
  const [hapusLoading, setHapusLoading] = useState(false);
  const [error, setError] = useState("");

  // Live calculation
  const kalkulasi = useMemo(() => {
    const subtotalKotor = items.reduce((sum, it) => {
      const itemSub = Math.max(Number(it.qty || 0) * Number(it.harga_beli || 0) - Number(it.diskon || 0), 0);
      return sum + itemSub;
    }, 0);

    const discRp = Number(diskonFakturRp) || 0;
    const discPct = Number(diskonFakturPersen) || 0;
    const totalDiskon = discRp + Math.round((subtotalKotor * discPct) / 100);
    const dpp = Math.max(subtotalKotor - totalDiskon, 0);

    const persenPpn = 11;
    const ppn = isPkp ? Math.round((dpp * persenPpn) / 100) : 0;
    const totalBesarUang = dpp + ppn;

    return { subtotalKotor, totalDiskon, dpp, ppn, totalBesarUang };
  }, [items, isPkp, diskonFakturRp, diskonFakturPersen]);

  function handleItemChange(idx, field, value) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!namaSupplier.trim()) {
      setError("Nama PBF / Supplier wajib diisi.");
      return;
    }
    if (!noFaktur.trim()) {
      setError("Nomor Faktur wajib diisi.");
      return;
    }
    if (!tanggalTerima) {
      setError("Tanggal terima barang wajib diisi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        nama_supplier: namaSupplier.trim(),
        supplier_id: supplierId || null,
        update_master_pbf: updateMasterPbf,
        no_faktur: noFaktur.trim(),
        tanggal_terima: tanggalTerima,
        tanggal_jatuh_tempo: tanggalJatuhTempo || null,
        is_pkp: isPkp,
        diskon_faktur_rp: Number(diskonFakturRp) || 0,
        diskon_faktur_persen: Number(diskonFakturPersen) || 0,
        items: items.map((it) => ({
          id: it.id,
          qty: Number(it.qty),
          harga_beli: Number(it.harga_beli),
          diskon: Number(it.diskon),
          nomor_batch: it.nomor_batch.trim() || null,
          tanggal_exp: it.tanggal_exp || null,
        })),
      };

      const res = await api(`/penerimaan/${penerimaan.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const namaAkun = user?.nama || user?.username || "Petugas";
      tambahLogPerubahan({
        nama_akun: namaAkun,
        role_akun: user?.role || "admin",
        kategori: "Penerimaan Barang",
        aksi: "Edit Faktur",
        judul: `Koreksi Faktur #${noFaktur}`,
        sebelum: `PBF: ${penerimaan.nama_supplier}, Total: ${rupiah(penerimaan.total)}`,
        sesudah: `PBF: ${namaSupplier}, Total: ${rupiah(kalkulasi.totalBesarUang)}`,
        keterangan: `Koreksi penerimaan & besar uang oleh ${namaAkun}`,
      });

      onSukses(res);
      onClose();
    } catch (err) {
      setError(err.message || "Gagal menyimpan perubahan faktur.");
    } finally {
      setLoading(false);
    }
  }

  async function handleHapus() {
    const konfirmasi = confirm(
      `PERINGATAN: Apakah Anda yakin ingin MENGHAPUS faktur "${noFaktur}" dari "${penerimaan.nama_supplier}"?\n\nStok obat yang masuk dari faktur ini akan otomatis ditarik kembali.`
    );
    if (!konfirmasi) return;

    setHapusLoading(true);
    setError("");

    try {
      await api(`/penerimaan/${penerimaan.id}`, { method: "DELETE" });

      const namaAkun = user?.nama || user?.username || "Petugas";
      tambahLogPerubahan({
        nama_akun: namaAkun,
        role_akun: user?.role || "admin",
        kategori: "Penerimaan Barang",
        aksi: "Hapus Faktur",
        judul: `Hapus Faktur #${noFaktur}`,
        sebelum: `Total ${rupiah(penerimaan.total)}`,
        sesudah: "Dihapus",
        keterangan: `Faktur dihapus oleh ${namaAkun}`,
      });

      if (onHapus) onHapus(penerimaan.id);
      onClose();
    } catch (err) {
      setError(err.message || "Gagal menghapus faktur.");
    } finally {
      setHapusLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          maxWidth: 820,
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: "1.5px solid #E2E8F0",
            background: "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#7E22CE" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#581C87", margin: 0 }}>
                Edit / Koreksi Penerimaan Barang
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#6B21A8",
                  background: "#EDE9FE",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                #{penerimaan.no_faktur}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#7E22CE", marginTop: 2 }}>
              Ubah nama PBF, nomor faktur, harga beli, atau jumlah barang untuk membetulkan besar uang
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#EDE9FE",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#581C87",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "20px 22px", flex: 1 }}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "#FEF2F2",
                border: "1.5px solid #FCA5A5",
                borderRadius: 10,
                color: "#991B1B",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {/* Bagian 1: Nama PBF / Supplier */}
          <div
            style={{
              background: "#FAF5FF",
              border: "1.5px solid #E9D5FF",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: "#6B21A8", marginBottom: 8 }}>
              INFORMASI PBF / SUPPLIER
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                  Nama PBF (Bisa Diketik Langsung atau Pilih):
                </label>
                <input
                  type="text"
                  list="daftar-pbf-edit"
                  value={namaSupplier}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNamaSupplier(val);
                    const match = supplierList.find(
                      (s) => s.nama.toLowerCase() === val.toLowerCase()
                    );
                    if (match) {
                      setSupplierId(match.id);
                    }
                  }}
                  placeholder="Contoh: PT Alida"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #D8B4FE",
                    fontSize: 13.5,
                    fontWeight: 700,
                    outline: "none",
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                  required
                />
                <datalist id="daftar-pbf-edit">
                  {supplierList.map((s) => (
                    <option key={s.id} value={s.nama} />
                  ))}
                </datalist>
              </div>

              <div style={{ paddingTop: 22 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#581C87",
                    cursor: "pointer",
                  }}
                  title="Jika dicentang, nama supplier di Master PBF dan seluruh faktur dengan nama lama akan ikut disinkronkan"
                >
                  <input
                    type="checkbox"
                    checked={updateMasterPbf}
                    onChange={(e) => setUpdateMasterPbf(e.target.checked)}
                    style={{ cursor: "pointer", width: 16, height: 16 }}
                  />
                  <span>Sinkronkan ke Master PBF & Faktur Lain</span>
                </label>
              </div>
            </div>
          </div>

          {/* Bagian 2: Data Faktur */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1.5px solid #E2E8F0",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1E293B", marginBottom: 10 }}>
              INFORMASI FAKTUR & TANGGAL
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                  No. Faktur:
                </label>
                <input
                  type="text"
                  value={noFaktur}
                  onChange={(e) => setNoFaktur(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1.5px solid #CBD5E1",
                    fontSize: 13,
                    fontWeight: 600,
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                  Tgl Terima / Faktur:
                </label>
                <input
                  type="date"
                  value={tanggalTerima}
                  onChange={(e) => setTanggalTerima(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1.5px solid #CBD5E1",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                  Tgl Jatuh Tempo:
                </label>
                <input
                  type="date"
                  value={tanggalJatuhTempo}
                  onChange={(e) => setTanggalJatuhTempo(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1.5px solid #CBD5E1",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "center", paddingTop: 6 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: isPkp ? "#6B21A8" : "#475569",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isPkp}
                  onChange={(e) => setIsPkp(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span>Kena Pajak PPN 11% (Faktur PKP)</span>
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                <span style={{ color: "#64748B", fontWeight: 600 }}>Diskon Faktur (Rp):</span>
                <input
                  type="number"
                  min="0"
                  value={diskonFakturRp}
                  onChange={(e) => setDiskonFakturRp(Number(e.target.value) || 0)}
                  style={{
                    width: 100,
                    padding: "5px 8px",
                    borderRadius: 6,
                    border: "1.5px solid #CBD5E1",
                    fontSize: 12.5,
                    textAlign: "right",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bagian 3: Rincian Barang & Besar Uang */}
          <div
            style={{
              background: "#fff",
              border: "1.5px solid #E2E8F0",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1E293B" }}>
                RINCIAN BARANG & BESAR UANG ({items.length} Item)
              </div>
              <span style={{ fontSize: 11.5, color: "#64748B" }}>
                Koreksi Harga Beli / Qty otomatis menghitung ulang Total
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F1F5F9", color: "#334155", textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", borderRadius: "6px 0 0 6px" }}>Nama Obat</th>
                    <th style={{ padding: "8px 8px", width: 75, textAlign: "center" }}>Qty</th>
                    <th style={{ padding: "8px 8px", width: 110, textAlign: "right" }}>Harga Beli</th>
                    <th style={{ padding: "8px 8px", width: 90, textAlign: "right" }}>Diskon</th>
                    <th style={{ padding: "8px 8px", width: 90 }}>No. Batch</th>
                    <th style={{ padding: "8px 8px", width: 110 }}>EXP</th>
                    <th style={{ padding: "8px 10px", width: 110, textAlign: "right", borderRadius: "0 6px 6px 0" }}>
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const subtotalItem = Math.max(
                      Number(it.qty || 0) * Number(it.harga_beli || 0) - Number(it.diskon || 0),
                      0
                    );
                    return (
                      <tr key={it.id || idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "#1E293B" }}>
                          {it.nama_obat}
                          <span style={{ display: "block", fontSize: 10.5, color: "#64748B", fontWeight: 500 }}>
                            Satuan: {it.nama_satuan}
                          </span>
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={it.qty}
                            onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              borderRadius: 6,
                              border: "1px solid #CBD5E1",
                              textAlign: "center",
                              fontSize: 12,
                              fontWeight: 700,
                              boxSizing: "border-box",
                            }}
                            required
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "right" }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.harga_beli}
                            onChange={(e) => handleItemChange(idx, "harga_beli", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              borderRadius: 6,
                              border: "1.5px solid #D8B4FE",
                              textAlign: "right",
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#581C87",
                              boxSizing: "border-box",
                            }}
                            required
                          />
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "right" }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.diskon}
                            onChange={(e) => handleItemChange(idx, "diskon", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              borderRadius: 6,
                              border: "1px solid #CBD5E1",
                              textAlign: "right",
                              fontSize: 11.5,
                              boxSizing: "border-box",
                            }}
                          />
                        </td>
                        <td style={{ padding: "8px 6px" }}>
                          <input
                            type="text"
                            value={it.nomor_batch}
                            onChange={(e) => handleItemChange(idx, "nomor_batch", e.target.value)}
                            placeholder="Batch"
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              borderRadius: 6,
                              border: "1px solid #CBD5E1",
                              fontSize: 11,
                              fontFamily: "monospace",
                              boxSizing: "border-box",
                            }}
                          />
                        </td>
                        <td style={{ padding: "8px 6px" }}>
                          <input
                            type="date"
                            value={it.tanggal_exp}
                            onChange={(e) => handleItemChange(idx, "tanggal_exp", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              borderRadius: 6,
                              border: "1px solid #CBD5E1",
                              fontSize: 11,
                              boxSizing: "border-box",
                            }}
                          />
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "#1E293B" }}>
                          {rupiah(subtotalItem)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bagian 4: Ringkasan Kalkulasi Besar Uang Otomatis */}
          <div
            style={{
              background: "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)",
              border: "1.5px solid #D8B4FE",
              borderRadius: 14,
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#6B21A8", textTransform: "uppercase" }}>
                Rincian Akumulasi Faktur:
              </div>
              <div style={{ fontSize: 12.5, color: "#4B5563", marginTop: 4, display: "flex", gap: 14 }}>
                <span>Subtotal: <strong>{rupiah(kalkulasi.subtotalKotor)}</strong></span>
                {kalkulasi.totalDiskon > 0 && (
                  <span>Diskon: <strong style={{ color: "#DC2626" }}>-{rupiah(kalkulasi.totalDiskon)}</strong></span>
                )}
                <span>DPP: <strong>{rupiah(kalkulasi.dpp)}</strong></span>
                <span>PPN: <strong style={{ color: "#7E22CE" }}>+{rupiah(kalkulasi.ppn)}</strong></span>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#701A75", textTransform: "uppercase" }}>
                TOTAL BESAR UANG BARU (DPP + PPN)
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#581C87", marginTop: 2 }}>
                {rupiah(kalkulasi.totalBesarUang)}
              </div>
            </div>
          </div>

          {/* Tombol Aksi Bawah */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 22,
              paddingTop: 14,
              borderTop: "1.5px solid #E2E8F0",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={handleHapus}
              disabled={hapusLoading || loading}
              style={{
                padding: "8px 16px",
                borderRadius: 9,
                border: "1.5px solid #FCA5A5",
                background: "#FEF2F2",
                color: "#991B1B",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {hapusLoading ? "Menghapus..." : "Hapus Faktur Ini"}
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading || hapusLoading}
                style={{
                  padding: "9px 18px",
                  borderRadius: 9,
                  border: "1.5px solid #CBD5E1",
                  background: "#fff",
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={loading || hapusLoading}
                style={{
                  padding: "9px 24px",
                  borderRadius: 9,
                  border: "none",
                  background: "linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(147, 51, 234, 0.25)",
                }}
              >
                {loading ? "Menyimpan Perubahan..." : "Simpan Perubahan Faktur"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
