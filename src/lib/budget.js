// Biaya "unknown" TIDAK dihitung sebagai nol: dipisah dan dilaporkan sebagai jumlah komponen belum diketahui.
export function computeTotals(itinerary, travelers) {
  let knownTotal = 0;
  let unknownCount = 0;
  const perDay = (itinerary?.days || []).map((day) => {
    let known = 0;
    let unknown = 0;
    for (const a of day.activities) {
      if (a.cost_status === "unknown") unknown += 1;
      else known += Number(a.estimated_cost_idr) || 0;
    }
    knownTotal += known;
    unknownCount += unknown;
    return { day_number: day.day_number, known, unknown };
  });
  const n = Number(travelers) > 0 ? Number(travelers) : null;
  return { knownTotal, unknownCount, perDay, perPerson: n ? Math.round(knownTotal / n) : null };
}

export const rupiah = (v) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v) || 0);
