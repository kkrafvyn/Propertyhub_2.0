#!/usr/bin/env node
/**
 * Live smoke checks against deployed Supabase edge functions.
 * Usage: npm run ops:smoke-live
 */
import { loadProjectEnv } from "../load-project-env.mjs";

const env = loadProjectEnv();
const baseUrl = env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
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

if (!baseUrl || !anonKey) {
  fail("supabase client env", "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required");
} else {
  pass("supabase client env", "configured");
}

async function postFunction(name, body = {}) {
  const res = await fetch(`${baseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function getFunction(name) {
  const res = await fetch(`${baseUrl}/functions/v1/${name}?surface=web`, {
    headers: { apikey: anonKey },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

if (baseUrl && anonKey) {
  const version = await getFunction("app-version");
  if (version.status === 200 && version.json?.latest_version) {
    pass("app-version", `latest=${version.json.latest_version}`);
  } else {
    fail("app-version", `HTTP ${version.status}`);
  }

  const rates = await postFunction("exchange-rates", { from: "GHS", to: "USD" });
  if (rates.status === 200 && Number(rates.json?.rate) > 0) {
    pass("exchange-rates", `GHS/USD=${rates.json.rate}`);
  } else {
    fail("exchange-rates", `HTTP ${rates.status}: ${rates.json?.error || "invalid rate"}`);
  }
}

if (env.PAYANGELS_SECRET_KEY?.trim()) {
  pass("payangels secret", "present in local env");
} else {
  warn("payangels secret", "PAYANGELS_SECRET_KEY not in local .env (may exist in Supabase secrets)");
}

if (env.PAYANGELS_WEBHOOK_SECRET?.trim()) {
  pass("payangels webhook secret", "present");
} else {
  warn("payangels webhook secret", "set PAYANGELS_WEBHOOK_SECRET for npm run pilot:payangels-e2e");
}

if (env.VITE_PAYANGELS_PUBLIC_KEY?.trim()) {
  pass("payangels public key", "present for inline checkout");
} else {
  warn("payangels public key", "set VITE_PAYANGELS_PUBLIC_KEY on Vercel");
}

const failed = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), checks, failed: failed.length }, null, 2));
process.exit(failed.length > 0 ? 1 : 0);
