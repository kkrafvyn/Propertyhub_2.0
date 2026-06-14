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
          className={`rounded-xl border p-4 text-left transition disabled:opacity-60 ${
            value === p.id
              ? 'border-ink bg-surface shadow-sm ring-1 ring-ink'
              : 'border-surface-border bg-surface hover:border-ink/30'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-ink">{p.label}</span>
            <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-bold text-ink">
              {p.badge}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-secondary">{p.subtitle}</p>
        </button>
      ))}
    </div>
  )
}
