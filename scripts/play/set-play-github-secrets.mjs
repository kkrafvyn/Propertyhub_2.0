#!/usr/bin/env node
/**
 * Push Google Play CI secrets from .env to GitHub Actions (gh CLI).
 * Does not print secret values. Requires: gh auth login (workflow scope).
 *
 *   node scripts/play/set-play-github-secrets.mjs
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadProjectEnv } = require("../load-project-env.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const env = loadProjectEnv();

const NAMES = [
  "PLAY_SERVICE_ACCOUNT_JSON",
  "PLAY_CONSUMER_KEYSTORE_B64",
  "PLAY_CONSUMER_KEYSTORE_PASSWORD",
  "PLAY_CONSUMER_KEY_ALIAS",
  "PLAY_CONSUMER_KEY_PASSWORD",
  "PLAY_WORKSPACE_KEYSTORE_B64",
  "PLAY_WORKSPACE_KEYSTORE_PASSWORD",
  "PLAY_WORKSPACE_KEY_ALIAS",
  "PLAY_WORKSPACE_KEY_PASSWORD",
];

let set = 0;
let skipped = 0;

for (const name of NAMES) {
  const value = env[name]?.trim();
  if (!value) {
    console.warn(`skip ${name} (missing in .env)`);
    skipped += 1;
    continue;
  }
  execFileSync("gh", ["secret", "set", name], {
    input: value,
    cwd: ROOT,
    stdio: ["pipe", "pipe", "inherit"],
  });
  console.log(`ok ${name}`);
  set += 1;
}

console.log(`\nDone: ${set} secret(s) updated, ${skipped} skipped.`);
if (skipped > 0 && !env.PLAY_SERVICE_ACCOUNT_JSON?.trim()) {
  console.log(
    "\nPLAY_SERVICE_ACCOUNT_JSON: create in Google Cloud → IAM → Service account → Keys (JSON),",
  );
  console.log(
    "enable Google Play Android Developer API, invite the account in Play Console (Release manager),",
  );
  console.log("then add PLAY_SERVICE_ACCOUNT_JSON to .env or: gh secret set PLAY_SERVICE_ACCOUNT_JSON < key.json");
}
