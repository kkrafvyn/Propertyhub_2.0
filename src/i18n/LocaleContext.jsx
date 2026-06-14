import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { messages, SUPPORTED_LOCALES, getLocaleMeta } from './index.js'
import { detectLocale, translate } from './translate.js'

const STORAGE_KEY = 'baytmiftah_locale'

const LocaleContext = createContext(null)

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => detectLocale(SUPPORTED_LOCALES))

  const meta = getLocaleMeta(locale)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = meta.dir
  }, [locale, meta.dir])

  const setLocale = useCallback((code) => {
    if (!SUPPORTED_LOCALES.includes(code)) return
    setLocaleState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (key, vars) => translate(messages[locale] ?? messages.en, key, vars),
    [locale],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t, dir: meta.dir, locales: SUPPORTED_LOCALES }),
    [locale, setLocale, t, meta.dir],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

export function useTranslation() {
  const { t, locale, setLocale, dir } = useLocale()
  return { t, locale, setLocale, dir }
}
