import fs from 'fs'
import path from 'path'

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name !== 'mobile') walk(p, files)
    } else if (ent.name.endsWith('.jsx')) files.push(p)
  }
  return files
}

const skip = new Set([
  'HomePage.jsx', 'LoginPage.jsx', 'SignUpPage.jsx', 'SavedPage.jsx', 'HostPage.jsx', 'ProfilePage.jsx',
  'BuyerHubPage.jsx', 'RenterHubPage.jsx', 'ManageHubPage.jsx', 'AgencyDashboardPage.jsx',
  'AgentDashboardPage.jsx', 'FinanceHubPage.jsx', 'IntelligenceHubPage.jsx', 'DeveloperHubPage.jsx',
  'EnterpriseHubPage.jsx', 'SmartHubPage.jsx', 'AdminModerationPage.jsx', 'AuthCallbackPage.jsx',
])

const reps = [
  [/rounded-card border border-surface-border bg-surface/g, 'panel-card bg-surface'],
  [/rounded-card border border-white\/10 bg-white\/5/g, 'panel-card'],
  [/rounded-card border border-surface-border/g, 'panel-card'],
  [/rounded-card/g, 'rounded-xl'],
  [/rounded-lg bg-brand-dark px-/g, 'rounded-lg bg-brand-accent px-'],
  [/rounded-full bg-brand-dark px-/g, 'rounded-full bg-brand-accent px-'],
  [/text-sm font-semibold text-brand"/g, 'text-sm font-semibold text-white"'],
  [/text-xs text-brand"/g, 'text-xs text-white"'],
  [/text-base font-semibold text-brand"/g, 'text-base font-semibold text-white"'],
  [/ml-auto bg-brand-dark text-brand/g, 'ml-auto bg-ink text-white'],
  [/bg-brand-dark text-brand/g, 'bg-brand-accent text-white'],
  [/text-brand-dark underline/g, 'text-ink underline'],
  [/text-sm font-semibold text-brand-dark/g, 'text-sm font-semibold text-ink'],
  [/text-xs font-semibold uppercase tracking-wide text-brand-dark/g, 'text-xs font-semibold uppercase tracking-wide text-ink-secondary'],
  [/text-xl font-bold text-brand-dark/g, 'text-xl font-bold text-ink'],
  [/text-sm text-white\/70/g, 'text-sm text-ink-secondary'],
  [/text-3xl font-semibold text-brand/g, 'text-2xl font-semibold text-ink'],
  [/border border-white\/10/g, 'border border-surface-border'],
  [/bg-white\/5/g, 'bg-surface-subtle'],
  [/text-white\/60/g, 'text-ink-secondary'],
  [/text-white\/70/g, 'text-ink-secondary'],
  [/id === conv.id \? 'bg-brand-light' : ''/g, "id === conv.id ? 'bg-surface-hover' : ''"],
  [/bg-brand-light text-brand-dark/g, 'bg-surface-hover text-ink'],
  [/bg-brand\/20 text-brand/g, 'bg-surface-hover text-ink'],
  [/bg-brand-light px-/g, 'bg-surface-hover px-'],
  [/text-brand-dark\/70/g, 'text-ink-secondary'],
  [/text-brand-dark\/80/g, 'text-ink-secondary'],
  [/text-brand-dark\/60/g, 'text-ink-secondary'],
  [/text-brand-dark/g, 'text-ink'],
  [/border border-brand\/30 bg-brand-light/g, 'border border-surface-border bg-surface-subtle'],
  [/rounded-full bg-brand-dark"/g, 'rounded-full bg-brand-accent"'],
  [/rounded-xl bg-brand-dark/g, 'rounded-xl bg-brand-accent'],
  [/rounded-lg bg-brand px-/g, 'rounded-lg bg-brand-accent px-'],
  [/text-xs font-semibold text-brand-dark/g, 'text-xs font-semibold text-ink'],
  [/font-bold text-brand-dark/g, 'font-bold text-ink'],
  [/font-semibold text-brand-dark/g, 'font-semibold text-ink'],
  [/font-medium text-brand-dark/g, 'font-medium text-ink'],
  [/text-lg font-bold text-brand-dark/g, 'text-lg font-bold text-ink'],
  [/text-2xl font-bold text-brand-dark/g, 'text-2xl font-bold text-ink'],
  [/text-4xl font-bold text-brand-dark/g, 'text-4xl font-bold text-ink'],
  [/text-5xl font-bold text-brand-dark/g, 'text-5xl font-bold text-ink'],
  [/text-3xl font-bold text-brand-dark/g, 'text-3xl font-bold text-ink'],
  [/h-full rounded-full bg-brand-dark/g, 'h-full rounded-full bg-brand-accent'],
  [/panel-card bg-brand-light/g, 'panel-card bg-surface-subtle'],
  [/font-semibold text-brand disabled/g, 'font-semibold text-white disabled'],
  [/focus:border-brand-dark/g, 'focus:border-ink'],
  [/text-brand underline/g, 'text-ink underline'],
  [/text-brand"/g, 'text-ink"'],
  [/bg-brand-light/g, 'bg-surface-subtle'],
]

let changed = 0
for (const file of walk('src/pages')) {
  if (skip.has(path.basename(file))) continue
  let src = fs.readFileSync(file, 'utf8')
  const orig = src
  for (const [a, b] of reps) src = src.replace(a, b)
  if (src !== orig) {
    fs.writeFileSync(file, src)
    changed++
    console.log('updated', file)
  }
}
console.log('total', changed)
