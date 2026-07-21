import { useEffect, useRef, useState } from 'react'
import { LOCALE_META, LOCALE_GROUPS } from '../../i18n'
import { useLocale, useTranslation } from '../../i18n/LocaleContext'
import { IconChevronRight } from './icons'

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
        {variant === 'compact' && <IconChevronRight className="h-4 w-4 text-ink-secondary" />}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-surface-border bg-surface py-2 shadow-menu ${
            variant === 'compact' ? 'left-0 right-0' : 'right-0 min-w-[220px]'
          }`}
          role="listbox"
          aria-label={t('language.choose')}
        >
          {LOCALE_GROUPS.map(({ id, labelKey }) => {
            const items = LOCALE_META.filter((l) => l.group === id)
            if (!items.length) return null
            return (
              <div key={id} className="py-1">
                <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  {t(labelKey)}
                </p>
                {items.map(({ code, label }) => (
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
            )
          })}
        </div>
      )}
    </div>
  )
}

export function LanguageSelect({ className = '' }) {
  const { locale, setLocale, t } = useLocale()

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      className={`w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-ink ${className}`}
      aria-label={t('language.choose')}
    >
      {LOCALE_META.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  )
}

export function LanguagePanel() {
  const { t } = useTranslation()

  return (
    <div>
      <p className="mb-3 text-sm text-ink-secondary">{t('profile.languageDesc')}</p>
      <LanguageSelect />
    </div>
  )
}
