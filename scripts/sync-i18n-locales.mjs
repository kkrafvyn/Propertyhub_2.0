/**
 * Deep-merge missing keys from en.js into full JSON locale catalogs.
 * Skips mergeLocale-style partial locales (de.js, ja.js, …).
 * Run: npm run i18n:sync
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import en from '../src/i18n/locales/en.js'

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

const skip = new Set(['en.js', '_chrome.js'])
const partialsDir = join(localesDir, 'partials')
const files = readdirSync(localesDir).filter((f) => f.endsWith('.js') && !skip.has(f))

for (const file of files) {
  const code = file.replace('.js', '')
  if (existsSync(join(partialsDir, `${code}.js`))) {
    console.log('Skip partial wrapper', file)
    continue
  }

  const path = join(localesDir, file)
  const src = readFileSync(path, 'utf8')
  if (src.includes('mergeLocale') || src.includes('createPartialLocale') || src.includes('buildPartialLocale')) {
    console.log('Skip partial', file)
    continue
  }

  const mod = await import(pathToFileURL(path).href)
  const data = mod.default
  const merged = deepMerge(data, en)
  if (data.localeName) merged.localeName = data.localeName
  writeFileSync(path, `export default ${JSON.stringify(merged, null, 2)}\n`)
  console.log('Synced', file)
}
