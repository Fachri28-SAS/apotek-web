import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah, hitungHargaJualOtomatis, hitungMarginPersen, getStatusMargin } from "../../utils/format";
import KasirShell from "./KasirShell";
import SearchObatPenerimaan from "./komponen/SearchObatPenerimaan";
import TambahSupplierModal from "./komponen/TambahSupplierModal";

function tambahHari(tanggal, hari = 30) {
  const d = new Date(tanggal);
  d.setDate(d.getDate() + hari);
  return d.toISOString().slice(0, 10);
}

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
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState(tambahHari(new Date(), 30));
  const [isPkp, setIsPkp] = useState(false);
  const [modalSupplierOpen, setModalSupplierOpen] = useState(false);
  const [fakturTerbuka, setFakturTerbuka] = useState(true);

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

  function tambahItem(obat) {
    const satuan = obat.satuan[0];
    const initialQty = 1;
    const initialKemasan = 1;
    const hargaBeliAwal = Number(satuan.harga_beli || 0);
    const hargaJualAwal = (satuan.harga_jual && Number(satuan.harga_jual) > 0)
      ? Number(satuan.harga_jual)
      : hitungHargaJualOtomatis(hargaBeliAwal, 25);

    setItems((prev) => [...prev, {
      key: Date.now() + Math.random(),
      obat_id: obat.id,
      nama_obat: obat.nama,
      satuanOptions: obat.satuan,
      obat_satuan_id: satuan.id,
      qty: initialQty,
      kemasan: initialKemasan,
      harga_beli: satuan.harga_beli,
      diskon: 0,
      nomor_batch: "",
      tanggal_exp: tambahBulan(new Date(), 3), // default 3 bulan, bisa diubah manual
      harga_jual_referensi: satuan.harga_jual,
      harga_jual_baru: hargaJualAwal,
      harga_beli_sebelumnya: satuan.harga_beli,
    }]);
    setSukses("");
  }

  function ubahItem(key, field, value) {
    setItems((prev) => prev.map((it) => {
      if (it.key !== key) return it;
      const updated = { ...it, [field]: value };
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
          tempo_label: "custom",
          is_pkp: isPkp,
          diskon_faktur_rp: Number(diskonFakturRp || 0),
          diskon_faktur_persen: Number(diskonFakturPersen || 0),
          items: items.map((it) => ({
            obat_id: it.obat_id,
            obat_satuan_id: it.obat_satuan_id,
            qty: Number(it.qty),
            kemasan: Number(it.kemasan || it.qty),
            harga_beli: Number(it.harga_beli),
            diskon: Number(it.diskon || 0),
            nomor_batch: it.nomor_batch,
            tanggal_exp: it.tanggal_exp || null,
            harga_jual_baru: Number(it.harga_jual_baru ?? it.harga_jual_referensi),
          })),
        }),
      });

      setSukses(`Faktur ${noFaktur} berhasil disimpan. Stok & harga obat sudah diperbarui.`);
      setItems([]);
      setNoFaktur("");
      setDiskonFakturRp(0);
      setDiskonFakturPersen(0);
    } catch (e) {
      setError(e.message || "Gagal menyimpan penerimaan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KasirShell>
      <div className="halaman-header" style={{ marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Penerimaan Barang</h1>
          <p className="halaman-sub" style={{ margin: "2px 0 0" }}>Catat faktur pembelian dari supplier</p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {sukses && <div className="pesan-sukses">{sukses}</div>}

      {/* ---------- PANEL 1: FAKTUR PEMBELIAN (COMPACT & COLLAPSIBLE) ---------- */}
      <div className="panel" style={{ padding: "12px 16px", marginBottom: 12 }}>
        <div
          className="panel-head"
          style={{
            marginBottom: fakturTerbuka ? 10 : 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          onClick={() => setFakturTerbuka(!fakturTerbuka)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>📋 Faktur Pembelian</h3>
            {!fakturTerbuka && (
              <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>
                {namaSupplier ? `• ${namaSupplier}` : "• (Supplier belum dipilih)"}
                {noFaktur ? ` • No: ${noFaktur}` : ""}
                {tanggalJatuhTempo ? ` • Tempo: ${tanggalJatuhTempo}` : ""}
                {isPkp ? " • PKP 11%" : " • Non PKP"}
              </span>
            )}
          </div>
          <button
            type="button"
            style={{
              background: "#F8FAFC",
              border: "1px solid var(--line)",
              borderRadius: 6,
              color: "var(--ink-soft)",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              padding: "3px 8px",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{fakturTerbuka ? "▲ Ringkas Form" : "▼ Buka Detail Faktur"}</span>
          </button>
        </div>

        {fakturTerbuka && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Baris 1: 4 Kolom di Desktop (Supplier, Nama Supplier, No. Faktur, Tanggal Terima) */}
            <div className="penerimaan-baris-1">
              <div className="payment-field" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <label style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>Supplier</label>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setModalSupplierOpen(true); }}
                    style={{
                      background: "#FAF5FF",
                      border: "1px solid var(--magenta)",
                      borderRadius: 5,
                      color: "var(--magenta-dark)",
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: "pointer",
                      padding: "1px 6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    + Tambah
                  </button>
                </div>
                <select
                  value={supplierId}
                  onChange={(e) => pilihSupplier(e.target.value)}
                  style={{ padding: "6px 8px", fontSize: 12.5, borderRadius: 8 }}
                >
                  <option value="">— Pilih atau ketik manual —</option>
                  {supplierList.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>

              <div className="payment-field" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Nama Supplier</label>
                <input
                  value={namaSupplier}
                  onChange={(e) => setNamaSupplier(e.target.value)}
                  placeholder="PT Kimia Farma Trading"
                  style={{ padding: "6px 8px", fontSize: 12.5, borderRadius: 8 }}
                />
              </div>

              <div className="payment-field" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>No. Faktur Supplier</label>
                <input
                  value={noFaktur}
                  onChange={(e) => setNoFaktur(e.target.value)}
                  placeholder="Contoh: KF-2026-0088"
                  style={{ padding: "6px 8px", fontSize: 12.5, borderRadius: 8 }}
                />
              </div>

              <div className="payment-field" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Tanggal Terima</label>
                <input
                  type="date"
                  value={tanggalTerima}
                  onChange={(e) => setTanggalTerima(e.target.value)}
                  style={{ padding: "6px 8px", fontSize: 12.5, borderRadius: 8 }}
                />
              </div>
            </div>

            {/* Baris 2: Jatuh Tempo & PKP Supplier */}
            <div className="penerimaan-baris-2">
              <div className="payment-field" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  value={tanggalJatuhTempo}
                  onChange={(e) => setTanggalJatuhTempo(e.target.value)}
                  style={{
                    maxWidth: 220,
                    padding: "7px 10px",
                    fontSize: 13,
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: "#fff",
                  }}
                />
              </div>

              <div className="payment-field" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>PKP Supplier</label>
                <div className="metode-chips" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className={`metode-chip ${!isPkp ? "active" : ""}`}
                    onClick={() => setIsPkp(false)}
                    style={{ padding: "5px 14px", fontSize: 12 }}
                  >
                    Non PKP
                  </button>
                  <button
                    type="button"
                    className={`metode-chip ${isPkp ? "active" : ""}`}
                    onClick={() => setIsPkp(true)}
                    style={{ padding: "5px 14px", fontSize: 12 }}
                  >
                    PKP (PPN 11%)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------- PANEL 2: DAFTAR ITEM (NAIK LEBIH KE ATAS) ---------- */}
      <div className="panel" style={{ padding: "14px 16px" }}>
        <div className="panel-head" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Daftar Item Faktur</h3>
        </div>

        <SearchObatPenerimaan onPilih={tambahItem} supplierId={supplierId} />

        {items.length === 0 ? (
          <div className="panel-kosong">Cari obat di atas untuk menambah item faktur.</div>
        ) : (
          <>
            <div className="obat-table-wrap">
              <table className="obat-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Nama Obat</th><th>Terima</th><th>Kemasan</th><th>Harga Satuan</th>
                    <th>Diskon</th><th>Batch</th><th>Exp. Date</th><th>Harga Jual Baru</th>
                    <th>Margin %</th><th>Subtotal</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const badge = badgeHarga(Number(it.harga_beli), it.harga_beli_sebelumnya);
                    const unitBeli = (Number(it.kemasan) > 0 && Number(it.qty) > 0)
                      ? (Number(it.qty) * Number(it.harga_beli)) / Number(it.kemasan)
                      : Number(it.harga_beli);
                    const hargaJualAktif = Number(it.harga_jual_baru ?? it.harga_jual_referensi ?? 0);
                    const margin = hitungMarginPersen(unitBeli, hargaJualAktif);
                    const marginStat = getStatusMargin(margin);
                    const subtotalItem = it.qty * it.harga_beli - Number(it.diskon || 0);

                    return (
                      <tr key={it.key}>
                        <td><span className="obat-nama-cell">{it.nama_obat}</span></td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="cart-input-angka"
                            style={{ width: 60 }}
                            value={it.qty}
                            onChange={(e) => ubahItem(it.key, "qty", e.target.value)}
                            title="Jumlah unit faktur yang diterima (misal 6)"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="cart-input-angka"
                            style={{ width: 60 }}
                            value={it.kemasan}
                            onChange={(e) => ubahItem(it.key, "kemasan", e.target.value)}
                            title="Total isi kemasan yang masuk ke stok Data Obat (misal 60)"
                          />
                        </td>
                        <td>
                          <input type="number" min="0" step="any" className="cart-input-angka" value={it.harga_beli} onChange={(e) => ubahItem(it.key, "harga_beli", e.target.value)} />
                          {badge && <div className={`harga-badge ${badge.warna}`}>{badge.teks}</div>}
                        </td>
                        <td><input type="number" min="0" className="cart-input-angka" style={{ width: 70 }} value={it.diskon} onChange={(e) => ubahItem(it.key, "diskon", e.target.value)} /></td>
                        <td><input type="text" className="cart-input-angka" style={{ width: 90 }} value={it.nomor_batch} onChange={(e) => ubahItem(it.key, "nomor_batch", e.target.value)} placeholder="wajib" /></td>
                        <td>
                          <input type="date" className="cart-input-angka" value={it.tanggal_exp} onChange={(e) => ubahItem(it.key, "tanggal_exp", e.target.value)} />
                          <div className="exp-default-hint">Default 3 bln, bisa diubah</div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="cart-input-angka"
                              style={{ width: 95 }}
                              value={it.harga_jual_baru ?? it.harga_jual_referensi ?? ""}
                              onChange={(e) => ubahItem(it.key, "harga_jual_baru", e.target.value)}
                              title="Harga jual satuan yang akan disimpan ke Data Obat"
                            />
                            <button
                              type="button"
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--magenta)",
                                fontSize: 10,
                                cursor: "pointer",
                                fontWeight: 700,
                                padding: 0,
                                textAlign: "left"
                              }}
                              title="Hitung otomatis margin 25% kelipatan Rp 500"
                              onClick={() => {
                                const auto = hitungHargaJualOtomatis(unitBeli, 25);
                                ubahItem(it.key, "harga_jual_baru", auto);
                              }}
                            >
                              ⚡ Auto 25% (Bulat 500)
                            </button>
                          </div>
                        </td>
                        <td className="obat-margin-cell">
                          {marginStat.status !== "kosong" ? (
                            <span className={`margin-badge ${marginStat.warna}`}>
                              {marginStat.label}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
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

              <div className="opname-ringkasan-info" style={{ flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
