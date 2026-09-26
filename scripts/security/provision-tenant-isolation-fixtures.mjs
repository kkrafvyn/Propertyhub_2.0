#!/usr/bin/env node
/**
 * Provision (or refresh) two-org tenant isolation fixtures in the linked Supabase project.
 * Writes the six VITE_SUPABASE_TEST_* values to root .env and optionally GitHub Actions secrets.
 *
 * Usage:
 *   npm run security:provision-tenant-fixtures
 *   npm run security:provision-tenant-fixtures -- --gh-secrets
 */
import { spawnSync } from "node:child_process";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv, upsertRootEnv } from "../load-project-env.mjs";

const USER_A_EMAIL = "tenant-a-isolation@mailinator.com";
const USER_B_EMAIL = "tenant-b-isolation@mailinator.com";
const USER_A_ANALYST_EMAIL = "tenant-a-analyst@mailinator.com";
const ORG_A_SLUG = "ci-tenant-isolation-a";
const ORG_B_SLUG = "ci-tenant-isolation-b";
const FIXTURE_PASSWORD =
  process.env.TENANT_FIXTURE_PASSWORD || "BaytMiftah-TenantIsolation-CI-2026!";

function requireEnv(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing ${key} in root .env`);
  return value;
}

function getDbConfig(env) {
  if (env.SUPABASE_DB_URL) {
    return { connectionString: env.SUPABASE_DB_URL };
  }
  const password = env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error("Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in root .env");
  }
  const ref = env.SUPABASE_PROJECT_REF || new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
  const region = env.SUPABASE_DB_REGION || "eu-west-1";
  const port = Number(env.SUPABASE_DB_PORT || 5432);
  const host = env.SUPABASE_DB_HOST || `aws-0-${region}.pooler.supabase.com`;
  return {
    host,
    port,
    user: `postgres.${ref}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: process.env.DB_ALLOW_INSECURE_TLS !== "1" },
  };
}

async function withPg(env, run) {
  const client = new pg.Client(getDbConfig(env));
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function signUpOrRefreshUser(url, anonKey, email) {
  const signIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: FIXTURE_PASSWORD }),
  });

  if (signIn.ok) {
    const body = await signIn.json();
    console.log(`  auth user ${email} ready`);
    return { userId: body.user.id, accessToken: body.access_token };
  }

  const signInBody = await signIn.json().catch(() => ({}));
  if (signInBody.error_code === "email_not_confirmed" || signInBody.msg === "User already registered") {
    console.log(`  existing auth user ${email} — will confirm via database`);
    return { userId: null, accessToken: null };
  }

  const signUp = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: FIXTURE_PASSWORD,
      data: { full_name: email.includes("tenant-a") ? "CI Tenant A" : "CI Tenant B" },
    }),
  });

  const signUpBody = await signUp.json();
  if (
    !signUp.ok &&
    signUpBody.msg !== "User already registered" &&
    !String(signUpBody.msg || "").includes("rate limit") &&
    !String(signUpBody.msg || "").includes("after")
  ) {
    throw new Error(`Signup failed for ${email}: ${signUpBody.msg || signUp.status}`);
  }

  if (!signUp.ok) {
    console.log(`  existing or throttled auth user ${email} — will confirm via database`);
    return { userId: null, accessToken: null };
  }

  console.log(`  created auth user ${email}`);
  return { userId: signUpBody.id || signUpBody.user?.id, accessToken: signUpBody.access_token || null };
}

async function resolveUserIdPg(client, email) {
  const { rows } = await client.query(`SELECT id FROM auth.users WHERE email = $1 LIMIT 1`, [email]);
  if (!rows[0]?.id) throw new Error(`Auth user not found for ${email}`);
  return rows[0].id;
}

async function confirmAuthUserPg(client, email) {
  await client.query(
    `
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE email = $1
    `,
    [email],
  );
}

async function waitForPublicUserPg(client, userId, email) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { rows } = await client.query(`SELECT id FROM public.users WHERE id = $1`, [userId]);
    if (rows[0]?.id) return;
    await client.query(`SELECT pg_sleep(0.2)`);
  }

  await client.query(
    `
    INSERT INTO public.users (id, email, full_name, verified, banned)
    VALUES ($1, $2, $3, TRUE, FALSE)
    ON CONFLICT (id) DO NOTHING
    `,
    [userId, email, email.includes("tenant-a") ? "CI Tenant A" : "CI Tenant B"],
  );
}

async function ensureOrganizationPg(client, slug, name, ownerId) {
  const { rows } = await client.query(`SELECT id FROM public.organizations WHERE slug = $1 LIMIT 1`, [slug]);
  if (rows[0]?.id) {
    await client.query(
      `UPDATE public.organizations SET verified = FALSE WHERE id = $1`,
      [rows[0].id],
    );
    console.log(`  organization ${slug} exists (${rows[0].id})`);
    return rows[0].id;
  }

  const { rows: inserted } = await client.query(
    `
    INSERT INTO public.organizations (name, slug, owner_id, email, verified)
    VALUES ($1, $2, $3, $4, FALSE)
    RETURNING id
    `,
    [name, slug, ownerId, `${slug}@baytmiftah-ci.test`],
  );
  console.log(`  created organization ${slug} (${inserted[0].id})`);
  return inserted[0].id;
}

async function ensureMemberPg(client, organizationId, userId, role = "owner") {
  await client.query(
    `
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (organization_id, user_id) DO NOTHING
    `,
    [organizationId, userId, role],
  );
}

async function ensureBankFeedSeedPg(client, organizationId, userId, label) {
  const accountNumber = `CI-${label}-${organizationId.slice(0, 8)}`;
  const providerAccountId = `ci-${label}-${organizationId}`;

  const { rows: accountRows } = await client.query(
    `
    INSERT INTO public.bank_accounts (
      organization_id, bank_name, account_number, account_holder_name, currency, created_by
    )
    VALUES ($1, 'CI Fixture Bank', $2, $3, 'GHS', $4)
    ON CONFLICT (organization_id, bank_name, account_number) DO UPDATE
      SET account_holder_name = EXCLUDED.account_holder_name
    RETURNING id
    `,
    [organizationId, accountNumber, `Tenant ${label}`, userId],
  );
  const bankAccountId = accountRows[0].id;

  await client.query(
    `
    INSERT INTO public.bank_feed_connections (
      organization_id, bank_account_id, provider, provider_account_id, status, created_by
    )
    VALUES ($1, $2, 'ci_fixture', $3, 'active', $4)
    ON CONFLICT (provider, provider_account_id) DO NOTHING
    `,
    [organizationId, bankAccountId, providerAccountId, userId],
  );
}

async function ensureAuthUserAdmin(admin, email, fullName) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  let user = listed.users.find((row) => row.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: FIXTURE_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  created auth user ${email}`);
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: FIXTURE_PASSWORD,
    });
    if (error) throw error;
    console.log(`  refreshed auth user ${email}`);
  }

  return user.id;
}

async function ensureOrganizationAdmin(admin, slug, name, ownerId) {
  const { data: existing, error: readError } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (readError) throw readError;
  if (existing?.id) {
    const { error: updateError } = await admin
      .from("organizations")
      .update({ verified: false })
      .eq("id", existing.id);
    if (updateError) throw updateError;
    console.log(`  organization ${slug} exists (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await admin
    .from("organizations")
    .insert({
      name,
      slug,
      owner_id: ownerId,
      email: `${slug}@baytmiftah-ci.test`,
      verified: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`  created organization ${slug} (${data.id})`);
  return data.id;
}

async function ensureMemberAdmin(admin, organizationId, userId, role = "owner") {
  const { error } = await admin.from("organization_members").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      role,
    },
    { onConflict: "organization_id,user_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

async function ensureBankFeedSeedAdmin(admin, organizationId, userId, label) {
  const accountNumber = `CI-${label}-${organizationId.slice(0, 8)}`;
  const providerAccountId = `ci-${label}-${organizationId}`;

  const { data: account, error: accountError } = await admin
    .from("bank_accounts")
    .upsert(
      {
        organization_id: organizationId,
        bank_name: "CI Fixture Bank",
        account_number: accountNumber,
        account_holder_name: `Tenant ${label}`,
        currency: "GHS",
        created_by: userId,
      },
      { onConflict: "organization_id,bank_name,account_number" },
    )
    .select("id")
    .single();
  if (accountError) throw accountError;

  const { error: feedError } = await admin.from("bank_feed_connections").upsert(
    {
      organization_id: organizationId,
      bank_account_id: account.id,
      provider: "ci_fixture",
      provider_account_id: providerAccountId,
      status: "active",
      created_by: userId,
    },
    { onConflict: "provider,provider_account_id", ignoreDuplicates: true },
  );
  if (feedError) throw feedError;
}

async function ensureDealCaseFixtureAdmin(admin, organizationId, applicantUserId, label) {
  const slug = `ci-deal-${label}-${organizationId.slice(0, 8)}`;

  const { data: existingDeal } = await admin
    .from("deal_cases")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("message", "CI tenant isolation fixture")
    .maybeSingle();
  if (existingDeal?.id) return existingDeal.id;

  const { data: property, error: propertyError } = await admin
    .from("properties")
    .insert({
      organization_id: organizationId,
      address: `${slug} Street`,
      city: "Accra",
      region: "Greater Accra",
      category: "apartment",
    })
    .select("id")
    .single();
  if (propertyError) throw propertyError;

  const { data: listing, error: listingError } = await admin
    .from("listings")
    .insert({
      property_id: property.id,
      organization_id: organizationId,
      listing_type: "rental",
      price: 1000,
      status: "draft",
      visibility: "private",
    })
    .select("id")
    .single();
  if (listingError) throw listingError;

  const { data: dealCase, error: dealError } = await admin
    .from("deal_cases")
    .insert({
      listing_id: listing.id,
      user_id: applicantUserId,
      organization_id: organizationId,
      case_type: "rental_application",
      status: "pending",
      message: "CI tenant isolation fixture",
    })
    .select("id")
    .single();
  if (dealError) throw dealError;

  console.log(`  seeded deal case fixture for tenant ${label} (${dealCase.id})`);
  return dealCase.id;
}

async function signInToken(url, anonKey, email) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: FIXTURE_PASSWORD,
  });
  if (error || !data.session?.access_token) {
    throw error || new Error(`No access token for ${email}`);
  }
  return data.session.access_token;
}

function setGhSecret(name, value) {
  const result = spawnSync("gh", ["secret", "set", name, "--body", value], {
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`gh secret set ${name} failed: ${result.stderr || result.stdout}`);
  }
}

async function ensureDealCaseFixturePg(client, organizationId, applicantUserId, label) {
  const { rows: existing } = await client.query(
    `SELECT id FROM public.deal_cases WHERE organization_id = $1 AND message = 'CI tenant isolation fixture' LIMIT 1`,
    [organizationId],
  );
  if (existing[0]?.id) return existing[0].id;

  const { rows: propertyRows } = await client.query(
    `
    INSERT INTO public.properties (organization_id, address, city, region, category)
    VALUES ($1, $2, 'Accra', 'Greater Accra', 'apartment')
    RETURNING id
    `,
    [organizationId, `CI deal fixture ${label}`],
  );
  const propertyId = propertyRows[0].id;

  const { rows: listingRows } = await client.query(
    `
    INSERT INTO public.listings (property_id, organization_id, listing_type, price, status, visibility)
    VALUES ($1, $2, 'rental', 1000, 'draft', 'private')
    RETURNING id
    `,
    [propertyId, organizationId],
  );
  const listingId = listingRows[0].id;

  const { rows: dealRows } = await client.query(
    `
    INSERT INTO public.deal_cases (listing_id, user_id, organization_id, case_type, status, message)
    VALUES ($1, $2, $3, 'rental_application', 'pending', 'CI tenant isolation fixture')
    RETURNING id
    `,
    [listingId, applicantUserId, organizationId],
  );
  console.log(`  seeded deal case fixture for tenant ${label} (${dealRows[0].id})`);
  return dealRows[0].id;
}

async function provisionWithPg(env, url, anonKey) {
  const userA = await signUpOrRefreshUser(url, anonKey, USER_A_EMAIL);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const userB = await signUpOrRefreshUser(url, anonKey, USER_B_EMAIL);
  const userAnalyst = await signUpOrRefreshUser(url, anonKey, USER_A_ANALYST_EMAIL);

  const ids = await withPg(env, async (client) => {
    const userAId = userA.userId || (await resolveUserIdPg(client, USER_A_EMAIL));
    const userBId = userB.userId || (await resolveUserIdPg(client, USER_B_EMAIL));
    const analystUserId = userAnalyst.userId || (await resolveUserIdPg(client, USER_A_ANALYST_EMAIL));
    await confirmAuthUserPg(client, USER_A_EMAIL);
    await confirmAuthUserPg(client, USER_B_EMAIL);
    await confirmAuthUserPg(client, USER_A_ANALYST_EMAIL);
    await client.query(
      `UPDATE auth.users SET encrypted_password = crypt($2, gen_salt('bf')) WHERE email = $1`,
      [USER_A_EMAIL, FIXTURE_PASSWORD],
    );
    await client.query(
      `UPDATE auth.users SET encrypted_password = crypt($2, gen_salt('bf')) WHERE email = $1`,
      [USER_B_EMAIL, FIXTURE_PASSWORD],
    );
    await client.query(
      `UPDATE auth.users SET encrypted_password = crypt($2, gen_salt('bf')) WHERE email = $1`,
      [USER_A_ANALYST_EMAIL, FIXTURE_PASSWORD],
    );
    await waitForPublicUserPg(client, userAId, USER_A_EMAIL);
    await waitForPublicUserPg(client, userBId, USER_B_EMAIL);
    await waitForPublicUserPg(client, analystUserId, USER_A_ANALYST_EMAIL);

    const orgAId = await ensureOrganizationPg(client, ORG_A_SLUG, "CI Tenant Isolation A", userAId);
    const orgBId = await ensureOrganizationPg(client, ORG_B_SLUG, "CI Tenant Isolation B", userBId);
    await ensureMemberPg(client, orgAId, userAId, "owner");
    await ensureMemberPg(client, orgAId, analystUserId, "analyst");
    await ensureMemberPg(client, orgBId, userBId, "owner");
    await ensureBankFeedSeedPg(client, orgAId, userAId, "a");
    await ensureBankFeedSeedPg(client, orgBId, userBId, "b");
    await ensureDealCaseFixturePg(client, orgAId, userAId, "a");
    return { orgAId, orgBId, userAId, userBId };
  });

  const tenantAToken = userA.accessToken || (await signInToken(url, anonKey, USER_A_EMAIL));
  const tenantBToken = userB.accessToken || (await signInToken(url, anonKey, USER_B_EMAIL));

  return { ...ids, tenantAToken, tenantBToken };
}

async function provisionWithServiceRole(env, serviceRoleKey, url, anonKey) {
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userAId = await ensureAuthUserAdmin(admin, USER_A_EMAIL, "CI Tenant A");
  const userBId = await ensureAuthUserAdmin(admin, USER_B_EMAIL, "CI Tenant B");
  const analystUserId = await ensureAuthUserAdmin(admin, USER_A_ANALYST_EMAIL, "CI Tenant A Analyst");
  const orgAId = await ensureOrganizationAdmin(admin, ORG_A_SLUG, "CI Tenant Isolation A", userAId);
  const orgBId = await ensureOrganizationAdmin(admin, ORG_B_SLUG, "CI Tenant Isolation B", userBId);
  await ensureMemberAdmin(admin, orgAId, userAId, "owner");
  await ensureMemberAdmin(admin, orgAId, analystUserId, "analyst");
  await ensureMemberAdmin(admin, orgBId, userBId, "owner");
  await ensureBankFeedSeedAdmin(admin, orgAId, userAId, "a");
  await ensureBankFeedSeedAdmin(admin, orgBId, userBId, "b");
  await ensureDealCaseFixtureAdmin(admin, orgAId, userAId, "a");

  const tenantAToken = await signInToken(url, anonKey, USER_A_EMAIL);
  const tenantBToken = await signInToken(url, anonKey, USER_B_EMAIL);
  return { userAId, userBId, orgAId, orgBId, tenantAToken, tenantBToken };
}

async function main() {
  const pushGhSecrets = process.argv.includes("--gh-secrets");
  const env = loadProjectEnv();
  const url = requireEnv(env, "VITE_SUPABASE_URL");
  const anonKey = requireEnv(env, "VITE_SUPABASE_ANON_KEY");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  console.log("\nProvisioning tenant isolation fixtures...\n");

  const ids = serviceRoleKey
    ? await provisionWithServiceRole(env, serviceRoleKey, url, anonKey)
    : await provisionWithPg(env, url, anonKey);

  const fixtureEnv = {
    VITE_SUPABASE_TEST_URL: url,
    VITE_SUPABASE_TEST_ANON_KEY: anonKey,
    VITE_SUPABASE_TEST_TENANT_A_TOKEN: ids.tenantAToken,
    VITE_SUPABASE_TEST_TENANT_B_TOKEN: ids.tenantBToken,
    VITE_SUPABASE_TEST_TENANT_A_ID: ids.orgAId,
    VITE_SUPABASE_TEST_TENANT_B_ID: ids.orgBId,
  };

  upsertRootEnv(fixtureEnv);

  console.log("\nFixture values written to .env:");
  for (const key of Object.keys(fixtureEnv)) {
    console.log(`  ✓ ${key}`);
  }

  if (pushGhSecrets) {
    console.log("\nPushing GitHub Actions secrets...");
    for (const [key, value] of Object.entries(fixtureEnv)) {
      setGhSecret(key, value);
      console.log(`  ✓ ${key}`);
    }
  } else {
    console.log("\nTip: rerun with --gh-secrets to sync GitHub Actions repository secrets.");
  }

  console.log(
    "\nRun: npm run security:tenant-fixtures && npm run test -- src/lib/security/tenant-isolation.test.ts\n",
  );
}

main().catch((error) => {
  console.error("\nTenant fixture provisioning failed:", error.message || error);
  process.exit(1);
});
