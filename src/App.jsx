import { useState } from "react";
import TripMap from "./components/map/TripMap.jsx";
import PlaceSearch from "./components/map/PlaceSearch.jsx";
import SavedTrips from "./components/trips/SavedTrips.jsx";
import ItineraryPanel from "./components/itinerary/ItineraryPanel.jsx";

const INITIAL_STOPS = [
  {
    id: "initial-tangerang",
    name: "Tangerang",
    lat: -6.1783,
    lng: 106.6319,
    country: "Indonesia",
    category: "city",
    source: "Koordinat perkiraan pusat kota",
  },
  {
    id: "initial-bandung",
    name: "Bandung",
    lat: -6.9175,
    lng: 107.6191,
    country: "Indonesia",
    category: "city",
    source: "Koordinat perkiraan pusat kota",
  },
];

const INITIAL_FORM = {
  departure: "",
  travelers: "2",
  transport: "car",
  budget: "500000",
  days: "",
  interests: "",
};

const TRANSPORT_OPTIONS = [
  { value: "car", label: "Mobil" },
  { value: "motorcycle", label: "Motor" },
  { value: "public_transport", label: "Transportasi umum" },
  { value: "plane", label: "Pesawat" },
  { value: "train", label: "Kereta" },
  { value: "ferry", label: "Feri" },
  { value: "flexible", label: "Pilih yang terbaik" },
];

function formatRupiah(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "Belum ditentukan";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function App() {
  const [stops, setStops] = useState(INITIAL_STOPS);
  const [focus, setFocus] = useState(null);
  const [showPlan, setShowPlan] = useState(true);
  const [itinerary, setItinerary] = useState(null);
  const [currentTrip, setCurrentTrip] = useState({ id: null, title: "" });
  const [showTrips, setShowTrips] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [notice, setNotice] = useState("");

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function addStop(place) {
    if (stops.length >= 10) {
      setNotice("Maksimal 10 pemberhentian untuk satu perjalanan.");
      return;
    }

    const alreadyExists = stops.some(
      (stop) =>
        Math.abs(stop.lat - place.lat) < 0.00001 &&
        Math.abs(stop.lng - place.lng) < 0.00001,
    );

    if (alreadyExists) {
      setNotice("Tempat tersebut sudah ada di daftar perjalanan.");
      return;
    }

    setStops((current) => [
      ...current,
      {
        ...place,
        id: place.id || `place-${place.lat}-${place.lng}`,
      },
    ]);

    setNotice(`${place.name} ditambahkan ke perjalanan.`);
  }

  function removeStop(id) {
    setStops((current) => current.filter((stop) => stop.id !== id));
    setNotice("");
  }

  function moveStop(index, direction) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= stops.length) return;

    setStops((current) => {
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function resetStops() {
    setStops([]);
    setNotice("Daftar destinasi dikosongkan. Cari tempat untuk memulai.");
  }

  function restoreExampleStops() {
    setStops(INITIAL_STOPS);
    setNotice("Contoh perjalanan dipulihkan.");
  }

  function getTripData() {
    return { version: 1, stops, form, itinerary };
  }

  function loadTrip(row) {
    const d = row.data || {};
    if (!Array.isArray(d.stops)) {
      setNotice("Data perjalanan tersimpan tidak valid.");
      return;
    }
    setStops(d.stops);
    setForm({ ...INITIAL_FORM, ...(d.form || {}) });
    setItinerary(d.itinerary || null);
    setCurrentTrip({ id: row.id, title: row.title });
    setFocus(null);
    setNotice(`Perjalanan "${row.title}" dimuat.`);
  }

  const preferences = {
    departure: form.departure.trim(),
    travelers: form.travelers,
    transport: form.transport,
    budget: form.budget,
    days: form.days,
    interests: form.interests,
  };

  const inputCls =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  function stepFocus(dir) {
    if (!stops.length) return;
    setFocus((f) => (f == null ? (dir > 0 ? 0 : stops.length - 1) : (f + dir + stops.length) % stops.length));
  }

  return (
    <div className="flex flex-col bg-canvas min-h-screen lg:h-screen text-ink">
      <header className="z-[600] flex justify-between items-center bg-white px-4 sm:px-6 py-3 border-gray-200 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex justify-center items-center bg-brand-600 rounded-xl size-10 text-white text-lg">⌖</div>
          <div>
            <h1 className="font-heading font-extrabold text-lg leading-none">trial-AImap</h1>
            <p className="hidden sm:block mt-1 text-muted text-xs">AI Travel Planner</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-brand-50 px-3 py-1.5 border border-brand-100 rounded-full font-semibold text-brand-700 text-sm">
            {stops.length} / 10 destinasi
          </span>
          <button
            type="button"
            onClick={() => setShowTrips(true)}
            className="hover:bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-full font-medium text-sm">
            Trip tersimpan
          </button>
          <button
            type="button"
            onClick={() => setShowPlan((v) => !v)}
            className="hidden lg:block hover:bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-full font-medium text-sm">
            {showPlan ? "Sembunyikan itinerary" : "Tampilkan itinerary"}
          </button>
        </div>
      </header>

      <main className="relative flex flex-col flex-1 lg:block min-h-0">
        <div className="h-[48vh] lg:h-auto lg:absolute lg:inset-0 z-0">
          <TripMap stops={stops} focus={focus} onFocus={setFocus} padLeft={showPlan ? 820 : 440} />
        </div>

        <div className="lg:absolute lg:inset-y-4 lg:left-4 z-[500] lg:flex lg:gap-4 lg:pointer-events-none">
          {/* Panel kiri: cari, destinasi, preferensi */}
          <section className="flex flex-col bg-white shadow-xl lg:rounded-3xl lg:w-[400px] lg:overflow-hidden pointer-events-auto">
            <div className="p-4 border-gray-100 border-b">
              <PlaceSearch onSelect={addStop} />
            </div>

            <div className="flex-1 space-y-5 p-4 min-h-0 lg:overflow-y-auto thin-scroll">
              <div>
                <div className="flex justify-between items-center">
                  <h2 className="font-heading font-bold">Destinasi</h2>
                  <div className="flex gap-2 text-xs">
                    <button type="button" onClick={restoreExampleStops} className="font-semibold text-brand-700 hover:underline">Contoh</button>
                    <button type="button" onClick={resetStops} disabled={!stops.length} className="font-semibold text-red-700 disabled:opacity-40 hover:underline">Kosongkan</button>
                  </div>
                </div>

                {stops.length === 0 ? (
                  <p className="mt-3 p-4 border border-gray-300 border-dashed rounded-xl text-muted text-sm text-center">
                    Belum ada destinasi. Cari tempat di atas.
                  </p>
                ) : (
                  <ol className="space-y-2 mt-3">
                    {stops.map((stop, index) => (
                      <li
                        key={stop.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${focus === index ? "border-blue-500 bg-blue-50/50" : "border-gray-200"}`}>
                        <button
                          type="button"
                          onClick={() => setFocus(index)}
                          className="flex flex-1 items-center gap-3 min-w-0 text-left">
                          <span className="flex justify-center items-center bg-blue-600 rounded-full size-7 font-bold text-white text-xs shrink-0">{index + 1}</span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-sm truncate">{stop.name}</span>
                            <span className="block text-muted text-xs truncate">{stop.address || stop.country || stop.category}</span>
                          </span>
                        </button>
                        <div className="flex gap-1 shrink-0">
                          <button type="button" aria-label="Naikkan" disabled={index === 0} onClick={() => moveStop(index, -1)} className="disabled:opacity-30 hover:bg-gray-100 rounded-lg size-7">↑</button>
                          <button type="button" aria-label="Turunkan" disabled={index === stops.length - 1} onClick={() => moveStop(index, 1)} className="disabled:opacity-30 hover:bg-gray-100 rounded-lg size-7">↓</button>
                          <button type="button" aria-label={`Hapus ${stop.name}`} onClick={() => removeStop(stop.id)} className="hover:bg-red-50 rounded-lg size-7 text-red-600">✕</button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {stops.length > 1 && (
                  <div className="flex justify-between items-center mt-3 text-xs">
                    <span className="text-muted">Fokus ke titik di peta</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => stepFocus(-1)} className="hover:bg-gray-100 border border-gray-200 rounded-lg size-8">‹</button>
                      <button type="button" onClick={() => stepFocus(1)} className="hover:bg-gray-100 border border-gray-200 rounded-lg size-8">›</button>
                      <button type="button" onClick={() => setFocus(null)} className="hover:bg-gray-100 px-2 border border-gray-200 rounded-lg h-8">Semua</button>
                    </div>
                  </div>
                )}
                {notice && <p role="status" className="mt-2 text-brand-700 text-xs">{notice}</p>}
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
                <h2 className="font-heading font-bold">Preferensi</h2>
                <label className="block">
                  <span className="block mb-1 font-medium text-xs">Tanggal keberangkatan (opsional)</span>
                  <input name="departure" value={form.departure} onChange={updateForm} maxLength={40} placeholder="Contoh: 20 Desember 2026" className={inputCls} />
                </label>
                <div className="gap-3 grid grid-cols-2">
                  <label className="block">
                    <span className="block mb-1 font-medium text-xs">Peserta</span>
                    <input type="number" name="travelers" value={form.travelers} onChange={updateForm} min="1" max="20" required className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="block mb-1 font-medium text-xs">Transportasi</span>
                    <select name="transport" value={form.transport} onChange={updateForm} className={inputCls}>
                      {TRANSPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="block mb-1 font-medium text-xs">Anggaran total (Rp)</span>
                  <input type="number" name="budget" value={form.budget} onChange={updateForm} min="0" max="1000000000" required className={inputCls} />
                  <span className="block mt-1 text-muted text-xs">{formatRupiah(form.budget)}</span>
                </label>
                <div className="gap-3 grid grid-cols-2">
                  <label className="block">
                    <span className="block mb-1 font-medium text-xs">Durasi (hari, opsional)</span>
                    <input type="number" name="days" value={form.days} onChange={updateForm} min="1" max="30" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="block mb-1 font-medium text-xs">Minat (opsional)</span>
                    <input name="interests" value={form.interests} onChange={updateForm} maxLength={200} placeholder="kuliner, alam" className={inputCls} />
                  </label>
                </div>
              </form>
            </div>
          </section>

          {/* Panel tengah: itinerary AI */}
          {showPlan && (
            <section className="bg-white shadow-xl lg:rounded-3xl lg:w-[400px] lg:overflow-hidden pointer-events-auto mt-4 lg:mt-0 lg:h-full">
              <ItineraryPanel stops={stops} preferences={preferences} itinerary={itinerary} setItinerary={setItinerary} />
            </section>
          )}
        </div>
      </main>

      {showTrips && (
        <SavedTrips
          onClose={() => setShowTrips(false)}
          getTripData={getTripData}
          onLoad={loadTrip}
          current={currentTrip}
          setCurrent={setCurrentTrip}
          hasContent={stops.length > 0}
        />
      )}
    </div>
  );
}
