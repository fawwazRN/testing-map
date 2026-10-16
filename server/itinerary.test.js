import test from "node:test";
import assert from "node:assert/strict";
import { generateJson, registerItineraryRoutes, itinerarySchema } from "./itinerary.js";
import { validateItinerary } from "./validation.js";
import { goodItinerary } from "./validation.test.js";

const ok = (obj) => ({ ok: true, status: 200, text: async () => JSON.stringify({ output_text: typeof obj === "string" ? obj : JSON.stringify(obj) }) });
const http = (status) => ({ ok: false, status, text: async () => "{}" });
const seq = (...responses) => { let i = 0; const f = async () => responses[Math.min(i++, responses.length - 1)]; f.calls = () => i; return f; };
const base = { prompt: "p", schema: itinerarySchema, validate: validateItinerary, apiKey: "k" };

test("generateJson: sukses", async () => {
  const r = await generateJson({ ...base, fetchImpl: seq(ok(goodItinerary())) });
  assert.equal(r.trip_title, "T");
});
test("generateJson: JSON rusak lalu sukses (retry terbatas)", async () => {
  const f = seq(ok("{bukan json"), ok(goodItinerary()));
  const r = await generateJson({ ...base, fetchImpl: f });
  assert.equal(r.trip_title, "T");
  assert.equal(f.calls(), 2);
});
test("generateJson: gagal terus berhenti setelah 2 percobaan", async () => {
  const f = seq(ok(""), ok("{}"));
  await assert.rejects(generateJson({ ...base, fetchImpl: f }), (e) => e.status === 502);
  assert.equal(f.calls(), 2);
});
test("generateJson: 429 dipetakan dan tidak di-retry", async () => {
  const f = seq(http(429));
  await assert.rejects(generateJson({ ...base, fetchImpl: f }), (e) => e.status === 429);
  assert.equal(f.calls(), 1);
});
test("generateJson: jaringan putus", async () => {
  const f = async () => { throw new Error("ECONNRESET"); };
  await assert.rejects(generateJson({ ...base, fetchImpl: f }), (e) => e.status === 502);
});

// Express tidak ter-install penuh di sandbox, jadi handler dijalankan lewat app tiruan minimal.
async function withServer(opts, fn) {
  const routes = {};
  registerItineraryRoutes({ post: (path, handler) => { routes[path] = handler; } }, opts);
  await fn(async (path, body) => {
    let status = 200;
    let payload;
    const res = {
      status(c) { status = c; return this; },
      json(o) { payload = o; return this; },
    };
    await routes[path]({ body }, res);
    return { status, body: payload };
  });
}
const stops = [{ name: "A", lat: -6, lng: 106 }, { name: "B", lat: -7, lng: 107 }];
const preferences = { budget: 100000, travelers: 2, transport: "car" };

test("endpoint /api/itinerary: input valid, tidak valid, tanpa key, layanan gagal", async () => {
  await withServer({ fetchImpl: seq(ok(goodItinerary())), getApiKey: () => "k" }, async (post) => {
    assert.equal((await post("/api/itinerary", { stops, preferences })).status, 200);
    assert.equal((await post("/api/itinerary", { stops: [stops[0]], preferences })).status, 400);
  });
  await withServer({ fetchImpl: seq(ok(goodItinerary())), getApiKey: () => "" }, async (post) => {
    assert.equal((await post("/api/itinerary", { stops, preferences })).status, 500);
  });
  await withServer({ fetchImpl: seq(http(503)), getApiKey: () => "k" }, async (post) => {
    assert.equal((await post("/api/itinerary", { stops, preferences })).status, 503);
  });
});
test("endpoint /api/itinerary/revise", async () => {
  await withServer({ fetchImpl: seq(ok(goodItinerary())), getApiKey: () => "k" }, async (post) => {
    const itinerary = goodItinerary();
    assert.equal((await post("/api/itinerary/revise", { stops, preferences, itinerary, instruction: "tambah kuliner" })).status, 200);
    assert.equal((await post("/api/itinerary/revise", { stops, preferences, itinerary, instruction: "x" })).status, 400);
    assert.equal((await post("/api/itinerary/revise", { stops, preferences, itinerary: {}, instruction: "tambah kuliner" })).status, 400);
  });
});
