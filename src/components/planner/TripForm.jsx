import TransportSelector from "./TransportSelector.jsx";
import Button from "../ui/Button.jsx";

const budgetOptions = [
  { value: "200000", label: "Rp200.000" },
  { value: "500000", label: "Rp500.000" },
  { value: "1000000", label: "Rp1.000.000" },
  { value: "2000000", label: "Rp2.000.000" },
  { value: "5000000", label: "Rp5.000.000" },
];

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:bg-white";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block mb-2 font-bold text-slate-600 text-xs">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function TripForm({ form, onChange, onSubmit, notice = "" }) {
  function updateField(event) {
    const { name, value } = event.target;
    onChange(name, value);
  }

  return (
    <section
      id="trip-form"
      className="bg-white shadow-slate-200/30 shadow-sm p-5 sm:p-7 border border-slate-100 rounded-2xl">
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-bold text-brand-600 text-xs uppercase tracking-[0.16em]">
            Step 01 · Trip basics
          </p>
          <h2 className="mt-2 font-heading font-extrabold text-xl">
            Mau pergi ke mana?
          </h2>
          <p className="mt-2 text-slate-500 text-sm leading-6">
            Isi detail perjalanan untuk mulai menyusun rencana.
          </p>
        </div>

        <span className="flex justify-center items-center bg-brand-50 rounded-xl w-10 h-10 text-lg shrink-0">
          🗺️
        </span>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 mt-7">
        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
          <Field label="Kota asal">
            <input
              required
              name="origin"
              value={form.origin}
              onChange={updateField}
              placeholder="Contoh: Tangerang"
              className={fieldClass}
            />
          </Field>

          <Field label="Kota tujuan">
            <input
              required
              name="destination"
              value={form.destination}
              onChange={updateField}
              placeholder="Contoh: Bandung"
              className={fieldClass}
            />
          </Field>
        </div>

        <Field label="Tanggal berangkat">
          <input
            type="date"
            name="departure"
            value={form.departure}
            onChange={updateField}
            className={fieldClass}
          />
        </Field>

        <TransportSelector
          value={form.transport}
          onChange={(value) => onChange("transport", value)}
        />

        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
          <Field label="Jumlah orang">
            <select
              name="travelers"
              value={form.travelers}
              onChange={updateField}
              className={fieldClass}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (number) => (
                  <option key={number} value={String(number)}>
                    {number} {number === 1 ? "orang" : "orang"}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Budget per orang">
            <select
              name="budget"
              value={form.budget}
              onChange={updateField}
              className={fieldClass}>
              {budgetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {notice && (
          <p
            role="status"
            className="bg-brand-50 px-4 py-3 border border-brand-100 rounded-xl text-brand-700 text-sm leading-6">
            {notice}
          </p>
        )}

        <Button type="submit" className="w-full">
          Lanjutkan perencanaan <span aria-hidden="true">→</span>
        </Button>
      </form>
    </section>
  );
}
