import { providerMeta } from '../lib/payment-providers'

export default function PaymentProviderPicker({ value, onChange, disabled }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.values(providerMeta).map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p.id)}
          className={`rounded-card border p-4 text-left transition disabled:opacity-60 ${
            value === p.id
              ? 'border-brand-dark bg-brand-light ring-2 ring-brand-dark/20'
              : 'border-surface-border bg-surface hover:border-brand-dark/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{p.label}</span>
            <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-dark">{p.badge}</span>
          </div>
          <p className="mt-1 text-xs text-ink-secondary">{p.subtitle}</p>
        </button>
      ))}
    </div>
  )
}
