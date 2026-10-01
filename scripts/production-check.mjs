#!/usr/bin/env node
/**
 * Production readiness gate — static evidence checks (no secrets required).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectEnv } from './load-project-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
}

function warn(name, detail) {
  checks.push({ name, ok: true, warning: true, detail });
}

function requireFile(relativePath, name = relativePath) {
  const full = path.join(root, relativePath);
  if (existsSync(full)) pass(name, `Found ${relativePath}`);
  else fail(name, `Missing ${relativePath}`);
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
  for (const script of ['build', 'typecheck', 'test', 'jobs:run-all', 'production:check', 'ops:health']) {
    if (pkg.scripts?.[script]) pass(`npm script:${script}`, 'declared');
    else fail(`npm script:${script}`, 'missing from package.json');
  }
} catch (error) {
  fail('package.json parse', error instanceof Error ? error.message : String(error));
}

try {
  const envExample = readFileSync(path.join(root, '.env.example'), 'utf8');
  for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_TEST_URL']) {
    if (envExample.includes(key)) pass(`env.example:${key}`, 'documented');
    else fail(`env.example:${key}`, 'not documented');
  }
  if (/VITE_ENABLE_DEMO_DATA\s*=\s*false/.test(envExample)) pass('env.example:demo disabled', 'production default is false');
  else fail('env.example:demo disabled', 'VITE_ENABLE_DEMO_DATA must default to false');
} catch (error) {
  fail('.env.example', error instanceof Error ? error.message : String(error));
}

try {
  const rlsTest = readFileSync(path.join(root, 'src/lib/security/rls-policy-audit.test.ts'), 'utf8');
  for (const table of ['estate_ai_action_logs', 'ai_agent_controls', 'estate_collection_cases', 'estate_visitor_passes']) {
    if (rlsTest.includes(table)) pass(`rls audit:${table}`, 'covered in static audit');
    else fail(`rls audit:${table}`, 'not listed in rls-policy-audit.test.ts');
  }
} catch (error) {
  fail('rls-policy-audit.test.ts', error instanceof Error ? error.message : String(error));
}

for (const orphan of ['verify-stripe-payment', 'initiate-momo-payment', 'momo-webhook']) {
  const orphanPath = path.join(root, 'supabase/functions', orphan);
  if (!existsSync(orphanPath)) pass(`orphan removed:${orphan}`, 'legacy payment rail removed');
  else fail(`orphan removed:${orphan}`, `${orphan} should be deleted — PayAngels is the sole payment rail`);
}

const runtimeEnv = loadProjectEnv();
for (const [area, keys] of Object.entries({
  'Prembly live KYC': [
    'PREMBLY_API_KEY', 'PREMBLY_PUBLIC_KEY', 'PREMBLY_ORGANISATION_ID',
    'VITE_PREMBLY_WIDGET_KEY', 'VITE_PREMBLY_WIDGET_ID',
  ],
  'offsite backups': [
    'BACKUP_S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
  ],
  'scheduled operations': ['SUPABASE_SERVICE_ROLE_KEY'],
  'incident alerts': ['OPS_ALERT_WEBHOOK_URL'],
})) {
  const missing = keys.filter((key) => !runtimeEnv[key]?.trim());
  if (missing.length === 0) pass(`runtime config:${area}`, 'configured');
  else warn(`runtime config:${area}`, `not live: ${missing.join(', ')}`);
}

const failed = checks.filter((c) => !c.ok);
const warnings = checks.filter((c) => c.warning);
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), passed: checks.length - failed.length - warnings.length, warnings: warnings.length, failed: failed.length, ready: failed.length === 0 && warnings.length === 0, checks }, null, 2));
process.exit(failed.length > 0 ? 1 : 0);
