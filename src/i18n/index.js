import en from './locales/en.js'
import ar from './locales/ar.js'
import fr from './locales/fr.js'
import es from './locales/es.js'
import pt from './locales/pt.js'
import tw from './locales/tw.js'
import ha from './locales/ha.js'
import sw from './locales/sw.js'
import de from './locales/de.js'
import zh from './locales/zh.js'
import hi from './locales/hi.js'
import it from './locales/it.js'

export const messages = { en, ar, fr, es, pt, tw, ha, sw, de, zh, hi, it }

export const LOCALE_META = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'tw', label: 'Twi', dir: 'ltr' },
  { code: 'ha', label: 'Hausa', dir: 'ltr' },
  { code: 'sw', label: 'Kiswahili', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'pt', label: 'Português', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'it', label: 'Italiano', dir: 'ltr' },
  { code: 'zh', label: '中文', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
]

export const SUPPORTED_LOCALES = LOCALE_META.map((l) => l.code)

export function getLocaleMeta(code) {
  return LOCALE_META.find((l) => l.code === code) ?? LOCALE_META[0]
}
