import { useState } from "react";
import MapView from "./components/map/MapView.jsx";
import PlaceSearch from "./components/map/PlaceSearch.jsx";
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

  const preferences = {
    departure: form.departure.trim(),
    travelers: form.travelers,
    transport: form.transport,
    budget: form.budget,
  };

  return (
    <main className="bg-gray-50 min-h-screen text-gray-900">
      <header className="bg-white border-gray-200 border-b">
        <div className="flex flex-wrap justify-between items-center gap-3 mx-auto px-4 sm:px-6 lg:px-8 py-5 max-w-7xl">
          <div>
            <p className="font-semibold text-emerald-700 text-sm uppercase tracking-wider">
              Travel smarter
            </p>
            <h1 className="mt-1 font-extrabold text-2xl sm:text-3xl tracking-tight">
              trial-AImap
            </h1>
            <p className="mt-1 text-gray-500 text-sm">
              Rencanakan perjalanan lokal maupun internasional dengan bantuan
              AI.
            </p>
          </div>

          <div className="bg-emerald-50 px-4 py-2 border border-emerald-100 rounded-full font-medium text-emerald-800 text-sm">
            {stops.length} / 10 destinasi
          </div>
        </div>
      </header>

      <div className="space-y-6 mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        <section className="gap-6 grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <PlaceSearch onSelect={addStop} />

            <section className="bg-white shadow-sm p-4 sm:p-5 border border-gray-200 rounded-2xl">
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <h2 className="font-bold text-lg">Destinasi perjalanan</h2>
                  <p className="mt-1 text-gray-500 text-sm">
                    Atur urutan tempat yang ingin dikunjungi.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={restoreExampleStops}
                  className="hover:bg-gray-50 px-3 py-2 border border-gray-300 rounded-lg font-medium text-sm">
                  Pulihkan contoh
                </button>
              </div>

              {stops.length === 0 ? (
                <div className="mt-4 p-6 border border-gray-300 border-dashed rounded-xl text-center">
                  <p className="font-medium text-gray-700">
                    Belum ada destinasi
                  </p>
                  <p className="mt-1 text-gray-500 text-sm">
                    Cari kota, restoran, atau tempat wisata di atas.
                  </p>
                </div>
              ) : (
                <ol className="space-y-3 mt-4">
                  {stops.map((stop, index) => (
                    <li
                      key={stop.id || `${stop.lat}-${stop.lng}`}
                      className="flex gap-3 p-3 border border-gray-200 rounded-xl">
                      <div className="flex justify-center items-center bg-emerald-100 rounded-full size-8 font-bold text-emerald-800 text-sm shrink-0">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold break-words">{stop.name}</p>
                        <p className="mt-1 text-gray-500 text-xs break-words">
                          {stop.address ||
                            `${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}`}
                        </p>
                        {stop.country && (
                          <p className="mt-1 text-emerald-700 text-xs">
                            {stop.country}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveStop(index, -1)}
                            className="disabled:opacity-40 px-2.5 py-1.5 border border-gray-200 rounded-lg font-medium text-xs disabled:cursor-not-allowed">
                            Naik
                          </button>

                          <button
                            type="button"
                            disabled={index === stops.length - 1}
                            onClick={() => moveStop(index, 1)}
                            className="disabled:opacity-40 px-2.5 py-1.5 border border-gray-200 rounded-lg font-medium text-xs disabled:cursor-not-allowed">
                            Turun
                          </button>

                          <button
                            type="button"
                            onClick={() => removeStop(stop.id)}
                            className="hover:bg-red-50 px-2.5 py-1.5 border border-red-200 rounded-lg font-medium text-red-700 text-xs">
                            Hapus
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={resetStops}
                  disabled={stops.length === 0}
                  className="hover:bg-gray-50 disabled:opacity-40 px-3 py-2 border border-gray-300 rounded-xl font-medium text-sm">
                  Kosongkan destinasi
                </button>
              </div>

              {notice && (
                <p role="status" className="mt-3 text-emerald-800 text-sm">
                  {notice}
                </p>
              )}
            </section>

            <section className="bg-white shadow-sm p-4 sm:p-5 border border-gray-200 rounded-2xl">
              <h2 className="font-bold text-lg">Preferensi perjalanan</h2>
              <p className="mt-1 text-gray-500 text-sm">
                Informasi ini membantu AI memilih rencana dan transportasi yang
                sesuai.
              </p>

              <form
                className="space-y-4 mt-4"
                onSubmit={(event) => event.preventDefault()}>
                <label className="block">
                  <span className="block mb-1.5 font-medium text-sm">
                    Tanggal atau waktu keberangkatan
                  </span>
                  <input
                    type="text"
                    name="departure"
                    value={form.departure}
                    onChange={updateForm}
                    placeholder="Contoh: 20 Desember 2026"
                    maxLength={40}
                    className="px-3 py-2.5 border border-gray-300 focus:border-emerald-500 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 w-full"
                  />
                  <span className="block mt-1 text-gray-500 text-xs">
                    Opsional. Jika diisi, AI tetap perlu data jadwal
                    terverifikasi.
                  </span>
                </label>

                <label className="block">
                  <span className="block mb-1.5 font-medium text-sm">
                    Jumlah peserta
                  </span>
                  <input
                    type="number"
                    name="travelers"
                    value={form.travelers}
                    onChange={updateForm}
                    min="1"
                    max="20"
                    required
                    className="px-3 py-2.5 border border-gray-300 rounded-xl w-full"
                  />
                </label>

                <label className="block">
                  <span className="block mb-1.5 font-medium text-sm">
                    Preferensi transportasi
                  </span>
                  <select
                    name="transport"
                    value={form.transport}
                    onChange={updateForm}
                    className="bg-white px-3 py-2.5 border border-gray-300 rounded-xl w-full">
                    {TRANSPORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block mb-1.5 font-medium text-sm">
                    Anggaran total (rupiah)
                  </span>
                  <input
                    type="number"
                    name="budget"
                    value={form.budget}
                    onChange={updateForm}
                    min="0"
                    max="1000000000"
                    required
                    className="px-3 py-2.5 border border-gray-300 rounded-xl w-full"
                  />
                  <span className="block mt-1 text-gray-500 text-xs">
                    Anggaran yang dimasukkan: {formatRupiah(form.budget)}
                  </span>
                </label>
              </form>
            </section>
          </div>

          <section className="flex flex-col bg-white shadow-sm border border-gray-200 rounded-2xl min-h-[420px] overflow-hidden">
            <div className="p-4 border-gray-200 border-b">
              <h2 className="font-bold text-lg">Peta perjalanan</h2>
              <p className="mt-1 text-gray-500 text-sm">
                Periksa titik lokasi dan rute di antara destinasi.
              </p>
            </div>

            <div className="flex-1 min-h-[420px]">
              <MapView stops={stops} onStopsChange={setStops} />
            </div>
          </section>
        </section>

        <section id="itinerary" className="scroll-mt-6">
          <ItineraryPanel stops={stops} preferences={preferences} />
        </section>

        <footer className="py-5 border-gray-200 border-t text-gray-500 text-xs leading-5">
          Data lokasi berasal dari OpenStreetMap jika tersedia. Rute, jadwal,
          harga tiket, dan tarif transportasi harus diperiksa sesuai penyedia
          dan tanggal perjalanan. Estimasi AI bukan harga atau jadwal resmi.
        </footer>
      </div>
    </main>
  );
}
