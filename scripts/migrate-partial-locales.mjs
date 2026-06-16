/**
 * Migrate legacy partial locale files to partials/ + thin wrappers.
 * Run: npm run i18n:migrate
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { applyExtended } from '../src/i18n/locales/partials/_extended.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'src', 'i18n', 'locales')
const partialsDir = join(localesDir, 'partials')
const FULL_JSON = new Set(['ar.js', 'fr.js', 'es.js', 'pt.js', 'en.js', '_chrome.js'])

const EXTENDED = {
  mobile: {
    findNextHome: null,
    viewList: null,
    viewMap: null,
    savedCount: null,
    noSavedTitle: null,
    noSavedDesc: null,
    mapLoading: null,
    useMyLocation: null,
    menu: null,
  },
  language: {
    groupGlobal: null,
    groupAfrica: null,
    groupAsia: null,
  },
  home: {
    noMatches: null,
    tryAdjusting: null,
    showResults: null,
  },
  filters: {
    verifiedOnly: null,
    minBedrooms: null,
    any: null,
  },
}

mkdirSync(partialsDir, { recursive: true })

function extractOverrides(src) {
  const direct = src.match(/mergeLocale\(en,\s*(\{[\s\S]*\})\s*\)/)
  if (direct) {
    // eslint-disable-next-line no-new-func
    return new Function(`return (${direct[1]})`)()
  }

  const chrome = src.match(/coreChrome\(\s*['"]([^'"]+)['"]\s*,\s*(\{[\s\S]*\})\s*\)/)
  if (chrome) {
    // eslint-disable-next-line no-new-func
    const body = new Function(`return (${chrome[2]})`)()
    return { localeName: chrome[1], ...body }
  }
  return null
}

function thinWrapper(code) {
  return `import { buildPartialLocale } from './_chrome.js'
import en from './en.js'
import partial from './partials/${code}.js'

export default buildPartialLocale(en, partial)
`
}

const files = readdirSync(localesDir).filter((f) => f.endsWith('.js') && !FULL_JSON.has(f))

for (const file of files) {
  const code = file.replace(/\.js$/, '')
  const path = join(localesDir, file)
  const src = readFileSync(path, 'utf8')

  if (src.includes('./partials/')) {
    console.log('Already migrated', file)
    continue
  }

  const overrides = extractOverrides(src)
  if (!overrides?.localeName) {
    console.warn('Skip (no overrides)', file)
    continue
  }

  // Ensure nested objects exist for extended keys (English fallback via merge)
  for (const [section, keys] of Object.entries(EXTENDED)) {
    overrides[section] = overrides[section] ?? {}
  }

  writeFileSync(
    join(partialsDir, `${code}.js`),
    `export default ${JSON.stringify(applyExtended(overrides, code), null, 2)}\n`,
  )
  writeFileSync(path, thinWrapper(code))
  console.log('Migrated', file, '-> partials/' + code + '.js')
}

console.log('Done. Review partials/ and add extended translations where needed.')

// Re-apply extended chrome to existing partials (idempotent).
for (const file of readdirSync(partialsDir).filter((f) => f.endsWith('.js') && f !== '_extended.js')) {
  const code = file.replace(/\.js$/, '')
  const path = join(partialsDir, file)
  const src = readFileSync(path, 'utf8')
  const match = src.match(/export default (\{[\s\S]*\})\s*$/)
  if (!match) continue
  // eslint-disable-next-line no-new-func
  const partial = new Function(`return (${match[1]})`)()
  const merged = applyExtended(partial, code)
  writeFileSync(path, `export default ${JSON.stringify(merged, null, 2)}\n`)
  console.log('Extended', file)
}
