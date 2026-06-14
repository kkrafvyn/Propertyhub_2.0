/**
 * Deep-merge missing keys from en.js into ar/fr/es/pt (preserves existing translations).
 * Writes valid JS using JSON.stringify (handles apostrophes safely).
 * Run: node scripts/sync-i18n-locales.mjs
 */
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import en from '../src/i18n/locales/en.js'
import ar from '../src/i18n/locales/ar.js'
import fr from '../src/i18n/locales/fr.js'
import es from '../src/i18n/locales/es.js'
import pt from '../src/i18n/locales/pt.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'src', 'i18n', 'locales')

function deepMerge(base, patch) {
  const out = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge(base[key] ?? {}, value)
    } else if (!(key in base)) {
      out[key] = value
    }
  }
  return out
}

const targets = [
  { file: 'ar.js', data: ar, localeName: ar.localeName },
  { file: 'fr.js', data: fr, localeName: fr.localeName },
  { file: 'es.js', data: es, localeName: es.localeName },
  { file: 'pt.js', data: pt, localeName: pt.localeName },
]

for (const { file, data, localeName } of targets) {
  const merged = deepMerge(data, en)
  merged.localeName = localeName
  writeFileSync(join(localesDir, file), `export default ${JSON.stringify(merged, null, 2)}\n`)
  console.log('Synced', file)
}
