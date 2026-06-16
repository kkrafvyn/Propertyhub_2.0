/**
 * Apply hub translation cache to ar/fr/es/pt locale files (offline, no API).
 * Run: node scripts/apply-hub-locales.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import en from '../src/i18n/locales/en.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'src', 'i18n', 'locales')
const cachePath = join(root, 'scripts', '.hub-translate-cache.json')

const TARGETS = [
  { file: 'fr.js', lang: 'fr', name: 'Français' },
  { file: 'es.js', lang: 'es', name: 'Español' },
  { file: 'pt.js', lang: 'pt', name: 'Português' },
  { file: 'ar.js', lang: 'ar', name: 'العربية' },
]

function collectStrings(node, out = new Set()) {
  if (typeof node === 'string') {
    out.add(node)
    return out
  }
  if (!node || typeof node !== 'object') return out
  for (const value of Object.values(node)) collectStrings(value, out)
  return out
}

function applyMap(node, map) {
  if (typeof node === 'string') return map[node] ?? node
  if (!node || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map((v) => applyMap(v, map))
  const out = {}
  for (const [k, v] of Object.entries(node)) out[k] = applyMap(v, map)
  return out
}

function deepMerge(base, patch) {
  const out = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge(base[key] ?? {}, value)
    } else {
      out[key] = value
    }
  }
  return out
}

if (!existsSync(cachePath)) {
  console.error('No cache at scripts/.hub-translate-cache.json — run npm run i18n:hubs first')
  process.exit(1)
}

const cache = JSON.parse(readFileSync(cachePath, 'utf8'))
const sections = { workspace: en.workspace, hubs: en.hubs, panels: en.panels }
const allStrings = [...collectStrings(sections)]

for (const { file, lang, name } of TARGETS) {
  const map = {}
  let hit = 0
  for (const s of allStrings) {
    const translated = cache[`${lang}::${s}`]
    if (translated) {
      map[s] = translated
      hit += 1
    }
  }
  const path = join(localesDir, file)
  const mod = await import(pathToFileURL(path).href)
  const merged = deepMerge(mod.default, {
    workspace: applyMap(en.workspace, map),
    hubs: applyMap(en.hubs, map),
    panels: applyMap(en.panels, map),
  })
  merged.localeName = mod.default.localeName || name
  writeFileSync(path, `export default ${JSON.stringify(merged, null, 2)}\n`)
  console.log(`${file}: applied ${hit}/${allStrings.length} hub strings`)
}
