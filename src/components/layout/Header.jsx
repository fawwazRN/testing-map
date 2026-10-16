export default function Header() {
  return (
    <header className="flex flex-wrap justify-between items-center gap-4">
      <div>
        <p className="font-medium text-slate-400 text-sm">
          Your personal travel assistant
        </p>

        <h1 className="mt-1 font-heading font-extrabold text-2xl sm:text-3xl tracking-tight">
          Plan your next trip
          <span className="text-brand-600">.</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex bg-white px-4 py-2 border border-slate-200 rounded-full font-semibold text-slate-500 text-xs">
          ✦ AI-powered travel
        </span>

        <div
          aria-label="User profile placeholder"
          className="flex justify-center items-center bg-brand-50 border border-brand-100 rounded-full w-11 h-11 font-bold text-brand-700">
          T
        </div>
      </div>
    </header>
  );
}
