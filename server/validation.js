export const TRANSPORTS = new Set([
  "car", "motorcycle", "public_transport", "plane", "train", "ferry", "flexible",
]);
export const COST_STATUSES = ["estimate", "free", "unknown"];
export const PRICE_STATUSES = ["estimate", "unknown"];
export const SCENARIO_NAMES = ["hemat", "seimbang", "nyaman"];

const isInt = (v) => Number.isInteger(v) && v >= 0;

export function validateRequest(stops, preferences = {}) {
  if (!Array.isArray(stops) || stops.length < 2 || stops.length > 10)
    return { error: "Perjalanan harus memiliki 2 sampai 10 pemberhentian." };

  const ok = stops.every(
    (s) =>
      s && typeof s.name === "string" && s.name.trim().length > 0 &&
      Number.isFinite(s.lat) && Number.isFinite(s.lng) &&
      s.lat >= -90 && s.lat <= 90 && s.lng >= -180 && s.lng <= 180,
  );
  if (!ok) return { error: "Nama atau koordinat pemberhentian tidak valid." };

  const budget = Number(preferences.budget);
  const travelers = Number(preferences.travelers);
  if (!Number.isFinite(budget) || budget < 0 || budget > 1_000_000_000)
    return { error: "Budget harus berupa angka antara 0 dan 1 miliar rupiah." };
  if (!Number.isInteger(travelers) || travelers < 1 || travelers > 20)
    return { error: "Jumlah peserta harus antara 1 dan 20 orang." };

  let days = null;
  if (preferences.days !== undefined && preferences.days !== null && preferences.days !== "") {
    days = Number(preferences.days);
    if (!Number.isInteger(days) || days < 1 || days > 30)
      return { error: "Durasi perjalanan harus 1 sampai 30 hari." };
  }

  const requested = String(preferences.transport || "flexible");
  const transport = TRANSPORTS.has(requested) ? requested : "flexible";
  const interests = String(preferences.interests || "").trim().slice(0, 200);
  return { budget, travelers, transport, days, interests };
}

export function validateRevision(itinerary, instruction) {
  const text = typeof instruction === "string" ? instruction.trim() : "";
  if (text.length < 3 || text.length > 500)
    return "Instruksi revisi harus 3 sampai 500 karakter.";
  if (validateItinerary(itinerary)) return "Itinerary saat ini tidak valid.";
  return null;
}

export function validateItinerary(r) {
  if (
    !r || typeof r.trip_title !== "string" || typeof r.overview !== "string" ||
    !Array.isArray(r.days) || !Number.isFinite(r.total_estimated_cost_idr) ||
    typeof r.budget_note !== "string" || !Array.isArray(r.important_notes)
  ) return "Struktur itinerary dari AI tidak lengkap.";

  const okDays = r.days.every(
    (d) =>
      d && Number.isInteger(d.day_number) && typeof d.title === "string" &&
      Array.isArray(d.activities) &&
      d.activities.every(
        (a) =>
          a && typeof a.time === "string" && typeof a.place === "string" &&
          typeof a.description === "string" && isInt(a.duration_minutes) &&
          isInt(a.estimated_cost_idr) && COST_STATUSES.includes(a.cost_status) &&
          typeof a.notes === "string",
      ),
  );
  if (!okDays) return "Data aktivitas dari AI tidak valid.";

  const okTransport = (r.transport_options || []).every(
    (t) => t && typeof t.mode === "string" && PRICE_STATUSES.includes(t.price_status) &&
      isInt(t.estimated_total_idr) && typeof t.note === "string",
  );
  if (!okTransport) return "Data transportasi dari AI tidak valid.";

  const okScenarios = (r.budget_scenarios || []).every(
    (s) => s && SCENARIO_NAMES.includes(s.name) && isInt(s.total_estimated_cost_idr) &&
      typeof s.assumptions === "string",
  );
  if (!okScenarios) return "Data skenario anggaran dari AI tidak valid.";
  return null;
}
