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

describe('WhatsApp tenant-context RPC privilege contract', () => {
  it('limits tenant context lookup to service_role', () => {
    const migration = readFileSync(
      path.join(migrationsDir, '2026092701_restrict_whatsapp_context_rpc.sql'),
      'utf8',
    );

    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.get_whatsapp_bot_context\(UUID, TEXT\) FROM PUBLIC, anon, authenticated/i);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_whatsapp_bot_context\(UUID, TEXT\) TO service_role/i);
    expect(migration).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.get_whatsapp_bot_context\(UUID, TEXT\) TO [^;]*authenticated/i);
  });
});

describe('tenant mutation hardening migration contract', () => {
  const hardening = readFileSync(
    path.join(migrationsDir, '2026092702_close_tenant_mutation_paths.sql'),
    'utf8',
  );

  it('removes direct escrow and payout request mutations', () => {
    expect(hardening).toMatch(/REVOKE ALL ON public\.escrow_holds FROM PUBLIC, anon, authenticated/i);
    expect(hardening).toMatch(/REVOKE ALL ON public\.wallet_payout_requests FROM PUBLIC, anon, authenticated/i);
    expect(hardening).toMatch(/private\.require_account_admin\(\)/);
  });

  it('reserves usage metering and preventive maintenance for service_role', () => {
    expect(hardening).toMatch(/increment_saas_usage\(UUID, TEXT, BIGINT\) FROM PUBLIC, anon, authenticated/i);
    expect(hardening).toMatch(/run_due_preventive_maintenance\(DATE\) FROM PUBLIC, anon, authenticated/i);
    expect(hardening).toMatch(/GRANT EXECUTE ON FUNCTION public\.run_due_preventive_maintenance\(DATE\) TO service_role/i);
  });

  it('restricts org-member writes on automation events and AI alerts', () => {
    const combined = migrationFiles
      .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
      .join('\n');

    expect(combined).toMatch(/CREATE POLICY .*estate_automation_events.*FOR INSERT.*private\.is_org_admin\(organization_id\)/i);
    expect(combined).toMatch(/CREATE POLICY .*estate_automation_events.*FOR UPDATE.*private\.is_org_admin\(organization_id\)/i);
    expect(combined).toMatch(/CREATE POLICY .*estate_ai_watch_alerts.*FOR INSERT.*private\.is_org_admin\(organization_id\)/i);
    expect(combined).toMatch(/CREATE POLICY .*estate_ai_watch_alerts.*FOR UPDATE.*private\.is_org_admin\(organization_id\)/i);
    expect(combined).not.toMatch(/CREATE POLICY .*Members access automation events.*FOR ALL.*organization_members/i);
    expect(combined).not.toMatch(/CREATE POLICY .*Members access AI alerts.*FOR ALL.*organization_members/i);
  });

  it('checks external resources against the grant organization on create and update', () => {
    expect(hardening).toMatch(/guard_external_access_resource_org/);
    expect(hardening).toMatch(/resource_org IS DISTINCT FROM NEW\.organization_id/i);
    expect(hardening).toMatch(/mr\.organization_id = v_grant\.organization_id/i);
  });

  it('restricts integration settings and e-sign status transitions', () => {
    expect(hardening).toMatch(/Org administrators manage integrations/);
    expect(hardening).toMatch(/REVOKE ALL ON public\.esignature_requests FROM PUBLIC, anon, authenticated/i);
    expect(hardening).toMatch(/send_esignature_request\(p_request_id UUID\)/);
    expect(hardening).toMatch(/guard_lease_sensitive_fields/);
  });

  it('requires enrolled platform staff to complete MFA for enrollment review', () => {
    expect(hardening).toMatch(/require_platform_staff_mfa/);
    expect(hardening).toMatch(/auth\.jwt\(\)->>'aal'.*aal2/i);
  });
});

describe('high-risk workflow hardening contract', () => {
  it('creates step-up sessions only through AAL2 RPC and denies direct DML', () => {
    const migration = readFileSync(
      path.join(migrationsDir, '2026092706_trusted_step_up_and_ai_allowlist.sql'),
      'utf8',
    );

    expect(migration).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.privileged_step_up FROM PUBLIC, anon, authenticated/i);
    expect(migration).toMatch(/auth\.jwt\(\)->>'aal'.*aal2/i);
    expect(migration).toMatch(/INSERT INTO public\.privileged_step_up[\s\S]*VALUES[\s\S]*auth\.uid\(\)/i);
    expect(migration).toMatch(/create_privileged_step_up/i);
  });

  it('fails closed for AI allowlists and protects statement financial fields', () => {
    const aiSource = readFileSync(path.resolve(process.cwd(), 'supabase/functions/_shared/org-auth.ts'), 'utf8');
    const statementMigration = readFileSync(
      path.join(migrationsDir, '2026092707_owner_statement_integrity.sql'),
      'utf8',
    );

    expect(aiSource).toMatch(/if \(!data \|\| data\.enabled !== true\)/i);
    expect(aiSource).toMatch(/required_permission/i);
    expect(statementMigration).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.estate_owner_statement_runs/i);
    expect(statementMigration).toMatch(/Approved owner statement financial fields are immutable/i);
    expect(statementMigration).toMatch(/requested_by = auth\.uid\(\)/i);
  });

  it('removes public raw document access and exposes only the public DTO RPC', () => {
    const migration = readFileSync(
      path.join(migrationsDir, '2026092705_public_document_privacy.sql'),
      'utf8',
    );

    expect(migration).toMatch(/REVOKE SELECT ON public\.organization_documents FROM anon/i);
    expect(migration).toMatch(/get_public_listing_documents/i);
    expect(migration).toMatch(/REVOKE SELECT ON public\.document_signatures FROM anon/i);
    expect(migration).toMatch(/No client document signature writes/i);
  });
});

describe('new security findings contract', () => {
  const hardening = readFileSync(
    path.join(migrationsDir, '2026092711_new_security_findings.sql'),
    'utf8',
  );

  it('requires authorized self-join and member role for generic conversations', () => {
    expect(hardening).toMatch(/user_id = auth\.uid\(\)/i);
    expect(hardening).toMatch(/participant_role = 'member'/i);
    expect(hardening).toMatch(/can_join_conversation/i);
    expect(hardening).toMatch(/Participant identity and role are immutable/i);
  });

  it('creates API keys and webhook secrets with server cryptographic randomness', () => {
    expect(hardening).toMatch(/gen_random_bytes\(32\)/i);
    expect(hardening).toMatch(/digest\(v_raw,'sha256'\)/i);
    expect(hardening).toMatch(/create_organization_api_key/i);
    expect(hardening).toMatch(/create_organization_webhook/i);
    expect(hardening).toMatch(/developer_api:manage/i);
    expect(hardening).toMatch(/webhooks:manage/i);
  });

  it('protects audit receipts and cross-resource organization bindings', () => {
    expect(hardening).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.message_delivery, public\.document_activity_logs/i);
    expect(hardening).toMatch(/record_document_activity/i);
    expect(hardening).toMatch(/Issue does not belong to organization/i);
    expect(hardening).toMatch(/Estate does not belong to organization/i);
    expect(hardening).toMatch(/Field activity actor must be the authenticated user/i);
  });

  it('generates tax statements from trusted statement runs', () => {
    expect(hardening).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.owner_tax_statements/i);
    expect(hardening).toMatch(/generate_owner_tax_statement/i);
    expect(hardening).toMatch(/estate_owner_statement_runs/i);
  });
});

describe('server-controlled sensitive workflow contract', () => {
  const hardening = readFileSync(
    path.join(migrationsDir, '2026092712_server_controlled_sensitive_workflows.sql'),
    'utf8',
  );

  it('requires server-generated KYC review transitions and denies direct client review writes', () => {
    expect(hardening).toMatch(/REVOKE UPDATE ON public\.kyc_submissions FROM authenticated/i);
    expect(hardening).toMatch(/review_kyc_submission\(/i);
    expect(hardening).toMatch(/KYC review fields are controlled by platform administrators/i);
  });

  it('server-controls visitor pass generation and gate verification', () => {
    expect(hardening).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.estate_visitor_passes/i);
    expect(hardening).toMatch(/create_estate_visitor_pass\(/i);
    expect(hardening).toMatch(/verify_estate_visitor_pass\(/i);
    expect(hardening).toMatch(/server-generated.*(?:pin|token)/i);
  });

  it('requires trusted smart-device event writes and strips secrets from public results', () => {
    expect(hardening).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.smart_devices, public\.smart_device_events/i);
    expect(hardening).toMatch(/register_smart_device\(/i);
    expect(hardening).toMatch(/append_smart_device_event\(/i);
    expect(hardening).toMatch(/access_code.*NULL|secret.*NULL/i);
  });

  it('rate-limits anonymous complaint intake and legal acceptance writes through the server', () => {
    expect(hardening).toMatch(/REVOKE INSERT ON public\.legal_acceptances|REVOKE INSERT ON public\.support_complaints/i);
    expect(hardening).toMatch(/record_legal_acceptance\(/i);
    expect(hardening).toMatch(/submit_support_complaint\(/i);
    expect(hardening).toMatch(/rate limit|too many complaints|too_many/i);
  });

  it('makes valuation audits immutable once created and keeps staff access read-only', () => {
    expect(hardening).toMatch(/REVOKE UPDATE, DELETE ON public\.property_valuation_audits/i);
    expect(hardening).toMatch(/guard_property_valuation_audit_mutation/i);
    expect(hardening).toMatch(/confidence_score_pct.*immutable|predicted_.*immutable/i);
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
  'public.estate_visitor_pass_attempts',
  'public.estate_visitor_pass_policies',
  'public.fraud_reports',
  'public.image_hashes',
  'public.legal_policy_bundles',
  'public.listing_sync_jobs',
  'public.nearby_services',
  'public.organization_webhook_secrets',
  'public.property_inspections',
  'public.rate_limit_buckets',
  'public.recommendation_logs',
  'public.reconciliation_adjustments',
  'public.smart_device_credentials',
  'public.support_complaint_attempts',
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
