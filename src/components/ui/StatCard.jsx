export default function StatCard({ icon, label, value, note }) {
  return (
    <article className="bg-white shadow-slate-200/30 shadow-sm p-5 border border-slate-100 rounded-2xl">
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-medium text-slate-500 text-sm">{label}</p>
          <p className="mt-2 font-heading font-extrabold text-ink text-2xl tracking-tight">
            {value}
          </p>
        </div>

        <span className="flex justify-center items-center bg-brand-50 rounded-xl w-11 h-11 text-xl">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-slate-400 text-xs">{note}</p>
    </article>
  );
}
