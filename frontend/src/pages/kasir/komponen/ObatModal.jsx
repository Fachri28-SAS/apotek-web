import { useState, useEffect } from "react";
import { useAuth } from "../../../context/useAuth";
import { api } from "../../../lib/api";
import { hitungHargaJualOtomatis, hitungMarginPersen, getStatusMargin } from "../../../utils/format";
import { tambahLogPerubahan } from "../../../lib/auditLog";

function satuanKosong() {
  return { nama_satuan: "", faktor: 1, harga_beli: "", harga_jual: "" };
}

export default function ObatModal({ obat, onClose, onSelesai, onDataBerubah }) {
  const { user } = useAuth();
  const modeEdit = !!obat;

  const [namaSaran, setNamaSaran] = useState([]);
  const [supplierList, setSupplierList] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [nama, setNama] = useState(obat?.nama || "");
  const [kemasan, setKemasan] = useState(obat?.kemasan || "");
  const [satuanDasar, setSatuanDasar] = useState(obat?.satuan_dasar || "");
  const [nomorBatch, setNomorBatch] = useState(obat?.nomor_batch || "");
  const [tanggalExp, setTanggalExp] = useState(obat?.tanggal_exp?.slice(0, 10) || "");
  const [stokAwal, setStokAwal] = useState(obat?.stok ?? 0);
  const [stokMinimum, setStokMinimum] = useState(obat?.stok_minimum ?? 10);
  const [supplierId, setSupplierId] = useState(obat?.supplier_id || "");
  const [perluResep, setPerluResep] = useState(obat?.perlu_resep || false);
  const [aktifDijual, setAktifDijual] = useState(obat?.aktif_dijual ?? true);

  const [multiSatuan, setMultiSatuan] = useState((obat?.satuan?.length || 0) > 1);
  const [satuanList, setSatuanList] = useState(
    obat?.satuan?.length
      ? obat.satuan.map((s) => ({
          ...s,
          harga_beli: s.harga_beli != null && s.harga_beli !== "" ? Math.round(Number(s.harga_beli)) : "",
          harga_jual: s.harga_jual != null && s.harga_jual !== "" ? Math.round(Number(s.harga_jual)) : "",
          harga_beli_awal: s.harga_beli_awal != null && s.harga_beli_awal !== "" ? Math.round(Number(s.harga_beli_awal)) : s.harga_beli_awal,
        }))
      : [satuanKosong()]
  );
  // Mode 1-satuan pakai state terpisah biar sederhana, disatukan lagi saat submit
  const [satuanTunggal, setSatuanTunggal] = useState(
    obat?.satuan?.length === 1
      ? {
          ...obat.satuan[0],
          harga_beli: obat.satuan[0].harga_beli != null && obat.satuan[0].harga_beli !== "" ? Math.round(Number(obat.satuan[0].harga_beli)) : "",
          harga_jual: obat.satuan[0].harga_jual != null && obat.satuan[0].harga_jual !== "" ? Math.round(Number(obat.satuan[0].harga_jual)) : "",
          harga_beli_awal: obat.satuan[0].harga_beli_awal != null && obat.satuan[0].harga_beli_awal !== "" ? Math.round(Number(obat.satuan[0].harga_beli_awal)) : obat.satuan[0].harga_beli_awal,
        }
      : { nama_satuan: obat?.satuan_dasar || "", faktor: 1, harga_beli: "", harga_jual: "" }
  );

  const [gambarPreview, setGambarPreview] = useState(
    obat?.gambar_url || (obat?.gambar ? `/storage/${obat.gambar}` : "")
  );
  const [gambarBase64, setGambarBase64] = useState("");
  const [hapusGambar, setHapusGambar] = useState(false);

  function handlePilihGambar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar terlalu besar (maksimal 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setGambarPreview(ev.target.result);
      setGambarBase64(ev.target.result);
      setHapusGambar(false);
    };
    reader.readAsDataURL(file);
  }

  function handleHapusFoto() {
    setGambarPreview("");
    setGambarBase64("");
    setHapusGambar(true);
  }

  useEffect(() => {
    api("/obat-referensi").then((data) => setNamaSaran(data.map((d) => d.nama)));
    api("/suppliers").then(setSupplierList).catch(() => {});
  }, []);

  function tambahBarisSatuan() {
    setSatuanList((prev) => [...prev, satuanKosong()]);
  }

  async function hapusBarisSatuan(idx, s) {
    // Baris baru yang belum tersimpan — cukup hapus dari state lokal
    if (!s.id) {
      setSatuanList((prev) => prev.filter((_, i) => i !== idx));
      return;
    }

    // Satuan yang sudah tersimpan di database — konfirmasi dulu,
    // baru benar-benar hapus lewat API (aman, struk lama tidak
    // terpengaruh karena datanya sudah disalin ke transaksi).
    if (!window.confirm(`Hapus satuan "${s.nama_satuan}"? Ini tidak bisa dibatalkan.`)) return;

    try {
      await api(`/obat/${obat.id}/satuan/${s.id}`, { method: "DELETE" });
      setSatuanList((prev) => prev.filter((_, i) => i !== idx));
      const namaAkun = user?.nama || user?.username || (user?.role === "admin" ? "Admin" : "Kasir");
      const roleAkun = user?.role || "kasir";
      tambahLogPerubahan({
        nama_akun: namaAkun,
        role_akun: roleAkun,
        kategori: "Katalog Obat",
        aksi: "Hapus Satuan",
        judul: `${obat?.nama || "Obat"} - Satuan ${s.nama_satuan}`,
        sebelum: `Satuan: ${s.nama_satuan} (Rp ${Number(s.harga_jual || 0).toLocaleString("id-ID")})`,
        sesudah: "Dihapus",
        keterangan: `Hapus satuan obat via modal (${namaAkun})`,
      });
      onDataBerubah?.(); // refresh tabel utama di belakang layar, tanpa nutup modal ini
    } catch (err) {
      // Kalau ternyata sudah kehapus duluan (data basi), jangan tampilkan
      // error mentah dari Laravel — anggap saja sudah selesai.
      if (err.message?.includes("No query results")) {
        setSatuanList((prev) => prev.filter((_, i) => i !== idx));
        onDataBerubah?.();
      } else {
        setError(err.message);
      }
    }
  }

  function ubahBarisSatuan(idx, field, value) {
    setSatuanList((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function koreksiHargaAwal(hargaSekarang, onSimpan) {
    const input = window.prompt(
      "Koreksi Harga Awal — ini acuan tren jangka panjang, biasanya tidak perlu diubah.\nMasukkan harga awal yang benar:",
      hargaSekarang
    );
    if (input === null) return; // batal
    const angka = Number(input);
    if (isNaN(angka) || angka < 0) { alert("Masukkan angka yang valid."); return; }
    if (!window.confirm(`Ubah Harga Awal jadi Rp${angka.toLocaleString("id-ID")}? Ini akan mengubah perhitungan tren jangka panjang obat ini.`)) return;
    onSimpan(angka);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const satuanDikirim = multiSatuan
      ? satuanList.map((s) => ({
          id: s.id,
          nama_satuan: s.nama_satuan,
          faktor: Number(s.faktor) || 1,
          harga_beli: Number(s.harga_beli) || 0,
          harga_jual: Number(s.harga_jual) || 0,
          ...(s.harga_beli_awal != null ? { harga_beli_awal: Number(s.harga_beli_awal) } : {}),
        }))
      : [{
          id: satuanTunggal.id,
          nama_satuan: satuanTunggal.nama_satuan || satuanDasar,
          faktor: 1,
          harga_beli: Number(satuanTunggal.harga_beli) || 0,
          harga_jual: Number(satuanTunggal.harga_jual) || 0,
          ...(satuanTunggal.harga_beli_awal != null ? { harga_beli_awal: Number(satuanTunggal.harga_beli_awal) } : {}),
        }];

    if (satuanDikirim.some((s) => !s.nama_satuan)) {
      setError("Nama satuan tidak boleh kosong.");
      return;
    }

    setLoading(true);
    try {
      const namaAkun = user?.nama || user?.username || (user?.role === "admin" ? "Admin" : "Kasir");
      const roleAkun = user?.role || "kasir";

      if (modeEdit) {
        await api(`/obat/${obat.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nama, kemasan, nomor_batch: nomorBatch || null,
            tanggal_exp: tanggalExp || null, stok_minimum: Number(stokMinimum),
            supplier_id: supplierId || null, perlu_resep: perluResep,
            aktif_dijual: aktifDijual, satuan: satuanDikirim,
            ...(gambarBase64 ? { gambar_base64: gambarBase64 } : {}),
            ...(hapusGambar ? { hapus_gambar: true } : {}),
          }),
        });

        // Deteksi perubahan harga
        const rincianHargaLama = (obat?.satuan || [])
          .map((s) => `${s.nama_satuan}: Beli Rp${Number(s.harga_beli || 0).toLocaleString("id-ID")}, Jual Rp${Number(s.harga_jual || 0).toLocaleString("id-ID")}`)
          .join(" | ");
        const rincianHargaBaru = satuanDikirim
          .map((s) => `${s.nama_satuan}: Beli Rp${Number(s.harga_beli || 0).toLocaleString("id-ID")}, Jual Rp${Number(s.harga_jual || 0).toLocaleString("id-ID")}`)
          .join(" | ");

        const adaUbahHarga = rincianHargaLama !== rincianHargaBaru;

        // Deteksi perubahan data identitas/detail obat
        const perubahans = [];
        if (nama.trim() !== (obat.nama || "").trim()) perubahans.push(`Nama: "${obat.nama}" ➔ "${nama}"`);
        if (kemasan.trim() !== (obat.kemasan || "").trim()) perubahans.push(`Kemasan: "${obat.kemasan || "-"}" ➔ "${kemasan}"`);
        if ((nomorBatch || "").trim() !== (obat.nomor_batch || "").trim()) perubahans.push(`Batch: "${obat.nomor_batch || "-"}" ➔ "${nomorBatch || "-"}"`);
        if ((tanggalExp || "") !== (obat.tanggal_exp?.slice(0, 10) || "")) perubahans.push(`Exp: "${obat.tanggal_exp?.slice(0, 10) || "-"}" ➔ "${tanggalExp || "-"}"`);
        if (Number(stokMinimum) !== Number(obat.stok_minimum ?? 10)) perubahans.push(`Stok Min: ${obat.stok_minimum} ➔ ${stokMinimum}`);
        if (aktifDijual !== (obat.aktif_dijual ?? true)) perubahans.push(`Status Jual: ${obat.aktif_dijual ? "Aktif" : "Nonaktif"} ➔ ${aktifDijual ? "Aktif" : "Nonaktif"}`);

        if (adaUbahHarga) {
          tambahLogPerubahan({
            nama_akun: namaAkun,
            role_akun: roleAkun,
            kategori: "Ganti Harga Obat",
            aksi: "Ubah",
            judul: `${nama} (${satuanDikirim.map((s) => s.nama_satuan).join("/")})`,
            sebelum: rincianHargaLama || "-",
            sesudah: rincianHargaBaru || "-",
            keterangan: `Penyesuaian harga obat via formulir edit (${namaAkun})`,
          });
        }

        if (perubahans.length > 0) {
          tambahLogPerubahan({
            nama_akun: namaAkun,
            role_akun: roleAkun,
            kategori: "Katalog Obat",
            aksi: "Ubah Data",
            judul: nama,
            sebelum: "Data sebelumnya",
            sesudah: perubahans.join("; "),
            keterangan: `Edit rincian obat via formulir (${namaAkun})`,
          });
        }

        // Jika tidak ada perubahan signifikan terdeteksi tapi user klik Simpan
        if (!adaUbahHarga && perubahans.length === 0) {
          tambahLogPerubahan({
            nama_akun: namaAkun,
            role_akun: roleAkun,
            kategori: "Katalog Obat",
            aksi: "Ubah Data",
            judul: nama,
            sebelum: "Tersimpan",
            sesudah: "Disimpan ulang",
            keterangan: `Konfirmasi data obat via formulir edit (${namaAkun})`,
          });
        }
      } else {
        await api("/obat", {
          method: "POST",
          body: JSON.stringify({
            nama, kemasan, satuan_dasar: satuanDasar || satuanDikirim[0].nama_satuan,
            stok: Number(stokAwal), stok_minimum: Number(stokMinimum),
            supplier_id: supplierId || null, perlu_resep: perluResep,
            aktif_dijual: aktifDijual, tampil_online: true,
            satuan: satuanDikirim.map(({ id, ...s }) => s), // id tidak relevan saat create
            ...(gambarBase64 ? { gambar_base64: gambarBase64 } : {}),
          }),
        });

        tambahLogPerubahan({
          nama_akun: namaAkun,
          role_akun: roleAkun,
          kategori: "Katalog Obat",
          aksi: "Tambah",
          judul: nama,
          sebelum: "-",
          sesudah: `Stok: ${stokAwal} ${satuanDasar || satuanDikirim[0]?.nama_satuan}, Jual: Rp ${Number(satuanDikirim[0]?.harga_jual || 0).toLocaleString("id-ID")}`,
          keterangan: `Input obat baru via formulir (${namaAkun})`,
        });
      }
      onSelesai();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="obat-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="obat-modal">
        <div className="obat-modal-head">
          <h2>{modeEdit ? "Edit Obat" : "Tambah Obat"}</h2>
          <button className="kasir-logout-btn" onClick={onClose} aria-label="Tutup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="obat-modal-body">
        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="obat-form-grid">
            {/* Widget Upload Foto Obat */}
            <div className="payment-field" style={{ gridColumn: "1 / -1" }}>
              <label>Foto Produk Obat (Toko Online)</label>
              <div style={{ display: "flex", gap: 16, alignItems: "center", background: "#FAF5FF", padding: 12, borderRadius: 10, border: "1.5px dashed #D8B4FE" }}>
                <div style={{ width: 72, height: 72, borderRadius: 8, background: "#fff", border: "1px solid var(--line)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {gambarPreview ? (
                    <img src={gambarPreview} alt="Preview Foto Obat" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#A64BC7" strokeWidth="1.5" style={{ width: 32, height: 32 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                    {gambarPreview ? "Foto Obat Terpasang" : "Belum Ada Foto Obat"}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 8 }}>
                    Format PNG, JPG, atau WebP (Maks 5 MB). Foto akan langsung tampil di Toko Online.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <label style={{ cursor: "pointer", background: "var(--magenta)", color: "#fff", padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, display: "inline-block" }}>
                      {gambarPreview ? "Ganti Foto" : "Pilih Foto Obat"}
                      <input type="file" accept="image/*" onChange={handlePilihGambar} style={{ display: "none" }} />
                    </label>
                    {gambarPreview && (
                      <button
                        type="button"
                        onClick={handleHapusFoto}
                        style={{ background: "#FEE2E2", color: "#B91C1C", border: "none", padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="payment-field" style={{ gridColumn: "1 / -1" }}>
              <label>Nama Obat</label>
              <input
                list="saran-nama-obat"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                placeholder="Ketik atau pilih dari saran…"
              />
              <datalist id="saran-nama-obat">
                {namaSaran.map((n) => <option key={n} value={n} />)}
              </datalist>
            </div>

            <div className="payment-field">
              <label>Kemasan</label>
              <input value={kemasan} onChange={(e) => setKemasan(e.target.value)} placeholder="Contoh: Strip isi 10 tablet" />
            </div>

            <div className="payment-field">
              <label>Satuan Dasar (buat hitung stok)</label>
              <input
                value={satuanDasar}
                onChange={(e) => setSatuanDasar(e.target.value)}
                placeholder="Contoh: Tablet"
                disabled={modeEdit}
                required={!modeEdit}
              />
            </div>

            <div className="payment-field">
              <label>Nomor Batch</label>
              <input value={nomorBatch} onChange={(e) => setNomorBatch(e.target.value)} />
            </div>

            <div className="payment-field">
              <label>Tanggal Kadaluwarsa (opsional)</label>
              <input type="date" value={tanggalExp} onChange={(e) => setTanggalExp(e.target.value)} />
            </div>

            <div className="payment-field">
              <label>Stok Awal {modeEdit && "(tidak bisa diubah di sini)"}</label>
              <input
                type="number" min="0" value={stokAwal}
                onChange={(e) => setStokAwal(e.target.value)}
                disabled={modeEdit}
                title={modeEdit ? "Stok cuma bisa berubah lewat Penerimaan Barang, Penjualan, atau Stok Opname" : ""}
              />
            </div>

            <div className="payment-field">
              <label>Stok Minimum</label>
              <input type="number" min="0" value={stokMinimum} onChange={(e) => setStokMinimum(e.target.value)} />
            </div>

            <div className="payment-field">
              <label>Supplier (opsional)</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— Pilih supplier —</option>
                {supplierList.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
          </div>

          <div className="obat-toggle-row">
            <div className="obat-toggle-item">
              <button
                type="button"
                className={`toggle-pill ${perluResep ? "on" : ""}`}
                onClick={() => setPerluResep((v) => !v)}
                aria-label="Perlu Resep Dokter"
              >
                <span className="toggle-knob" />
              </button>
              <span>Perlu Resep Dokter</span>
            </div>
            <div className="obat-toggle-item">
              <button
                type="button"
                className={`toggle-pill ${aktifDijual ? "on" : ""}`}
                onClick={() => setAktifDijual((v) => !v)}
                aria-label="Aktif Dijual"
              >
                <span className="toggle-knob" />
              </button>
              <span>Aktif Dijual</span>
            </div>
            <div className="obat-toggle-item">
              <button
                type="button"
                className={`toggle-pill ${multiSatuan ? "on" : ""}`}
                onClick={() => setMultiSatuan((v) => !v)}
                aria-label="Punya beberapa satuan"
              >
                <span className="toggle-knob" />
              </button>
              <span>Punya beberapa satuan</span>
            </div>
          </div>

          {!multiSatuan ? (
            <div className="obat-satuan-tunggal">
              <div className="payment-field">
                <label>Satuan Jual</label>
                <input
                  value={satuanTunggal.nama_satuan}
                  onChange={(e) => setSatuanTunggal((s) => ({ ...s, nama_satuan: e.target.value }))}
                  placeholder={satuanDasar || "Contoh: Botol"}
                />
              </div>
              <div className="payment-field">
                <label>Harga Beli</label>
                <input
                  type="number" min="0" step="any" value={satuanTunggal.harga_beli}
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoJual = hitungHargaJualOtomatis(val, 25);
                    setSatuanTunggal((s) => ({
                      ...s,
                      harga_beli: val,
                      harga_jual: (!modeEdit && (!s.harga_jual || Number(s.harga_jual) === 0)) ? autoJual : s.harga_jual,
                    }));
                  }}
                  required
                />
              </div>
              <div className="payment-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>Harga Jual</label>
                  <button
                    type="button"
                    style={{
                      background: "var(--magenta-tint)",
                      color: "var(--magenta-dark)",
                      border: "1px solid var(--magenta)",
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                    title="Hitung otomatis margin 25% & bulatkan kelipatan Rp 500"
                    onClick={() => {
                      const auto = hitungHargaJualOtomatis(satuanTunggal.harga_beli, 25);
                      setSatuanTunggal((s) => ({ ...s, harga_jual: auto }));
                    }}
                  >
                    ⚡ Auto 25% (Bulat 500)
                  </button>
                </div>
                <input
                  type="number" min="0" step="any" value={satuanTunggal.harga_jual}
                  onChange={(e) => setSatuanTunggal((s) => ({ ...s, harga_jual: e.target.value }))}
                  required
                />
                {(() => {
                  const m = hitungMarginPersen(satuanTunggal.harga_beli, satuanTunggal.harga_jual);
                  const stat = getStatusMargin(m);
                  return m !== null ? (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <span style={{ color: "var(--ink-soft)" }}>Margin:</span>
                      <span className={`margin-badge ${stat.warna}`}>
                        {stat.label}
                      </span>
                      {stat.status === "rugi" && (
                        <span style={{ color: "#DC2626", fontSize: 11, fontWeight: 700 }}>
                          ⚠️ Jual rugi!
                        </span>
                      )}
                      {stat.status === "tipis" && (
                        <span style={{ color: "#B45309", fontSize: 11 }}>
                          (Di bawah batas aman 20%)
                        </span>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
              {modeEdit && satuanTunggal.harga_beli_awal != null && (
                <div className="harga-awal-info">
                  <span>Harga Awal: Rp{Math.round(Number(satuanTunggal.harga_beli_awal || 0)).toLocaleString("id-ID")}</span>
                  <button
                    type="button"
                    className="harga-awal-koreksi-btn"
                    onClick={() => koreksiHargaAwal(satuanTunggal.harga_beli_awal, (angka) =>
                      setSatuanTunggal((s) => ({ ...s, harga_beli_awal: angka }))
                    )}
                  >
                    Koreksi
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="obat-satuan-editor">
              <div className="satuan-editor-table-wrap">
              <table className="satuan-editor-table">
                <thead>
                  <tr><th>Nama Satuan</th><th>Isi (faktor)</th><th>Harga Beli</th><th>Harga Jual</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {satuanList.map((s, i) => (
                    <tr key={i}>
                      <td><input value={s.nama_satuan} onChange={(e) => ubahBarisSatuan(i, "nama_satuan", e.target.value)} required /></td>
                      <td><input type="number" min="1" value={s.faktor} onChange={(e) => ubahBarisSatuan(i, "faktor", e.target.value)} disabled={!!s.id} title={s.id ? "Faktor varian lama tidak bisa diubah" : ""} required /></td>
                      <td>
                        <div className="satuan-harga-cell">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={s.harga_beli}
                            onChange={(e) => {
                              const val = e.target.value;
                              ubahBarisSatuan(i, "harga_beli", val);
                              if (!s.id && (!s.harga_jual || Number(s.harga_jual) === 0)) {
                                ubahBarisSatuan(i, "harga_jual", hitungHargaJualOtomatis(val, 25));
                              }
                            }}
                            required
                          />
                          {s.id && s.harga_beli_awal != null && (
                            <button
                              type="button"
                              className="harga-awal-icon-btn"
                              title={`Harga Awal: Rp${Math.round(Number(s.harga_beli_awal || 0)).toLocaleString("id-ID")} — klik untuk koreksi`}
                              onClick={() => koreksiHargaAwal(s.harga_beli_awal, (angka) => ubahBarisSatuan(i, "harga_beli_awal", angka))}
                            >
                              ⓘ
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <input type="number" min="0" step="any" value={s.harga_jual} onChange={(e) => ubahBarisSatuan(i, "harga_jual", e.target.value)} required />
                          {(() => {
                            const m = hitungMarginPersen(s.harga_beli, s.harga_jual);
                            const stat = getStatusMargin(m);
                            return m !== null ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span className={`margin-badge ${stat.warna}`} style={{ fontSize: 9.5, padding: "1px 5px" }}>
                                  {stat.label}
                                </span>
                                <button
                                  type="button"
                                  style={{ background: "none", border: "none", color: "var(--magenta)", fontSize: 10, cursor: "pointer", fontWeight: 700, padding: 0 }}
                                  title="Hitung otomatis margin 25% bulat 500"
                                  onClick={() => ubahBarisSatuan(i, "harga_jual", hitungHargaJualOtomatis(s.harga_beli, 25))}
                                >
                                  Auto 25%
                                </button>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td>
                        {satuanList.length > 1 && (
                          <button type="button" className="satuan-hapus-btn" onClick={() => hapusBarisSatuan(i, s)} title="Hapus satuan ini">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <button type="button" className="obat-tambah-satuan-btn" onClick={tambahBarisSatuan}>
                + Tambah Varian Satuan
              </button>
            </div>
          )}

          <div className="obat-modal-foot">
            <button type="button" className="btn-outline" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Menyimpan…" : "✓ Simpan"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
