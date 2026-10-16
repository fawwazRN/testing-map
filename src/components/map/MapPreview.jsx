export default function MapPreview({ origin, destination }) {
  return (
    <section className="bg-white shadow-slate-200/30 shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
      <div className="flex justify-between items-center gap-3 p-5 sm:p-6">
        <div>
          <p className="font-bold text-brand-600 text-xs uppercase tracking-[0.16em]">
            Explore
          </p>
          <h2 className="mt-2 font-heading font-extrabold text-xl">
            Your trip map
          </h2>
        </div>

        <span className="bg-slate-50 px-3 py-2 rounded-lg font-semibold text-slate-500 text-xs">
          Map preview
        </span>
      </div>

      <div className="relative flex flex-col justify-center items-center bg-[#eaf2ec] p-6 min-h-[320px] sm:min-h-[400px] overflow-hidden text-center">
        {/* Decorative map shapes */}
        <div className="absolute inset-0 opacity-50 pointer-events-none">
          <div className="top-12 -left-10 absolute border-white/80 border-y-[18px] w-[130%] h-40 rotate-[-18deg]" />
          <div className="top-0 left-1/3 absolute bg-white/70 w-8 h-[120%] rotate-[22deg]" />
          <div className="top-1/2 left-0 absolute bg-white/80 w-full h-6 rotate-[10deg]" />
          <div className="top-0 right-10 absolute bg-white/80 w-4 h-[120%] rotate-[-28deg]" />

          <div className="bottom-12 left-10 absolute bg-[#d1e7d8] rounded-[40%] w-36 h-28" />
          <div className="top-10 right-5 absolute bg-[#d1e7d8] rounded-[40%] w-32 h-24" />
          <div className="right-1/3 bottom-8 absolute bg-[#d1e7d8] rounded-[40%] w-24 h-20" />
        </div>

        <div className="z-10 relative flex flex-col items-center">
          <div className="flex justify-center items-center bg-white shadow-lg border border-white rounded-2xl w-14 h-14 text-2xl">
            📍
          </div>

          <h3 className="mt-5 font-heading font-extrabold text-lg">
            Your journey starts here
          </h3>

          <p className="mt-2 max-w-xs text-slate-500 text-sm leading-6">
            Lokasi dan rute perjalananmu akan tampil di sini setelah peta
            interaktif terpasang.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <span className="bg-white/90 px-3 py-2 border border-white rounded-full font-semibold text-slate-600 text-xs">
              📍 {origin || "Kota asal"}
            </span>

            <span className="bg-white/90 px-3 py-2 border border-white rounded-full font-semibold text-slate-600 text-xs">
              🧭 {destination || "Kota tujuan"}
            </span>
          </div>

          <p className="mt-5 font-semibold text-[10px] text-slate-400 uppercase tracking-[0.15em]">
            Interactive map · Coming next
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center gap-3 px-5 sm:px-6 py-4 border-slate-100 border-t">
        <div>
          <p className="font-bold text-slate-700 text-xs">Route overview</p>
          <p className="mt-1 text-slate-400 text-xs">Belum ada data rute</p>
        </div>

        <span className="bg-slate-50 px-3 py-2 rounded-lg font-semibold text-slate-500 text-xs">
          Not connected
        </span>
      </div>
    </section>
  );
}
