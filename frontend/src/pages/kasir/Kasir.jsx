import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState([tabKosong(Date.now())]);
  const [tabAktifId, setTabAktifId] = useState(tabs[0].id);
  const [struk, setStruk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalClosingOpen, setModalClosingOpen] = useState(false);
  const [loadingClosing, setLoadingClosing] = useState(false);

  async function handleClosingKasir() {
    setLoadingClosing(true);
    try {
      await api("/user/closing", { method: "POST" });
      await logout();
      navigate("/login?pesan=closing", { replace: true });
    } catch (err) {
      alert(err.message || "Gagal melakukan closing kasir. Silakan coba lagi.");
      setLoadingClosing(false);
    }
  }

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
            <span className="kasir-tab-icon"></span>
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
        <button
          type="button"
          className="kasir-tab-closing-btn"
          onClick={() => setModalClosingOpen(true)}
          title="Closing kasir & selesai shift (akun dinonaktifkan otomatis sampai diaktifkan Admin)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 14, height: 14 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Closing</span>
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

      {/* Floating Sticky Cart Bar di Mobile */}
      {tabAktif.items.length > 0 && (
        <div className="cart-sticky mobile-only">
          <div className="l">
            <div className="n">Total ({tabAktif.items.length} item)</div>
            <div className="v">{rupiah(total)}</div>
          </div>
          <button
            type="button"
            className="btn-pay"
            disabled={loading}
            onClick={() => {
              const kurang = tabAktif.metodeBayar === "tunai" && Number(tabAktif.uangDiterima || 0) < total;
              if (kurang) {
                const el = document.querySelector(".payment-panel");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
                const inputUang = document.querySelector(".payment-field input[placeholder='0']");
                if (inputUang) {
                  inputUang.focus();
                }
                return;
              }
              // Jika uang sudah cukup/pas atau QRIS, langsung proses pembayaran tanpa pop up
              simpanTransaksi();
            }}
          >
            {loading ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      )}

      <StrukModal data={struk} onClose={() => setStruk(null)} />

      {modalClosingOpen && (
        <div
          className="struk-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loadingClosing) setModalClosingOpen(false);
          }}
        >
          <div className="struk-modal" style={{ maxWidth: 440, padding: 0, overflow: "hidden" }}>
            <div className="struk-modal-head" style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#FEE2E2",
                    color: "#DC2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 20, height: 20 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#991B1B" }}>
                    Closing Kasir &amp; Selesai Shift
                  </h3>
                  <div style={{ fontSize: 11.5, color: "#B91C1C", marginTop: 2 }}>
                    Tutup sesi dan nonaktifkan akses akun kasir
                  </div>
                </div>
              </div>
              <button
                className="kasir-logout-btn"
                onClick={() => !loadingClosing && setModalClosingOpen(false)}
                disabled={loadingClosing}
                aria-label="Tutup"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div style={{ padding: "20px 22px" }}>
              {/* Info Kasir */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B", fontWeight: 600 }}>Kasir Bertugas:</span>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>
                    {user?.nama || "Kasir"} (@{user?.username || "-"})
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B", fontWeight: 600 }}>Waktu Closing:</span>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>
                    {new Date().toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    WIB
                  </span>
                </div>
              </div>

              {/* Warning Alert */}
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 12.5,
                  color: "#166534",
                  lineHeight: 1.5,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 4, display: "flex", alignItems: "center", gap: 6, color: "#15803D" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Ketentuan Selesai Shift:
                </div>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: 18 }}>
                  <li>Sesi shift kasir Anda akan <strong>ditutup dengan aman</strong> dan Anda akan langsung keluar (logout).</li>
                  <li>Kasir shift berikutnya dapat <strong>langsung masuk bertugas</strong> selama jam operasional apotek (07:00 – 22:00 WIB).</li>
                  <li>Seluruh riwayat penjualan shift Anda telah tercatat rapi di laporan sistem.</li>
                </ul>
              </div>

              {tabAktif.items.length > 0 && (
                <div
                  style={{
                    background: "#FEE2E2",
                    color: "#991B1B",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  ⚠️ Masih ada {tabAktif.items.length} item obat di keranjang transaksi saat ini. Pastikan semua transaksi sudah selesai atau dibatalkan sebelum closing.
                </div>
              )}
            </div>

            <div className="struk-actions" style={{ background: "#F8FAFC", borderTop: "1px solid #E2E8F0", padding: "14px 22px" }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setModalClosingOpen(false)}
                disabled={loadingClosing}
                style={{ flex: 1 }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClosingKasir}
                disabled={loadingClosing}
                style={{
                  flex: 1.4,
                  background: "#DC2626",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 4px 14px rgba(220, 38, 38, 0.3)",
                }}
              >
                {loadingClosing ? (
                  "Menutup Shift..."
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ width: 16, height: 16 }}>
                      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                      <line x1="12" y1="2" x2="12" y2="12" />
                    </svg>
                    Ya, Closing Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </KasirShell>
  );
}
