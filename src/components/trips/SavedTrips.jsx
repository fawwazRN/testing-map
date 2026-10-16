import { useCallback, useEffect, useState } from "react";
import { supabase, supabaseConfigured, listTrips, getTrip, saveTrip, deleteTrip } from "../../lib/supabase.js";

const inputCls = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function SavedTrips({ onClose, getTripData, onLoad, current, setCurrent, hasContent }) {
  const [session, setSession] = useState(null);
  const [trips, setTrips] = useState([]);
  const [title, setTitle] = useState(current.title || "");
  const [auth, setAuth] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const say = (type, text) => setMsg({ type, text });
  const refresh = useCallback(async () => {
    try { setTrips(await listTrips()); } catch (e) { say("error", e.message); }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (session) refresh(); }, [session, refresh]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function run(fn, okText) {
    setBusy(true); say("", "");
    try { await fn(); if (okText) say("ok", okText); } catch (e) { say("error", e.message || "Terjadi kesalahan."); } finally { setBusy(false); }
  }

  const signIn = () => run(async () => {
    const { error } = await supabase.auth.signInWithPassword(auth);
    if (error) throw error;
  });
  const signUp = () => run(async () => {
    const { data, error } = await supabase.auth.signUp(auth);
    if (error) throw error;
    if (!data.session) say("ok", "Akun dibuat. Cek email untuk konfirmasi, lalu masuk.");
  });

  const save = (asNew) => run(async () => {
    const t = title.trim();
    if (!t) throw new Error("Beri judul perjalanan dulu.");
    if (!hasContent) throw new Error("Belum ada destinasi untuk disimpan.");
    const row = await saveTrip({ id: asNew ? null : current.id, title: t, data: getTripData() });
    setCurrent({ id: row.id, title: row.title });
    await refresh();
  }, "Perjalanan tersimpan.");

  const open = (id) => run(async () => {
    const row = await getTrip(id);
    onLoad(row);
    setTitle(row.title);
    onClose();
  });
  const remove = (id) => {
    if (!window.confirm("Hapus perjalanan ini secara permanen?")) return;
    run(async () => {
      await deleteTrip(id);
      if (current.id === id) setCurrent({ id: null, title: "" });
      await refresh();
    }, "Perjalanan dihapus.");
  };

  return (
    <div className="z-[1000] fixed inset-0 flex justify-center items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Trip tersimpan">
      <div className="flex flex-col bg-white shadow-2xl rounded-3xl w-full max-w-lg max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-gray-100 border-b">
          <h2 className="font-heading font-extrabold text-ink text-lg">Trip tersimpan</h2>
          <button onClick={onClose} aria-label="Tutup" className="hover:bg-gray-100 rounded-lg size-8">✕</button>
        </div>

        <div className="space-y-4 p-5 overflow-y-auto thin-scroll">
          {!supabaseConfigured ? (
            <div className="bg-amber-50 p-4 border border-amber-200 rounded-2xl text-amber-900 text-sm leading-6">
              <b>Penyimpanan belum tersedia.</b> Supabase belum dikonfigurasi, jadi perjalanan tidak disimpan ke mana pun.
              Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di <code>.env</code>, jalankan
              <code> supabase/migrations/001_trips.sql</code>, lalu mulai ulang <code>npm run dev</code>.
            </div>
          ) : !session ? (
            <div className="space-y-3">
              <p className="text-muted text-sm">Masuk untuk menyimpan dan memuat perjalananmu.</p>
              <input type="email" placeholder="Email" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} className={inputCls} />
              <input type="password" placeholder="Kata sandi (min. 6 karakter)" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} className={inputCls} />
              <div className="flex gap-2">
                <button disabled={busy} onClick={signIn} className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 py-2.5 rounded-xl font-semibold text-white text-sm">Masuk</button>
                <button disabled={busy} onClick={signUp} className="flex-1 hover:bg-gray-50 disabled:opacity-50 py-2.5 border border-gray-200 rounded-xl font-semibold text-sm">Daftar</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center text-muted text-xs">
                <span className="truncate">{session.user.email}</span>
                <button onClick={() => supabase.auth.signOut()} className="font-semibold text-ink hover:underline">Keluar</button>
              </div>

              <div className="space-y-2">
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Judul perjalanan" className={inputCls} />
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => save(false)} className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 py-2.5 rounded-xl font-semibold text-white text-sm">
                    {current.id ? "Perbarui" : "Simpan"}
                  </button>
                  {current.id && (
                    <button disabled={busy} onClick={() => save(true)} className="flex-1 hover:bg-gray-50 disabled:opacity-50 py-2.5 border border-gray-200 rounded-xl font-semibold text-sm">Simpan sebagai salinan</button>
                  )}
                </div>
              </div>

              <ul className="space-y-2">
                {trips.length === 0 && <li className="p-4 border border-gray-300 border-dashed rounded-xl text-muted text-sm text-center">Belum ada perjalanan tersimpan.</li>}
                {trips.map((t) => (
                  <li key={t.id} className={`flex items-center gap-2 p-3 border rounded-xl ${current.id === t.id ? "border-brand-500 bg-brand-50/50" : "border-gray-200"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{t.title}</p>
                      <p className="text-muted text-xs">{new Date(t.updated_at).toLocaleString("id-ID")}</p>
                    </div>
                    <button disabled={busy} onClick={() => open(t.id)} className="hover:bg-gray-100 px-2.5 py-1.5 border border-gray-200 rounded-lg font-semibold text-xs">Buka</button>
                    <button disabled={busy} onClick={() => remove(t.id)} aria-label={`Hapus ${t.title}`} className="hover:bg-red-50 rounded-lg size-8 text-red-600">✕</button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {busy && <p className="text-muted text-xs">Memproses…</p>}
          {msg.text && (
            <p role="status" className={`text-sm ${msg.type === "error" ? "text-red-700" : "text-brand-700"}`}>{msg.text}</p>
          )}
        </div>
      </div>
    </div>
  );
}
