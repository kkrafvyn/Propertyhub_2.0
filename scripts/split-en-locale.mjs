/**
 * One-time helper: split en.js into namespaced modules under locales/en/
 * Run: node scripts/split-en-locale.mjs
 */
import { mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import en from '../src/i18n/locales/en.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src', 'i18n', 'locales', 'en')
mkdirSync(enDir, { recursive: true })

const GROUPS = {
  core: [
    'nav', 'search', 'categories', 'footer', 'common', 'language', 'access',
    'auth', 'profile', 'roles', 'menu', 'filters', 'alerts', 'notifications',
    'share', 'reviews', 'similar', 'integrations', 'legal',
  ],
  mobile: ['mobile'],
  marketplace: [
    'home', 'listing', 'savedPage', 'tripsPage', 'comparePage', 'property',
    'notFound', 'neighborhoodPage', 'consumer', 'buyerHub',
  ],
  workspace: ['workspace', 'hubs', 'panels', 'profileNav'],
  extensions: ['extensions'],
  pages: [
    'host', 'messagesPage', 'vaultPage', 'kycPage', 'paymentsPage', 'help',
    'referral', 'adminUsers',
  ],
}

const assigned = new Set(['localeName'])
for (const keys of Object.values(GROUPS)) keys.forEach((k) => assigned.add(k))

for (const [group, keys] of Object.entries(GROUPS)) {
  const chunk = {}
  for (const key of keys) {
    if (en[key] !== undefined) chunk[key] = en[key]
  }
  writeFileSync(join(enDir, `${group}.js`), `export default ${JSON.stringify(chunk, null, 2)}\n`)
}

const leftover = Object.keys(en).filter((k) => !assigned.has(k))
if (leftover.length) {
  console.warn('Unassigned en keys:', leftover)
}

const imports = Object.keys(GROUPS).map((g) => `import ${g} from './${g}.js'`).join('\n')
const spreads = Object.keys(GROUPS).map((g) => `  ...${g},`).join('\n')

writeFileSync(
  join(enDir, 'index.js'),
  `${imports}

export default {
  localeName: 'English',
${spreads}
}
`,
)

writeFileSync(join(root, 'src', 'i18n', 'locales', 'en.js'), "export { default } from './en/index.js'\n")
console.log('Split en.js into', Object.keys(GROUPS).length, 'modules')
