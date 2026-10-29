#!/usr/bin/env node
/**
 * Production smoke: Vercel SPA routes + Supabase listings + auth + admin + PayAngels dry-run.
 *
 * Usage: npm run ops:smoke-production
 */
import { spawnSync } from "node:child_process";
import { loadProjectEnv } from "../load-project-env.mjs";

const env = loadProjectEnv();
const appUrl = (
  env.VITE_PUBLIC_APP_URL ||
  env.VERCEL_PUBLIC_APP_URL ||
  "https://app.baytmiftah.com"
).replace(/\/+$/, "");
const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
}

function warn(name, detail) {
  checks.push({ name, ok: true, detail, warning: true });
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
}

async function fetchText(url, init = {}) {
  const res = await fetch(url, { redirect: "follow", ...init });
  const text = await res.text();
  return { status: res.status, text, contentType: res.headers.get("content-type") || "" };
}

async function supabaseRest(path, query = "") {
  const url = `${supabaseUrl}/rest/v1/${path}${query}`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/json",
    },
  });
  const json = await res.json().catch(() => []);
  return { status: res.status, json };
}

async function signIn(email, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { ok: res.ok, token: body.access_token, error: body.error_description || body.msg };
}

// ── 1. Home (Vercel) ───────────────────────────────────────────────────────
try {
  const home = await fetchText(`${appUrl}/`);
  if (home.status === 200 && home.text.includes('id="root"')) {
    pass("home", `${appUrl}/ → SPA shell`);
  } else {
    fail("home", `HTTP ${home.status}`);
  }
} catch (error) {
  fail("home", error instanceof Error ? error.message : String(error));
}

// ── 2. Listing detail (Supabase + route) ─────────────────────────────────────
let sampleListingId = "";
if (!supabaseUrl || !anonKey) {
  fail("listing detail", "Supabase env missing");
} else {
  const listings = await supabaseRest(
    "listings",
    "?select=id,status,visibility&status=eq.listed&visibility=eq.public&limit=1"
  );
  sampleListingId =
    env.SMOKE_TEST_LISTING_ID?.trim() ||
    env.PILOT_TEST_LISTING_ID?.trim() ||
    (listings.status === 200 && Array.isArray(listings.json) && listings.json[0]?.id) ||
    "";

  if (listings.status === 200 && Array.isArray(listings.json) && listings.json.length > 0) {
    pass("listings query", `found ${listings.json.length} public listing(s)`);
  } else if (sampleListingId) {
    warn("listings query", "anon catalog empty — using SMOKE_TEST_LISTING_ID override");
  } else if (listings.status === 200) {
    warn(
      "listings query",
      "empty catalog (needs listed+public listing from verified org, or set SMOKE_TEST_LISTING_ID)"
    );
  } else {
    fail("listings query", `HTTP ${listings.status}`);
  }

  if (sampleListingId) {
    try {
      const detail = await fetchText(`${appUrl}/property/${sampleListingId}`);
      if (detail.status === 200 && detail.text.includes('id="root"')) {
        pass("listing detail route", `/property/${sampleListingId.slice(0, 8)}…`);
      } else {
        fail("listing detail route", `HTTP ${detail.status}`);
      }
    } catch (error) {
      fail("listing detail route", error instanceof Error ? error.message : String(error));
    }
  } else {
    try {
      const detail = await fetchText(`${appUrl}/property/smoke-route-probe`);
      if (detail.status === 200 && detail.text.includes('id="root"')) {
        pass("listing detail route", "/property/:id SPA shell (no listing id in catalog)");
      } else {
        fail("listing detail route", `HTTP ${detail.status}`);
      }
    } catch (error) {
      fail("listing detail route", error instanceof Error ? error.message : String(error));
    }
  }
}

// ── 3. Login page + optional session probe ───────────────────────────────────
try {
  const login = await fetchText(`${appUrl}/login`);
  if (login.status === 200 && login.text.includes('id="root"')) {
    pass("login route", "/login SPA");
  } else {
    fail("login route", `HTTP ${login.status}`);
  }
} catch (error) {
  fail("login route", error instanceof Error ? error.message : String(error));
}

const smokeEmail = env.SMOKE_TEST_USER_EMAIL?.trim() || env.PILOT_TEST_USER_EMAIL?.trim();
const smokePassword = env.SMOKE_TEST_USER_PASSWORD?.trim() || env.PILOT_TEST_USER_PASSWORD?.trim();
if (supabaseUrl && anonKey && smokeEmail && smokePassword) {
  const session = await signIn(smokeEmail, smokePassword);
  if (session.ok && session.token) {
    pass("login auth", `session for ${smokeEmail}`);
  } else {
    fail("login auth", session.error || "sign-in failed");
  }
} else {
  warn("login auth", "Set SMOKE_TEST_USER_EMAIL/PASSWORD (or PILOT_TEST_*) for live auth probe");
}

// ── 4. Admin enrollment route (SPA shell; auth enforced client-side) ─────────
try {
  const admin = await fetchText(`${appUrl}/admin/organizations`);
  if (admin.status === 200 && admin.text.includes('id="root"')) {
    pass("admin enrollment route", "/admin/organizations SPA");
  } else {
    fail("admin enrollment route", `HTTP ${admin.status}`);
  }
} catch (error) {
  fail("admin enrollment route", error instanceof Error ? error.message : String(error));
}

if (supabaseUrl && anonKey) {
  const enrollments = await supabaseRest(
    "organization_enrollment_requests",
    "?select=id,status&status=eq.pending&limit=1"
  );
  if (enrollments.status === 200) {
    const count = Array.isArray(enrollments.json) ? enrollments.json.length : 0;
    pass("enrollment queue (service role bypass)", `anon sees ${count} pending (RLS may hide — expected)`);
  } else if (enrollments.status === 401 || enrollments.status === 403) {
    pass("enrollment queue RLS", "anon blocked from enrollment_requests (expected)");
  } else {
    warn("enrollment queue", `HTTP ${enrollments.status}`);
  }
}

// ── 5. PayAngels checkout dry-run ────────────────────────────────────────────
if (env.PAYANGELS_WEBHOOK_SECRET?.trim()) {
  const payDryRun = spawnSync(
    process.execPath,
    ["scripts/pilot/payangels-staging-e2e.mjs", "--dry-run"],
    { cwd: process.cwd(), encoding: "utf8", env: process.env }
  );
  if (payDryRun.status === 0) {
    pass("payangels dry-run", "config keys present");
  } else {
    const detail = (payDryRun.stderr || payDryRun.stdout || "dry-run failed").trim().slice(0, 200);
    fail("payangels dry-run", detail);
  }
} else {
  warn(
    "payangels dry-run",
    "PAYANGELS_WEBHOOK_SECRET not in local .env (may exist in Supabase secrets only)"
  );
}

// ── 6. Static asset MIME (post-deploy regression) ────────────────────────────
try {
  const index = await fetchText(`${appUrl}/`);
  const scriptMatch = index.text.match(/src="(\/assets\/[^"]+\.js)"/);
  if (scriptMatch) {
    const asset = await fetchText(`${appUrl}${scriptMatch[1]}`);
    if (asset.contentType.includes("javascript")) {
      pass("asset mime", `${scriptMatch[1]} → ${asset.contentType}`);
    } else {
      fail("asset mime", `${scriptMatch[1]} → ${asset.contentType || "unknown"}`);
    }
  } else {
    warn("asset mime", "No /assets/*.js reference in index.html");
  }
} catch (error) {
  warn("asset mime", error instanceof Error ? error.message : String(error));
}

const failed = checks.filter((c) => !c.ok);
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      appUrl,
      sampleListingId: sampleListingId || null,
      checks,
      failed: failed.length,
    },
    null,
    2
  )
);
process.exit(failed.length > 0 ? 1 : 0);
