import "dotenv/config";
import express from "express";
import cors from "cors";
import { registerItineraryRoutes } from "./itinerary.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Izinkan frontend dari localhost/127.0.0.1 (port Vite bisa berganti) + CLIENT_ORIGIN bila diatur.
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(
  cors({
    origin(origin, callback) {
      const allowed = !origin || LOCAL_ORIGIN.test(origin) || origin === process.env.CLIENT_ORIGIN;
      callback(null, allowed);
    },
  }),
);
app.use(express.json({ limit: "120kb" }));

// Pembatas permintaan sederhana per IP (in-memory).
const hits = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({
        error: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
      });
    }
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (now - v.start > 10 * 60 * 1000) hits.delete(k);
}, 60 * 1000).unref();

app.use("/api/itinerary", rateLimit(10, 60 * 1000));
app.use("/api/places", rateLimit(40, 60 * 1000));

// ============================================================
// CACHE PENCARIAN TEMPAT + ANTREAN NOMINATIM
// ============================================================

const placeSearchCache = new Map();
let lastNominatimRequestAt = 0;
let nominatimQueue = Promise.resolve();

const PLACE_CATEGORIES = {
  all: "",
  restaurant: "restaurant",
  cafe: "cafe",
  tourism: "tourist attraction",
  museum: "museum",
  hotel: "hotel",
  transport: "train station",
};

// Antrekan permintaan agar aplikasi ini tidak mengirim
// permintaan Nominatim publik secara bersamaan.
function requestNominatim(url) {
  const request = nominatimQueue.then(async () => {
    const waitMs = Math.max(0, 1100 - (Date.now() - lastNominatimRequestAt));

    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    lastNominatimRequestAt = Date.now();

    return fetch(url, {
      headers: {
        "User-Agent": "trial-AImap/1.0 (development travel planner)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12000),
    });
  });

  // Pastikan antrean berikutnya tetap berjalan walaupun
  // permintaan sebelumnya gagal.
  nominatimQueue = request.then(
    () => undefined,
    () => undefined,
  );

  return request;
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "trial-AImap API",
  });
});

// ============================================================
// PENCARIAN TEMPAT NYATA: OPENSTREETMAP / NOMINATIM
// ============================================================

app.get("/api/places/search", async (req, res) => {
  try {
    const query = String(req.query.query || "")
      .trim()
      .slice(0, 160);

    const category = String(req.query.category || "all");

    if (query.length < 2) {
      return res.status(400).json({
        error: "Masukkan minimal 2 karakter untuk mencari tempat.",
      });
    }

    if (!Object.hasOwn(PLACE_CATEGORIES, category)) {
      return res.status(400).json({
        error: "Kategori tempat tidak valid.",
      });
    }

    const searchText = [query, PLACE_CATEGORIES[category]]
      .filter(Boolean)
      .join(" ")
      .trim();

    const cacheKey = searchText.toLowerCase();
    const cached = placeSearchCache.get(cacheKey);

    if (cached && Date.now() - cached.savedAt < 10 * 60 * 1000) {
      return res.json({
        results: cached.results,
        source: "OpenStreetMap",
        cached: true,
      });
    }

    const url = new URL(NOMINATIM_URL);

    url.searchParams.set("q", searchText);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "8");
    url.searchParams.set("accept-language", "id,en");

    const response = await requestNominatim(url);

    if (!response.ok) {
      console.error("Nominatim HTTP status:", response.status);

      return res.status(502).json({
        error: "Layanan pencarian tempat sedang tidak tersedia.",
      });
    }

    const data = await response.json();

    const results = data
      .filter(
        (item) =>
          item &&
          item.display_name &&
          Number.isFinite(Number(item.lat)) &&
          Number.isFinite(Number(item.lon)),
      )
      .map((item) => ({
        id: `${item.osm_type || "place"}-${item.osm_id || item.place_id}`,
        name: item.name || item.display_name.split(",")[0],
        address: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        category: item.type || item.category || "place",
        country: item.address?.country || "",
        countryCode: item.address?.country_code || "",
        source: "OpenStreetMap",
      }));

    placeSearchCache.set(cacheKey, {
      savedAt: Date.now(),
      results,
    });

    if (placeSearchCache.size > 200) {
      const oldestKey = placeSearchCache.keys().next().value;
      if (oldestKey) placeSearchCache.delete(oldestKey);
    }

    return res.json({
      results,
      source: "OpenStreetMap",
      cached: false,
    });
  } catch (error) {
    console.error("Place search error:", {
      message: error.message,
      name: error.name,
      code: error.cause?.code,
    });

    return res.status(502).json({
      error: "Gagal mencari tempat. Silakan coba lagi.",
    });
  }
});

registerItineraryRoutes(app);

// Endpoint /api/* yang tidak ada -> JSON (bukan HTML)
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
});

// Penanganan error global (JSON rusak, body terlalu besar, dll.)
app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Data permintaan terlalu besar." });
  }
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      error: "Format JSON permintaan tidak valid. Muat ulang halaman lalu coba lagi.",
    });
  }
  console.error("Unhandled error:", error?.message);
  return res.status(500).json({ error: "Terjadi kesalahan pada server." });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`trial-AImap API berjalan di http://localhost:${PORT}`);
});
