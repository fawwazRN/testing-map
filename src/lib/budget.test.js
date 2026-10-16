import test from "node:test";
import assert from "node:assert/strict";
import { computeTotals } from "./budget.js";
import { buildPrintHtml, escapeHtml } from "./exportPdf.js";

const it = {
  trip_title: "<b>T</b>", overview: "o", important_notes: [],
  days: [
    { day_number: 1, title: "a", activities: [
      { time: "1", place: "P1", description: "", notes: "", estimated_cost_idr: 100000, cost_status: "estimate" },
      { time: "2", place: "P2", description: "", notes: "", estimated_cost_idr: 0, cost_status: "free" },
      { time: "3", place: "P3", description: "", notes: "", estimated_cost_idr: 0, cost_status: "unknown" },
    ] },
    { day_number: 2, title: "b", activities: [
      { time: "1", place: "P4", description: "", notes: "", estimated_cost_idr: 50000, cost_status: "estimate" },
    ] },
  ],
};

test("biaya unknown tidak dihitung sebagai nol", () => {
  const t = computeTotals(it, 2);
  assert.equal(t.knownTotal, 150000);
  assert.equal(t.unknownCount, 1);
  assert.equal(t.perPerson, 75000);
  assert.deepEqual(t.perDay.map((d) => d.unknown), [1, 0]);
});
test("jumlah peserta memperbarui biaya per orang", () => {
  assert.equal(computeTotals(it, 3).perPerson, 50000);
  assert.equal(computeTotals(it, 0).perPerson, null);
});
test("PDF HTML meng-escape konten", () => {
  assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  const html = buildPrintHtml({ itinerary: it, stops: [{ name: "A" }], totals: computeTotals(it, 2), travelers: 2 });
  assert.ok(!html.includes("<b>T</b>"));
  assert.ok(html.includes("Biaya belum diketahui"));
});
