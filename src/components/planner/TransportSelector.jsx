const transportOptions = [
  { id: "car", label: "Mobil", icon: "🚗" },
  { id: "train", label: "Kereta", icon: "🚆" },
  { id: "bus", label: "Bus", icon: "🚌" },
  { id: "motorcycle", label: "Motor", icon: "🏍️" },
];

export default function TransportSelector({ value, onChange }) {
  return (
    <fieldset>
      <legend className="block mb-2 font-bold text-slate-600 text-xs">
        Transportasi
      </legend>

      <div className="gap-3 grid grid-cols-2 sm:grid-cols-4">
        {transportOptions.map((option) => {
          const selected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={`rounded-xl border px-2 py-3 text-center transition ${
                selected
                  ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}>
              <span className="block text-xl">{option.icon}</span>
              <span className="block mt-2 font-semibold text-xs">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
