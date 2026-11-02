#!/usr/bin/env node
/**
 * Print GitHub Actions secret names and values for Google Play CI upload.
 * Run locally only — never commit output.
 *
 *   node scripts/play/print-play-github-secrets.mjs
 *
 * Requires play-keystores/*.keystore (or PLAY_* in .env).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadProjectEnv } = require("../load-project-env.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const env = loadProjectEnv();
for (const [k, v] of Object.entries(env)) {
  if (v != null && process.env[k] == null) process.env[k] = String(v);
}

const defaultPass = process.env.PLAY_LOCAL_KEYSTORE_PASSWORD || "BaytMiftah-Local-Upload-2026";

function b64File(filePath) {
  return fs.readFileSync(filePath).toString("base64");
}

function line(name, value) {
  console.log(`\n${name}=\n${value}`);
}

console.log("=== Add these in GitHub: Settings → Secrets and variables → Actions ===\n");
console.log("(VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are already set on your repo.)");

if (process.env.PLAY_SERVICE_ACCOUNT_JSON?.trim()) {
  line("PLAY_SERVICE_ACCOUNT_JSON", process.env.PLAY_SERVICE_ACCOUNT_JSON.trim());
} else {
  console.log("\nPLAY_SERVICE_ACCOUNT_JSON — paste full JSON from Google Cloud service account (Play Console invite).");
}

for (const [variant, file, alias] of [
  ["CONSUMER", "consumer-upload.keystore", "baytmiftah-consumer"],
  ["WORKSPACE", "workspace-upload.keystore", "baytmiftah-workspace"],
]) {
  const b64Env = process.env[`PLAY_${variant}_KEYSTORE_B64`]?.trim();
  const keystorePath = path.join(ROOT, "play-keystores", file);
  if (b64Env) {
    line(`PLAY_${variant}_KEYSTORE_B64`, b64Env);
  } else if (fs.existsSync(keystorePath)) {
    line(`PLAY_${variant}_KEYSTORE_B64`, b64File(keystorePath));
  } else {
    console.log(`\nPLAY_${variant}_KEYSTORE_B64 — missing (no .env and no ${keystorePath})`);
  }
  const storePass = process.env[`PLAY_${variant}_KEYSTORE_PASSWORD`] || defaultPass;
  const keyAlias = process.env[`PLAY_${variant}_KEY_ALIAS`] || alias;
  const keyPass = process.env[`PLAY_${variant}_KEY_PASSWORD`] || storePass;
  line(`PLAY_${variant}_KEYSTORE_PASSWORD`, storePass);
  line(`PLAY_${variant}_KEY_ALIAS`, keyAlias);
  line(`PLAY_${variant}_KEY_PASSWORD`, keyPass);
}

console.log("\n=== Then: Actions → Google Play Upload → Run workflow (track: internal, version: 1.0.0) ===\n");
