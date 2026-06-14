import en from './locales/en.js'
import ar from './locales/ar.js'
import fr from './locales/fr.js'
import es from './locales/es.js'
import pt from './locales/pt.js'

export const messages = { en, ar, fr, es, pt }

export const LOCALE_META = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'pt', label: 'Português', dir: 'ltr' },
]

export const SUPPORTED_LOCALES = LOCALE_META.map((l) => l.code)

export function getLocaleMeta(code) {
  return LOCALE_META.find((l) => l.code === code) ?? LOCALE_META[0]
}
