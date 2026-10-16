const navigation = [
  { id: "planner", icon: "✧", label: "AI Trip Planner" },
  { id: "trips", icon: "▤", label: "My Trips" },
  { id: "saved", icon: "♡", label: "Saved Places" },
];

export default function Sidebar({ activeNav = "planner", onNavigate }) {
  return (
    <aside className="hidden lg:flex lg:flex-col bg-white px-5 py-7 border-slate-100 border-r w-64 shrink-0">
      <a href="#" className="flex items-center gap-3 px-2">
        <span className="flex justify-center items-center bg-brand-600 shadow-brand-600/20 shadow-lg rounded-2xl w-11 h-11 text-white text-xl">
          ✦
        </span>

        <span>
          <span className="block font-heading font-extrabold text-lg tracking-tight">
            trial<span className="text-brand-600">AI</span>map
          </span>
          <span className="text-slate-400 text-xs">
            Your journey, reimagined
          </span>
        </span>
      </a>

      <nav className="mt-12">
        <p className="mb-3 px-4 font-bold text-[10px] text-slate-400 uppercase tracking-[0.2em]">
          Workspace
        </p>

        <div className="space-y-1">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                activeNav === item.id
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}>
              <span className="inline-flex justify-center items-center w-5 h-5">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <nav className="mt-9">
        <p className="mb-3 px-4 font-bold text-[10px] text-slate-400 uppercase tracking-[0.2em]">
          Preferences
        </p>

        <button
          type="button"
          onClick={() => onNavigate?.("settings")}
          className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
            activeNav === "settings"
              ? "bg-brand-50 text-brand-700"
              : "text-slate-500 hover:bg-slate-50"
          }`}>
          <span>⚙</span>
          Settings
        </button>
      </nav>

      <div className="bg-ink mt-auto p-5 rounded-2xl text-white">
        <div className="flex justify-center items-center bg-white/10 mb-3 rounded-xl w-9 h-9">
          ✨
        </div>

        <p className="font-heading font-bold text-sm">Your next adventure</p>

        <p className="mt-2 text-white/60 text-xs leading-5">
          Ide perjalananmu bisa dimulai dari satu tujuan sederhana.
        </p>

        <button
          type="button"
          onClick={() => onNavigate?.("planner")}
          className="bg-brand-500 hover:bg-brand-600 mt-4 px-3 py-2.5 rounded-xl w-full font-bold text-white text-xs transition">
          Plan a trip ↗
        </button>
      </div>

      <p className="mt-6 px-2 text-[10px] text-slate-400">
        TRIAL-AIMAP · EARLY ACCESS
      </p>
    </aside>
  );
}
