#!/usr/bin/env node
/**
 * Production readiness gate — static evidence + non-secret runtime hints.
 * Scoring rubric: docs/deployment/PRODUCTION_SCORE.md
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectEnv } from './load-project-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];

/** @type {Record<string, { total: number, earned: number }>} */
const categories = {
  repository: { total: 0, earned: 0 },
  security: { total: 0, earned: 0 },
  integrations: { total: 0, earned: 0 },
  legal: { total: 0, earned: 0 },
  edge: { total: 0, earned: 0 },
};

function truthyFlag(value) {
  return /^(1|true|yes)$/i.test(String(value || '').trim());
}

function pass(name, detail, category = 'repository') {
  checks.push({ name, ok: true, detail, category });
}

function fail(name, detail, category = 'repository') {
  checks.push({ name, ok: false, detail, category });
}

/** @param {{ blocking?: boolean, deferredFullCredit?: boolean, informational?: boolean }} opts */
function warn(name, detail, category = 'integrations', opts = { blocking: true }) {
  checks.push({
    name,
    ok: true,
    warning: true,
    blocking: opts.blocking !== false,
    deferredFullCredit: opts.deferredFullCredit === true,
    informational: opts.informational === true,
    detail,
    category,
  });
}

function requireFile(relativePath, name = relativePath, category = 'repository') {
  const full = path.join(root, relativePath);
  if (existsSync(full)) pass(name, `Found ${relativePath}`, category);
  else fail(name, `Missing ${relativePath}`, category);
}

requireFile('package.json');
requireFile('.env.example');
requireFile('.github/workflows/ci.yml');
requireFile('scripts/workers/run-all-jobs.mjs');
requireFile('scripts/workers/verify-collection-promises.mjs');
requireFile('scripts/workers/process-automation-events.mjs');
requireFile('scripts/workers/night-watch-audit.mjs');
requireFile('scripts/workers/process-owner-statement-deliveries.mjs');
requireFile('scripts/workers/process-communication-queue.mjs');
requireFile('scripts/workers/apply-data-retention.mjs');
requireFile('scripts/ops/health-check.mjs');
requireFile('.github/workflows/scheduled-jobs.yml');
requireFile('.github/workflows/deploy.yml');
requireFile('public/manifest.webmanifest');
requireFile('public/sw.js');
requireFile('capacitor.config.json');
requireFile('electron/main.cjs');
requireFile('android/app/src/main/AndroidManifest.xml');
requireFile('src/content/legal/policies.ts', 'legal policies catalog');
requireFile('src/content/legal/legal-catalog.test.ts', 'legal catalog tests');
requireFile('src/lib/legal-config.ts', 'legal operator config');
requireFile('scripts/backup/restore-drill.mjs', 'backup restore drill');
requireFile('scripts/backup/fixtures/minimal-backup/backup-manifest.json', 'backup drill fixture');
requireFile('docs/deployment/PRODUCTION_SCORE.md', 'production score rubric');
requireFile('scripts/supabase/edge-function-audit.mjs', 'edge function audit script', 'edge');
requireFile('supabase/functions/payangels-webhook/index.ts', 'payangels-webhook edge', 'edge');
requireFile('supabase/functions/initialize-payangels-payment/index.ts', 'initialize-payangels-payment edge', 'edge');
requireFile('supabase/functions/dispatch-notification/index.ts', 'dispatch-notification edge', 'integrations');
requireFile('supabase/functions/kyc-prembly-verify/index.ts', 'kyc-prembly-verify edge', 'integrations');
requireFile('supabase/functions/kyc-prembly-webhook/index.ts', 'kyc-prembly-webhook edge', 'integrations');
requireFile('supabase/functions/polygon-transactions/index.ts', 'polygon-transactions edge', 'edge');
requireFile('.github/workflows/monitoring.yml', 'monitoring workflow', 'integrations');
requireFile('.github/workflows/backup-offsite.yml', 'offsite backup workflow', 'integrations');

const migrationsDir = path.join(root, 'supabase/migrations');
if (existsSync(migrationsDir)) {
  const sqlFiles = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
  if (sqlFiles.length > 0) pass('supabase migrations', `${sqlFiles.length} migration files`);
  else fail('supabase migrations', 'No SQL migrations found');
} else {
  fail('supabase migrations', 'supabase/migrations directory missing');
}

try {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const script of ['build', 'typecheck', 'test', 'jobs:run-all', 'production:check', 'production:check:repo', 'ops:health']) {
    if (pkg.scripts?.[script]) pass(`npm script:${script}`, 'declared');
    else fail(`npm script:${script}`, 'missing from package.json');
  }
  if (pkg.scripts?.['supabase:audit:edge']) pass('npm script:supabase:audit:edge', 'declared', 'edge');
  else warn('npm script:supabase:audit:edge', 'add to package.json for operator ergonomics', 'edge', { blocking: false });
} catch (error) {
  fail('package.json parse', error instanceof Error ? error.message : String(error));
}

try {
  const envExample = readFileSync(path.join(root, '.env.example'), 'utf8');
  for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_TEST_URL']) {
    if (envExample.includes(key)) pass(`env.example:${key}`, 'documented');
    else fail(`env.example:${key}`, 'not documented');
  }
  for (const key of [
    'PAYANGELS_WEBHOOK_SECRET',
    'PAYANGELS_SECRET_KEY',
    'VITE_PAYANGELS_PUBLIC_KEY',
    'RESEND_API_KEY',
    'NOTIFICATION_EMAIL_FROM',
    'OPS_ALERT_WEBHOOK_URL',
    'BACKUP_S3_BUCKET',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PREMBLY_API_KEY',
    'VITE_PREMBLY_WIDGET_KEY',
    'PREMBLY_LIVE_KYC_OPTIONAL',
  ]) {
    if (envExample.includes(key)) pass(`env.example:${key}`, 'documented', 'integrations');
    else fail(`env.example:${key}`, 'not documented', 'integrations');
  }
  if (/VITE_ENABLE_DEMO_DATA\s*=\s*false/.test(envExample)) pass('env.example:demo disabled', 'production default is false', 'security');
  else fail('env.example:demo disabled', 'VITE_ENABLE_DEMO_DATA must default to false', 'security');
  if (envExample.includes('LEGAL_LAUNCH_SIGNED_OFF')) pass('env.example:legal sign-off', 'documented', 'legal');
  else warn('env.example:legal sign-off', 'add LEGAL_LAUNCH_SIGNED_OFF', 'legal', { blocking: false });
  if (envExample.includes('PREMBLY_LIVE_KYC_OPTIONAL')) pass('env.example:Prembly optional flag', 'documented', 'integrations');
  else warn('env.example:Prembly optional flag', 'add PREMBLY_LIVE_KYC_OPTIONAL', 'integrations', { blocking: false });
  if (envExample.includes('PRODUCTION_INTEGRATIONS_DEFERRED')) {
    pass('env.example:integrations deferred flag', 'documented', 'integrations');
  } else {
    warn('env.example:integrations deferred flag', 'add PRODUCTION_INTEGRATIONS_DEFERRED', 'integrations', { blocking: false });
  }
  if (envExample.includes('LEGAL_LAUNCH_DEFERRED')) pass('env.example:legal deferred flag', 'documented', 'legal');
  else warn('env.example:legal deferred flag', 'add LEGAL_LAUNCH_DEFERRED', 'legal', { blocking: false });
} catch (error) {
  fail('.env.example', error instanceof Error ? error.message : String(error));
}

try {
  const deployScript = readFileSync(path.join(root, 'scripts/deploySupabasePayments.cjs'), 'utf8');
  for (const slug of ['payangels-webhook', 'kyc-prembly-verify', 'kyc-prembly-webhook', 'dispatch-notification']) {
    if (deployScript.includes(slug)) pass(`deploy script:${slug}`, 'listed for edge deploy', 'integrations');
    else fail(`deploy script:${slug}`, 'missing from scripts/deploySupabasePayments.cjs', 'integrations');
  }
} catch (error) {
  fail('deploySupabasePayments.cjs', error instanceof Error ? error.message : String(error), 'integrations');
}

try {
  const rlsTest = readFileSync(path.join(root, 'src/lib/security/rls-policy-audit.test.ts'), 'utf8');
  for (const table of ['estate_ai_action_logs', 'ai_agent_controls', 'estate_collection_cases', 'estate_visitor_passes']) {
    if (rlsTest.includes(table)) pass(`rls audit:${table}`, 'covered in static audit', 'security');
    else fail(`rls audit:${table}`, 'not listed in rls-policy-audit.test.ts', 'security');
  }
} catch (error) {
  fail('rls-policy-audit.test.ts', error instanceof Error ? error.message : String(error), 'security');
}

for (const orphan of ['verify-stripe-payment', 'initiate-momo-payment', 'momo-webhook']) {
  const orphanPath = path.join(root, 'supabase/functions', orphan);
  if (!existsSync(orphanPath)) pass(`orphan removed:${orphan}`, 'legacy payment rail removed', 'security');
  else fail(`orphan removed:${orphan}`, `${orphan} should be deleted — PayAngels is the sole payment rail`, 'security');
}

try {
  const legalConfig = readFileSync(path.join(root, 'src/lib/legal-config.ts'), 'utf8');
  const checklistMatch = legalConfig.match(/LEGAL_LAUNCH_CHECKLIST\s*=\s*\[([\s\S]*?)\]\s*as const/);
  const items = checklistMatch
    ? checklistMatch[1].split('\n').filter((line) => line.includes('"')).length
    : 0;
  if (items >= 5) pass('legal launch checklist', `${items} operator items defined`, 'legal');
  else fail('legal launch checklist', 'LEGAL_LAUNCH_CHECKLIST missing or too short', 'legal');
} catch (error) {
  fail('legal launch checklist', error instanceof Error ? error.message : String(error), 'legal');
}

const runtimeEnv = loadProjectEnv();
const integrationsDeferred = truthyFlag(process.env.PRODUCTION_INTEGRATIONS_DEFERRED ?? runtimeEnv.PRODUCTION_INTEGRATIONS_DEFERRED);
const legalDeferred = truthyFlag(process.env.LEGAL_LAUNCH_DEFERRED ?? runtimeEnv.LEGAL_LAUNCH_DEFERRED);
const premblyOptional = truthyFlag(runtimeEnv.PREMBLY_LIVE_KYC_OPTIONAL);
const integrationWarnOpts = integrationsDeferred
  ? { blocking: false, deferredFullCredit: true, informational: true }
  : { blocking: true };
const legalWarnOpts = legalDeferred
  ? { blocking: false, deferredFullCredit: true, informational: true }
  : { blocking: true };

const demoData = runtimeEnv.VITE_ENABLE_DEMO_DATA?.trim().toLowerCase();
if (!demoData || demoData === 'false' || demoData === '0') {
  pass('runtime config:demo data', 'VITE_ENABLE_DEMO_DATA is false or unset', 'security');
} else {
  fail('runtime config:demo data', 'VITE_ENABLE_DEMO_DATA must be false in production environments', 'security');
}

for (const [area, keys] of Object.entries({
  'PayAngels payments': ['PAYANGELS_SECRET_KEY', 'PAYANGELS_WEBHOOK_SECRET', 'VITE_PAYANGELS_PUBLIC_KEY'],
  'transactional email (Resend)': ['RESEND_API_KEY', 'NOTIFICATION_EMAIL_FROM'],
  'scheduled operations': ['SUPABASE_SERVICE_ROLE_KEY'],
  'incident alerts': ['OPS_ALERT_WEBHOOK_URL'],
  'offsite backups': ['BACKUP_S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
})) {
  const missing = keys.filter((key) => !runtimeEnv[key]?.trim());
  if (missing.length === 0) pass(`runtime config:${area}`, 'configured', 'integrations');
  else {
    warn(
      `runtime config:${area}`,
      integrationsDeferred
        ? `deferred (PRODUCTION_INTEGRATIONS_DEFERRED=true): ${missing.join(', ')}`
        : `not live locally: ${missing.join(', ')}`,
      'integrations',
      integrationWarnOpts,
    );
  }
}

{
  const premblyKeys = [
    'PREMBLY_API_KEY', 'PREMBLY_PUBLIC_KEY', 'PREMBLY_ORGANISATION_ID',
    'VITE_PREMBLY_WIDGET_KEY', 'VITE_PREMBLY_WIDGET_ID',
  ];
  const missing = premblyKeys.filter((key) => !runtimeEnv[key]?.trim());
  if (missing.length === 0) {
    pass('runtime config:Prembly live KYC', 'configured', 'integrations');
  } else if (premblyOptional) {
    warn(
      'runtime config:Prembly live KYC',
      integrationsDeferred
        ? `deferred (PRODUCTION_INTEGRATIONS_DEFERRED): ${missing.join(', ')}`
        : `deferred (PREMBLY_LIVE_KYC_OPTIONAL=true): ${missing.join(', ')}`,
      'integrations',
      { blocking: false, deferredFullCredit: integrationsDeferred },
    );
  } else {
    warn(
      `runtime config:Prembly live KYC`,
      integrationsDeferred
        ? `deferred (PRODUCTION_INTEGRATIONS_DEFERRED=true): ${missing.join(', ')}`
        : `not live: ${missing.join(', ')} — set PREMBLY_LIVE_KYC_OPTIONAL=true to defer`,
      'integrations',
      integrationWarnOpts,
    );
  }
}

if (truthyFlag(runtimeEnv.LEGAL_LAUNCH_SIGNED_OFF)) {
  pass('legal launch sign-off', 'LEGAL_LAUNCH_SIGNED_OFF=true', 'legal');
} else {
  warn(
    'legal launch sign-off',
    legalDeferred
      ? 'deferred (LEGAL_LAUNCH_DEFERRED=true) — set LEGAL_LAUNCH_SIGNED_OFF=true after checklist'
      : 'Set LEGAL_LAUNCH_SIGNED_OFF=true after completing LEGAL_LAUNCH_CHECKLIST (see src/lib/legal-config.ts)',
    'legal',
    legalWarnOpts,
  );
}

for (const check of checks) {
  const cat = categories[check.category] || categories.repository;
  cat.total += 1;
  if (check.ok && !check.warning) cat.earned += 1;
  else if (check.ok && check.warning && check.deferredFullCredit) cat.earned += 1;
  else if (check.ok && check.warning && check.blocking === false) cat.earned += 0.75;
  else if (check.ok && check.warning) cat.earned += 0.25;
}

const CATEGORY_WEIGHTS = {
  repository: 30,
  security: 15,
  integrations: 35,
  legal: 10,
  edge: 10,
};

let score = 0;
/** @type {Record<string, { weight: number, points: number, maxPoints: number, checks: number, passed: number }>} */
const breakdown = {};
for (const [key, weight] of Object.entries(CATEGORY_WEIGHTS)) {
  const { total, earned } = categories[key] || { total: 0, earned: 0 };
  const ratio = total > 0 ? earned / total : 1;
  const points = Math.round(ratio * weight * 10) / 10;
  score += points;
  breakdown[key] = {
    weight,
    points,
    maxPoints: weight,
    checks: total,
    passed: Math.round(earned * 10) / 10,
  };
}
score = Math.round(score);

const failed = checks.filter((c) => !c.ok);
const warnings = checks.filter((c) => c.warning);
const blockingWarnings = warnings.filter((c) => c.blocking !== false);
const repoDeferredMode = integrationsDeferred || legalDeferred;
const ready =
  failed.length === 0 &&
  blockingWarnings.length === 0 &&
  !integrationsDeferred &&
  !legalDeferred;

console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      score,
      targetScore: 90,
      mode: repoDeferredMode ? 'repo-deferred' : 'standard',
      integrationsDeferred,
      legalDeferred,
      ready,
      passed: checks.filter((c) => c.ok && !c.warning).length,
      warnings: warnings.length,
      blockingWarnings: blockingWarnings.length,
      failed: failed.length,
      breakdown,
      rubric: 'docs/deployment/PRODUCTION_SCORE.md',
      checks,
    },
    null,
    2,
  ),
);
process.exit(failed.length > 0 ? 1 : 0);
