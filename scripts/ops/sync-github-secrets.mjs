#!/usr/bin/env node
/**
 * Sync CI/CD secrets and variables from root .env to GitHub Actions.
 * Never prints secret values.
 *
 * Usage: npm run ops:sync-github-secrets
 */
import { spawnSync } from "node:child_process";
import { loadProjectEnv } from "../load-project-env.mjs";

function buildDbUrl(env) {
  if (env.SUPABASE_DB_URL?.trim()) return env.SUPABASE_DB_URL.trim();

  const password = env.SUPABASE_DB_PASSWORD?.trim();
  const projectRef =
    env.SUPABASE_PROJECT_REF ||
    (env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0] : "");
  if (!password || !projectRef) return "";

  const region = env.SUPABASE_DB_REGION || "eu-west-1";
  const port = env.SUPABASE_DB_PORT || "5432";
  const host = env.SUPABASE_DB_HOST || `aws-0-${region}.pooler.supabase.com`;
  const user = env.SUPABASE_DB_USER || `postgres.${projectRef}`;
  const encoded = encodeURIComponent(password);
  return `postgresql://${user}:${encoded}@${host}:${port}/postgres`;
}

async function resolveServiceRoleKey(env) {
  const fromEnv = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fromEnv) return fromEnv;

  const token = env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef = env.SUPABASE_PROJECT_REF?.trim() || getProjectRef(env);
  if (!token || !projectRef) return "";

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return "";

  const keys = await response.json();
  const service = Array.isArray(keys)
    ? keys.find((entry) => entry.name === "service_role")
    : keys?.service_role;
  return service?.api_key?.trim() || "";
}

function getProjectRef(env) {
  if (env.SUPABASE_PROJECT_REF) return env.SUPABASE_PROJECT_REF;
  if (env.VITE_SUPABASE_URL) return new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
  return "";
}

function ghSetSecret(name, value) {
  const result = spawnSync("gh", ["secret", "set", name], {
    input: value,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `failed to set secret ${name}`);
  }
}

function ghSetVariable(name, value) {
  const result = spawnSync("gh", ["variable", "set", name, "--body", value], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `failed to set variable ${name}`);
  }
}

const SECRET_MAP = [
  ["SUPABASE_ACCESS_TOKEN", (env) => env.SUPABASE_ACCESS_TOKEN?.trim()],
  ["SUPABASE_PROJECT_REF", (env) => getProjectRef(env)],
  ["SUPABASE_DB_URL", (env) => buildDbUrl(env)],
  ["VITE_SUPABASE_URL", (env) => env.VITE_SUPABASE_URL?.trim()],
  ["SUPABASE_SERVICE_ROLE_KEY", async (env) => resolveServiceRoleKey(env)],
  ["INTERNAL_AUTOMATIONS_KEY", (env) => env.INTERNAL_AUTOMATIONS_KEY?.trim()],
  ["TENANT_FIXTURE_PASSWORD", (env) => env.TENANT_FIXTURE_PASSWORD?.trim()],
  ["OPS_ALERT_WEBHOOK_URL", (env) => env.OPS_ALERT_WEBHOOK_URL?.trim()],
];

const VARIABLE_MAP = [
  [
    "DAST_TARGET_URL",
    (env) =>
      env.VERCEL_PUBLIC_APP_URL?.trim() ||
      env.VITE_PUBLIC_APP_URL?.trim() ||
      "https://propertyhub-2-0-ecru.vercel.app",
  ],
  ["DAST_ALLOW_NON_STAGING", () => "true"],
];

async function run() {
  spawnSync("gh", ["auth", "status"], { stdio: "inherit" });
  if (spawnSync("gh", ["auth", "status"], { encoding: "utf8" }).status !== 0) {
    process.exit(1);
  }

  const env = loadProjectEnv();
  const set = [];
  const skipped = [];

  for (const [name, resolve] of SECRET_MAP) {
    const value = await Promise.resolve(resolve(env));
    if (!value) {
      skipped.push(name);
      continue;
    }
    ghSetSecret(name, value);
    set.push(name);
  }

  for (const [name, resolve] of VARIABLE_MAP) {
    const value = resolve(env);
    if (!value) {
      skipped.push(name);
      continue;
    }
    ghSetVariable(name, value);
    set.push(`var:${name}`);
  }

  console.log("GitHub sync complete.");
  if (set.length) console.log("Updated:", set.join(", "));
  if (skipped.length) console.log("Skipped (missing in .env):", skipped.join(", "));
  if (skipped.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    console.log(
      "Add SUPABASE_SERVICE_ROLE_KEY to root .env (Supabase → Settings → API → service_role), then rerun.",
    );
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
