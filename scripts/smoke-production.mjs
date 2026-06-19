/**
 * Production smoke test — run: npm run smoke:prod
 * Env: SMOKE_BASE_URL (default https://phub-sigma.vercel.app)
 *      VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY for edge checks
 */
const BASE = process.env.SMOKE_BASE_URL || 'https://phub-sigma.vercel.app'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SMOKE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SMOKE_SUPABASE_ANON_KEY

const pages = ['/', '/services', '/agencies', '/agents', '/login', '/compare', '/neighborhoods']

async function checkPage(path) {
  const url = `${BASE}${path}`
  const res = await fetch(url, { redirect: 'follow' })
  const ok = res.ok && res.headers.get('content-type')?.includes('text/html')
  return { path, ok, status: res.status }
}

async function checkEdge(action, extra = '') {
  if (!SUPABASE_URL || !ANON) return { action, ok: false, skipped: true }
  const url = `${SUPABASE_URL}/functions/v1/marketplace?action=${action}${extra}`
  const res = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } })
  const payload = await res.json().catch(() => null)
  return { action, ok: res.ok, status: res.status, hasData: Boolean(payload?.services || payload?.agencies || payload?.agents) }
}

async function checkCronHealth() {
  if (!SUPABASE_URL || !ANON) return { action: 'cron_health', skipped: true }
  const url = `${SUPABASE_URL}/functions/v1/cron?action=health`
  const res = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } })
  return { action: 'cron_health', ok: res.ok, status: res.status }
}

console.log(`Smoke test → ${BASE}\n`)

const results = []
for (const path of pages) {
  results.push(await checkPage(path))
}
results.push(await checkEdge('services'))
results.push(await checkEdge('public_list', '&type=agency'))
results.push(await checkCronHealth())

let failed = 0
for (const r of results) {
  if (r.skipped) {
    console.log(`  SKIP  ${r.action ?? r.path}`)
    continue
  }
  const label = r.path ?? r.action
  if (r.ok) console.log(`  OK    ${label}${r.status ? ` (${r.status})` : ''}`)
  else {
    console.log(`  FAIL  ${label} (${r.status ?? 'error'})`)
    failed += 1
  }
}

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.')
process.exit(failed ? 1 : 0)
