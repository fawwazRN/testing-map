import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";
const GEMINI_MODEL = "gemini-3.8-flash";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "30kb" }));

// ============================================================
// SCHEMA OUTPUT ITINERARY GEMINI
// ============================================================

const itinerarySchema = {
  type: "object",
  properties: {
    trip_title: { type: "string" },
    overview: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day_number: { type: "integer" },
          title: { type: "string" },
          activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time: { type: "string" },
                place: { type: "string" },
                description: { type: "string" },
                duration_minutes: { type: "integer" },
                estimated_cost_idr: { type: "integer" },
                notes: { type: "string" },
              },
              required: [
                "time",
                "place",
                "description",
                "duration_minutes",
                "estimated_cost_idr",
                "notes",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["day_number", "title", "activities"],
        additionalProperties: false,
      },
    },
    total_estimated_cost_idr: { type: "integer" },
    budget_note: { type: "string" },
    important_notes: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "trip_title",
    "overview",
    "days",
    "total_estimated_cost_idr",
    "budget_note",
    "important_notes",
  ],
  additionalProperties: false,
};

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

// ============================================================
// GENERATOR ITINERARY: GEMINI
// ============================================================

app.post("/api/itinerary", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      app.use((error, _req, res, _next) => {
        if (
          error instanceof SyntaxError &&
          error.status === 400 &&
          "body" in error
        ) {
          return res.status(400).json({
            error:
              "Format JSON permintaan tidak valid. Muat ulang halaman lalu coba lagi.",
          });
        }

        console.error("Request parsing error:", error.message);
        return res.status(400).json({
          error:
            "Permintaan tidak dapat diproses. Periksa data lalu coba lagi.",
        });
      });
      return res.status(500).json({
        error: "GEMINI_API_KEY belum diatur di file .env.",
      });
    }

    const { stops, preferences = {} } = req.body || {};

    if (!Array.isArray(stops) || stops.length < 2 || stops.length > 10) {
      return res.status(400).json({
        error: "Perjalanan harus memiliki 2 sampai 10 pemberhentian.",
      });
    }

    const stopsAreValid = stops.every(
      (stop) =>
        stop &&
        typeof stop.name === "string" &&
        stop.name.trim().length > 0 &&
        Number.isFinite(stop.lat) &&
        Number.isFinite(stop.lng) &&
        stop.lat >= -90 &&
        stop.lat <= 90 &&
        stop.lng >= -180 &&
        stop.lng <= 180,
    );

    if (!stopsAreValid) {
      return res.status(400).json({
        error: "Nama atau koordinat pemberhentian tidak valid.",
      });
    }

    const budget = Number(preferences.budget);
    const travelers = Number(preferences.travelers);

    if (!Number.isFinite(budget) || budget < 0 || budget > 1000000000) {
      return res.status(400).json({
        error: "Budget harus berupa angka antara 0 dan 1 miliar rupiah.",
      });
    }

    if (!Number.isInteger(travelers) || travelers < 1 || travelers > 20) {
      return res.status(400).json({
        error: "Jumlah peserta harus antara 1 dan 20 orang.",
      });
    }

    const allowedTransport = new Set([
      "car",
      "motorcycle",
      "public_transport",
      "plane",
      "train",
      "ferry",
      "flexible",
    ]);

    const requestedTransport = String(preferences.transport || "flexible");

    const transport = allowedTransport.has(requestedTransport)
      ? requestedTransport
      : "flexible";

    const tripData = {
      stops: stops.map((stop, index) => ({
        order: index + 1,
        name: stop.name.trim().slice(0, 120),
        address:
          typeof stop.address === "string" ? stop.address.slice(0, 300) : "",
        country:
          typeof stop.country === "string" ? stop.country.slice(0, 100) : "",
        latitude: stop.lat,
        longitude: stop.lng,
        category:
          typeof stop.category === "string"
            ? stop.category.slice(0, 60)
            : "place",
        source:
          typeof stop.source === "string"
            ? stop.source.slice(0, 80)
            : "Tidak diketahui",
      })),
      preferences: {
        departure: String(preferences.departure || "").slice(0, 40),
        travelers,
        transport,
        budget,
      },
    };

    const prompt = `
Kamu adalah AI Trip Planner untuk perjalanan domestik dan internasional.
Buat itinerary terperinci dalam bahasa Indonesia.

DATA PERJALANAN:
${JSON.stringify(tripData, null, 2)}

TUGAS:
1. Ikuti urutan pemberhentian yang dimasukkan pengguna.
2. Buat jadwal kegiatan yang masuk akal untuk setiap hari.
3. Utamakan aktivitas wisata, tempat makan, dan kegiatan yang relevan
   dengan destinasi pengguna.
4. Pilih moda transportasi yang paling sesuai dengan rute, anggaran,
   jumlah peserta, dan preferensi pengguna.
5. Jika rute lintas negara, pertimbangkan bahwa perjalanan bisa
   membutuhkan lebih dari satu moda transportasi.
6. Semua nilai biaya dalam rupiah dan harus berupa bilangan bulat.
7. Total biaya merupakan estimasi untuk seluruh rombongan.
8. Biaya yang tidak diketahui secara pasti harus dijelaskan di notes
   dan budget_note sebagai estimasi, bukan harga resmi.
9. Jangan mengklaim harga tiket, tarif, jam buka, jadwal transportasi,
   waktu tempuh, atau ketersediaan sebagai data terverifikasi.
10. Koordinat tempat berasal dari data lokasi pengguna. Jangan mengarang
    koordinat atau mengubah lokasi tujuan.
11. Jangan mengklaim bahwa nama tempat yang disarankan sudah ditemukan
    di basis data tempat kecuali memang ada dalam DATA PERJALANAN.
12. Jika tanggal tidak diberikan, gunakan Hari 1, Hari 2, dan seterusnya.
13. Berikan waktu kegiatan yang wajar. Waktu ini adalah rencana,
    bukan jadwal operasional yang sudah diverifikasi.
14. Jika informasi tidak tersedia, nyatakan ketidakpastian dengan jelas.
15. Ingatkan pengguna untuk memeriksa harga, visa, dokumen perjalanan,
    jam buka, dan jadwal transportasi dari sumber resmi sebelum berangkat.
16. Jangan mengarang informasi yang tidak diketahui hanya untuk
    membuat rencana terlihat lengkap.
17. Kembalikan hanya JSON yang sesuai dengan schema.
`;

    const apiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input: prompt,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: itinerarySchema,
        },
      }),
      signal: AbortSignal.timeout(90000),
    });

    const responseBody = await apiResponse.text();

    let providerData;

    try {
      providerData = JSON.parse(responseBody);
    } catch {
      console.error(
        "Gemini mengirim respons yang bukan JSON. HTTP:",
        apiResponse.status,
      );

      return res.status(502).json({
        error: "Respons Gemini tidak dapat dibaca. Silakan coba lagi.",
      });
    }

    if (!apiResponse.ok) {
      const providerMessage =
        providerData?.error?.message || "Unknown Gemini API error";

      console.error("Gemini API error:", {
        status: apiResponse.status,
        message: providerMessage,
      });

      if (apiResponse.status === 401 || apiResponse.status === 403) {
        return res.status(502).json({
          error: "Gemini menolak akses. Periksa API key dan izin API.",
        });
      }

      if (apiResponse.status === 429) {
        return res.status(429).json({
          error: "Kuota atau batas penggunaan Gemini tercapai.",
        });
      }

      if (apiResponse.status === 503) {
        return res.status(503).json({
          error: "Server Gemini sedang sibuk. Coba lagi beberapa saat.",
        });
      }

      if (apiResponse.status === 404) {
        return res.status(502).json({
          error: "Model atau endpoint Gemini tidak ditemukan.",
        });
      }

      return res.status(502).json({
        error: "Gemini gagal memproses permintaan itinerary.",
      });
    }

    let generatedText =
      typeof providerData.output_text === "string"
        ? providerData.output_text
        : "";

    if (!generatedText && Array.isArray(providerData.steps)) {
      const textParts = [];

      for (const step of providerData.steps) {
        if (step?.type === "model_output" && Array.isArray(step.content)) {
          for (const part of step.content) {
            if (part?.type === "text" && typeof part.text === "string") {
              textParts.push(part.text);
            }
          }
        }
      }

      generatedText = textParts.join("\n");
    }

    if (!generatedText) {
      console.error("Gemini tidak mengembalikan teks output.");

      return res.status(502).json({
        error: "Gemini tidak menghasilkan itinerary. Silakan coba lagi.",
      });
    }

    let parsedResult;

    try {
      parsedResult = JSON.parse(generatedText);
    } catch (error) {
      console.error("JSON itinerary tidak valid:", error.message);

      return res.status(502).json({
        error: "Format itinerary dari AI tidak valid. Silakan coba lagi.",
      });
    }

    if (
      !parsedResult ||
      typeof parsedResult.trip_title !== "string" ||
      typeof parsedResult.overview !== "string" ||
      !Array.isArray(parsedResult.days) ||
      !Number.isFinite(parsedResult.total_estimated_cost_idr) ||
      typeof parsedResult.budget_note !== "string" ||
      !Array.isArray(parsedResult.important_notes)
    ) {
      return res.status(502).json({
        error: "Struktur itinerary dari AI tidak lengkap.",
      });
    }

    const activitiesAreValid = parsedResult.days.every(
      (day) =>
        day &&
        Number.isInteger(day.day_number) &&
        typeof day.title === "string" &&
        Array.isArray(day.activities) &&
        day.activities.every(
          (activity) =>
            activity &&
            typeof activity.time === "string" &&
            typeof activity.place === "string" &&
            typeof activity.description === "string" &&
            Number.isInteger(activity.duration_minutes) &&
            activity.duration_minutes >= 0 &&
            Number.isInteger(activity.estimated_cost_idr) &&
            activity.estimated_cost_idr >= 0 &&
            typeof activity.notes === "string",
        ),
    );

    if (!activitiesAreValid) {
      return res.status(502).json({
        error: "Data aktivitas dari AI tidak valid.",
      });
    }

    return res.json({
      itinerary: parsedResult,
    });
  } catch (error) {
    console.error("Backend error:", {
      message: error.message,
      name: error.name,
      cause: error.cause
        ? {
            message: error.cause.message,
            code: error.cause.code,
            name: error.cause.name,
          }
        : null,
    });

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(504).json({
        error: "Permintaan terlalu lama. Silakan coba lagi.",
      });
    }

    return res.status(500).json({
      error: "Terjadi kesalahan pada backend.",
    });
  }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`trial-AImap API berjalan di http://localhost:${PORT}`);
});
