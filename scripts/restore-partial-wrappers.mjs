/** Restore thin locale wrappers after accidental full-json sync. */
import { writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'src', 'i18n', 'locales')
const partialsDir = join(localesDir, 'partials')

for (const file of readdirSync(partialsDir).filter((f) => f.endsWith('.js') && f !== '_extended.js')) {
  const code = file.replace(/\.js$/, '')
  writeFileSync(
    join(localesDir, `${code}.js`),
    `import { buildPartialLocale } from './_chrome.js'
import en from './en.js'
import partial from './partials/${code}.js'

export default buildPartialLocale(en, partial)
`,
  )
  console.log('Restored', `${code}.js`)
}
