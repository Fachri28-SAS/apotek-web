import { useState, useEffect } from "react";
import { api } from "../../../lib/api";

function satuanKosong() {
  return { nama_satuan: "", faktor: 1, harga_beli: "", harga_jual: "" };
}

export default function ObatModal({ obat, onClose, onSelesai }) {
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
    obat?.satuan?.length ? obat.satuan.map((s) => ({ ...s })) : [satuanKosong()]
  );
  // Mode 1-satuan pakai state terpisah biar sederhana, disatukan lagi saat submit
  const [satuanTunggal, setSatuanTunggal] = useState(
    obat?.satuan?.length === 1
      ? { ...obat.satuan[0] }
      : { nama_satuan: obat?.satuan_dasar || "", faktor: 1, harga_beli: "", harga_jual: "" }
  );

  useEffect(() => {
    api("/obat-referensi").then((data) => setNamaSaran(data.map((d) => d.nama)));
    api("/suppliers").then(setSupplierList).catch(() => {});
  }, []);

  function tambahBarisSatuan() {
    setSatuanList((prev) => [...prev, satuanKosong()]);
  }
  function hapusBarisSatuan(idx) {
    setSatuanList((prev) => prev.filter((_, i) => i !== idx));
  }
  function ubahBarisSatuan(idx, field, value) {
    setSatuanList((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
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
        }))
      : [{
          id: satuanTunggal.id,
          nama_satuan: satuanTunggal.nama_satuan || satuanDasar,
          faktor: 1,
          harga_beli: Number(satuanTunggal.harga_beli) || 0,
          harga_jual: Number(satuanTunggal.harga_jual) || 0,
        }];

    if (satuanDikirim.some((s) => !s.nama_satuan)) {
      setError("Nama satuan tidak boleh kosong.");
      return;
    }

    setLoading(true);
    try {
      if (modeEdit) {
        await api(`/obat/${obat.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nama, kemasan, nomor_batch: nomorBatch || null,
            tanggal_exp: tanggalExp || null, stok_minimum: Number(stokMinimum),
            supplier_id: supplierId || null, perlu_resep: perluResep,
            aktif_dijual: aktifDijual, satuan: satuanDikirim,
          }),
        });
      } else {
        await api("/obat", {
          method: "POST",
          body: JSON.stringify({
            nama, kemasan, satuan_dasar: satuanDasar || satuanDikirim[0].nama_satuan,
            stok: Number(stokAwal), stok_minimum: Number(stokMinimum),
            supplier_id: supplierId || null, perlu_resep: perluResep,
            aktif_dijual: aktifDijual, tampil_online: true,
            satuan: satuanDikirim.map(({ id, ...s }) => s), // id tidak relevan saat create
          }),
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
            <label className="login-remember">
              <input type="checkbox" checked={perluResep} onChange={(e) => setPerluResep(e.target.checked)} />
              Perlu Resep Dokter
            </label>
            <label className="login-remember">
              <input type="checkbox" checked={aktifDijual} onChange={(e) => setAktifDijual(e.target.checked)} />
              Aktif Dijual
            </label>
            <label className="login-remember">
              <input type="checkbox" checked={multiSatuan} onChange={(e) => setMultiSatuan(e.target.checked)} />
              Punya beberapa satuan
            </label>
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
                  type="number" min="0" value={satuanTunggal.harga_beli}
                  onChange={(e) => setSatuanTunggal((s) => ({ ...s, harga_beli: e.target.value }))}
                  required
                />
              </div>
              <div className="payment-field">
                <label>Harga Jual</label>
                <input
                  type="number" min="0" value={satuanTunggal.harga_jual}
                  onChange={(e) => setSatuanTunggal((s) => ({ ...s, harga_jual: e.target.value }))}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="obat-satuan-editor">
              <table className="satuan-editor-table">
                <thead>
                  <tr><th>Nama Satuan</th><th>Isi (faktor)</th><th>Harga Beli</th><th>Harga Jual</th><th></th></tr>
                </thead>
                <tbody>
                  {satuanList.map((s, i) => (
                    <tr key={i}>
                      <td><input value={s.nama_satuan} onChange={(e) => ubahBarisSatuan(i, "nama_satuan", e.target.value)} required /></td>
                      <td><input type="number" min="1" value={s.faktor} onChange={(e) => ubahBarisSatuan(i, "faktor", e.target.value)} disabled={!!s.id} title={s.id ? "Faktor varian lama tidak bisa diubah" : ""} required /></td>
                      <td><input type="number" min="0" value={s.harga_beli} onChange={(e) => ubahBarisSatuan(i, "harga_beli", e.target.value)} required /></td>
                      <td><input type="number" min="0" value={s.harga_jual} onChange={(e) => ubahBarisSatuan(i, "harga_jual", e.target.value)} required /></td>
                      <td>
                        {satuanList.length > 1 && !s.id && (
                          <button type="button" onClick={() => hapusBarisSatuan(i)}>×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
