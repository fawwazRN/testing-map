import { useEffect, useState } from "react";
import L from "leaflet";

import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

const markerIcon = L.icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const searchCache = new Map();
let lastSearchRequestAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function searchPlaces(query) {
  const key = query.trim().toLowerCase();

  if (searchCache.has(key)) return searchCache.get(key);

  const wait = Math.max(0, 1100 - (Date.now() - lastSearchRequestAt));

  if (wait > 0) await sleep(wait);

  lastSearchRequestAt = Date.now();

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    countrycodes: "id",
    "accept-language": "id",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
  );

  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Terlalu banyak permintaan. Coba lagi nanti."
        : "Layanan pencarian tempat tidak tersedia.",
    );
  }

  const data = await response.json();
  searchCache.set(key, data);

  return data;
}

async function fetchMultiStopRoute(stops) {
  const coordinates = stops.map((stop) => `${stop.lng},${stop.lat}`).join(";");

  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
  });

  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Layanan routing tidak tersedia saat ini.");
  }

  const data = await response.json();

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("Rute tidak ditemukan. Periksa lokasi pemberhentianmu.");
  }

  const route = data.routes[0];

  return {
    distance: route.distance,
    duration: route.duration,
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    legs: (route.legs || []).map((leg) => ({
      distance: leg.distance,
      duration: leg.duration,
    })),
  };
}

function formatCoordinates(stop) {
  if (!stop || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) {
    return "Koordinat belum tersedia";
  }

  return `${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}`;
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;

  return `${(meters / 1000).toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  })} km`;
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (!hours) return `${minutes} menit`;
  if (!remaining) return `${hours} jam`;

  return `${hours} jam ${remaining} menit`;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function FitMap({ stops, route }) {
  const map = useMap();

  useEffect(() => {
    if (route?.coordinates?.length) {
      map.fitBounds(L.latLngBounds(route.coordinates), {
        padding: [40, 40],
        maxZoom: 14,
      });
      return;
    }

    const validStops = stops.filter(
      (stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng),
    );

    if (validStops.length > 1) {
      map.fitBounds(
        L.latLngBounds(validStops.map((stop) => [stop.lat, stop.lng])),
        { padding: [40, 40], maxZoom: 12 },
      );
    } else if (validStops.length === 1) {
      map.setView([validStops[0].lat, validStops[0].lng], 12);
    }
  }, [map, stops, route]);

  return null;
}

export default function MapView({ stops, onStopsChange }) {
  const [selectedStopId, setSelectedStopId] = useState(stops[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [message, setMessage] = useState("");

  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const validStops = stops.filter(
    (stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng),
  );

  useEffect(() => {
    setRoute(null);
    setRouteError("");
  }, [stops]);

  useEffect(() => {
    if (!stops.some((stop) => stop.id === selectedStopId)) {
      setSelectedStopId(stops[0]?.id ?? "");
    }
  }, [stops, selectedStopId]);

  function updateStopLocation(stopId, point, label) {
    onStopsChange((current) =>
      current.map((stop) =>
        stop.id === stopId
          ? {
              ...stop,
              lat: point.lat,
              lng: point.lng,
              name: label || stop.name,
            }
          : stop,
      ),
    );
  }

  function handleMapClick(point) {
    if (!selectedStopId) return;

    updateStopLocation(
      selectedStopId,
      point,
      `Lokasi peta (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})`,
    );

    setMessage("Lokasi pemberhentian berhasil dipindahkan.");
    setSearchError("");
  }

  async function handleSearch(event) {
    event.preventDefault();

    if (query.trim().length < 3) {
      setSearchError("Masukkan minimal 3 karakter.");
      setResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    setMessage("");
    setResults([]);

    try {
      const places = await searchPlaces(query.trim());
      setResults(places);

      if (places.length === 0) {
        setMessage("Lokasi tidak ditemukan. Coba kata kunci lain.");
      }
    } catch (error) {
      setSearchError(error.message || "Pencarian gagal.");
    } finally {
      setSearchLoading(false);
    }
  }

  function choosePlace(place) {
    const point = {
      lat: Number(place.lat),
      lng: Number(place.lon),
    };

    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
      setSearchError("Koordinat tempat tidak valid.");
      return;
    }

    updateStopLocation(selectedStopId, point, place.name || place.display_name);

    setQuery(place.name || place.display_name);
    setResults([]);
    setSearchError("");
    setMessage(
      `Lokasi berhasil diterapkan ke pemberhentian ${
        stops.findIndex((stop) => stop.id === selectedStopId) + 1
      }.`,
    );
  }

  async function calculateRoute() {
    if (validStops.length !== stops.length || stops.length < 2) {
      setRouteError(
        "Pastikan minimal dua pemberhentian sudah memiliki koordinat.",
      );
      return;
    }

    setRouteLoading(true);
    setRouteError("");
    setMessage("");
    setRoute(null);

    try {
      const result = await fetchMultiStopRoute(stops);
      setRoute(result);
      setMessage("Rute perjalanan berhasil dihitung.");
    } catch (error) {
      setRouteError(error.message || "Gagal menghitung rute.");
    } finally {
      setRouteLoading(false);
    }
  }

  const straightLine = validStops.map((stop) => [stop.lat, stop.lng]);

  return (
    <section className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
      <div className="p-5 sm:p-6">
        <p className="font-bold text-brand-600 text-xs uppercase tracking-[0.16em]">
          Multi-stop planner
        </p>

        <h2 className="mt-2 font-heading font-extrabold text-ink text-xl">
          Peta perjalanan
        </h2>

        <p className="mt-2 text-slate-500 text-sm leading-6">
          Pilih pemberhentian yang ingin diedit, lalu cari tempat atau klik
          titik baru pada peta.
        </p>

        <label
          htmlFor="selected-stop"
          className="block mt-5 mb-2 font-bold text-slate-700 text-sm">
          Edit lokasi pemberhentian
        </label>

        <select
          id="selected-stop"
          value={selectedStopId}
          onChange={(event) => setSelectedStopId(event.target.value)}
          className="bg-white px-4 py-3 border border-slate-200 rounded-xl w-full text-sm">
          {stops.map((stop, index) => (
            <option key={stop.id} value={stop.id}>
              {index === 0
                ? `Asal: ${stop.name}`
                : `Pemberhentian ${index}: ${stop.name}`}
            </option>
          ))}
        </select>

        <form onSubmit={handleSearch} className="mt-4">
          <label
            htmlFor="multi-stop-search"
            className="block mb-2 font-bold text-slate-700 text-sm">
            Cari nama tempat
          </label>

          <div className="flex sm:flex-row flex-col gap-2">
            <input
              id="multi-stop-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Contoh: Monas, Jakarta"
              className="flex-1 px-4 py-3 border border-slate-200 focus:border-brand-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-100 min-w-0 text-sm"
            />

            <button
              type="submit"
              disabled={searchLoading}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 px-5 py-3 rounded-xl font-bold text-white text-sm">
              {searchLoading ? "Mencari..." : "Cari"}
            </button>
          </div>
        </form>

        {searchError && (
          <p
            role="alert"
            className="bg-red-50 mt-3 p-3 rounded-xl text-red-700 text-sm">
            {searchError}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="bg-brand-50 mt-3 p-3 rounded-xl text-brand-700 text-sm">
            {message}
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="font-bold text-slate-500 text-xs uppercase tracking-wide">
              Hasil pencarian
            </p>

            {results.map((place) => (
              <button
                key={`${place.osm_type}-${place.osm_id}`}
                type="button"
                onClick={() => choosePlace(place)}
                className="hover:bg-brand-50 p-3 border border-slate-200 hover:border-brand-500 rounded-xl w-full text-left">
                <span className="block font-bold text-ink text-sm">
                  {place.name || place.display_name}
                </span>
                <span className="block mt-1 text-slate-500 text-xs leading-5">
                  {place.display_name}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 p-4 border border-slate-200 rounded-xl">
          <p className="font-bold text-ink text-sm">Urutan perjalanan</p>

          <ol className="space-y-3 mt-3">
            {stops.map((stop, index) => (
              <li key={stop.id} className="flex items-start gap-3">
                <span className="flex justify-center items-center bg-brand-50 rounded-full w-7 h-7 font-extrabold text-brand-700 text-xs shrink-0">
                  {index + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink text-sm break-words">
                    {stop.name}
                  </p>
                  <p className="mt-1 text-slate-500 text-xs break-words">
                    {formatCoordinates(stop)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <button
          type="button"
          onClick={calculateRoute}
          disabled={routeLoading}
          className="bg-ink hover:bg-slate-800 disabled:opacity-60 mt-5 px-5 py-3.5 rounded-xl w-full font-bold text-white text-sm">
          {routeLoading ? "Menghitung rute..." : "Hitung seluruh rute"}
        </button>

        {routeError && (
          <p
            role="alert"
            className="bg-red-50 mt-3 p-3 rounded-xl text-red-700 text-sm">
            {routeError}
          </p>
        )}

        {route && (
          <div className="space-y-3 mt-4">
            <div className="gap-3 grid grid-cols-2">
              <div className="bg-brand-50 p-4 rounded-xl">
                <p className="font-semibold text-slate-500 text-xs">
                  Total jarak
                </p>
                <p className="mt-1 font-heading font-extrabold text-brand-700 text-xl">
                  {formatDistance(route.distance)}
                </p>
              </div>

              <div className="bg-brand-50 p-4 rounded-xl">
                <p className="font-semibold text-slate-500 text-xs">
                  Waktu berkendara
                </p>
                <p className="mt-1 font-heading font-extrabold text-brand-700 text-xl">
                  {formatDuration(route.duration)}
                </p>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl">
              <p className="font-bold text-ink text-sm">Detail setiap segmen</p>

              <ol className="space-y-3 mt-3">
                {route.legs.map((leg, index) => (
                  <li key={`${stops[index].id}-${stops[index + 1].id}`}>
                    <p className="font-semibold text-slate-700 text-sm">
                      {stops[index].name} → {stops[index + 1].name}
                    </p>
                    <p className="mt-1 text-slate-500 text-xs">
                      {formatDistance(leg.distance)} ·{" "}
                      {formatDuration(leg.duration)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-slate-500 text-xs leading-5">
              Estimasi OSRM bukan data lalu lintas langsung. Waktu aktual dapat
              berbeda.
            </p>
          </div>
        )}
      </div>

      <div className="z-0 relative w-full h-[360px] sm:h-[460px]">
        <MapContainer
          center={[-6.5, 107.1]}
          zoom={9}
          scrollWheelZoom
          className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapClickHandler onMapClick={handleMapClick} />
          <FitMap stops={stops} route={route} />

          {stops.map((stop, index) => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={markerIcon}>
              <Popup>
                <strong>
                  {index === 0 ? "Titik asal" : `Pemberhentian ${index}`}
                </strong>
                <br />
                {stop.name}
                <br />
                {formatCoordinates(stop)}
              </Popup>
            </Marker>
          ))}

          {route ? (
            <Polyline
              positions={route.coordinates}
              pathOptions={{
                color: "#059669",
                weight: 5,
                opacity: 0.9,
              }}
            />
          ) : (
            <Polyline
              positions={straightLine}
              pathOptions={{
                color: "#94a3b8",
                weight: 3,
                dashArray: "8 8",
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="px-5 sm:px-6 py-4 border-slate-100 border-t">
        <p className="text-slate-500 text-xs leading-5">
          Peta © OpenStreetMap contributors. Pencarian menggunakan Nominatim dan
          rute jalan menggunakan OSRM.
        </p>
      </div>
    </section>
  );
}
