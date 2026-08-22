import { useState } from "react";
import KasirShell from "./KasirShell";
import SearchObat from "./komponen/SearchObat";
import CartTable from "./komponen/CartTable";
import PaymentPanel from "./komponen/PaymentPanel";
import StrukModal from "./komponen/StrukModal";
import { api } from "../../lib/api";

function tabKosong(nomor) {
  return {
    id: Date.now() + Math.random(),
    label: `Kasir ${nomor}`,
    items: [],
    namaPembeli: "",
    noInvoice: "",
    catatan: "",
    diskon: 0,
    metodeBayar: "tunai",
    uangDiterima: "",
  };
}

export default function Kasir() {
  const [tabs, setTabs] = useState([tabKosong(1)]);
  const [tabAktifId, setTabAktifId] = useState(tabs[0].id);
  const [struk, setStruk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tabAktif = tabs.find((t) => t.id === tabAktifId);

  function updateTabAktif(patch) {
    setTabs((prev) => prev.map((t) => (t.id === tabAktifId ? { ...t, ...patch } : t)));
  }

  function tambahTab() {
    const baru = tabKosong(tabs.length + 1);
    setTabs((prev) => [...prev, baru]);
    setTabAktifId(baru.id);
  }

  function tutupTab(id) {
    const tab = tabs.find((t) => t.id === id);
    if (tab.items.length > 0 && !confirm("Keranjang tab ini masih ada isinya. Tutup tab?")) return;

    const sisa = tabs.filter((t) => t.id !== id);
    if (sisa.length === 0) {
      // Selalu sisakan minimal 1 tab supaya kasir tidak kehilangan tempat kerja
      const baru = tabKosong(1);
      setTabs([baru]);
      setTabAktifId(baru.id);
    } else {
      setTabs(sisa);
      if (tabAktifId === id) setTabAktifId(sisa[0].id);
    }
  }

  function tambahItem(obat, satuan) {
    const key = `${obat.id}-${satuan.id}`;
    const sudahAda = tabAktif.items.find((it) => it.key === key);

    if (sudahAda) {
      updateTabAktif({
        items: tabAktif.items.map((it) => (it.key === key ? { ...it, qty: it.qty + 1 } : it)),
      });
      return;
    }

    updateTabAktif({
      items: [
        ...tabAktif.items,
        {
          key,
          obat_id: obat.id,
          obat_satuan_id: satuan.id,
          nama_obat: obat.nama,
          nama_satuan: satuan.nama_satuan,
          nomor_batch: obat.nomor_batch,
          faktor: satuan.faktor,
          qty: 1,
          harga_asli: satuan.harga_jual,
          harga_jual: satuan.harga_jual,
          tuslah: 0,
        },
      ],
    });
  }

  function ubahItem(key, field, value) {
    updateTabAktif({
      items: tabAktif.items.map((it) => (it.key === key ? { ...it, [field]: value } : it)),
    });
  }

  function hapusItem(key) {
    updateTabAktif({ items: tabAktif.items.filter((it) => it.key !== key) });
  }

  const subtotal = tabAktif.items.reduce((s, it) => s + it.qty * it.harga_jual + it.tuslah, 0);
  const total = Math.max(subtotal - Number(tabAktif.diskon || 0), 0);
  const kembalian = Math.max(Number(tabAktif.uangDiterima || 0) - total, 0);

  async function simpanTransaksi() {
    setError("");
    setLoading(true);
    try {
      const payload = {
        nama_pembeli: tabAktif.namaPembeli || null,
        no_invoice: tabAktif.noInvoice || null,
        catatan: tabAktif.catatan || null,
        diskon: Number(tabAktif.diskon || 0),
        metode_bayar: tabAktif.metodeBayar,
        uang_diterima: tabAktif.metodeBayar === "tunai" ? Number(tabAktif.uangDiterima || 0) : null,
        items: tabAktif.items.map((it) => ({
          obat_id: it.obat_id,
          obat_satuan_id: it.obat_satuan_id,
          qty: it.qty,
          harga_asli: it.harga_asli,
          harga_jual: it.harga_jual,
          tuslah: it.tuslah,
        })),
      };

      const hasil = await api("/penjualan", { method: "POST", body: JSON.stringify(payload) });
      setStruk(hasil);

      // Reset tab ini supaya siap dipakai pelanggan berikutnya, tab lain tidak diganggu
      updateTabAktif({
        items: [], namaPembeli: "", noInvoice: "", catatan: "",
        diskon: 0, metodeBayar: "tunai", uangDiterima: "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KasirShell>
      <div className="kasir-tabs-bar">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`kasir-tab ${t.id === tabAktifId ? "active" : ""}`}
            onClick={() => setTabAktifId(t.id)}
          >
            {t.label}
            {t.items.length > 0 && <span className="kasir-tab-dot" />}
            {tabs.length > 1 && (
              <button
                type="button"
                className="kasir-tab-close"
                onClick={(e) => { e.stopPropagation(); tutupTab(t.id); }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" className="kasir-tab-add" onClick={tambahTab}>+</button>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="kasir-jual-grid">
        <div className="kasir-jual-kiri">
          <SearchObat onPilih={tambahItem} />
          <CartTable items={tabAktif.items} onUbah={ubahItem} onHapus={hapusItem} />
        </div>

        <div className="kasir-jual-kanan">
          <PaymentPanel
            tab={tabAktif}
            onChange={(field, value) => updateTabAktif({ [field]: value })}
            subtotal={subtotal}
            total={total}
            kembalian={kembalian}
            onSubmit={simpanTransaksi}
            loading={loading}
            disabled={tabAktif.items.length === 0}
          />
        </div>
      </div>

      <StrukModal data={struk} onClose={() => setStruk(null)} />
    </KasirShell>
  );
}
