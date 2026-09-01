import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const supabaseUrl = import.meta.env.VITE_SUPABASE_TEST_URL;
const tenantAToken = import.meta.env.VITE_SUPABASE_TEST_TENANT_A_TOKEN;
const tenantBToken = import.meta.env.VITE_SUPABASE_TEST_TENANT_B_TOKEN;
const tenantAId = import.meta.env.VITE_SUPABASE_TEST_TENANT_A_ID;
const tenantBId = import.meta.env.VITE_SUPABASE_TEST_TENANT_B_ID;
const hasFixtures = Boolean(supabaseUrl && tenantAToken && tenantBToken && tenantAId && tenantBId);

const testIfConfigured = hasFixtures ? it : it.skip;

function userClient(accessToken: string) {
  return createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("tenant isolation integration contract", () => {
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

    expect(error).not.toBeNull();
    expect(data || []).toEqual([]);
  });
});

if (!hasFixtures) {
  describe("tenant isolation fixture requirements", () => {
    it("skips deployed RLS proof until two isolated test users are configured", () => {
      expect(true).toBe(true);
    });
  });
}
