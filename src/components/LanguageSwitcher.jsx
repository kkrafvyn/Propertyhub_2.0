import { useEffect, useRef, useState } from 'react'
import { LOCALE_META } from '../i18n'
import { useLocale } from '../i18n/LocaleContext'

export default function LanguageSwitcher({ className = '', variant = 'pill' }) {
  const { locale, setLocale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const current = LOCALE_META.find((l) => l.code === locale) ?? LOCALE_META[0]

  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const triggerClass =
    variant === 'compact'
      ? 'flex w-full items-center justify-between rounded-lg border border-surface-border px-4 py-3 text-sm text-ink hover:bg-surface-hover'
      : 'nav-pill inline-flex gap-2'

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-label={t('nav.language')}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{current.label}</span>
        {variant === 'compact' && <span className="text-ink-secondary">›</span>}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 overflow-hidden rounded-xl border border-surface-border bg-surface py-2 shadow-menu ${
            variant === 'compact' ? 'left-0 right-0' : 'right-0 min-w-[180px]'
          }`}
          role="listbox"
          aria-label={t('language.choose')}
        >
          <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
            {t('language.choose')}
          </p>
          {LOCALE_META.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={locale === code}
              onClick={() => {
                setLocale(code)
                setOpen(false)
              }}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-surface-hover ${
                locale === code ? 'font-semibold text-ink' : 'text-ink-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function LanguagePanel() {
  const { locale, setLocale, t } = useLocale()

  return (
    <div>
      <p className="mb-3 text-sm text-ink-secondary">{t('profile.languageDesc')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {LOCALE_META.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
              locale === code
                ? 'border-ink bg-surface font-semibold text-ink shadow-sm'
                : 'border-surface-border text-ink-secondary hover:border-ink/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
