import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  SUPPORTED_LOCALES,
  getLocaleMeta,
  getCachedLocale,
  loadLocale,
  preloadLocales,
  enMessages,
} from './localeRegistry.js'
import { detectLocale, translate } from './translate.js'

const STORAGE_KEY = 'baytmiftah_locale'

const LocaleContext = createContext(null)

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => detectLocale(SUPPORTED_LOCALES))
  const [catalog, setCatalog] = useState(enMessages)
  const [ready, setReady] = useState(() => locale === 'en')

  const meta = getLocaleMeta(locale)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = meta.dir
  }, [locale, meta.dir])

  useEffect(() => {
    let cancelled = false
    setReady(locale === 'en')

    preloadLocales(['en', locale]).then(() => {
      if (cancelled) return
      setCatalog(getCachedLocale(locale))
      setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [locale])

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
    (key, vars) => translate(catalog ?? enMessages, key, vars),
    [catalog],
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      dir: meta.dir,
      locales: SUPPORTED_LOCALES,
      localeReady: ready,
    }),
    [locale, setLocale, t, meta.dir, ready],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

export function useTranslation() {
  const { t, locale, setLocale, dir, localeReady } = useLocale()
  return { t, locale, setLocale, dir, localeReady }
}
