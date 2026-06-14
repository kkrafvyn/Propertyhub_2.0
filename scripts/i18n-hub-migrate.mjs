/**
 * Adds hubs.* i18n keys to en.js and rewrites Shell title/subtitle to titleKey/subtitleKey.
 * Run: node scripts/i18n-hub-migrate.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pagesDir = join(root, 'src', 'pages')

const SHELL_PREFIXES = {
  Agent: 'agent',
  Agency: 'agency',
  Admin: 'admin',
  Renter: 'renter',
  Manage: 'manage',
  Finance: 'finance',
  Intelligence: 'intelligence',
  Developer: 'developer',
  Enterprise: 'enterprise',
  Smart: 'smart',
  Buyer: 'buyer',
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, files)
    else if (name.endsWith('Page.jsx')) files.push(p)
  }
  return files
}

function pageSlug(filePath, shellName) {
  const base = filePath.replace(/\\/g, '/').split('/').pop().replace('Page.jsx', '')
  const prefix = shellName.replace('Shell', '')
  const rest = base.startsWith(prefix) ? base.slice(prefix.length) : base
  return rest.charAt(0).toLowerCase() + rest.slice(1) || 'index'
}

const hubEntries = {}
let fileCount = 0

for (const file of walk(pagesDir)) {
  let src = readFileSync(file, 'utf8')
  if (!/\wShell/.test(src)) continue

  const shellMatch = src.match(/(\w+Shell)\s+title="([^"]+)"(?:\s+subtitle="([^"]+)")?/)
  if (!shellMatch) continue

  const [, shell, titleText, subtitleText] = shellMatch
  const section = SHELL_PREFIXES[shell.replace('Shell', '')] || shell.replace('Shell', '').toLowerCase()
  const page = pageSlug(relative(pagesDir, file), shell.replace('Shell', ''))
  const baseKey = `hubs.${section}.${page}`

  hubEntries[`${baseKey}.title`] = titleText
  if (subtitleText && !subtitleText.includes('${') && !subtitleText.includes('{')) {
    hubEntries[`${baseKey}.subtitle`] = subtitleText
  }

  let next = src
  next = next.replace(
    new RegExp(`(${shell}) title="${titleText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
    `$1 titleKey="${baseKey}.title"`,
  )
  if (subtitleText && !subtitleText.includes('${')) {
    next = next.replace(
      new RegExp(`subtitle="${subtitleText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
      `subtitleKey="${baseKey}.subtitle"`,
    )
  }

  if (next !== src) {
    writeFileSync(file, next)
    fileCount++
  }
}

const hubsObj = {}
for (const [flatKey, value] of Object.entries(hubEntries)) {
  const parts = flatKey.split('.')
  const field = parts.pop()
  const page = parts.pop()
  const section = parts.pop()
  hubsObj[section] ??= {}
  hubsObj[section][page] ??= {}
  hubsObj[section][page][field] = value
}

function formatHubs(obj, indent = 2) {
  const pad = ' '.repeat(indent)
  const lines = ['{']
  for (const [section, pages] of Object.entries(obj).sort()) {
    lines.push(`${pad}${section}: {`)
    for (const [page, fields] of Object.entries(pages).sort()) {
      lines.push(`${pad}  ${page}: {`)
      for (const [field, val] of Object.entries(fields).sort()) {
        lines.push(`${pad}    ${field}: ${JSON.stringify(val)},`)
      }
      lines.push(`${pad}  },`)
    }
    lines.push(`${pad}},`)
  }
  lines.push('}')
  return lines.join('\n')
}

const enPath = join(root, 'src', 'i18n', 'locales', 'en.js')
let en = readFileSync(enPath, 'utf8')
const hubsBlock = `  hubs: ${formatHubs(hubsObj).replace(/\n/g, '\n  ')},\n`

if (en.includes('hubs:')) {
  en = en.replace(/  hubs: \{[\s\S]*?\n  \},\n(?=  profileNav:)/, hubsBlock)
} else {
  en = en.replace(/  profileNav: \{/, `${hubsBlock}  profileNav: {`)
}

writeFileSync(enPath, en)
console.log(`Updated ${fileCount} page files, ${Object.keys(hubEntries).length} hub keys in en.js`)
