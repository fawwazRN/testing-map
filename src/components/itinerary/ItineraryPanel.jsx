import { useState } from "react";

const API_URL = "http://localhost:3001";

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function ItineraryPanel({ stops, preferences }) {
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateItinerary() {
    setLoading(true);
    setError("");
    setItinerary(null);

    try {
      const response = await fetch(`${API_URL}/api/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops, preferences }),
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          "Server mengirim respons yang bukan JSON. Pastikan backend API berjalan di port 3001.",
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat itinerary.");
      }

      setItinerary(data.itinerary);
    } catch (err) {
      setError(
        err.message ||
          "Tidak dapat terhubung ke server. Pastikan backend sudah berjalan.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white shadow-sm mt-8 p-5 sm:p-8 border border-emerald-100 rounded-3xl">
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
        <div>
          <p className="font-semibold text-emerald-700 text-sm">
            AI TRIP GENERATOR
          </p>
          <h2 className="mt-1 font-heading font-bold text-ink text-2xl">
            Rancang perjalananmu
          </h2>
          <p className="mt-2 max-w-xl text-muted text-sm leading-6">
            Buat rencana per hari berdasarkan pemberhentian, transportasi,
            jumlah peserta, dan anggaran yang kamu pilih.
          </p>
        </div>

        <button
          type="button"
          onClick={generateItinerary}
          disabled={loading || stops.length < 2}
          className="inline-flex justify-center items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 px-5 py-3 rounded-xl min-h-12 font-semibold text-white transition disabled:cursor-not-allowed shrink-0">
          {loading ? (
            <>
              <span className="animate-spin">◌</span>
              Menyusun rencana...
            </>
          ) : (
            <>
              <span aria-hidden="true">✦</span>
              Buat itinerary AI
            </>
          )}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 mt-5 p-4 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-canvas mt-6 p-6 rounded-2xl">
          <div className="bg-emerald-100 rounded w-2/3 h-3 animate-pulse" />
          <div className="bg-emerald-100 mt-4 rounded w-full h-3 animate-pulse" />
          <div className="bg-emerald-100 mt-3 rounded w-4/5 h-3 animate-pulse" />
          <p className="mt-5 text-muted text-sm">
            AI sedang menyusun aktivitas dan perkiraan biaya. Proses ini
            biasanya membutuhkan beberapa saat.
          </p>
        </div>
      )}

      {itinerary && (
        <div className="mt-8">
          <div className="bg-emerald-50 p-5 sm:p-6 rounded-2xl">
            <p className="font-medium text-emerald-800 text-sm">
              Rencana perjalanan
            </p>
            <h3 className="mt-2 font-heading font-bold text-ink text-2xl">
              {itinerary.trip_title}
            </h3>
            <p className="mt-3 text-muted leading-7">{itinerary.overview}</p>

            <div className="mt-5 pt-4 border-emerald-100 border-t">
              <p className="text-muted text-sm">
                Estimasi biaya seluruh rombongan
              </p>
              <p className="mt-1 font-bold text-emerald-800 text-2xl">
                {rupiah(itinerary.total_estimated_cost_idr)}
              </p>
              <p className="mt-2 text-muted text-sm leading-6">
                {itinerary.budget_note}
              </p>
            </div>
          </div>

          <div className="space-y-8 mt-8">
            {itinerary.days.map((day) => (
              <article key={day.day_number}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex justify-center items-center bg-emerald-100 rounded-xl w-10 h-10 font-bold text-emerald-800 shrink-0">
                    {day.day_number}
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-700 text-xs uppercase tracking-wider">
                      Hari {day.day_number}
                    </p>
                    <h4 className="font-heading font-bold text-ink text-lg">
                      {day.title}
                    </h4>
                  </div>
                </div>

                <div className="space-y-3 sm:ml-5 pl-4 sm:pl-6 border-emerald-100 border-l-2">
                  {day.activities.map((activity, index) => (
                    <div
                      key={`${day.day_number}-${index}`}
                      className="bg-white shadow-sm p-4 border border-gray-100 rounded-2xl">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className="bg-emerald-50 px-3 py-1 rounded-lg font-semibold text-emerald-800 text-sm">
                          {activity.time}
                        </span>
                        <span className="text-muted text-xs">
                          {activity.duration_minutes} menit
                        </span>
                      </div>

                      <h5 className="mt-3 font-heading font-bold text-ink text-base">
                        {activity.place}
                      </h5>
                      <p className="mt-2 text-muted text-sm leading-6">
                        {activity.description}
                      </p>

                      <div className="mt-3 pt-3 border-gray-100 border-t">
                        <p className="font-semibold text-ink text-sm">
                          Estimasi: {rupiah(activity.estimated_cost_idr)}
                        </p>
                        {activity.notes && (
                          <p className="mt-1 text-muted text-sm leading-6">
                            {activity.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {itinerary.important_notes.length > 0 && (
            <div className="bg-amber-50 mt-8 p-5 border border-amber-200 rounded-2xl">
              <h4 className="font-bold text-amber-900">Sebelum berangkat</h4>
              <ul className="space-y-2 mt-3 pl-5 text-amber-900 text-sm leading-6 list-disc">
                {itinerary.important_notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-5 text-muted text-xs leading-5">
            Biaya dari AI merupakan perkiraan, bukan harga resmi. Periksa
            kembali tiket, jam operasional, dan jadwal transportasi sebelum
            melakukan perjalanan.
          </p>

          <button
            type="button"
            onClick={generateItinerary}
            disabled={loading}
            className="hover:bg-emerald-50 mt-5 px-4 py-3 border border-emerald-200 rounded-xl font-semibold text-emerald-800 text-sm transition">
            Buat ulang itinerary
          </button>
        </div>
      )}
    </section>
  );
}
