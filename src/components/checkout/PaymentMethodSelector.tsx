const METHODS = [
  { value: "va_bca", label: "BCA Virtual Account" },
  { value: "va_bri", label: "BRI Virtual Account" },
  { value: "va_mandiri", label: "Mandiri Virtual Account" },
  { value: "qris", label: "QRIS (semua e-wallet & m-banking)" },
  { value: "dana", label: "DANA" },
  { value: "ovo", label: "OVO" },
  { value: "shopeepay", label: "ShopeePay" },
  { value: "credit_card", label: "Kartu Kredit" },
] as const;

export default function PaymentMethodSelector({ value, onChange, error }: {
  value?: string; onChange: (v: CheckoutPaymentMethod) => void; error?: string;
}) {
  return (
    <div className="space-y-3 rounded-card bg-surface p-4 shadow-subtle">
      <h2 className="font-heading text-h3 font-semibold">Metode Pembayaran</h2>
      <div className="grid gap-2" role="radiogroup" aria-label="Metode pembayaran">
        {METHODS.map((m) => (
          <label key={m.value} className="flex h-11 cursor-pointer items-center gap-2 rounded-control border border-black/10 px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input type="radio" name="paymentMethod" checked={value === m.value} onChange={() => onChange(m.value as CheckoutPaymentMethod)} className="accent-primary" />
            {m.label}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-error">{error}</p>}
    </div>
  );
}

type CheckoutPaymentMethod = "va_bca" | "va_bri" | "va_mandiri" | "qris" | "dana" | "ovo" | "shopeepay" | "credit_card";
