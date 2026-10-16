import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  LayersControl,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";

function numberIcon(n, active) {
  return L.divIcon({
    className: "",
    html: `<div class="pin${active ? " pin-active" : ""}"><span>${n}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

async function fetchRoute(stops, signal) {
  const coords = stops.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Layanan routing tidak tersedia.");
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length)
    throw new Error("Rute jalan tidak ditemukan untuk titik ini.");
  const r = data.routes[0];
  return {
    distance: r.distance,
    duration: r.duration,
    coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}

export function formatDistance(m) {
  return m < 1000
    ? `${Math.round(m)} m`
    : `${(m / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
}

export function formatDuration(s) {
  const min = Math.round(s / 60);
  const h = Math.floor(min / 60);
  const r = min % 60;
  if (!h) return `${min} mnt`;
  return r ? `${h} jam ${r} mnt` : `${h} jam`;
}

function Viewport({ stops, route, focus, padLeft }) {
  const map = useMap();
  useEffect(() => {
    const opts = { paddingTopLeft: [padLeft, 60], paddingBottomRight: [40, 90], maxZoom: 14 };
    if (focus != null && stops[focus]) {
      map.flyTo([stops[focus].lat, stops[focus].lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
    } else if (route?.coordinates?.length) {
      map.fitBounds(L.latLngBounds(route.coordinates), opts);
    } else if (stops.length > 1) {
      map.fitBounds(L.latLngBounds(stops.map((s) => [s.lat, s.lng])), opts);
    } else if (stops.length === 1) {
      map.setView([stops[0].lat, stops[0].lng], 12);
    }
  }, [map, stops, route, focus, padLeft]);
  return null;
}

export default function TripMap({ stops, focus, onFocus, padLeft = 0 }) {
  const [route, setRoute] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const [error, setError] = useState("");

  const key = useMemo(() => stops.map((s) => `${s.lat},${s.lng}`).join("|"), [stops]);

  useEffect(() => {
    if (stops.length < 2) {
      setRoute(null);
      setStatus("idle");
      return;
    }
    const ctrl = new AbortController();
    setStatus("loading");
    const t = setTimeout(() => {
      fetchRoute(stops, ctrl.signal)
        .then((r) => { setRoute(r); setStatus("ok"); setError(""); })
        .catch((e) => {
          if (e.name === "AbortError") return;
          setRoute(null); setStatus("error"); setError(e.message);
        });
    }, 500);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const straight = stops.map((s) => [s.lat, s.lng]);

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[-2.5, 118]} zoom={5} zoomControl={false} className="w-full h-full">
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Esri Jalan">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenTopoMap">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors, SRTM | &copy; <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a>'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <ZoomControl position="bottomright" />
        <Viewport stops={stops} route={route} focus={focus} padLeft={padLeft} />

        {route ? (
          <>
            <Polyline positions={route.coordinates} pathOptions={{ color: "#fff", weight: 9, opacity: 0.9 }} />
            <Polyline positions={route.coordinates} pathOptions={{ color: "#2563eb", weight: 5 }} />
          </>
        ) : (
          stops.length > 1 && (
            <Polyline positions={straight} pathOptions={{ color: "#94a3b8", weight: 3, dashArray: "8 8" }} />
          )
        )}

        {stops.map((s, i) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={numberIcon(i + 1, focus === i)}
            eventHandlers={{ click: () => onFocus?.(i) }}>
            <Popup closeButton={false} className="stop-popup">
              <p className="font-heading font-bold text-ink text-sm">{s.name}</p>
              <p className="mt-1 max-w-[220px] text-muted text-xs leading-4">
                {s.address || `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`}
              </p>
              <p className="mt-2 text-[11px] text-muted">
                {s.category} · {s.source}
              </p>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Info rute: hanya data dari OSRM */}
      <div className="bottom-4 left-1/2 z-[500] absolute bg-white/95 shadow-lg backdrop-blur px-4 py-2.5 rounded-2xl max-w-[92%] text-sm -translate-x-1/2 pointer-events-none lg:left-auto lg:right-20 lg:translate-x-0">
        {status === "ok" && route && (
          <span className="font-semibold text-ink">
            Rute mobil (OSRM): {formatDistance(route.distance)} · {formatDuration(route.duration)}
          </span>
        )}
        {status === "loading" && <span className="text-muted">Menghitung rute…</span>}
        {status === "error" && <span className="text-red-700">{error} Garis putus-putus bukan rute jalan.</span>}
        {status === "idle" && <span className="text-muted">Tambahkan minimal 2 destinasi untuk melihat rute.</span>}
      </div>
    </div>
  );
}
