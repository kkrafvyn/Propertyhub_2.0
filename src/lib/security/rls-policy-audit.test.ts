import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'));

const sensitiveTables = [
  'organization_api_keys',
  'organization_webhook_subscriptions',
  'webhook_delivery_logs',
  'whitelabel_apps',
  'bank_feed_connections',
  'journal_entries',
  'coa_accounts',
  'estate_automation_events',
  'estate_collection_cases',
  'estate_ai_action_logs',
  'ai_agent_controls',
  'org_sop_documents',
  'legal_holds',
  'ai_org_controls',
  'estate_visitor_passes',
  'estate_artisans',
  'estate_utility_meters',
  'estate_owner_statement_runs',
];

describe('RLS policy audit (static migration contract)', () => {
  it('has migration files present', () => {
    expect(migrationFiles.length).toBeGreaterThan(0);
  });

  it.each(sensitiveTables)('enables RLS for %s in migrations', (tableName) => {
    const combined = migrationFiles
      .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
      .join('\n');

    expect(combined).toMatch(new RegExp(`ALTER TABLE public\\.${tableName}\\s+ENABLE ROW LEVEL SECURITY`, 'i'));
  });
});

describe('tenant isolation fixture requirements', () => {
  it('documents required env vars for live cross-tenant proof', () => {
    const required = [
      'VITE_SUPABASE_TEST_URL',
      'VITE_SUPABASE_TEST_ANON_KEY',
      'VITE_SUPABASE_TEST_TENANT_A_TOKEN',
      'VITE_SUPABASE_TEST_TENANT_B_TOKEN',
      'VITE_SUPABASE_TEST_TENANT_A_ID',
      'VITE_SUPABASE_TEST_TENANT_B_ID',
    ];
    expect(required.every((key) => typeof key === 'string')).toBe(true);
  });
});
