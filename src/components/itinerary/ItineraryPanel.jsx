import { useState } from "react";
import { computeTotals, rupiah } from "../../lib/budget.js";
import { exportItineraryPdf } from "../../lib/exportPdf.js";
import { apiRequest } from "../../lib/api.js";


const STATUS_LABEL = { estimate: "Estimasi AI", free: "Gratis", unknown: "Biaya belum diketahui" };
const CHECKLIST = [
  "Identitas / paspor masih berlaku",
  "Tiket & reservasi (cek ulang di penyedia resmi)",
  "Syarat masuk / visa (cek situs resmi negara tujuan)",
  "Asuransi perjalanan",
  "Uang tunai & kartu pembayaran",
  "Charger & power bank",
  "Obat pribadi",
];
const SCENARIO_LABEL = { hemat: "Hemat", seimbang: "Seimbang", nyaman: "Nyaman" };

const postJson = (path, body) =>
  apiRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const fieldCls = "w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500";

export default function ItineraryPanel({ stops, preferences, itinerary, setItinerary }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState(0);
  const [editing, setEditing] = useState(null); // { d, i }
  const [draft, setDraft] = useState(null);
  const [editError, setEditError] = useState("");
  const [instruction, setInstruction] = useState("");
  const [checks, setChecks] = useState({});

  const travelers = Number(preferences.travelers) || 1;
  const budget = Number(preferences.budget) || 0;
  const totals = itinerary ? computeTotals(itinerary, travelers) : null;
  const dayIndex = itinerary ? Math.min(activeDay, itinerary.days.length - 1) : 0;
  const day = itinerary?.days?.[dayIndex];

  async function call(path, body, after) {
    setLoading(true);
    setError("");
    try {
      const data = await postJson(path, body);
      setItinerary(data.itinerary);
      setEditing(null);
      after?.();
    } catch (e) {
      setError(e.message || "Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  function generate() {
    if (itinerary && !window.confirm("Itinerary saat ini (termasuk editanmu) akan diganti. Lanjutkan?")) return;
    call("/api/itinerary", { stops, preferences }, () => setActiveDay(0));
  }
  function revise() {
    if (instruction.trim().length < 3) { setError("Tulis instruksi revisi minimal 3 karakter."); return; }
    call("/api/itinerary/revise", { stops, preferences, itinerary, instruction }, () => setInstruction(""));
  }

  function patchDay(di, fn) {
    setItinerary((cur) => ({ ...cur, days: cur.days.map((d, i) => (i === di ? fn(d) : d)) }));
  }
  function startEdit(di, ai) {
    setEditing({ d: di, i: ai });
    setDraft({ ...itinerary.days[di].activities[ai] });
    setEditError("");
  }
  function saveDraft() {
    if (!draft.place.trim()) { setEditError("Nama tempat wajib diisi."); return; }
    const clean = {
      ...draft,
      place: draft.place.trim(),
      duration_minutes: Math.max(0, Math.round(Number(draft.duration_minutes) || 0)),
      estimated_cost_idr: draft.cost_status === "unknown" ? 0 : Math.max(0, Math.round(Number(draft.estimated_cost_idr) || 0)),
    };
    patchDay(editing.d, (d) => ({ ...d, activities: d.activities.map((a, i) => (i === editing.i ? clean : a)) }));
    setEditing(null);
  }
  function removeActivity(di, ai) {
    patchDay(di, (d) => ({ ...d, activities: d.activities.filter((_, i) => i !== ai) }));
    setEditing(null);
  }
  function addActivity(di) {
    const a = { time: "", place: "Aktivitas baru", description: "", duration_minutes: 60, estimated_cost_idr: 0, cost_status: "unknown", notes: "" };
    const index = itinerary.days[di].activities.length;
    patchDay(di, (d) => ({ ...d, activities: [...d.activities, a] }));
    setEditing({ d: di, i: index });
    setDraft(a);
    setEditError("");
  }
  function exportPdf() {
    try { exportItineraryPdf({ itinerary, stops, totals, travelers }); } catch (e) { setError(e.message); }
  }

  const over = totals && budget > 0 && totals.knownTotal > budget;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-5 pb-4 border-gray-100 border-b">
        <span className="inline-flex items-center gap-1.5 bg-brand-50 px-3 py-1.5 border border-brand-100 rounded-full font-semibold text-brand-700 text-xs">✦ Rekomendasi AI</span>
        <h2 className="mt-3 font-heading font-extrabold text-ink text-xl leading-tight">{itinerary?.trip_title || "Itinerary perjalananmu"}</h2>
        <p className="mt-1.5 text-muted text-sm leading-5">
          {itinerary?.overview || "Pilih minimal 2 destinasi, atur preferensi, lalu buat rencana per hari dengan Gemini."}
        </p>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={generate} disabled={loading || stops.length < 2}
            className="flex flex-1 justify-center items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-4 py-3 rounded-xl font-semibold text-white text-sm transition disabled:cursor-not-allowed">
            {loading ? (<><span className="inline-block animate-spin">◌</span> Memproses…</>) : itinerary ? "↻ Buat ulang" : "✦ Buat itinerary AI"}
          </button>
          {itinerary && (
            <button type="button" onClick={exportPdf} className="hover:bg-gray-50 px-4 border border-gray-200 rounded-xl font-semibold text-sm">PDF</button>
          )}
        </div>
        {stops.length < 2 && <p className="mt-2 text-amber-700 text-xs">Tambahkan minimal 2 destinasi dulu.</p>}
      </div>

      <div className="flex-1 p-5 min-h-0 overflow-y-auto thin-scroll">
        {error && (
          <div role="alert" className="bg-red-50 mb-4 p-3 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
            <button onClick={itinerary && instruction.trim() ? revise : generate} className="block mt-2 font-semibold underline">Coba lagi</button>
          </div>
        )}

        {loading && (
          <div className="space-y-3 mb-4">
            {[70, 100, 85].map((w, i) => <div key={i} className="bg-gray-100 rounded-xl h-14 animate-pulse" style={{ width: `${w}%` }} />)}
          </div>
        )}

        {!loading && !itinerary && !error && (
          <div className="p-6 border border-gray-300 border-dashed rounded-2xl text-center">
            <p className="font-semibold text-ink text-sm">Belum ada itinerary</p>
            <p className="mt-1 text-muted text-xs leading-5">Hasil AI tampil di sini sebagai kartu per hari dan bisa kamu edit.</p>
          </div>
        )}

        {itinerary && (
          <>
            <div className="flex gap-2 pb-1 overflow-x-auto thin-scroll">
              {itinerary.days.map((d, i) => (
                <button key={d.day_number} type="button" onClick={() => { setActiveDay(i); setEditing(null); }}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold border transition ${i === dayIndex ? "bg-ink text-white border-ink" : "bg-white text-muted border-gray-200 hover:border-gray-400"}`}>
                  Hari {d.day_number}
                </button>
              ))}
            </div>

            {day && (
              <div className="mt-4">
                <h3 className="font-heading font-bold text-ink text-lg">Hari {day.day_number}</h3>
                <p className="text-muted text-sm">{day.title}</p>
                {day.activities.length === 0 && <p className="mt-3 text-muted text-sm">Belum ada aktivitas di hari ini.</p>}

                <ol className="mt-3 divide-y divide-gray-100 border border-gray-200 rounded-2xl">
                  {day.activities.map((a, i) => {
                    const isEditing = editing && editing.d === dayIndex && editing.i === i;
                    return (
                      <li key={i} className="p-4">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="gap-2 grid grid-cols-2">
                              <input aria-label="Jam" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} placeholder="09:00" className={fieldCls} />
                              <input aria-label="Durasi (menit)" type="number" min="0" value={draft.duration_minutes} onChange={(e) => setDraft({ ...draft, duration_minutes: e.target.value })} className={fieldCls} />
                            </div>
                            <input aria-label="Tempat" value={draft.place} onChange={(e) => setDraft({ ...draft, place: e.target.value })} className={fieldCls} />
                            <textarea aria-label="Deskripsi" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={fieldCls} />
                            <div className="gap-2 grid grid-cols-2">
                              <select aria-label="Status biaya" value={draft.cost_status} onChange={(e) => setDraft({ ...draft, cost_status: e.target.value })} className={fieldCls}>
                                <option value="estimate">Estimasi</option><option value="free">Gratis</option><option value="unknown">Belum diketahui</option>
                              </select>
                              <input aria-label="Biaya (Rp)" type="number" min="0" disabled={draft.cost_status !== "estimate"} value={draft.cost_status === "estimate" ? draft.estimated_cost_idr : 0} onChange={(e) => setDraft({ ...draft, estimated_cost_idr: e.target.value })} className={`${fieldCls} disabled:bg-gray-50`} />
                            </div>
                            {editError && <p className="text-red-700 text-xs">{editError}</p>}
                            <div className="flex gap-2">
                              <button onClick={saveDraft} className="bg-brand-600 px-3 py-1.5 rounded-lg font-semibold text-white text-xs">Simpan</button>
                              <button onClick={() => setEditing(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg font-semibold text-xs">Batal</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center gap-2">
                              <span className="bg-brand-50 px-2.5 py-1 rounded-lg font-semibold text-brand-700 text-xs">{a.time || "—"}</span>
                              <span className="text-muted text-xs">{a.duration_minutes} mnt</span>
                            </div>
                            <h4 className="mt-2 font-heading font-bold text-ink">{a.place}</h4>
                            {a.description && <p className="mt-1 text-muted text-sm leading-5">{a.description}</p>}
                            <p className="mt-2 font-semibold text-ink text-xs">
                              {a.cost_status === "estimate" ? `≈ ${rupiah(a.estimated_cost_idr)}` : STATUS_LABEL[a.cost_status]}
                              {a.cost_status === "estimate" && <span className="font-normal text-muted"> (estimasi AI)</span>}
                            </p>
                            {a.notes && <p className="mt-1 text-muted text-xs leading-5">{a.notes}</p>}
                            <div className="flex gap-3 mt-2 text-xs">
                              <button onClick={() => startEdit(dayIndex, i)} className="font-semibold text-brand-700 hover:underline">Edit</button>
                              <button onClick={() => removeActivity(dayIndex, i)} className="font-semibold text-red-700 hover:underline">Hapus</button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ol>
                <button onClick={() => addActivity(dayIndex)} className="mt-2 font-semibold text-brand-700 text-xs hover:underline">+ Tambah aktivitas</button>
                {totals && (
                  <p className="mt-2 text-muted text-xs">
                    Subtotal hari ini: <b className="text-ink">{rupiah(totals.perDay[dayIndex]?.known)}</b>
                    {totals.perDay[dayIndex]?.unknown > 0 && ` + ${totals.perDay[dayIndex].unknown} komponen belum diketahui`}
                  </p>
                )}
              </div>
            )}

            <div className={`mt-5 p-4 rounded-2xl border ${over ? "bg-red-50 border-red-200" : "bg-brand-50 border-brand-100"}`}>
              <p className="text-muted text-xs">Total biaya yang diketahui · {travelers} orang · IDR</p>
              <p className="font-heading font-extrabold text-ink text-2xl">{rupiah(totals.knownTotal)}</p>
              <p className="text-muted text-xs">≈ {rupiah(totals.perPerson)} per orang</p>
              {totals.unknownCount > 0 && (
                <p className="mt-2 font-semibold text-amber-800 text-xs">Belum termasuk {totals.unknownCount} komponen yang biayanya belum diketahui (tidak dihitung sebagai Rp 0).</p>
              )}
              {over && <p className="mt-2 font-semibold text-red-700 text-xs">Melebihi anggaranmu ({rupiah(budget)}) sebesar {rupiah(totals.knownTotal - budget)}.</p>}
              <p className="mt-2 text-muted text-xs leading-5">{itinerary.budget_note}</p>
            </div>

            {itinerary.budget_scenarios?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-heading font-bold text-sm">Skenario anggaran <span className="font-normal text-muted">(estimasi AI)</span></h4>
                <div className="space-y-2 mt-2">
                  {itinerary.budget_scenarios.map((s) => (
                    <div key={s.name} className="p-3 border border-gray-200 rounded-xl">
                      <div className="flex justify-between text-sm"><b>{SCENARIO_LABEL[s.name]}</b><span>{rupiah(s.total_estimated_cost_idr)}</span></div>
                      <p className="mt-1 text-muted text-xs leading-5">Asumsi: {s.assumptions}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {itinerary.transport_options?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-heading font-bold text-sm">Opsi transportasi <span className="font-normal text-muted">(bukan tarif resmi)</span></h4>
                <div className="space-y-2 mt-2">
                  {itinerary.transport_options.map((t, i) => (
                    <div key={i} className="p-3 border border-gray-200 rounded-xl">
                      <div className="flex justify-between text-sm">
                        <b>{t.mode}</b>
                        <span>{t.price_status === "estimate" ? `≈ ${rupiah(t.estimated_total_idr)} (estimasi)` : "Harga belum tersedia"}</span>
                      </div>
                      <p className="mt-1 text-muted text-xs leading-5">{t.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 p-4 border border-gray-200 rounded-2xl">
              <h4 className="font-heading font-bold text-sm">Revisi dengan AI</h4>
              <p className="mt-1 text-muted text-xs">Hanya bagian yang terdampak yang diubah; editanmu ikut dikirim.</p>
              <textarea rows={2} value={instruction} maxLength={500} onChange={(e) => setInstruction(e.target.value)}
                placeholder="Contoh: ganti hari 2 jadi lebih santai, tambah wisata kuliner" className={`${fieldCls} mt-2`} />
              <button onClick={revise} disabled={loading} className="bg-ink hover:bg-slate-800 disabled:opacity-50 mt-2 px-4 py-2 rounded-lg font-semibold text-white text-sm">Terapkan revisi</button>
            </div>

            <div className="mt-4 p-4 border border-gray-200 rounded-2xl">
              <h4 className="font-heading font-bold text-sm">Checklist perjalanan</h4>
              <ul className="space-y-1.5 mt-2">
                {CHECKLIST.map((c) => (
                  <li key={c}><label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={!!checks[c]} onChange={() => setChecks({ ...checks, [c]: !checks[c] })} className="mt-1" />
                    <span className={checks[c] ? "line-through text-muted" : ""}>{c}</span>
                  </label></li>
                ))}
              </ul>
            </div>

            {itinerary.important_notes.length > 0 && (
              <div className="bg-amber-50 mt-4 p-4 border border-amber-200 rounded-2xl">
                <h4 className="font-bold text-amber-900 text-sm">Sebelum berangkat</h4>
                <ul className="space-y-1.5 mt-2 pl-4 text-amber-900 text-xs leading-5 list-disc">
                  {itinerary.important_notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}
            <p className="mt-4 text-muted text-[11px] leading-4">Biaya, jam buka, dan jadwal dari AI adalah perkiraan, bukan data resmi. Periksa ulang sebelum berangkat.</p>
          </>
        )}
      </div>
    </div>
  );
}
