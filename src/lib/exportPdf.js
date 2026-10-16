import { rupiah } from "./budget.js";

export const escapeHtml = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function buildPrintHtml({ itinerary, stops, totals, travelers }) {
  const days = itinerary.days.map((d) => `
    <h2>Hari ${escapeHtml(d.day_number)} — ${escapeHtml(d.title)}</h2>
    <table>${d.activities.map((a) => `
      <tr><td class="t">${escapeHtml(a.time)}</td>
      <td><b>${escapeHtml(a.place)}</b><br>${escapeHtml(a.description)}${a.notes ? `<br><i>${escapeHtml(a.notes)}</i>` : ""}</td>
      <td class="c">${a.cost_status === "unknown" ? "Biaya belum diketahui" : a.cost_status === "free" ? "Gratis" : `≈ ${escapeHtml(rupiah(a.estimated_cost_idr))}`}</td></tr>`).join("")}
    </table>`).join("");
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(itinerary.trip_title)}</title>
<style>body{font:13px/1.5 system-ui,sans-serif;margin:28px;color:#172b27}h1{margin:0}h2{margin:22px 0 6px;font-size:16px}
table{width:100%;border-collapse:collapse}td{padding:6px 8px;border-bottom:1px solid #ddd;vertical-align:top}.t{width:60px;white-space:nowrap}.c{width:150px;text-align:right}
.box{background:#effcf8;padding:10px 14px;border-radius:8px;margin:14px 0}small{color:#667}</style></head><body>
<h1>${escapeHtml(itinerary.trip_title)}</h1><p>${escapeHtml(itinerary.overview)}</p>
<p><b>Destinasi:</b> ${stops.map((s, i) => `${i + 1}. ${escapeHtml(s.name)}`).join(" → ")}</p>
<div class="box"><b>Total diketahui (${escapeHtml(travelers)} orang):</b> ${escapeHtml(rupiah(totals.knownTotal))}
 · per orang ≈ ${escapeHtml(totals.perPerson == null ? "-" : rupiah(totals.perPerson))}
 ${totals.unknownCount ? `<br>Belum termasuk ${escapeHtml(totals.unknownCount)} komponen yang biayanya belum diketahui.` : ""}</div>
${days}
${itinerary.important_notes.length ? `<h2>Sebelum berangkat</h2><ul>${itinerary.important_notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>` : ""}
<p><small>Biaya, jam, dan jadwal adalah estimasi AI, bukan data resmi. Lokasi: OpenStreetMap. Periksa ulang sebelum berangkat.</small></p>
</body></html>`;
}

export function exportItineraryPdf(args) {
  const w = window.open("", "_blank");
  if (!w) throw new Error("Pop-up diblokir browser. Izinkan pop-up lalu coba lagi.");
  w.document.open();
  w.document.write(buildPrintHtml(args));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
