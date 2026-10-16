import test from "node:test";
import assert from "node:assert/strict";
import { validateRequest, validateItinerary, validateRevision } from "./validation.js";

const stop = (n, lat = -6, lng = 106) => ({ name: n, lat, lng });
const prefs = { budget: 500000, travelers: 2, transport: "car" };

export const goodItinerary = () => ({
  trip_title: "T", overview: "O", total_estimated_cost_idr: 1000, budget_note: "n", important_notes: [],
  transport_options: [{ mode: "Mobil", price_status: "estimate", estimated_total_idr: 500000, note: "n" }],
  budget_scenarios: [{ name: "hemat", total_estimated_cost_idr: 800000, assumptions: "a" }],
  days: [{ day_number: 1, title: "d", activities: [
    { time: "09:00", place: "P", description: "d", duration_minutes: 60, estimated_cost_idr: 0, cost_status: "free", notes: "" },
  ] }],
});

test("request valid", () => {
  const r = validateRequest([stop("A"), stop("B")], { ...prefs, days: "3", interests: " kuliner " });
  assert.equal(r.error, undefined);
  assert.equal(r.days, 3);
  assert.equal(r.interests, "kuliner");
});
test("kurang dari 2 stop ditolak", () => assert.ok(validateRequest([stop("A")], prefs).error));
test("lebih dari 10 stop ditolak", () =>
  assert.ok(validateRequest(Array.from({ length: 11 }, (_, i) => stop(`S${i}`)), prefs).error));
test("koordinat di luar rentang ditolak", () =>
  assert.ok(validateRequest([stop("A"), stop("B", 99, 0)], prefs).error));
test("peserta, budget, durasi tidak valid ditolak", () => {
  const two = [stop("A"), stop("B")];
  assert.ok(validateRequest(two, { ...prefs, travelers: 0 }).error);
  assert.ok(validateRequest(two, { ...prefs, budget: -1 }).error);
  assert.ok(validateRequest(two, { ...prefs, days: 99 }).error);
});
test("transport tak dikenal jatuh ke flexible", () =>
  assert.equal(validateRequest([stop("A"), stop("B")], { ...prefs, transport: "rocket" }).transport, "flexible"));

test("itinerary valid lolos", () => assert.equal(validateItinerary(goodItinerary()), null));
test("itinerary rusak ditolak", () => {
  assert.ok(validateItinerary({}));
  const bad = goodItinerary();
  bad.days[0].activities[0].cost_status = "gratis-banget";
  assert.ok(validateItinerary(bad));
  const bad2 = goodItinerary();
  bad2.budget_scenarios[0].name = "mewah";
  assert.ok(validateItinerary(bad2));
});
test("revisi: instruksi pendek/panjang ditolak", () => {
  assert.ok(validateRevision(goodItinerary(), "x"));
  assert.ok(validateRevision(goodItinerary(), "x".repeat(501)));
  assert.equal(validateRevision(goodItinerary(), "tambah hari kuliner"), null);
});
