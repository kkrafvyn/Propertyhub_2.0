#!/usr/bin/env node
/**
 * Wire PayAngels: root .env → supabase/.env.payments → Supabase Edge secrets + payment functions.
 * Client public key: run npm run vercel:env (or set VITE_PAYANGELS_PUBLIC_KEY on Vercel).
 *
 * Usage:
 *   npm run integrations:wire-payangels
 *   npm run integrations:wire-payangels -- --skip-deploy
 *   npm run integrations:wire-payangels -- --vercel
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadProjectEnv,
  PROJECT_ROOT,
  upsertRootEnv,
  writeServerSecretsFile,
} from "../load-project-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAYMENTS_ENV = path.join(PROJECT_ROOT, "supabase", ".env.payments");

const PAYMENT_FUNCTIONS = [
  "initialize-payangels-payment",
  "verify-payangels-payment",
  "initiate-payangels-refund",
  "initiate-payangels-disbursement",
  "payangels-webhook",
];

function validateArgs(args) {
  if (!args.every((arg) => typeof arg === "string" && !/[\r\n\0]/.test(arg))) {
    throw new Error("Invalid command argument");
  }
}

function runNpx(args, label) {
  validateArgs(args);
  console.log(`\n==> ${label}`);
  const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", args, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status ?? 1})`);
  }
}

function runNpm(args, label) {
  validateArgs(args);
  console.log(`\n==> ${label}`);
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status ?? 1})`);
  }
}

function requirePayangelsEnv(env) {
  const missing = [];
  if (!env.VITE_PAYANGELS_PUBLIC_KEY?.trim()) missing.push("VITE_PAYANGELS_PUBLIC_KEY");
  if (!env.PAYANGELS_SECRET_KEY?.trim()) missing.push("PAYANGELS_SECRET_KEY");
  if (!env.PAYANGELS_WEBHOOK_SECRET?.trim()) missing.push("PAYANGELS_WEBHOOK_SECRET");
  if (!env.PAYANGELS_API_BASE?.trim()) missing.push("PAYANGELS_API_BASE");
  if (!env.PAYANGELS_DISBURSEMENT_URL?.trim()) missing.push("PAYANGELS_DISBURSEMENT_URL");
  if (!/^(1|true|yes)$/i.test(env.PAYANGELS_API_CONTRACT_VERIFIED?.trim() || "")) {
    missing.push("PAYANGELS_API_CONTRACT_VERIFIED=true");
  }
  if (!/^(1|true|yes)$/i.test(env.PAYANGELS_LIVE_CERTIFIED?.trim() || "")) {
    missing.push("PAYANGELS_LIVE_CERTIFIED=true");
  }
  if (missing.length) {
    throw new Error(
      `Missing in root .env: ${missing.join(", ")}. See docs/API_KEYS_AND_INTEGRATIONS.md`,
    );
  }

  for (const key of ["PAYANGELS_API_BASE", "PAYANGELS_DISBURSEMENT_URL"]) {
    let url;
    try {
      url = new URL(env[key]);
    } catch {
      throw new Error(`${key} must be a valid HTTPS URL supplied by PayAngel`);
    }
    if (url.protocol !== "https:" || /(^|\.)paystack\.co$/i.test(url.hostname)) {
      throw new Error(`${key} must be a verified PayAngel HTTPS endpoint, not Paystack`);
    }
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const skipDeploy = args.has("--skip-deploy");
  const syncVercel = args.has("--vercel");

  let env = loadProjectEnv();
  requirePayangelsEnv(env);

  upsertRootEnv({ VITE_PAYANGELS_CONFIGURED: "false" });
  writeServerSecretsFile(PAYMENTS_ENV, env);
  console.log(`Wrote ${path.relative(PROJECT_ROOT, PAYMENTS_ENV)}`);

  const token = env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef =
    env.SUPABASE_PROJECT_REF?.trim() ||
    (env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0] : "");
  if (!token || !projectRef) {
    throw new Error("Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF (or VITE_SUPABASE_URL) in .env");
  }
  if (!/^[a-z0-9]{20}$/.test(projectRef)) {
    throw new Error("SUPABASE_PROJECT_REF must be a 20-character lowercase project reference");
  }
  process.env.SUPABASE_ACCESS_TOKEN = token;

  runNpx(["supabase", "login", "--token", token], "Supabase CLI login");
  runNpx(
    [
      "supabase",
      "secrets",
      "set",
      "--project-ref",
      projectRef,
      "--env-file",
      path.relative(PROJECT_ROOT, PAYMENTS_ENV),
      "--workdir",
      ".",
    ],
    "Upload PayAngels + server secrets to Supabase Edge",
  );

  if (!skipDeploy) {
    for (const name of PAYMENT_FUNCTIONS) {
      const deployArgs = [
        "supabase",
        "functions",
        "deploy",
        name,
        "--project-ref",
        projectRef,
        "--workdir",
        ".",
        "--use-api",
      ];
      if (name === "payangels-webhook") deployArgs.push("--no-verify-jwt");
      runNpx(deployArgs, `Deploy ${name}`);
    }
    upsertRootEnv({ VITE_PAYANGELS_CONFIGURED: "true" });
  } else {
    console.log("\nDeployment skipped; VITE_PAYANGELS_CONFIGURED remains false.");
  }

  if (syncVercel) {
    runNpm(["run", "vercel:env"], "Sync VITE_* (incl. PayAngels public key) to Vercel");
  } else {
    console.log("\nClient: set VITE_PAYANGELS_PUBLIC_KEY on Vercel, or run:");
    console.log("  npm run integrations:wire-payangels -- --vercel");
  }

  console.log("\nPayAngels server wiring complete.");
  console.log(
    `Webhook URL: https://${projectRef}.supabase.co/functions/v1/payangels-webhook`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
