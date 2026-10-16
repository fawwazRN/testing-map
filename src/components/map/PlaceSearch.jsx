import { useState } from "react";
import { apiRequest } from "../../lib/api.js";

const CATEGORIES = [
  { value: "all", label: "Semua tempat" },
  { value: "restaurant", label: "Restoran" },
  { value: "cafe", label: "Kafe" },
  { value: "tourism", label: "Wisata" },
  { value: "museum", label: "Museum" },
  { value: "hotel", label: "Hotel" },
  { value: "transport", label: "Stasiun" },
];

export default function PlaceSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(event) {
    event.preventDefault();

    if (query.trim().length < 2) {
      setError("Masukkan minimal 2 karakter.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const params = new URLSearchParams({
        query: query.trim(),
        category,
      });

      const data = await apiRequest(`/api/places/search?${params}`);

      setResults(data.results || []);

      if (!data.results?.length) {
        setError("Tempat belum ditemukan. Coba nama yang lebih spesifik.");
      }
    } catch (err) {
      setError(err.message || "Tidak dapat mencari tempat.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(place) {
    onSelect?.(place);
    setResults([]);
    setQuery("");
    setError("");
  }

  return (
    <section className="bg-white shadow-sm p-4 border border-gray-200 rounded-2xl">
      <div className="mb-3">
        <h2 className="font-bold text-gray-900 text-lg">Cari destinasi</h2>
        <p className="mt-1 text-gray-500 text-sm">
          Cari kota, negara, restoran, atau tempat wisata.
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <label className="block">
          <span className="block mb-1 font-medium text-sm">Nama tempat</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Contoh: Gardens by the Bay, Singapore"
            maxLength={160}
            className="px-3 py-2.5 border border-gray-300 focus:border-emerald-500 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 w-full"
          />
        </label>

        <label className="block">
          <span className="block mb-1 font-medium text-sm">Kategori</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="bg-white px-3 py-2.5 border border-gray-300 rounded-xl w-full">
            {CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-4 py-2.5 rounded-xl w-full font-semibold text-white transition disabled:cursor-not-allowed">
          {loading ? "Mencari..." : "Cari tempat"}
        </button>
      </form>

      {error && (
        <p role="status" className="mt-3 text-amber-700 text-sm">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="font-semibold text-gray-700 text-sm">Hasil pencarian</p>

          {results.map((place) => (
            <button
              type="button"
              key={place.id}
              onClick={() => handleSelect(place)}
              className="block hover:bg-emerald-50 p-3 border border-gray-200 hover:border-emerald-400 rounded-xl w-full text-left transition">
              <span className="block font-semibold text-gray-900">
                {place.name}
              </span>

              <span className="block mt-1 text-gray-500 text-xs leading-5">
                {place.address}
              </span>

              {place.country && (
                <span className="block mt-1 text-emerald-700 text-xs">
                  {place.country}
                </span>
              )}

              <span className="block mt-2 font-semibold text-emerald-700 text-xs">
                + Tambahkan ke perjalanan
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-gray-500 text-xs">
        Data tempat: OpenStreetMap contributors.
      </p>
    </section>
  );
}
