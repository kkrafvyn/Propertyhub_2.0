import en from './locales/en.js'
import { mergeLocale } from './mergeLocale.js'
import { getDesktopChrome } from './locales/partials/_desktopChrome.js'

/** @type {Record<string, () => Promise<{ default: object }>>} */
export const LOCALE_LOADERS = {
  en: () => Promise.resolve({ default: en }),
  ar: () => import('./locales/ar.js'),
  fr: () => import('./locales/fr.js'),
  es: () => import('./locales/es.js'),
  pt: () => import('./locales/pt.js'),
  tw: () => import('./locales/tw.js'),
  ha: () => import('./locales/ha.js'),
  sw: () => import('./locales/sw.js'),
  de: () => import('./locales/de.js'),
  zh: () => import('./locales/zh.js'),
  hi: () => import('./locales/hi.js'),
  it: () => import('./locales/it.js'),
  ja: () => import('./locales/ja.js'),
  ko: () => import('./locales/ko.js'),
  nl: () => import('./locales/nl.js'),
  ru: () => import('./locales/ru.js'),
  tr: () => import('./locales/tr.js'),
  vi: () => import('./locales/vi.js'),
  yo: () => import('./locales/yo.js'),
  ig: () => import('./locales/ig.js'),
  am: () => import('./locales/am.js'),
}

export const LOCALE_META = [
  { code: 'en', label: 'English', dir: 'ltr', group: 'global' },
  { code: 'fr', label: 'Français', dir: 'ltr', group: 'global' },
  { code: 'es', label: 'Español', dir: 'ltr', group: 'global' },
  { code: 'pt', label: 'Português', dir: 'ltr', group: 'global' },
  { code: 'de', label: 'Deutsch', dir: 'ltr', group: 'global' },
  { code: 'it', label: 'Italiano', dir: 'ltr', group: 'global' },
  { code: 'nl', label: 'Nederlands', dir: 'ltr', group: 'global' },
  { code: 'ru', label: 'Русский', dir: 'ltr', group: 'global' },
  { code: 'tr', label: 'Türkçe', dir: 'ltr', group: 'global' },
  { code: 'ar', label: 'العربية', dir: 'rtl', group: 'africa' },
  { code: 'tw', label: 'Twi', dir: 'ltr', group: 'africa' },
  { code: 'ha', label: 'Hausa', dir: 'ltr', group: 'africa' },
  { code: 'sw', label: 'Kiswahili', dir: 'ltr', group: 'africa' },
  { code: 'yo', label: 'Yorùbá', dir: 'ltr', group: 'africa' },
  { code: 'ig', label: 'Igbo', dir: 'ltr', group: 'africa' },
  { code: 'am', label: 'አማርኛ', dir: 'ltr', group: 'africa' },
  { code: 'zh', label: '中文', dir: 'ltr', group: 'asia' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr', group: 'asia' },
  { code: 'ja', label: '日本語', dir: 'ltr', group: 'asia' },
  { code: 'ko', label: '한국어', dir: 'ltr', group: 'asia' },
  { code: 'vi', label: 'Tiếng Việt', dir: 'ltr', group: 'asia' },
]

export const LOCALE_GROUPS = [
  { id: 'global', labelKey: 'language.groupGlobal' },
  { id: 'africa', labelKey: 'language.groupAfrica' },
  { id: 'asia', labelKey: 'language.groupAsia' },
]

export const SUPPORTED_LOCALES = LOCALE_META.map((l) => l.code)

const cache = { en }

export function getLocaleMeta(code) {
  return LOCALE_META.find((l) => l.code === code) ?? LOCALE_META[0]
}

export function getCachedLocale(code) {
  return cache[code] ?? cache.en
}

export async function loadLocale(code) {
  if (cache[code]) return cache[code]
  const loader = LOCALE_LOADERS[code] ?? LOCALE_LOADERS.en
  const mod = await loader()
  const catalog =
    code === 'en' ? mod.default : mergeLocale(mod.default, getDesktopChrome(code))
  cache[code] = catalog
  return catalog
}

/** Preload English (sync) and the active locale in parallel. */
export function preloadLocales(codes) {
  const unique = [...new Set(codes.filter(Boolean))]
  return Promise.all(unique.map((code) => loadLocale(code)))
}

export { en as enMessages }
