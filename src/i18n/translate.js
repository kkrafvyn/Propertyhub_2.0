import en from './locales/en.js'

export function translate(messages, key, vars = {}) {
  const parts = key.split('.')
  let value = messages
  for (const part of parts) {
    value = value?.[part]
    if (value === undefined) break
  }
  if (typeof value !== 'string') {
    if (messages !== en) return translate(en, key, vars)
    return key
  }
  return value.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? ''))
}

export function detectLocale(supported) {
  try {
    const stored = localStorage.getItem('baytmiftah_locale')
    if (stored && supported.includes(stored)) return stored
  } catch {
    /* ignore */
  }
  const browser = (navigator.language || 'en').split('-')[0]
  if (supported.includes(browser)) return browser
  return 'en'
}
