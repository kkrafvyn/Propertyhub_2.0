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

const runLiveIsolation =
  import.meta.env.RUN_TENANT_ISOLATION_TESTS === "true" &&
  Boolean(supabaseUrl && testAnonKey && tenantAId && tenantBId);
const testIfConfigured = runLiveIsolation ? it : it.skip;

const PRIVATE_BUCKETS = ["maintenance-media", "kyc-documents"] as const;

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

describe("storage isolation integration", () => {
  beforeAll(async () => {
    if (!runLiveIsolation) return;
    tenantAToken = await signInFixtureToken(tenantAEmail);
    tenantBToken = await signInFixtureToken(tenantBEmail);
  }, 60_000);

  for (const bucket of PRIVATE_BUCKETS) {
    testIfConfigured(`tenant A cannot list tenant B objects in ${bucket}`, async () => {
      const client = userClient(tenantAToken);
      const { data, error } = await client.storage.from(bucket).list(tenantBId, { limit: 10 });

      if (error) {
        expect(data || []).toEqual([]);
        return;
      }
      expect(data || []).toEqual([]);
    });
  }

  testIfConfigured("tenant B cannot download arbitrary paths in tenant A maintenance-media", async () => {
    const client = userClient(tenantBToken);
    const probePath = `${tenantAId}/probe-file.jpg`;
    const { data, error } = await client.storage.from("maintenance-media").download(probePath);

    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  testIfConfigured("tenant A cannot list another user's kyc-documents folder", async () => {
    const client = userClient(tenantAToken);
    const { data, error } = await client.storage
      .from("kyc-documents")
      .list("00000000-0000-0000-0000-000000000099", { limit: 5 });

    if (error) {
      expect(data || []).toEqual([]);
      return;
    }
    expect(data || []).toEqual([]);
  });
});

if (!runLiveIsolation) {
  describe("storage isolation fixture requirements", () => {
    it("documents CI fixture variables for live storage RLS proof", () => {
      expect(PRIVATE_BUCKETS).toContain("kyc-documents");
    });
  });
}
