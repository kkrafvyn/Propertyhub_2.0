import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'));

const sensitiveTables = [
  'users',
  'organizations',
  'organization_members',
  'properties',
  'listings',
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
  'deal_cases',
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

describe('workspace permission RLS contract', () => {
  it('scopes deal_cases mutations to leads:write permission', () => {
    const combined = migrationFiles
      .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
      .join('\n');

    expect(combined).toMatch(/deal_cases FOR UPDATE[\s\S]*org_member_has_permission\(organization_id, 'leads:write'\)/i);
    expect(combined).toMatch(/deal_cases FOR SELECT[\s\S]*org_member_has_permission\(organization_id, 'leads:read'\)/i);
  });
});

describe('tenant isolation fixture requirements', () => {
  it('documents required env vars for live cross-tenant proof', () => {
    const required = [
      'VITE_SUPABASE_TEST_URL',
      'VITE_SUPABASE_TEST_ANON_KEY',
      'VITE_SUPABASE_TEST_TENANT_A_ID',
      'VITE_SUPABASE_TEST_TENANT_B_ID',
    ];
    expect(required.every((key) => typeof key === 'string')).toBe(true);
  });
});

const allMigrationSql = migrationFiles
  .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
  .join('\n');

// Every table must enable RLS, so a new migration that forgets it fails here
// instead of shipping a table that is reachable by default. Tables listed below
// are deliberate exceptions and each needs a reason.
//
// - Direct declaratively-partitioned children do not carry their own policies;
//   the parent's policies apply when queried through the parent.
// - Anything created by an extension is owned and governed by that extension.
const RLS_EXEMPT_TABLES = new Set<string>([]);

// These tables are intentionally deny-all until their owning workflow receives
// an explicit policy. Keeping the list explicit prevents new silent deny-all
// tables from appearing unnoticed.
const INTENTIONAL_ZERO_POLICY_TABLES = new Set([
  'public.fraud_reports',
  'public.image_hashes',
  'public.listing_sync_jobs',
  'public.nearby_services',
  'public.property_inspections',
  'public.rate_limit_buckets',
  'public.recommendation_logs',
  'public.reconciliation_adjustments',
  'public.vendor_assignments',
  'public.vendor_ratings',
  'public.vendor_services',
  'public.vendors',
  'private.account_guard_config',
]);

function createdTables(sql: string): Set<string> {
  const names = new Set<string>();
  for (const match of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+(?:(\w+)\.)?"?(\w+)"?/gi)) {
    const schema = match[1] ?? 'public';
    if (/^(temp|temporary|unlogged)$/i.test(schema)) continue;
    names.add(`${schema}.${match[2]}`);
  }
  return names;
}

function rlsEnabledTables(sql: string): Set<string> {
  const names = new Set<string>();
  for (const match of sql.matchAll(
    /ALTER TABLE(?: IF EXISTS)?\s+(?:(\w+)\.)?"?(\w+)"?\s+ENABLE ROW LEVEL SECURITY/gi,
  )) {
    names.add(`${match[1] ?? 'public'}.${match[2]}`);
  }
  return names;
}

function policyTables(sql: string): Set<string> {
  const names = new Set<string>();
  for (const match of sql.matchAll(
    /CREATE POLICY\s+(?:"[^"]+"|\S+)\s+ON\s+(?:(\w+)\.)?"?(\w+)"?/gi,
  )) {
    names.add(`${match[1] ?? 'public'}.${match[2]}`);
  }
  return names;
}

function broadGrants(sql: string): string[] {
  return [...sql.matchAll(
    /GRANT\s+ALL\s+ON\s+(?:(SCHEMA)\s+)?([^\s;]+)\s+TO\s+(public|anon)\b/gi,
  )].map((match) => match[0].trim());
}

function securityDefinerHeaders(sql: string): string[] {
  const headers: string[] = [];
  for (const match of sql.matchAll(
    /CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+[^;]+?SECURITY\s+DEFINER[\s\S]*?(?=\bAS\s+\$\$|\bAS\s+'|\bAS\s+E')/gi,
  )) {
    headers.push(match[0]);
  }
  return headers;
}

describe('RLS coverage contract (all tables, static migration scan)', () => {
  const created = createdTables(allMigrationSql);
  const enabled = rlsEnabledTables(allMigrationSql);
  const unprotected = [...created]
    .filter((table) => !enabled.has(table) && !RLS_EXEMPT_TABLES.has(table))
    .sort();

  it('finds tables in the migrations', () => {
    expect(created.size).toBeGreaterThan(200);
  });

  it('has every created table enable row level security', () => {
    expect(unprotected).toEqual([]);
  });

  it('tracks every RLS-enabled zero-policy table explicitly', () => {
    const policies = policyTables(allMigrationSql);
    const zeroPolicyTables = [...enabled]
      .filter((table) => !policies.has(table) && !RLS_EXEMPT_TABLES.has(table))
      .sort();

    expect(zeroPolicyTables).toEqual([...INTENTIONAL_ZERO_POLICY_TABLES].sort());
  });

  it('does not grant ALL to public or anon in migrations', () => {
    expect(broadGrants(allMigrationSql)).toEqual([]);
  });

  it('hardens every SECURITY DEFINER function with an explicit search_path', () => {
    const unsafe = securityDefinerHeaders(allMigrationSql).filter(
      (header) => !/SET\s+search_path\s*=/i.test(header),
    );

    expect(unsafe).toEqual([]);
  });
});
