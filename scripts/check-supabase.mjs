// Supabase connection check — Usage: node scripts/check-supabase.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const envPath = resolve(root, '.env')
  if (!existsSync(envPath)) return {}
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
  return env
}

const env = { ...process.env, ...loadEnv() }
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  console.error('FAIL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(url, key)

const checks = [
  { table: 'listings', filter: (q) => q.eq('status', 'active') },
  { table: 'insurance_products' },
  { table: 'viewing_slots' },
]

let failed = false

for (const { table, filter } of checks) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  if (filter) q = filter(q)
  const { error, count } = await q
  if (error) {
    console.error(`FAIL: ${table} —`, error.message)
    failed = true
  } else {
    console.log(`OK: ${table} — ${count ?? 0} rows`)
  }
}

const { data: active, error: listErr } = await supabase
  .from('listings')
  .select('id, title, status')
  .eq('status', 'active')
  .limit(3)

if (listErr) {
  console.error('FAIL: listings query —', listErr.message)
  failed = true
} else {
  console.log('OK: Supabase connected at', url)
  if (active?.length) {
    active.forEach((r) => console.log(' -', r.id, r.title))
  } else {
    console.log('Note: No active listings — apply migrations:')
    console.log('  npm run db:bundle   # then paste scripts/all-migrations.sql in Supabase SQL Editor')
    console.log('  npm run db:push     # or after: npx supabase login && npx supabase link --project-ref ixmbfnfwpjwbfahqaftc')
  }
}

process.exit(failed ? 1 : 0)
