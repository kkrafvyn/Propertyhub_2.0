import { useTranslation } from '../../i18n/LocaleContext'

export default function RolePicker({ value, onChange, options }) {
  const { t } = useTranslation()

  return (
    <div className="grid max-h-56 gap-2 overflow-y-auto overscroll-contain rounded-xl border border-surface-border bg-surface p-2">
      {options.map((option) => {
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={selected}
            className={`rounded-lg px-4 py-3 text-left text-sm transition ${
              selected
                ? 'bg-brand-forest/10 font-semibold text-brand-forest ring-1 ring-brand-forest/30'
                : 'text-ink hover:bg-surface-hover'
            }`}
          >
            {t(`roles.${option}`)}
          </button>
        )
      })}
    </div>
  )
}
