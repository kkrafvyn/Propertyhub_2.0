export default function QuickFormModal({ title, children, onClose, onSubmit, submitLabel = 'Save', loading = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}
        className="w-full max-w-md rounded-xl bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="text-ink-secondary hover:text-ink" aria-label="Close">×</button>
        </div>
        <div className="space-y-3">{children}</div>
        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Saving…' : submitLabel}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export function ModalField({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
    </label>
  )
}

export function modalInputClassName(extra = '') {
  return `w-full rounded-lg border border-surface-border px-3 py-2 text-sm ${extra}`.trim()
}
