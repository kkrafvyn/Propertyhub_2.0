/**
 * Translate workspace + hubs + panels into ar/fr/es/pt catalogs.
 * Uses MyMemory free API with disk cache. Run: npm run i18n:hubs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import en from '../src/i18n/locales/en.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'src', 'i18n', 'locales')
const cachePath = join(root, 'scripts', '.hub-translate-cache.json')

const TARGETS = [
  { file: 'fr.js', code: 'fr', lang: 'fr', name: 'Français' },
  { file: 'es.js', code: 'es', lang: 'es', name: 'Español' },
  { file: 'pt.js', code: 'pt', lang: 'pt', name: 'Português' },
  { file: 'ar.js', code: 'ar', lang: 'ar', name: 'العربية' },
]

const TOKEN_PREFIX = '__VAR_'
const TOKEN_SUFFIX = '__'

function collectStrings(node, out = new Set()) {
  if (typeof node === 'string') {
    out.add(node)
    return out
  }
  if (!node || typeof node !== 'object') return out
  for (const value of Object.values(node)) collectStrings(value, out)
  return out
}

function protectVars(text) {
  const vars = []
  const protectedText = text.replace(/\{\{[^}]+\}\}/g, (match) => {
    const token = `${TOKEN_PREFIX}${vars.length}${TOKEN_SUFFIX}`
    vars.push(match)
    return token
  })
  return { protectedText, vars }
}

function restoreVars(text, vars) {
  let out = text
  vars.forEach((v, i) => {
    out = out.replace(`${TOKEN_PREFIX}${i}${TOKEN_SUFFIX}`, v)
  })
  return out
}

function loadCache() {
  if (!existsSync(cachePath)) return {}
  try {
    return JSON.parse(readFileSync(cachePath, 'utf8'))
  } catch {
    return {}
  }
}

function saveCache(cache) {
  writeFileSync(cachePath, JSON.stringify(cache, null, 2))
}

async function translateText(text, lang, cache) {
  const key = `${lang}::${text}`
  if (cache[key]) return cache[key]

  const { protectedText, vars } = protectVars(text)
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(protectedText)}&langpair=en|${lang}`

  let translated = text
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      translated = restoreVars(data.responseData.translatedText, vars)
    }
  } catch {
    /* keep English */
  }

  cache[key] = translated
  return translated
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function buildStringMap(strings, lang, cache) {
  const map = {}
  let i = 0
  for (const s of strings) {
    map[s] = await translateText(s, lang, cache)
    i += 1
    if (i % 10 === 0) {
      saveCache(cache)
      process.stdout.write(`  ${lang}: ${i}/${strings.length}\r`)
    }
    await sleep(350)
  }
  saveCache(cache)
  return map
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

const sections = {
  workspace: en.workspace,
  hubs: en.hubs,
  panels: en.panels,
}

const allStrings = [...collectStrings(sections)].sort()
const cache = loadCache()

const langArg = process.argv.find((a) => a.startsWith('--langs='))
const langFilter = langArg ? langArg.split('=')[1].split(',').map((s) => s.trim()) : null
const targets = langFilter
  ? TARGETS.filter((t) => langFilter.includes(t.lang))
  : TARGETS

if (targets.length === 0) {
  console.error('No matching locales. Use --langs=pt,ar')
  process.exit(1)
}

console.log(`Translating ${allStrings.length} hub strings for ${targets.length} locale(s)…`)

for (const { file, lang, name } of targets) {
  console.log(`\n${file} (${name})`)
  const map = await buildStringMap(allStrings, lang, cache)
  const path = join(localesDir, file)
  const mod = await import(pathToFileURL(path).href)
  const merged = deepMerge(mod.default, {
    workspace: applyMap(en.workspace, map),
    hubs: applyMap(en.hubs, map),
    panels: applyMap(en.panels, map),
  })
  merged.localeName = mod.default.localeName || name
  writeFileSync(path, `export default ${JSON.stringify(merged, null, 2)}\n`)
  console.log(`  Wrote ${file}`)
}

console.log('\nDone.')
