import { useState } from "react";
import { api } from "../../lib/api";
import KasirShell from "./KasirShell";
import SearchObat from "./komponen/SearchObat";
import CartTable, { hitungDiskonItem } from "./komponen/CartTable";
import PaymentPanel from "./komponen/PaymentPanel";
import StrukModal from "./komponen/StrukModal";

function tabKosong(id) {
  return {
    id,
    items: [],
    namaPembeli: "",
    noInvoice: "",
    catatan: "",
    diskonTipe: "rp",
    diskonNilai: 0,
    diskon: 0,
    metodeBayar: "tunai",
    uangDiterima: "",
  };
}

export default function Kasir() {
  const [tabs, setTabs] = useState([tabKosong(Date.now())]);
  const [tabAktifId, setTabAktifId] = useState(tabs[0].id);
  const [struk, setStruk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tabAktif = tabs.find((t) => t.id === tabAktifId);

  function updateTabAktif(patch) {
    setTabs((prev) => prev.map((t) => (t.id === tabAktifId ? { ...t, ...patch } : t)));
  }

  function tambahTab() {
    const baru = tabKosong(Date.now());
    setTabs((prev) => [...prev, baru]);
    setTabAktifId(baru.id);
  }

  function tutupTab(id) {
    const tab = tabs.find((t) => t.id === id);
    if (tab.items.length > 0 && !confirm("Keranjang tab ini masih ada isinya. Tutup tab?")) return;

    const sisa = tabs.filter((t) => t.id !== id);
    if (sisa.length === 0) {
      const baru = tabKosong(Date.now());
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
          diskon_tipe: "rp",
          diskon_nilai: 0,
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

  const subtotalKotor = tabAktif.items.reduce((s, it) => s + it.qty * it.harga_jual + (it.tuslah || 0), 0);
  const totalDiskonItem = tabAktif.items.reduce((s, it) => s + hitungDiskonItem(it), 0);
  const subtotalBersih = Math.max(subtotalKotor - totalDiskonItem, 0);

  const diskonTransaksi =
    (tabAktif.diskonTipe || "rp") === "%"
      ? Math.round((subtotalBersih * Math.min(100, tabAktif.diskonNilai || 0)) / 100)
      : Math.min(Number(tabAktif.diskonNilai !== undefined ? tabAktif.diskonNilai : tabAktif.diskon || 0), subtotalBersih);

  const total = Math.max(subtotalBersih - diskonTransaksi, 0);
  const kembalian = Math.max(Number(tabAktif.uangDiterima || 0) - total, 0);

  async function simpanTransaksi() {
    setError("");
    setLoading(true);
    try {
      const payload = {
        nama_pembeli: tabAktif.namaPembeli || null,
        no_invoice: tabAktif.noInvoice || null,
        catatan: tabAktif.catatan || null,
        diskon: diskonTransaksi,
        metode_bayar: tabAktif.metodeBayar,
        uang_diterima: tabAktif.metodeBayar === "tunai" ? Number(tabAktif.uangDiterima || 0) : null,
        items: tabAktif.items.map((it) => ({
          obat_id: it.obat_id,
          obat_satuan_id: it.obat_satuan_id,
          qty: it.qty,
          harga_asli: it.harga_asli,
          harga_jual: it.harga_jual,
          tuslah: it.tuslah || 0,
          diskon: hitungDiskonItem(it),
        })),
      };

      const hasil = await api("/penjualan", { method: "POST", body: JSON.stringify(payload) });
      setStruk(hasil);

      updateTabAktif({
        items: [],
        namaPembeli: "",
        noInvoice: "",
        catatan: "",
        diskonTipe: "rp",
        diskonNilai: 0,
        diskon: 0,
        metodeBayar: "tunai",
        uangDiterima: "",
      });
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
          <h1 style={{ fontSize: 24 }}>Kasir / Penjualan</h1>
          <p className="halaman-sub">Catat transaksi penjualan langsung di apotek</p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="kasir-tabs-bar">
        {tabs.map((t, idx) => (
          <div
            key={t.id}
            className={`kasir-tab ${t.id === tabAktifId ? "active" : ""}`}
            onClick={() => setTabAktifId(t.id)}
          >
            <span className="kasir-tab-icon">🧾</span>
            <span className="kasir-tab-label">
              {t.namaPembeli ? t.namaPembeli : `Pelanggan ${idx + 1}`}
            </span>
            {t.items.length > 0 && (
              <span className="kasir-tab-badge">
                {t.items.length} item
              </span>
            )}
            {tabs.length > 1 && (
              <button
                type="button"
                className="kasir-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  tutupTab(t.id);
                }}
                title="Tutup transaksi ini"
                aria-label="Tutup tab"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="kasir-tab-add-btn"
          onClick={tambahTab}
          title="Buka transaksi baru (antrean pelanggan lain)"
        >
          <span style={{ fontSize: 16, fontWeight: 800 }}>+</span>
          <span>Transaksi Baru</span>
        </button>
      </div>

      <div className="kasir-jual-grid">
        <div className="kasir-jual-kiri">
          <SearchObat onPilih={tambahItem} />
          <CartTable items={tabAktif.items} onUbah={ubahItem} onHapus={hapusItem} />
        </div>

        <div className="kasir-jual-kanan">
          <PaymentPanel
            tab={tabAktif}
            onChange={(field, value) => updateTabAktif({ [field]: value })}
            subtotal={subtotalKotor}
            subtotalKotor={subtotalKotor}
            totalDiskonItem={totalDiskonItem}
            subtotalBersih={subtotalBersih}
            diskonTransaksi={diskonTransaksi}
            total={total}
            kembalian={kembalian}
            onSubmit={simpanTransaksi}
            loading={loading}
            disabled={tabAktif.items.length === 0}
          />
        </div>
      </div>

      {/* Floating Sticky Cart Bar di Mobile (Sesuai Preview Layar 3) */}
      {tabAktif.items.length > 0 && (
        <div className="cart-sticky mobile-only">
          <div className="l">
            <div className="n">Total ({tabAktif.items.length} item)</div>
            <div className="v">{rupiah(total)}</div>
          </div>
          <button
            type="button"
            className="btn-pay"
            onClick={() => {
              const el = document.querySelector(".kasir-jual-kanan");
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            Bayar →
          </button>
        </div>
      )}

      <StrukModal data={struk} onClose={() => setStruk(null)} />
    </KasirShell>
  );
}
