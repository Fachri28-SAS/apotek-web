import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import KasirShell from "./KasirShell";
import SearchObatPenerimaan from "./komponen/SearchObatPenerimaan";
import TambahSupplierModal from "./komponen/TambahSupplierModal";

const TEMPO_OPSI = [
  { key: "1_bulan", label: "1 Bulan", bulan: 1 },
  { key: "2_bulan", label: "2 Bulan", bulan: 2 },
  { key: "3_bulan", label: "3 Bulan", bulan: 3 },
  { key: "6_bulan", label: "6 Bulan", bulan: 6 },
  { key: "1_tahun", label: "1 Tahun", bulan: 12 },
  { key: "custom", label: "Custom", bulan: null },
];

function tambahBulan(tanggal, bulan) {
  const d = new Date(tanggal);
  d.setMonth(d.getMonth() + bulan);
  return d.toISOString().slice(0, 10);
}

function badgeHarga(baru, sebelumnya) {
  if (!sebelumnya || sebelumnya === 0) return null;
  const selisih = baru - sebelumnya;
  const persen = Math.round((selisih / sebelumnya) * 100);
  if (selisih === 0) return { warna: "hijau", teks: "✓ Harga Tetap" };
  if (selisih > 0) return { warna: "merah", teks: `▲ Naik ${rupiah(selisih)} (+${persen}%)` };
  return { warna: "biru", teks: `▼ Turun ${rupiah(Math.abs(selisih))} (${persen}%)` };
}

export default function Penerimaan() {
  // ---------- Panel 1: Faktur ----------
  const [supplierList, setSupplierList] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [namaSupplier, setNamaSupplier] = useState("");
  const [noFaktur, setNoFaktur] = useState("");
  const [tanggalTerima, setTanggalTerima] = useState(new Date().toISOString().slice(0, 10));
  const [tempoLabel, setTempoLabel] = useState("1_bulan");
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState(tambahBulan(new Date(), 1));
  const [isPkp, setIsPkp] = useState(false);
  const [modalSupplierOpen, setModalSupplierOpen] = useState(false);

  // ---------- Panel 2: Daftar Item ----------
  const [items, setItems] = useState([]);
  const [diskonFakturRp, setDiskonFakturRp] = useState(0);
  const [diskonFakturPersen, setDiskonFakturPersen] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState("");

  useEffect(() => {
    api("/suppliers").then(setSupplierList).catch(() => {});
  }, []);

  function pilihSupplier(id) {
    setSupplierId(id);
    const s = supplierList.find((x) => String(x.id) === String(id));
    setNamaSupplier(s ? s.nama : "");
    setIsPkp(s ? !!s.is_pkp : false);
  }

  function supplierBaruDitambahkan(s) {
    setSupplierList((prev) => {
      const ada = prev.some((x) => x.id === s.id);
      return ada ? prev : [...prev, s].sort((a, b) => a.nama.localeCompare(b.nama));
    });
    setSupplierId(s.id);
    setNamaSupplier(s.nama);
    setIsPkp(!!s.is_pkp);
    setSukses(`Supplier "${s.nama}" berhasil ditambahkan dan langsung dipilih.`);
  }

  function supplierDihapus(id) {
    setSupplierList((prev) => prev.filter((x) => x.id !== id));
    if (String(supplierId) === String(id)) {
      setSupplierId("");
      setNamaSupplier("");
      setIsPkp(false);
    }
  }

  function ubahTempo(key) {
    setTempoLabel(key);
    const opsi = TEMPO_OPSI.find((o) => o.key === key);
    if (opsi?.bulan) setTanggalJatuhTempo(tambahBulan(tanggalTerima, opsi.bulan));
  }

  function ubahTanggalTempoManual(val) {
    setTanggalJatuhTempo(val);
    setTempoLabel("custom"); // otomatis pindah ke Custom kalau diedit manual
  }

  function tambahItem(obat) {
    const satuan = obat.satuan[0];
    setItems((prev) => [...prev, {
      key: Date.now() + Math.random(),
      obat_id: obat.id,
      nama_obat: obat.nama,
      satuanOptions: obat.satuan,
      obat_satuan_id: satuan.id,
      qty: 1,
      harga_beli: satuan.harga_beli,
      diskon: 0,
      nomor_batch: "",
      tanggal_exp: tambahBulan(new Date(), 3), // default 3 bulan, bisa diubah manual
      harga_jual_referensi: satuan.harga_jual,
      harga_beli_sebelumnya: satuan.harga_beli,
    }]);
    setSukses("");
  }

  function ubahItem(key, field, value) {
    setItems((prev) => prev.map((it) => {
      if (it.key !== key) return it;
      const updated = { ...it, [field]: value };
      // Kalau satuan diganti, ikut ganti harga referensi & harga_beli_sebelumnya
      if (field === "obat_satuan_id") {
        const s = it.satuanOptions.find((s) => s.id === Number(value));
        if (s) {
          updated.harga_beli = s.harga_beli;
          updated.harga_jual_referensi = s.harga_jual;
          updated.harga_beli_sebelumnya = s.harga_beli;
        }
      }
      return updated;
    }));
  }

  function hapusItem(key) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  // ---------- Perhitungan ----------
  const subtotal = items.reduce((s, it) => s + it.qty * it.harga_beli - Number(it.diskon || 0), 0);
  const diskonTotal = Number(diskonFakturRp || 0) + Math.round(subtotal * Number(diskonFakturPersen || 0) / 100);
  const subtotalSetelahDiskon = Math.max(subtotal - diskonTotal, 0);
  const ppn = isPkp ? Math.round(subtotalSetelahDiskon * 0.11) : 0;
  const totalTagihan = subtotalSetelahDiskon + ppn;

  async function simpan() {
    setError(""); setSukses("");

    if (!namaSupplier.trim()) { setError("Nama supplier wajib diisi."); return; }
    if (!noFaktur.trim()) { setError("No. Faktur wajib diisi."); return; }
    if (items.length === 0) { setError("Tambahkan minimal 1 item."); return; }
    if (items.some((it) => !it.nomor_batch.trim())) { setError("Nomor Batch wajib diisi untuk semua item."); return; }

    setLoading(true);
    try {
      await api("/penerimaan", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: supplierId || null,
          nama_supplier: namaSupplier,
          no_faktur: noFaktur,
          tanggal_terima: tanggalTerima,
          tanggal_jatuh_tempo: tanggalJatuhTempo || null,
          tempo_label: tempoLabel,
          is_pkp: isPkp,
          diskon_faktur_rp: Number(diskonFakturRp || 0),
          diskon_faktur_persen: Number(diskonFakturPersen || 0),
          items: items.map((it) => ({
            obat_id: it.obat_id,
            obat_satuan_id: it.obat_satuan_id,
            qty: Number(it.qty),
            harga_beli: Number(it.harga_beli),
            diskon: Number(it.diskon || 0),
            nomor_batch: it.nomor_batch,
            tanggal_exp: it.tanggal_exp || null,
          })),
        }),
      });

      setSukses(`Faktur ${noFaktur} berhasil disimpan. Stok & harga obat sudah diperbarui.`);
      setItems([]);
      setNoFaktur("");
      setDiskonFakturRp(0);
      setDiskonFakturPersen(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Penerimaan Barang</h1>
          <p className="halaman-sub">Catat faktur pembelian dari supplier</p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {sukses && <div className="pesan-sukses">{sukses}</div>}

      {/* ---------- PANEL 1: FAKTUR PEMBELIAN ---------- */}
      <div className="panel">
        <div className="panel-head"><h3>Faktur Pembelian</h3></div>
        <div className="obat-form-grid">
          <div className="payment-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ margin: 0 }}>Supplier</label>
              <button
                type="button"
                onClick={() => setModalSupplierOpen(true)}
                style={{
                  background: "#FAF5FF",
                  border: "1px solid var(--magenta)",
                  borderRadius: 6,
                  color: "var(--magenta-dark)",
                  fontWeight: 700,
                  fontSize: 11.5,
                  cursor: "pointer",
                  padding: "2px 8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                + Tambah Supplier
              </button>
            </div>
            <select value={supplierId} onChange={(e) => pilihSupplier(e.target.value)}>
              <option value="">— Pilih atau ketik manual —</option>
              {supplierList.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </div>
          <div className="payment-field">
            <label>Nama Supplier</label>
            <input value={namaSupplier} onChange={(e) => setNamaSupplier(e.target.value)} placeholder="Contoh: PT Kimia Farma Trading" />
          </div>
          <div className="payment-field">
            <label>No. Faktur Supplier</label>
            <input value={noFaktur} onChange={(e) => setNoFaktur(e.target.value)} placeholder="Contoh: KF-2026-0088" />
          </div>
          <div className="payment-field">
            <label>Tanggal Terima</label>
            <input type="date" value={tanggalTerima} onChange={(e) => {
              setTanggalTerima(e.target.value);
              const opsi = TEMPO_OPSI.find((o) => o.key === tempoLabel);
              if (opsi?.bulan) setTanggalJatuhTempo(tambahBulan(e.target.value, opsi.bulan));
            }} />
          </div>

          <div className="payment-field" style={{ gridColumn: "1 / -1" }}>
            <label>Tanggal Jatuh Tempo</label>
            <div className="tempo-row">
              {TEMPO_OPSI.map((o) => (
                <button key={o.key} type="button"
                  className={`periode-chip ${tempoLabel === o.key ? "active" : ""}`}
                  onClick={() => ubahTempo(o.key)}>
                  {o.label}
                </button>
              ))}
              <input type="date" value={tanggalJatuhTempo} onChange={(e) => ubahTanggalTempoManual(e.target.value)} style={{ maxWidth: 170 }} />
            </div>
          </div>

          <div className="payment-field">
            <label>PKP Supplier</label>
            <div className="metode-chips">
              <button type="button" className={`metode-chip ${!isPkp ? "active" : ""}`} onClick={() => setIsPkp(false)}>Non PKP</button>
              <button type="button" className={`metode-chip ${isPkp ? "active" : ""}`} onClick={() => setIsPkp(true)}>PKP (PPN 11%)</button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- PANEL 2: DAFTAR ITEM ---------- */}
      <div className="panel">
        <div className="panel-head"><h3>Daftar Item</h3></div>

        <SearchObatPenerimaan onPilih={tambahItem} supplierId={supplierId} />

        {items.length === 0 ? (
          <div className="panel-kosong">Cari obat di atas untuk menambah item faktur.</div>
        ) : (
          <>
            <div className="obat-table-wrap">
              <table className="obat-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Nama Obat</th><th>Qty</th><th>Satuan</th><th>Harga Beli</th>
                    <th>Diskon</th><th>Batch</th><th>Exp. Date</th><th>Harga Jual</th>
                    <th>Margin %</th><th>Subtotal</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const badge = badgeHarga(Number(it.harga_beli), it.harga_beli_sebelumnya);
                    const margin = it.harga_jual_referensi > 0
                      ? Math.round(((it.harga_jual_referensi - it.harga_beli) / it.harga_jual_referensi) * 100)
                      : null;
                    const subtotalItem = it.qty * it.harga_beli - Number(it.diskon || 0);

                    return (
                      <tr key={it.key}>
                        <td><span className="obat-nama-cell">{it.nama_obat}</span></td>
                        <td><input type="number" min="1" className="cart-input-angka" style={{ width: 60 }} value={it.qty} onChange={(e) => ubahItem(it.key, "qty", e.target.value)} /></td>
                        <td>
                          <select className="cart-input-angka" value={it.obat_satuan_id} onChange={(e) => ubahItem(it.key, "obat_satuan_id", e.target.value)}>
                            {it.satuanOptions.map((s) => <option key={s.id} value={s.id}>{s.nama_satuan}</option>)}
                          </select>
                        </td>
                        <td>
                          <input type="number" min="0" className="cart-input-angka" value={it.harga_beli} onChange={(e) => ubahItem(it.key, "harga_beli", e.target.value)} />
                          {badge && <div className={`harga-badge ${badge.warna}`}>{badge.teks}</div>}
                        </td>
                        <td><input type="number" min="0" className="cart-input-angka" style={{ width: 70 }} value={it.diskon} onChange={(e) => ubahItem(it.key, "diskon", e.target.value)} /></td>
                        <td><input type="text" className="cart-input-angka" style={{ width: 90 }} value={it.nomor_batch} onChange={(e) => ubahItem(it.key, "nomor_batch", e.target.value)} placeholder="wajib" /></td>
                        <td>
                          <input type="date" className="cart-input-angka" value={it.tanggal_exp} onChange={(e) => ubahItem(it.key, "tanggal_exp", e.target.value)} />
                          <div className="exp-default-hint">Default 3 bln, bisa diubah</div>
                        </td>
                        <td className="obat-harga-cell">{rupiah(it.harga_jual_referensi)}</td>
                        <td className="obat-margin-cell">{margin !== null ? `${margin}%` : "-"}</td>
                        <td style={{ fontWeight: 700 }}>{rupiah(subtotalItem)}</td>
                        <td>
                          <button className="cart-hapus-btn" onClick={() => hapusItem(it.key)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ---------- RINGKASAN ---------- */}
            <div className="penerimaan-ringkasan">
              <div className="payment-row"><span>Subtotal</span><strong>{rupiah(subtotal)}</strong></div>

              <div className="opname-ringkasan-info" style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <span>Diskon Faktur:</span>
                <input type="number" min="0" className="cart-input-angka" style={{ width: 110 }} value={diskonFakturRp} onChange={(e) => setDiskonFakturRp(e.target.value)} placeholder="Rp" />
                <input type="number" min="0" max="100" className="cart-input-angka" style={{ width: 80 }} value={diskonFakturPersen} onChange={(e) => setDiskonFakturPersen(e.target.value)} placeholder="%" />
              </div>

              <div className="payment-row"><span>Subtotal Setelah Diskon</span><span>{rupiah(subtotalSetelahDiskon)}</span></div>
              <div className="payment-row"><span>Sebelum Pajak (DPP)</span><span>{rupiah(subtotalSetelahDiskon)}</span></div>
              <div className="payment-row"><span>Total Pajak (PPN {isPkp ? "11%" : "0%"})</span><span>{rupiah(ppn)}</span></div>
              <div className="payment-row payment-total"><span>Total Tagihan</span><strong>{rupiah(totalTagihan)}</strong></div>

              <button className="payment-submit" style={{ marginTop: 16 }} onClick={simpan} disabled={loading}>
                {loading ? "Menyimpan…" : "Simpan Penerimaan"}
              </button>
            </div>
          </>
        )}
      </div>

      {modalSupplierOpen && (
        <TambahSupplierModal
          supplierList={supplierList}
          onClose={() => setModalSupplierOpen(false)}
          onSukses={supplierBaruDitambahkan}
          onHapusSupplier={supplierDihapus}
        />
      )}
    </KasirShell>
  );
}
