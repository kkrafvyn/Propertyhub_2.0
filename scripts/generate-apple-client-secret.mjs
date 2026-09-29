#!/usr/bin/env node

/**
 * Generate the Apple Sign In client secret JWT for Supabase Auth.
 *
 * Supabase → Authentication → Providers → Apple → "Secret Key" must be this JWT,
 * NOT the raw .p8 private key contents.
 *
 * Required env (in .env) or flags:
 *   APPLE_TEAM_ID          Apple Developer Team ID (10 chars)
 *   APPLE_KEY_ID           Key ID of the Sign in with Apple key
 *   APPLE_SERVICES_ID      Services ID / Client ID (e.g. com.baymiftah.web)
 *   APPLE_PRIVATE_KEY_PATH Path to AuthKey_XXXXX.p8 (never commit this file)
 *
 * Optional:
 *   APPLE_JWT_TTL_SECONDS  Lifetime (default ~6 months, Apple max ~15777000)
 *
 * Usage:
 *   npm run apple:client-secret
 *   node scripts/generate-apple-client-secret.mjs --print
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadProjectEnv } = require("./load-project-env.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = loadProjectEnv();

const args = new Set(process.argv.slice(2));
const printOnly = args.has("--print") || args.has("-p");

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

const teamId = (argValue("--team-id") || env.APPLE_TEAM_ID || "").trim();
const keyId = (argValue("--key-id") || env.APPLE_KEY_ID || "").trim();
const clientId = (
  argValue("--services-id") ||
  env.APPLE_SERVICES_ID ||
  env.APPLE_CLIENT_ID ||
  ""
).trim();
const keyPathRaw =
  argValue("--key") || env.APPLE_PRIVATE_KEY_PATH || env.APPLE_P8_PATH || "";
const ttlSeconds = Number(
  argValue("--ttl") || env.APPLE_JWT_TTL_SECONDS || 15777000,
);

function fail(message) {
  console.error(`❌ ${message}`);
  console.error(`
Example .env entries:

  APPLE_TEAM_ID=AB12CD34EF
  APPLE_KEY_ID=XYZ123ABCD
  APPLE_SERVICES_ID=com.baymiftah.web
  APPLE_PRIVATE_KEY_PATH=./secrets/AuthKey_XYZ123ABCD.p8

Then:

  npm run apple:client-secret

Paste the printed JWT into Supabase → Auth → Providers → Apple → Secret Key.
Client ID in Supabase = APPLE_SERVICES_ID (Services ID).
`);
  process.exit(1);
}

if (!teamId) fail("Missing APPLE_TEAM_ID (Apple Team ID).");
if (!keyId) fail("Missing APPLE_KEY_ID (Sign in with Apple Key ID).");
if (!clientId) fail("Missing APPLE_SERVICES_ID (Services ID / Client ID).");
if (!keyPathRaw) fail("Missing APPLE_PRIVATE_KEY_PATH (path to .p8 file).");
if (!Number.isFinite(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 15777000) {
  fail("APPLE_JWT_TTL_SECONDS must be between 60 and 15777000 (~6 months).");
}

const keyPath = path.isAbsolute(keyPathRaw)
  ? keyPathRaw
  : path.resolve(ROOT, keyPathRaw);

if (!fs.existsSync(keyPath)) {
  fail(`Private key file not found: ${keyPath}`);
}

const privateKeyPem = fs.readFileSync(keyPath, "utf8");
if (!privateKeyPem.includes("PRIVATE KEY")) {
  fail("Key file does not look like an Apple .p8 PEM private key.");
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

const now = Math.floor(Date.now() / 1000);
const header = { alg: "ES256", kid: keyId };
const payload = {
  iss: teamId,
  iat: now,
  exp: now + ttlSeconds,
  aud: "https://appleid.apple.com",
  sub: clientId,
};

const unsigned = `${base64urlJson(header)}.${base64urlJson(payload)}`;

let privateKey;
try {
  privateKey = crypto.createPrivateKey(privateKeyPem);
} catch (err) {
  fail(`Could not parse .p8 key: ${err instanceof Error ? err.message : String(err)}`);
}

const signature = crypto.sign("sha256", Buffer.from(unsigned), {
  key: privateKey,
  dsaEncoding: "ieee-p1363",
});

const jwt = `${unsigned}.${signature.toString("base64url")}`;

const expiresAt = new Date((now + ttlSeconds) * 1000).toISOString();

if (!printOnly) {
  console.log("Apple client secret JWT generated for Supabase.\n");
  console.log(`  Client ID (Services ID): ${clientId}`);
  console.log(`  Team ID:                 ${teamId}`);
  console.log(`  Key ID:                  ${keyId}`);
  console.log(`  Expires:                 ${expiresAt}`);
  console.log("");
  console.log("Paste into Supabase → Authentication → Providers → Apple:");
  console.log("  • Client IDs  = Services ID (and bundle ID com.baymiftah.app if prompted)");
  console.log("  • Secret Key  = the JWT below (NOT the .p8 file contents)\n");
}

console.log(jwt);

if (!printOnly) {
  console.log("\n⚠️  This JWT expires ~every 6 months. Re-run this script and update Supabase before it expires.");
  console.log("   Never commit the .p8 key or this JWT to git.");
}
