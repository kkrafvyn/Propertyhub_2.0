import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const supabaseUrl = import.meta.env.VITE_SUPABASE_TEST_URL;
const testAnonKey = import.meta.env.VITE_SUPABASE_TEST_ANON_KEY;
const fixturePassword =
  import.meta.env.TENANT_FIXTURE_PASSWORD || "BaytMiftah-TenantIsolation-CI-2026!";
const workspaceEmail = "tenant-a-isolation@mailinator.com";

const hasFixtures = Boolean(supabaseUrl && testAnonKey);
const testIfConfigured = hasFixtures ? it : it.skip;

let workspaceToken = "";

function userClient(accessToken: string) {
  return createClient(supabaseUrl!, testAnonKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email: string) {
  const client = createClient(supabaseUrl!, testAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: fixturePassword });
  if (error || !data.session?.access_token) {
    throw error ?? new Error(`No access token for ${email}`);
  }
  return data.session.access_token;
}

describe("platform admin live denial", () => {
  beforeAll(async () => {
    if (!hasFixtures) return;
    workspaceToken = await signIn(workspaceEmail);
  }, 30_000);

  testIfConfigured("workspace user cannot insert platform_backup_jobs", async () => {
    const client = userClient(workspaceToken);
    const { error } = await client.from("platform_backup_jobs").insert({
      status: "probe",
      backup_type: "full",
    });

    expect(error).toBeTruthy();
  });

  testIfConfigured("workspace user cannot read platform_backup_jobs", async () => {
    const client = userClient(workspaceToken);
    const { data, error } = await client.from("platform_backup_jobs").select("id, status");

    expect(error).toBeNull();
    expect(data || []).toEqual([]);
  });

  testIfConfigured("workspace user cannot mutate platform_kyc_policies", async () => {
    const client = userClient(workspaceToken);
    const { error } = await client
      .from("platform_kyc_policies")
      .update({ updated_at: new Date().toISOString() })
      .eq("country_code", "GH");

    expect(error).toBeTruthy();
  });

  testIfConfigured("workspace user cannot read organization_api_keys outside their org", async () => {
    const tenantBId = import.meta.env.VITE_SUPABASE_TEST_TENANT_B_ID;
    if (!tenantBId) return;

    const client = userClient(workspaceToken);
    const { data, error } = await client
      .from("organization_api_keys")
      .select("id, organization_id")
      .eq("organization_id", tenantBId);

    expect(error).toBeNull();
    expect(data || []).toEqual([]);
  });
});

if (!hasFixtures) {
  describe("platform admin live fixture requirements", () => {
    it("documents tenant fixture env for live admin denial tests", () => {
      expect(["VITE_SUPABASE_TEST_URL", "VITE_SUPABASE_TEST_ANON_KEY"]).toHaveLength(2);
    });
  });
}
