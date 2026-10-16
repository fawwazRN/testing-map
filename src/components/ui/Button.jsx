export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  disabled = false,
}) {
  const variants = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/15",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${className}`}>
      {children}
    </button>
  );
}
