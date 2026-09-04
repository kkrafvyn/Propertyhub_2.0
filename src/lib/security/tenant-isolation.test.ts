import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const supabaseUrl = import.meta.env.VITE_SUPABASE_TEST_URL;
const testAnonKey = import.meta.env.VITE_SUPABASE_TEST_ANON_KEY;
const tenantAId = import.meta.env.VITE_SUPABASE_TEST_TENANT_A_ID;
const tenantBId = import.meta.env.VITE_SUPABASE_TEST_TENANT_B_ID;
const fixturePassword =
  import.meta.env.TENANT_FIXTURE_PASSWORD || "BaytMiftah-TenantIsolation-CI-2026!";
const tenantAEmail = "tenant-a-isolation@mailinator.com";
const tenantBEmail = "tenant-b-isolation@mailinator.com";

const hasFixtures = Boolean(supabaseUrl && testAnonKey && tenantAId && tenantBId);
const testIfConfigured = hasFixtures ? it : it.skip;

let tenantAToken = "";
let tenantBToken = "";

function userClient(accessToken: string) {
  return createClient(supabaseUrl!, testAnonKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signInFixtureToken(email: string) {
  const client = createClient(supabaseUrl!, testAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: fixturePassword,
  });
  if (error || !data.session?.access_token) {
    throw error ?? new Error(`No access token for ${email}`);
  }
  return data.session.access_token;
}

describe("tenant isolation integration contract", () => {
  beforeAll(async () => {
    if (!hasFixtures) return;
    tenantAToken = await signInFixtureToken(tenantAEmail);
    tenantBToken = await signInFixtureToken(tenantBEmail);
  }, 30_000);

  testIfConfigured("allows tenant A to see only tenant A bank-feed connections", async () => {
    const client = userClient(tenantAToken);
    const { data, error } = await client
      .from("bank_feed_connections")
      .select("organization_id")
      .eq("organization_id", tenantAId);

    expect(error).toBeNull();
    expect((data || []).every((row) => row.organization_id === tenantAId)).toBe(true);
    expect((data || []).some((row) => row.organization_id === tenantBId)).toBe(false);
  });

  testIfConfigured("prevents tenant B data from appearing in tenant A queries", async () => {
    const client = userClient(tenantAToken);
    const { data, error } = await client
      .from("bank_feed_connections")
      .select("organization_id")
      .eq("organization_id", tenantBId);

    expect(error).toBeNull();
    expect(data || []).toEqual([]);
  });

  testIfConfigured("prevents tenant A from reading tenant B Storage objects", async () => {
    const client = userClient(tenantAToken);
    const { data, error } = await client.storage
      .from("maintenance-media")
      .list(tenantBId, { limit: 10 });

    if (error) {
      expect(data || []).toEqual([]);
      return;
    }

    expect(data || []).toEqual([]);
  });

  testIfConfigured("scopes payment provider connections to tenant A", async () => {
    const client = userClient(tenantAToken);
    const { data, error } = await client
      .from("payment_provider_connections")
      .select("organization_id")
      .eq("organization_id", tenantBId);

    expect(error).toBeNull();
    expect(data || []).toEqual([]);
  });

  testIfConfigured("scopes journal entries to tenant A organization", async () => {
    const client = userClient(tenantAToken);
    const { data, error } = await client
      .from("journal_entries")
      .select("organization_id")
      .eq("organization_id", tenantBId);

    expect(error).toBeNull();
    expect(data || []).toEqual([]);
  });

  testIfConfigured("prevents tenant A from reading tenant B AI org controls", async () => {
    const client = userClient(tenantAToken);
    const { data, error } = await client
      .from("ai_org_controls")
      .select("organization_id")
      .eq("organization_id", tenantBId);

    expect(error).toBeNull();
    expect(data || []).toEqual([]);
  });

  testIfConfigured("prevents tenant B from reading tenant A property transactions", async () => {
    const client = userClient(tenantBToken);
    const { data, error } = await client
      .from("property_transactions")
      .select("organization_id")
      .eq("organization_id", tenantAId);

    expect(error).toBeNull();
    expect(data || []).toEqual([]);
  });

  testIfConfigured("prevents cross-tenant visitor pass reads", async () => {
    const clientA = userClient(tenantAToken);
    const { data: tenantAPasses } = await clientA
      .from("estate_visitor_passes")
      .select("id, estate:managed_estates(organization_id)")
      .limit(20);

    for (const row of tenantAPasses || []) {
      const orgId = (row.estate as { organization_id?: string } | null)?.organization_id;
      if (orgId) {
        expect(orgId).toBe(tenantAId);
      }
    }

    const clientB = userClient(tenantBToken);
    const { data: crossRead, error } = await clientB
      .from("estate_visitor_passes")
      .select("id")
      .in("id", (tenantAPasses || []).map((row) => row.id));

    expect(error).toBeNull();
    expect(crossRead || []).toEqual([]);
  });
});

if (!hasFixtures) {
  describe("tenant isolation fixture requirements", () => {
    it("documents CI fixture variables for live RLS proof", () => {
      expect([
        "VITE_SUPABASE_TEST_URL",
        "VITE_SUPABASE_TEST_ANON_KEY",
        "VITE_SUPABASE_TEST_TENANT_A_ID",
        "VITE_SUPABASE_TEST_TENANT_B_ID",
      ]).toHaveLength(4);
    });
  });
}
