// Concatenate supabase/migrations/*.sql → scripts/all-migrations.sql (for SQL Editor)
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'supabase/migrations')
const out = resolve(root, 'scripts/all-migrations.sql')

const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
const parts = files.map((f) => {
  const body = readFileSync(resolve(dir, f), 'utf8')
  return `-- ═══ ${f} ═══\n${body}\n`
})

writeFileSync(out, parts.join('\n'), 'utf8')
console.log(`Wrote ${out} (${files.length} migrations)`)
