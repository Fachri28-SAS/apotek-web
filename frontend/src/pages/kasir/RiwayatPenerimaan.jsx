import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { rupiah } from "../../utils/format";
import { cetakLaporanPenerimaan } from "../../utils/cetakLaporanPenerimaan";
import KasirShell from "./KasirShell";
import DetailFakturModal from "./komponen/DetailFakturModal";

function getTglYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const now = new Date();
const awalBulanDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const hariIniDefault = getTglYmd(now);

export default function RiwayatPenerimaan() {
  const [daftar, setDaftar] = useState([]);
  const [dariTanggal, setDariTanggal] = useState(awalBulanDefault);
  const [sampaiTanggal, setSampaiTanggal] = useState(hariIniDefault);
  const [filterStatus, setFilterStatus] = useState("semua"); // "semua" | "belum" | "lunas"
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [notif, setNotif] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dariTanggal) params.set("dari_tanggal", dariTanggal);
    if (sampaiTanggal) params.set("sampai_tanggal", sampaiTanggal);
    if (search.trim()) params.set("search", search.trim());

    const timer = setTimeout(() => {
      api(`/penerimaan?${params}`)
        .then((d) => { setDaftar(d || []); setError(""); })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [dariTanggal, sampaiTanggal, search]);

  const [konfirmasiBayar, setKonfirmasiBayar] = useState(null);
  const [loadingToggle, setLoadingToggle] = useState(false);

  function bukaDetail(faktur) {
    setDetail(faktur);
  }

  async function prosesToggleBayar() {
    if (!konfirmasiBayar) return;
    setLoadingToggle(true);
    try {
      const res = await api(`/penerimaan/${konfirmasiBayar.id}/toggle-bayar`, { method: "PUT" });
      setDaftar((prev) =>
        prev.map((it) => (it.id === konfirmasiBayar.id ? { ...it, status_bayar: res.penerimaan.status_bayar, tanggal_bayar: res.penerimaan.tanggal_bayar } : it))
      );
      setNotif(res.message);
      setTimeout(() => setNotif(""), 4000);
      setKonfirmasiBayar(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingToggle(false);
    }
  }

  // Filter berdasarkan status bayar jika dipilih
  const daftarTampil = daftar.filter((p) => {
    if (filterStatus === "belum") return p.status_bayar === "belum";
    if (filterStatus === "lunas") return p.status_bayar === "lunas";
    return true;
  });

  const totalTagihan = daftarTampil.reduce((s, p) => s + Number(p.total || 0), 0);
  const totalLunas = daftarTampil.filter((p) => p.status_bayar === "lunas").reduce((s, p) => s + Number(p.total || 0), 0);
  const totalBelumLunas = daftarTampil.filter((p) => p.status_bayar === "belum").reduce((s, p) => s + Number(p.total || 0), 0);

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Laporan Penerimaan Barang</h1>
          <p className="halaman-sub">
            {loading ? "Memuat…" : `${daftarTampil.length} faktur tercatat · Total Besar Uang: ${rupiah(totalTagihan)}`}
          </p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {notif && <div style={{ background: "#ECFDF5", color: "#065F46", padding: "10px 16px", borderRadius: 10, marginBottom: 14, fontWeight: 600, fontSize: 13.5, border: "1px solid #A7F3D0" }}>{notif}</div>}

      {/* Ringkasan Besar Uang & Jatuh Tempo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "#fff", padding: "14px 18px", borderRadius: 14, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Total Faktur Masuk</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--ink)", marginTop: 4 }}>{daftarTampil.length} Faktur</div>
        </div>
        <div style={{ background: "#fff", padding: "14px 18px", borderRadius: 14, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>Total Besar Uang</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--magenta-dark)", marginTop: 4 }}>{rupiah(totalTagihan)}</div>
        </div>
        <div style={{ background: "#F0FDF4", padding: "14px 18px", borderRadius: 14, border: "1px solid #BBF7D0" }}>
          <div style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>✓ Sudah Dibayar (Lunas)</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#15803D", marginTop: 4 }}>{rupiah(totalLunas)}</div>
        </div>
        <div style={{ background: "#FEF2F2", padding: "14px 18px", borderRadius: 14, border: "1px solid #FECACA" }}>
          <div style={{ fontSize: 12, color: "#991B1B", fontWeight: 600 }}>○ Belum Dibayar (Tempo)</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#DC2626", marginTop: 4 }}>{rupiah(totalBelumLunas)}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          {/* Kotak Pencarian */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 240, maxWidth: 340, background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: 12, padding: "8px 14px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 17, height: 17, color: "var(--ink-soft)" }}>
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama PBF, no. faktur, obat…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13.5, width: "100%", color: "var(--ink)" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", padding: 0 }}>
                ✕
              </button>
            )}
          </div>

          {/* Filter Rentang Tanggal, Status & Tombol Cetak */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              <span>Dari:</span>
              <input
                type="date"
                value={dariTanggal}
                onChange={(e) => setDariTanggal(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "1.5px solid var(--line)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              <span>Sampai:</span>
              <input
                type="date"
                value={sampaiTanggal}
                onChange={(e) => setSampaiTanggal(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "1.5px solid var(--line)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div className="periode-chips" style={{ margin: 0 }}>
              <button type="button" className={`periode-chip ${filterStatus === "semua" ? "active" : ""}`} onClick={() => setFilterStatus("semua")}>Semua Status</button>
              <button type="button" className={`periode-chip ${filterStatus === "belum" ? "active" : ""}`} onClick={() => setFilterStatus("belum")}>○ Belum Lunas</button>
              <button type="button" className={`periode-chip ${filterStatus === "lunas" ? "active" : ""}`} onClick={() => setFilterStatus("lunas")}>✓ Lunas</button>
            </div>

            <button
              type="button"
              onClick={() => cetakLaporanPenerimaan(daftarTampil, { dariTanggal, sampaiTanggal })}
              disabled={daftarTampil.length === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                background: "var(--magenta)",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                cursor: daftarTampil.length === 0 ? "not-allowed" : "pointer",
                opacity: daftarTampil.length === 0 ? 0.6 : 1,
                boxShadow: "0 2px 6px rgba(162, 28, 175, 0.2)",
              }}
              title="Cetak Laporan Penerimaan Barang untuk seluruh faktur yang tampil"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <path d="M6 14h12v8H6z" />
              </svg>
              Cetak Laporan
            </button>
          </div>
        </div>

        {loading ? (
          <div className="panel-kosong">Memuat laporan penerimaan…</div>
        ) : daftarTampil.length === 0 ? (
          <div className="panel-kosong">
            {search ? `Tidak ditemukan faktur untuk pencarian "${search}".` : "Belum ada faktur penerimaan pada periode tanggal ini."}
          </div>
        ) : (
          <div className="obat-table-wrap">
            <table className="obat-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: "center" }}>No</th>
                  <th style={{ width: 95 }}>Tgl</th>
                  <th>Nama PBF</th>
                  <th>Nomor Faktur</th>
                  <th style={{ textAlign: "right", width: 140 }}>Besar Uang</th>
                  <th style={{ width: 120 }}>Tgl Bayar</th>
                  <th style={{ width: 150, textAlign: "center" }}>Status Bayar</th>
                  <th style={{ width: 130, textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftarTampil.map((p, idx) => {
                  const tglTerima = new Date(p.tanggal_terima).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  });
                  const isLunas = p.status_bayar === "lunas";
                  const tglBayarOrTempo = isLunas
                    ? p.tanggal_bayar
                      ? new Date(p.tanggal_bayar).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" })
                      : "Lunas"
                    : p.tanggal_jatuh_tempo
                    ? new Date(p.tanggal_jatuh_tempo).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" })
                    : "—";

                  return (
                    <tr key={p.id} className="baris-klik" onClick={() => bukaDetail(p)}>
                      {/* 1. No Urut */}
                      <td style={{ textAlign: "center", fontWeight: 700, color: "var(--ink-soft)" }}>
                        {idx + 1}
                      </td>

                      {/* 2. Tanggal Terima */}
                      <td style={{ fontWeight: 600 }}>
                        {tglTerima}
                      </td>

                      {/* 3. Nama PBF */}
                      <td>
                        <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 13.5 }}>
                          {p.nama_supplier}
                        </div>
                        {p.items_count > 0 && (
                          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                            {p.items_count} item obat masuk
                          </div>
                        )}
                      </td>

                      {/* 4. Nomor Faktur */}
                      <td className="obat-batch-cell" style={{ fontWeight: 600 }}>
                        {p.no_faktur}
                      </td>

                      {/* 5. Besar Uang */}
                      <td style={{ textAlign: "right", fontWeight: 800, color: "var(--ink)", fontSize: 13.5 }}>
                        {rupiah(p.total)}
                      </td>

                      {/* 6. Tgl Bayar / Jatuh Tempo */}
                      <td>
                        <div style={{ fontWeight: 600, color: isLunas ? "#15803D" : "#B91C1C", fontSize: 12.5 }}>
                          {tglBayarOrTempo}
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                          {isLunas ? "Tgl pelunasan" : "Jatuh tempo"}
                        </div>
                      </td>

                      {/* 7. Status Checklist Lunas / Belum */}
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setKonfirmasiBayar(p);
                          }}
                          title="Klik untuk mengubah status pembayaran"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "5px 12px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            border: isLunas ? "1px solid #86EFAC" : "1px solid #FCA5A5",
                            background: isLunas ? "#DCFCE7" : "#FEF2F2",
                            color: isLunas ? "#15803D" : "#DC2626",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isLunas ? "✓ Lunas" : "○ Belum Lunas"}
                        </button>
                      </td>

                      {/* 8. Aksi: Lihat & Cetak */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              bukaDetail(p);
                            }}
                            title="Lihat rincian faktur"
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              border: "1px solid var(--line)",
                              background: "#fff",
                              color: "var(--magenta-dark)",
                              cursor: "pointer",
                            }}
                          >
                            Lihat
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              cetakLaporanPenerimaan([p], { dariTanggal: p.tanggal_terima, sampaiTanggal: p.tanggal_terima });
                            }}
                            title="Cetak Laporan untuk faktur ini"
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              border: "1px solid var(--magenta)",
                              background: "#FAF5FF",
                              color: "var(--magenta-dark)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                              <path d="M6 14h12v8H6z" />
                            </svg>
                            Cetak
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Pembayaran Faktur */}
      {konfirmasiBayar && (
        <div className="struk-overlay" onClick={() => !loadingToggle && setKonfirmasiBayar(null)}>
          <div className="struk-modal" style={{ maxWidth: 440, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>
              {konfirmasiBayar.status_bayar === "lunas" ? "↩️" : "✅"}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {konfirmasiBayar.status_bayar === "lunas"
                ? "Ubah Status Jadi Belum Lunas?"
                : "Tandai Faktur Sudah Lunas?"}
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5, marginBottom: 20 }}>
              Faktur <strong>{konfirmasiBayar.no_faktur}</strong> dari <strong>{konfirmasiBayar.nama_supplier}</strong> senilai <strong>{rupiah(konfirmasiBayar.total)}</strong> akan diubah statusnya menjadi{" "}
              <strong style={{ color: konfirmasiBayar.status_bayar === "lunas" ? "#DC2626" : "#15803D" }}>
                {konfirmasiBayar.status_bayar === "lunas" ? "○ Belum Lunas (Tempo)" : "✓ Lunas (Sudah Dibayar)"}
              </strong>.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={loadingToggle}
                onClick={() => setKonfirmasiBayar(null)}
                style={{ padding: "8px 18px", fontSize: 13.5 }}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={loadingToggle}
                onClick={prosesToggleBayar}
                style={{
                  padding: "8px 18px",
                  fontSize: 13.5,
                  background: konfirmasiBayar.status_bayar === "lunas" ? "#DC2626" : "#15803D",
                  borderColor: konfirmasiBayar.status_bayar === "lunas" ? "#DC2626" : "#15803D",
                }}
              >
                {loadingToggle ? "Menyimpan…" : (konfirmasiBayar.status_bayar === "lunas" ? "Ya, Ubah Jadi Tempo" : "Ya, Tandai Sudah Lunas")}
              </button>
            </div>
          </div>
        </div>
      )}

      <DetailFakturModal data={detail} onClose={() => setDetail(null)} />
    </KasirShell>
  );
}
