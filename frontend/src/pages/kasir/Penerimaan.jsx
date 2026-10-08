import { useState, useEffect } from "react";
import { api, login } from "../../lib/api";
import { rupiah, hitungHargaJualOtomatis, hitungMarginPersen, getStatusMargin } from "../../utils/format";
import { useAuth } from "../../context/useAuth";
import { tambahLogPerubahan } from "../../lib/auditLog";
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
  if (selisih === 0) return null;
  if (selisih > 0) return { warna: "merah", teks: `▲ Naik ${rupiah(selisih)} (+${persen}%)` };
  return { warna: "biru", teks: `▼ Turun ${rupiah(Math.abs(selisih))} (${persen}%)` };
}

function parseAngka(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  let str = String(val).trim();
  if (str.includes(",") && str.includes(".")) {
    // Format Indonesia seperti 9.819,82 -> buang titik ribuan, ganti koma desimal jadi titik
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    // 9819,82 -> 9819.82
    str = str.replace(",", ".");
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export default function Penerimaan() {
  const { user } = useAuth();

  // Pulihkan draft jika ada
  const draftAwal = (() => {
    try {
      const raw = localStorage.getItem("bima_draft_penerimaan");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  // ---------- Panel 1: Faktur ----------
  const [supplierList, setSupplierList] = useState([]);
  const [supplierId, setSupplierId] = useState(() => draftAwal?.supplierId || "");
  const [namaSupplier, setNamaSupplier] = useState(() => draftAwal?.namaSupplier || "");
  const [noFaktur, setNoFaktur] = useState(() => draftAwal?.noFaktur || "");
  const [tanggalTerima, setTanggalTerima] = useState(() => draftAwal?.tanggalTerima || new Date().toISOString().slice(0, 10));
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState(() => draftAwal?.tanggalJatuhTempo || tambahHari(new Date(), 30));
  const [isPkp, setIsPkp] = useState(() => draftAwal?.isPkp ?? false);
  const [persenPpn, setPersenPpn] = useState(() => {
    const saved = localStorage.getItem("bima_default_persen_ppn");
    return saved !== null && !isNaN(Number(saved)) ? Number(saved) : 11;
  });
  const [modalSupplierOpen, setModalSupplierOpen] = useState(false);
  const [fakturTerbuka, setFakturTerbuka] = useState(true);

  function handleUbahPersenPpn(val) {
    const num = Math.max(0, Math.min(100, Number(val) || 0));
    setPersenPpn(num);
    localStorage.setItem("bima_default_persen_ppn", String(num));
  }

  // ---------- Panel 2: Daftar Item ----------
  const [items, setItems] = useState(() => draftAwal?.items || []);
  const [adaDraftTersimpan, setAdaDraftTersimpan] = useState(() => !!draftAwal && (draftAwal.items?.length > 0 || !!draftAwal.noFaktur));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState("");

  // Auto-save draft ke localStorage
  useEffect(() => {
    if (items.length > 0 || noFaktur.trim() || namaSupplier.trim()) {
      try {
        localStorage.setItem("bima_draft_penerimaan", JSON.stringify({
          supplierId,
          namaSupplier,
          noFaktur,
          tanggalTerima,
          tanggalJatuhTempo,
          isPkp,
          items,
        }));
        setAdaDraftTersimpan(true);
      } catch {
        // ignore
      }
    }
  }, [supplierId, namaSupplier, noFaktur, tanggalTerima, tanggalJatuhTempo, isPkp, items]);

  function bersihkanDraft() {
    if (window.confirm("Yakin ingin mengosongkan draft input faktur ini?")) {
      try {
        localStorage.removeItem("bima_draft_penerimaan");
      } catch {}
      setItems([]);
      setNoFaktur("");
      setSupplierId("");
      setNamaSupplier("");
      setIsPkp(false);
      setAdaDraftTersimpan(false);
      setError("");
      setSukses("Draft faktur telah dibersihkan.");
    }
  }

  // Relogin Modal saat sesi habis (Unauthenticated)
  const [reloginModalOpen, setReloginModalOpen] = useState(false);
  const [reloginUsername, setReloginUsername] = useState(() => user?.username || "yunita");
  const [reloginPassword, setReloginPassword] = useState("");
  const [reloginLoading, setReloginLoading] = useState(false);
  const [reloginError, setReloginError] = useState("");

  useEffect(() => {
    if (user?.username) {
      setReloginUsername(user.username);
    }
  }, [user]);

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
    const satuanDasarNama = (obat.satuan_dasar || "").toLowerCase();
    const satuan = obat.satuan?.find((s) => s.nama_satuan.toLowerCase() === satuanDasarNama && !s.nama_satuan.toLowerCase().includes("box"))
      || obat.satuan?.find((s) => !s.nama_satuan.toLowerCase().includes("box"))
      || obat.satuan?.[0]
      || { id: null, harga_beli: 0, harga_jual: 0, nama_satuan: obat.satuan_dasar || "Strip" };
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
      nama_satuan: satuan.nama_satuan || obat.satuan_dasar || "",
      qty: initialQty,
      kemasan: satuan.faktor || 1,
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
      return { ...it, [field]: value };
    }));
  }

  function hapusItem(key) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  // ---------- Perhitungan ----------
  const subtotal = items.reduce((s, it) => {
    const bruto = Number(it.qty || 0) * parseAngka(it.harga_beli);
    const diskonPersen = parseAngka(it.diskon || 0);
    const potongan = (bruto * diskonPersen) / 100;
    return s + (bruto - potongan);
  }, 0);
  const ppn = isPkp ? Math.round(subtotal * (Number(persenPpn || 0) / 100)) : 0;
  const totalTagihan = subtotal + ppn;

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
          diskon_faktur_rp: 0,
          diskon_faktur_persen: 0,
          items: items.map((it) => {
            const unitBeli = parseAngka(it.harga_beli);
            const diskonPersen = parseAngka(it.diskon || 0);
            const bruto = Number(it.qty) * unitBeli;
            const nominalDiskon = (bruto * diskonPersen) / 100;
            return {
              obat_id: it.obat_id,
              obat_satuan_id: it.obat_satuan_id,
              qty: Number(it.qty),
              kemasan: Number(it.kemasan || 1),
              harga_beli: unitBeli,
              diskon: Math.round(nominalDiskon * 100) / 100,
              nomor_batch: it.nomor_batch,
              tanggal_exp: it.tanggal_exp || null,
              harga_jual_baru: parseAngka(it.harga_jual_baru ?? it.harga_jual_referensi),
            };
          }),
        }),
      });

      // Catat ke riwayat perubahan (Audit Log) dengan Nama Akun yang Login
      const namaAkun = user?.nama || user?.username || (user?.role === "admin" ? "Admin" : "Kasir");
      tambahLogPerubahan({
        nama_akun: namaAkun,
        role_akun: user?.role || "kasir",
        kategori: "Faktur Penerimaan",
        aksi: "Input Faktur",
        judul: `Faktur ${noFaktur} (${namaSupplier})`,
        sebelum: "-",
        sesudah: rupiah(totalTagihan),
        keterangan: `Supplier: ${namaSupplier}, ${items.length} item obat diterima (PPN ${isPkp ? `${persenPpn}%` : "0%"})`,
      });

      setSukses(`Faktur ${noFaktur} berhasil disimpan oleh ${namaAkun}. Stok & harga obat sudah diperbarui.`);
      try {
        localStorage.removeItem("bima_draft_penerimaan");
      } catch {}
      setAdaDraftTersimpan(false);
      setItems([]);
      setNoFaktur("");
    } catch (e) {
      const msg = e.message || "Gagal menyimpan penerimaan.";
      if (e.status === 401 || msg.toLowerCase().includes("unauthenticated")) {
        setReloginModalOpen(true);
        setError("Sesi login Anda terputus (kemungkinan akun login di HP / perangkat lain). Draft ketikan faktur Anda aman tersimpan! Silakan masukkan sandi kasir di bawah ini untuk menyambungkan kembali tanpa reload.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReloginSubmit(e) {
    if (e) e.preventDefault();
    if (!reloginPassword.trim()) {
      setReloginError("Silakan masukkan kata sandi kasir.");
      return;
    }
    setReloginLoading(true);
    setReloginError("");
    try {
      await login(reloginUsername, reloginPassword);
      setReloginModalOpen(false);
      setReloginPassword("");
      setError("");
      setSukses("Sesi kasir berhasil disambungkan kembali! Menyimpan faktur sekarang...");
      setTimeout(() => {
        simpan();
      }, 300);
    } catch (err) {
      setReloginError(err.message || "Gagal login. Periksa username dan kata sandi Anda.");
    } finally {
      setReloginLoading(false);
    }
  }

  return (
    <KasirShell>
      <div className="halaman-header" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Input Penerimaan Barang</h1>
          <p className="halaman-sub" style={{ margin: "2px 0 0" }}>Catat faktur pembelian dari supplier</p>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: "#F5F3FF",
            border: "1px solid #DDD6FE",
            padding: "6px 14px",
            borderRadius: 10,
            fontSize: 12.5,
            color: "#5B21B6",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <span style={{ color: "#7C3AED", fontWeight: 600 }}>Petugas Input:</span>
          <strong style={{ color: "#4C1D95", fontSize: 13 }}>
            {user?.nama || user?.username || "Petugas"}
          </strong>
          <span
            style={{
              fontSize: 11,
              background: "#EDE9FE",
              color: "#6D28D9",
              padding: "2px 7px",
              borderRadius: 5,
              fontWeight: 700,
              textTransform: "capitalize",
            }}
          >
            {user?.role || "kasir"}
          </span>
        </div>
      </div>

      {error && (
        <div className="login-error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span>{error}</span>
          {(error.toLowerCase().includes("sesi") || error.toLowerCase().includes("unauthenticated")) && (
            <button
              type="button"
              onClick={() => setReloginModalOpen(true)}
              style={{
                background: "#DC2626",
                color: "#FFF",
                border: "none",
                borderRadius: 6,
                padding: "5px 12px",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Sambungkan Akun
            </button>
          )}
        </div>
      )}
      {sukses && <div className="pesan-sukses">{sukses}</div>}

      {adaDraftTersimpan && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#FEF3C7",
          border: "1px solid #F59E0B",
          padding: "8px 14px",
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 12.5,
          color: "#92400E"
        }}>
          <div>
            <strong>Draft Faktur Tersimpan:</strong> Ketikan faktur Anda aman tersimpan di memori browser ini.
          </div>
          <button
            type="button"
            onClick={bersihkanDraft}
            style={{
              background: "#FFF",
              border: "1px solid #D97706",
              borderRadius: 6,
              color: "#B45309",
              padding: "3px 10px",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Hapus Draft
          </button>
        </div>
      )}

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
            <h3 style={{ margin: 0, fontSize: 15 }}> Faktur Pembelian</h3>
            {!fakturTerbuka && (
              <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>
                {namaSupplier ? `• ${namaSupplier}` : "• (Supplier belum dipilih)"}
                {noFaktur ? ` • No: ${noFaktur}` : ""}
                {tanggalJatuhTempo ? ` • Tempo: ${tanggalJatuhTempo}` : ""}
                {isPkp ? ` • PKP ${persenPpn}%` : " • Non PKP"}
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>PKP Supplier</label>
                  <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Tarif PPN: <strong>{persenPpn}%</strong></span>
                </div>
                <div className="metode-chips" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
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
                    PKP (PPN {persenPpn}%)
                  </button>

                  {/* Input fleksibel untuk ubah tarif PPN jika sewaktu-waktu ada kenaikan */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      background: "#FAF5FF",
                      border: "1px solid #E9D5FF",
                      borderRadius: 8,
                      marginLeft: 2,
                    }}
                    title="Edit persentase tarif PPN sewaktu-waktu ada kenaikan (contoh: 11% menjadi 12%)"
                  >
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--magenta-dark)", margin: 0 }}>
                      Tarif PPN:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={persenPpn}
                      onChange={(e) => handleUbahPersenPpn(e.target.value)}
                      style={{
                        width: 48,
                        padding: "3px 4px",
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: "center",
                        borderRadius: 6,
                        border: "1px solid var(--magenta)",
                        background: "#fff",
                        color: "var(--magenta-dark)",
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--magenta-dark)" }}>%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
                    <th>Nama Obat</th>
                    <th>Jumlah Satuan</th>
                    <th>Harga Satuan</th>
                    <th>Harga Jual Baru</th>
                    <th>Margin %</th>
                    <th>Diskon %</th>
                    <th>Batch</th>
                    <th>Exp. Date</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const unitBeli = parseAngka(it.harga_beli);
                    const diskonPersen = parseAngka(it.diskon || 0);
                    const hargaBeliNetto = unitBeli > 0 ? unitBeli * (1 - diskonPersen / 100) : 0;
                    // HPP Netto riil: memperhitungkan diskon dan PPN (jika supplier PKP)
                    const hppNetto = isPkp ? hargaBeliNetto * (1 + Number(persenPpn || 0) / 100) : hargaBeliNetto;

                    const badge = badgeHarga(unitBeli, it.harga_beli_sebelumnya);
                    const hargaJualAktif = parseAngka(it.harga_jual_baru ?? it.harga_jual_referensi ?? 0);
                    const margin = hitungMarginPersen(hppNetto, hargaJualAktif);
                    const marginStat = getStatusMargin(margin);
                    const brutoItem = Number(it.qty || 0) * unitBeli;
                    const potonganItem = (brutoItem * diskonPersen) / 100;
                    const subtotalItem = brutoItem - potonganItem;

                    return (
                      <tr key={it.key}>
                        <td>
                          <span className="obat-nama-cell">{it.nama_obat}</span>
                        </td>
                        <td>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <input
                              type="number"
                              min="1"
                              className="cart-input-angka"
                              style={{ width: 60, textAlign: "center", fontWeight: 700 }}
                              value={it.qty}
                              onChange={(e) => ubahItem(it.key, "qty", e.target.value)}
                              placeholder="1"
                              title="Jumlah satuan obat yang diterima"
                            />
                            {it.satuanOptions && it.satuanOptions.length > 1 ? (
                              <select
                                className="cart-input-angka"
                                style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--line)", width: "max-content" }}
                                value={it.obat_satuan_id}
                                onChange={(e) => {
                                  const sid = Number(e.target.value);
                                  const sat = it.satuanOptions.find((o) => o.id === sid);
                                  if (sat) {
                                    setItems((prev) => prev.map((item) => {
                                      if (item.key !== it.key) return item;
                                      return {
                                        ...item,
                                        obat_satuan_id: sat.id,
                                        nama_satuan: sat.nama_satuan,
                                        kemasan: sat.faktor || 1,
                                        harga_beli: sat.harga_beli,
                                      };
                                    }));
                                  }
                                }}
                              >
                                {it.satuanOptions.map((s) => (
                                  <option key={s.id} value={s.id}>{s.nama_satuan}</option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600 }}>
                                {it.nama_satuan}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="cart-input-angka"
                            style={{ width: 85 }}
                            value={it.harga_beli}
                            onChange={(e) => ubahItem(it.key, "harga_beli", e.target.value)}
                            placeholder="0"
                            title="Harga beli satuan faktur (bisa desimal)"
                          />
                          {badge && <div className={`harga-badge ${badge.warna}`}>{badge.teks}</div>}
                          {(diskonPersen > 0 || isPkp) && unitBeli > 0 && (
                            <div style={{ fontSize: 10, color: "var(--ink-soft)", marginTop: 2, fontWeight: 600 }} title="Modal riil (HPP Netto) setelah dikurangi diskon dan ditambah PPN">
                              Netto: {rupiah(hppNetto)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <input
                              type="text"
                              inputMode="decimal"
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
                              title="Hitung otomatis margin 25% dari HPP Netto kelipatan Rp 500"
                              onClick={() => {
                                const auto = hitungHargaJualOtomatis(hppNetto, 25);
                                ubahItem(it.key, "harga_jual_baru", auto);
                              }}
                            >
                              Auto 25% ({rupiah(hitungHargaJualOtomatis(hppNetto, 25))})
                            </button>
                          </div>
                        </td>
                        <td className="obat-margin-cell">
                          {marginStat.status !== "kosong" ? (
                            <span className={`margin-badge ${marginStat.warna}`} title={`Modal Netto: ${rupiah(hppNetto)}, Harga Jual: ${rupiah(hargaJualAktif)}`}>
                              {marginStat.label}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="cart-input-angka"
                              style={{ width: 70, textAlign: "right", paddingRight: 16 }}
                              value={it.diskon}
                              onChange={(e) => ubahItem(it.key, "diskon", e.target.value)}
                              placeholder="0"
                              title="Diskon persen (%)"
                            />
                            <span style={{ position: "absolute", right: 4, fontSize: 11, color: "var(--ink-soft)", pointerEvents: "none", fontWeight: 600 }}>%</span>
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="cart-input-angka"
                            style={{ width: 90 }}
                            value={it.nomor_batch}
                            onChange={(e) => ubahItem(it.key, "nomor_batch", e.target.value)}
                            placeholder="wajib"
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            className="cart-input-angka"
                            value={it.tanggal_exp}
                            onChange={(e) => ubahItem(it.key, "tanggal_exp", e.target.value)}
                          />
                          <div className="exp-default-hint">Default 3 bln, bisa diubah</div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{rupiah(subtotalItem)}</td>
                        <td>
                          <button className="cart-hapus-btn" onClick={() => hapusItem(it.key)} title="Hapus item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

                        <div className="penerimaan-ringkasan">
              <div className="payment-row"><span>Subtotal (DPP)</span><strong>{rupiah(subtotal)}</strong></div>
              <div className="payment-row"><span>Total Pajak (PPN {isPkp ? `${persenPpn}%` : "0%"})</span><span>{rupiah(ppn)}</span></div>
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

      {reloginModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: 430 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" style={{ width: 24, height: 24, flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Sesi Login Terputus</h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
                  Akun aktif di perangkat lain. Sambungkan kembali tanpa refresh:
                </p>
              </div>
            </div>

            <div style={{ fontSize: 12.5, color: "var(--ink)", background: "#F3F4F6", padding: "10px 14px", borderRadius: 8, margin: "0 0 14px 0", lineHeight: 1.5 }}>
              Tenang, <strong>{items.length} item</strong> faktur yang sudah Anda ketik <strong>tidak hilang</strong>! Cukup masukkan kata sandi kasir untuk langsung menyambungkan dan menyimpannya.
            </div>

            {reloginError && (
              <div className="login-error" style={{ marginBottom: 12, fontSize: 12 }}>
                {reloginError}
              </div>
            )}

            <form onSubmit={handleReloginSubmit}>
              <div className="payment-field" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Username Kasir</label>
                <input
                  type="text"
                  value={reloginUsername}
                  onChange={(e) => setReloginUsername(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)" }}
                  required
                />
              </div>

              <div className="payment-field" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Kata Sandi Kasir</label>
                <input
                  type="password"
                  placeholder="Masukkan kata sandi kasir"
                  value={reloginPassword}
                  onChange={(e) => setReloginPassword(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)" }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setReloginModalOpen(false)}
                  style={{
                    background: "#F3F4F6",
                    border: "1px solid var(--line)",
                    padding: "7px 14px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    cursor: "pointer"
                  }}
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={reloginLoading}
                  style={{
                    background: "var(--magenta)",
                    color: "#FFF",
                    border: "none",
                    padding: "7px 16px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {reloginLoading ? "Menyambungkan..." : "Sambungkan & Simpan Faktur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </KasirShell>
  );
}
