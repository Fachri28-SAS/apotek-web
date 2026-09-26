import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../lib/api";
import { tambahLogPerubahan } from "../../lib/auditLog";
import KasirShell from "./KasirShell";
import DetailBatchModal from "./komponen/DetailBatchModal";

function getTglYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function StokOpname() {
  const { user } = useAuth();
  const tglSekarang = getTglYmd(new Date());
  const [items, setItems] = useState([]);
  const [loadingObat, setLoadingObat] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("semua"); // "semua" | "selisih" | "terisi"
  const [riwayat, setRiwayat] = useState([]);
  const [dariTanggal, setDariTanggal] = useState(tglSekarang);
  const [sampaiTanggal, setSampaiTanggal] = useState(tglSekarang);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState("");
  const [modalBatchObat, setModalBatchObat] = useState(null);
  const [sedangMenyimpanId, setSedangMenyimpanId] = useState(null);

  // Muat seluruh daftar obat dari sistem (urut abjad A-Z)
  function muatSemuaObat() {
    setLoadingObat(true);
    api("/obat")
      .then((daftar) => {
        // Urutkan A-Z berdasarkan nama obat
        const sorted = [...daftar].sort((a, b) => a.nama.localeCompare(b.nama));
        setItems(
          sorted.map((obat) => ({
            id: obat.id,
            obat_id: obat.id,
            nama: obat.nama,
            nomor_batch: obat.nomor_batch || "-",
            tanggal_exp: obat.tanggal_exp,
            satuan_dasar: obat.satuan_dasar || "Unit",
            stok_sistem: Number(obat.stok || 0),
            stok_fisik: "",
            keterangan: "",
            batches: null,
          }))
        );
      })
      .catch((err) => {
        setError("Gagal memuat daftar obat: " + (err.message || ""));
      })
      .finally(() => {
        setLoadingObat(false);
      });
  }

  function muatRiwayat() {
    const params = new URLSearchParams({ tipe: "penyesuaian" });
    if (dariTanggal) params.set("dari_tanggal", dariTanggal);
    if (sampaiTanggal) params.set("sampai_tanggal", sampaiTanggal);
    api(`/stok-mutasi?${params}`)
      .then(setRiwayat)
      .catch(() => setRiwayat([]));
  }

  useEffect(() => {
    muatSemuaObat();
  }, []);

  useEffect(() => {
    muatRiwayat();
  }, [dariTanggal, sampaiTanggal]);

  function ubahItem(id, field, value) {
    setItems((prev) =>
      prev.map((it) => (it.obat_id === id ? { ...it, [field]: value } : it))
    );
  }

  // Bantuan: Samakan semua stok fisik dengan stok sistem
  function handleSamakanSemua() {
    if (!window.confirm("Isi stok fisik semua obat sama dengan stok sistem saat ini? Anda tinggal mengubah obat yang ada selisih.")) return;
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        stok_fisik: String(it.stok_sistem),
      }))
    );
  }

  // Bantuan: Kosongkan seluruh input stok fisik
  function handleKosongkanInput() {
    if (!window.confirm("Kosongkan semua input stok fisik?")) return;
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        stok_fisik: "",
        keterangan: "",
        batches: null,
      }))
    );
  }

  function handleSimpanBatch(obatId, { batches, totalStokFisik }) {
    setItems((prev) =>
      prev.map((it) =>
        it.obat_id === obatId
          ? { ...it, batches, stok_fisik: String(totalStokFisik) }
          : it
      )
    );
  }

  const itemTerisi = items.filter((it) => it.stok_fisik !== "");
  const totalSelisih = itemTerisi.reduce(
    (s, it) => s + (Number(it.stok_fisik) - it.stok_sistem),
    0
  );
  const itemSelisih = itemTerisi.filter(
    (it) => Number(it.stok_fisik) !== it.stok_sistem
  );
  const adaSelisih = itemSelisih.length;

  // Filter tampilan obat
  const itemsTampil = items.filter((it) => {
    // Filter pencarian teks
    const matchSearch =
      !search ||
      it.nama.toLowerCase().includes(search.toLowerCase()) ||
      String(it.nomor_batch).toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    // Filter tab
    if (filterTab === "terisi") return it.stok_fisik !== "";
    if (filterTab === "selisih") return it.stok_fisik !== "" && Number(it.stok_fisik) !== it.stok_sistem;
    return true;
  });

  // Simpan penyesuaian untuk 1 obat saja
  async function handleSimpanSatu(it) {
    if (it.stok_fisik === "") {
      setError(`Isi kolom Stok Fisik untuk obat "${it.nama}" terlebih dahulu.`);
      return;
    }

    setSedangMenyimpanId(it.obat_id);
    setError("");
    setSukses("");

    try {
      await api("/obat/opname", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              obat_id: it.obat_id,
              stok_fisik: Number(it.stok_fisik),
              keterangan: it.keterangan || null,
              batches: it.batches || null,
            },
          ],
        }),
      });

      const stokBaru = Number(it.stok_fisik);
      setItems((prev) =>
        prev.map((item) =>
          item.obat_id === it.obat_id
            ? {
                ...item,
                stok_sistem: stokBaru,
                stok_fisik: "",
                keterangan: "",
                batches: null,
              }
            : item
        )
      );

      tambahLogPerubahan({
        kategori: "Stok Opname",
        aksi: "Penyesuaian Stok",
        item: it.nama,
        sebelum: `Stok: ${it.stok_sistem} ${it.satuan_dasar}`,
        sesudah: `Stok: ${stokBaru} ${it.satuan_dasar}`,
        keterangan: it.keterangan || "Penyesuaian stok fisik",
        oleh: user?.nama || user?.username || "Admin",
      });

      setSukses(`✓ Stok "${it.nama}" berhasil disimpan & disinkronkan ke sistem (${stokBaru} ${it.satuan_dasar}).`);
      muatRiwayat();
    } catch (err) {
      setError(err.message || `Gagal menyimpan penyesuaian stok "${it.nama}".`);
    } finally {
      setSedangMenyimpanId(null);
    }
  }

  async function simpan() {
    setError("");
    setSukses("");

    if (itemTerisi.length === 0) {
      setError("Isi dulu Stok Fisik minimal pada salah satu obat.");
      return;
    }

    setLoading(true);
    try {
      await api("/obat/opname", {
        method: "POST",
        body: JSON.stringify({
          items: itemTerisi.map((it) => ({
            obat_id: it.obat_id,
            stok_fisik: Number(it.stok_fisik),
            keterangan: it.keterangan || null,
            batches: it.batches || null,
          })),
        }),
      });

      tambahLogPerubahan({
        kategori: "Stok Opname",
        aksi: "Penyesuaian Massal",
        item: `${itemTerisi.length} Obat`,
        sebelum: "Stok sebelumnya",
        sesudah: "Stok fisik disesuaikan",
        keterangan: `Stok opname massal ${itemTerisi.length} item`,
        oleh: user?.nama || user?.username || "Admin",
      });

      setSukses(
        `Berhasil menyesuaikan ${itemTerisi.length} obat. Stok sistem & mutasi telah diperbarui.`
      );
      muatSemuaObat();
      muatRiwayat();
    } catch (err) {
      setError(err.message || "Gagal menyimpan penyesuaian stok.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KasirShell>
      <div className="halaman-header">
        <div>
          <h1 style={{ fontSize: 24 }}>Stok Opname</h1>
          <p className="halaman-sub">
            Semua data obat langsung termuat per abjad (A–Z). Isi stok fisik riil di rak untuk sinkronisasi.
          </p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {sukses && <div className="pesan-sukses">{sukses}</div>}

      {/* ---------- PANEL INPUT DAFTAR SEMUA OBAT ---------- */}
      <div className="panel">
        <div
          className="panel-head"
          style={{ flexWrap: "wrap", gap: 12, alignItems: "center" }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>Daftar Obat (A–Z)</h3>
            <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>
              {items.length} obat terdaftar di apotek
            </span>
          </div>

          {/* Tombol Aksi Bantuan Cepat */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSamakanSemua}
              disabled={loadingObat || items.length === 0}
              style={{
                background: "#FAF5FF",
                border: "1px solid var(--magenta)",
                color: "var(--magenta-dark)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
              title="Isi stok fisik semua obat sama persis dengan stok sistem"
            >
              <span>⚡</span>
              <span>Samakan Semua dg Sistem</span>
            </button>

            {itemTerisi.length > 0 && (
              <button
                type="button"
                onClick={handleKosongkanInput}
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#DC2626",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title="Kosongkan semua inputan stok fisik"
              >
                Reset Input
              </button>
            )}
          </div>
        </div>

        {/* Toolbar Filter & Pencarian Cepat */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
            paddingBottom: 14,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div className="search-obat-input" style={{ maxWidth: 360, width: "100%" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Cari obat dalam daftar A–Z…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`periode-chip ${filterTab === "semua" ? "active" : ""}`}
              onClick={() => setFilterTab("semua")}
              style={{ fontSize: 12, padding: "5px 10px" }}
            >
              Semua ({items.length})
            </button>
            <button
              type="button"
              className={`periode-chip ${filterTab === "terisi" ? "active" : ""}`}
              onClick={() => setFilterTab("terisi")}
              style={{ fontSize: 12, padding: "5px 10px" }}
            >
              Sudah Diisi ({itemTerisi.length})
            </button>
            <button
              type="button"
              className={`periode-chip ${filterTab === "selisih" ? "active" : ""}`}
              onClick={() => setFilterTab("selisih")}
              style={{
                fontSize: 12,
                padding: "5px 10px",
                color: adaSelisih > 0 && filterTab !== "selisih" ? "#DC2626" : undefined,
                fontWeight: adaSelisih > 0 ? 800 : 600,
              }}
            >
              Ada Selisih ({adaSelisih})
            </button>
          </div>
        </div>

        {loadingObat ? (
          <div className="panel-kosong" style={{ padding: 30 }}>
            Memuat seluruh data obat…
          </div>
        ) : itemsTampil.length === 0 ? (
          <div className="panel-kosong" style={{ padding: 30 }}>
            Tidak ada obat yang cocok dengan filter.
          </div>
        ) : (
          <>
            <div className="obat-table-wrap">
              <table className="obat-table" style={{ marginTop: 4 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: "center" }}>No.</th>
                    <th>Nama Obat</th>
                    <th style={{ width: 140, textAlign: "center" }}>Rincian Batch</th>
                    <th style={{ width: 110 }}>Stok Sistem</th>
                    <th style={{ width: 130 }}>Stok Fisik (Riil)</th>
                    <th style={{ width: 110 }}>Selisih</th>
                    <th>Keterangan</th>
                    <th style={{ width: 95, textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsTampil.map((it, idx) => {
                    const terisi = it.stok_fisik !== "";
                    const selisih = terisi
                      ? Number(it.stok_fisik) - it.stok_sistem
                      : null;
                    const adaBatchConfig = it.batches && it.batches.length > 0;

                    return (
                      <tr
                        key={it.obat_id}
                        style={{
                          background:
                            selisih !== null && selisih !== 0
                              ? "#FFFBEB"
                              : terisi
                              ? "#F8FAFC"
                              : undefined,
                        }}
                      >
                        <td style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 12 }}>
                          {idx + 1}
                        </td>
                        <td>
                          <span className="obat-nama-cell" style={{ fontWeight: 700 }}>
                            {it.nama}
                          </span>
                          {it.nomor_batch && it.nomor_batch !== "-" ? (
                            <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                              Batch: {it.nomor_batch}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => setModalBatchObat(it)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "4px 9px",
                              borderRadius: 7,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: adaBatchConfig ? "#FAF5FF" : "#F8FAFC",
                              color: adaBatchConfig ? "var(--magenta-dark)" : "#64748B",
                              border: adaBatchConfig
                                ? "1px solid #E9D5FF"
                                : "1px solid #E2E8F0",
                              cursor: "pointer",
                            }}
                            title="Atur penyesuaian per batch obat"
                          >
                            <span>📦</span>
                            <span>{adaBatchConfig ? `${it.batches.length} Batch` : "Batch"}</span>
                          </button>
                        </td>
                        <td className="obat-stok-cell">
                          <strong>{it.stok_sistem}</strong>{" "}
                          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                            {it.satuan_dasar}
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="cart-input-angka"
                            value={it.stok_fisik}
                            placeholder="Isi stok riil"
                            onChange={(e) =>
                              ubahItem(it.obat_id, "stok_fisik", e.target.value)
                            }
                            style={{
                              fontWeight: 700,
                              borderColor:
                                selisih !== null && selisih !== 0
                                  ? "#F59E0B"
                                  : terisi
                                  ? "#10B981"
                                  : undefined,
                              background: terisi ? "#fff" : "#FAFAFC",
                            }}
                          />
                        </td>
                        <td>
                          {selisih === null ? (
                            <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>— Belum diisi —</span>
                          ) : selisih === 0 ? (
                            <span className="selisih-badge cocok">✓ Pas (0)</span>
                          ) : (
                            <span
                              className={`selisih-badge ${
                                selisih > 0 ? "lebih" : "kurang"
                              }`}
                            >
                              {selisih > 0 ? `▲ +${selisih}` : `▼ ${selisih}`}
                            </span>
                          )}
                        </td>
                        <td>
                          <input
                            type="text"
                            className="cart-input-angka"
                            value={it.keterangan}
                            placeholder="mis. rusak, selisih hitung"
                            onChange={(e) =>
                              ubahItem(it.obat_id, "keterangan", e.target.value)
                            }
                            style={{ fontSize: 12 }}
                          />
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            onClick={() => handleSimpanSatu(it)}
                            disabled={sedangMenyimpanId === it.obat_id || it.stok_fisik === ""}
                            style={{
                              background: it.stok_fisik !== "" ? "var(--magenta)" : "#F1F5F9",
                              color: it.stok_fisik !== "" ? "#fff" : "#94A3B8",
                              border: "none",
                              borderRadius: 7,
                              padding: "6px 12px",
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: it.stok_fisik !== "" ? "pointer" : "not-allowed",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              boxShadow: it.stok_fisik !== "" ? "0 2px 5px rgba(166, 75, 199, 0.28)" : "none",
                              transition: "all 0.15s ease",
                            }}
                            title={
                              it.stok_fisik !== ""
                                ? `Simpan stok untuk ${it.nama}`
                                : "Isi stok fisik dulu untuk simpan"
                            }
                          >
                            <span>💾</span>
                            <span>{sedangMenyimpanId === it.obat_id ? "…" : "Simpan"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Ringkasan & Tombol Simpan */}
            <div className="opname-ringkasan">
              <div className="opname-ringkasan-info">
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>
                  {itemTerisi.length} dari {items.length} obat telah dihitung
                </span>
                {adaSelisih > 0 ? (
                  <span
                    className="opname-ringkasan-selisih"
                    style={{ color: "#D97706", fontWeight: 700 }}
                  >
                    ⚠️ {adaSelisih} obat memiliki selisih fisik (Total selisih:{" "}
                    {totalSelisih > 0 ? `+${totalSelisih}` : totalSelisih})
                  </span>
                ) : itemTerisi.length > 0 ? (
                  <span style={{ color: "#059669", fontWeight: 700 }}>
                    ✓ Semua stok fisik yang diisi cocok dengan sistem (tidak ada selisih)
                  </span>
                ) : (
                  <span style={{ fontSize: 12 }}>
                    Ketik angka pada kolom Stok Fisik untuk obat yang dihitung.
                  </span>
                )}
              </div>

              <button
                className="payment-submit"
                style={{ width: "auto", marginTop: 0, padding: "12px 28px", fontSize: 14 }}
                onClick={simpan}
                disabled={loading || itemTerisi.length === 0}
              >
                {loading ? "Menyimpan…" : `Simpan Penyesuaian (${itemTerisi.length} Obat)`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ---------- MODAL RINCIAN BATCH ---------- */}
      {modalBatchObat && (
        <DetailBatchModal
          obat={modalBatchObat}
          onClose={() => setModalBatchObat(null)}
          onSimpan={(hasilBatch) =>
            handleSimpanBatch(modalBatchObat.obat_id, hasilBatch)
          }
        />
      )}

      {/* ---------- RIWAYAT PENYESUAIAN ---------- */}
      <div className="panel">
        <div className="panel-head" style={{ flexWrap: "wrap", gap: 12 }}>
          <h3>Riwayat Penyesuaian</h3>
          <div
            className="kalender-filter-group"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              className="kalender-item-wrap"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-soft)",
              }}
            >
              <span>📅 Dari:</span>
              <input
                type="date"
                value={dariTanggal}
                onChange={(e) => setDariTanggal(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1.5px solid var(--line)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  background: "#fff",
                }}
              />
            </div>

            <div
              className="kalender-item-wrap"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-soft)",
              }}
            >
              <span>Sampai:</span>
              <input
                type="date"
                value={sampaiTanggal}
                onChange={(e) => setSampaiTanggal(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1.5px solid var(--line)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  background: "#fff",
                }}
              />
            </div>
          </div>
        </div>

        {riwayat.length === 0 ? (
          <div className="panel-kosong">Belum ada penyesuaian pada periode ini.</div>
        ) : (
          <div className="obat-table-wrap">
            <table className="obat-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Obat</th>
                  <th>Sebelum</th>
                  <th>Sesudah</th>
                  <th>Selisih</th>
                  <th>Petugas</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {new Date(m.created_at).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td>
                      <span className="obat-nama-cell">{m.obat?.nama || "—"}</span>
                    </td>
                    <td>{m.stok_sebelum}</td>
                    <td>{m.stok_sesudah}</td>
                    <td>
                      <span
                        className={`selisih-badge ${
                          m.qty > 0 ? "lebih" : "kurang"
                        }`}
                      >
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </span>
                    </td>
                    <td>{m.user?.nama || "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      {m.keterangan || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </KasirShell>
  );
}
