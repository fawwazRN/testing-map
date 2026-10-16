// Urutan: (1) alamat relatif /api lewat Vite proxy, (2) bila balasannya bukan JSON, langsung ke backend :3001.
const CONFIGURED = import.meta.env.VITE_API_URL;
const DIRECT = "http://localhost:3001";

async function attempt(base, path, options) {
  let res;
  try {
    res = await fetch(`${base}${path}`, options);
  } catch {
    return { network: true };
  }
  const text = await res.text();
  try {
    return { res, data: JSON.parse(text) };
  } catch {
    return { notJson: true };
  }
}

export async function apiRequest(path, options) {
  const bases = CONFIGURED ? [CONFIGURED] : ["", DIRECT];
  let last;
  for (const base of bases) {
    last = await attempt(base, path, options);
    if (last.res) break;
  }
  if (last.network)
    throw new Error("Tidak dapat terhubung ke backend. Jalankan `npm run server` (port 3001).");
  if (last.notJson)
    throw new Error("Backend tidak membalas JSON. Buka http://localhost:3001/api/health di browser: harus tampil {\"ok\":true}. Jika tidak, port 3001 dipakai aplikasi lain atau server belum jalan.");
  if (!last.res.ok) throw new Error(last.data.error || "Permintaan gagal.");
  return last.data;
}
