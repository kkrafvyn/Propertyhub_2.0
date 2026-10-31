#!/usr/bin/env node
/**
 * Build signed release AAB for consumer or business Android app.
 * Usage: node scripts/android-bundle-release.mjs [consumer|business]
 *
 * Requires ANDROID_KEYSTORE_* or PLAY_<VARIANT>_KEYSTORE_B64 (+ password, alias).
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadProjectEnv } = require("./load-project-env.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const loadedEnv = loadProjectEnv();
for (const [key, value] of Object.entries(loadedEnv)) {
  if (value != null && String(value).trim() && process.env[key] == null) {
    process.env[key] = String(value);
  }
}

const variant = process.argv[2] || "consumer";
const playVariant = variant === "business" ? "workspace" : "consumer";
if (!["consumer", "business"].includes(variant)) {
  console.error("Usage: node scripts/android-bundle-release.mjs [consumer|business]");
  process.exit(1);
}

const androidDir = variant === "business" ? "android-business" : "android";
const gradlew = path.join(ROOT, androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");

if (!fs.existsSync(gradlew)) {
  console.error(`Missing ${androidDir}/ — run npm run mobile:${variant === "business" ? "business" : "consumer"}:sync first`);
  process.exit(1);
}

process.env.PLAY_VARIANT = playVariant;
execFileSync(process.execPath, ["scripts/play/ensure-local-upload-keystores.mjs"], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});
const signingExports = execFileSync(process.execPath, ["scripts/play/prepare-android-signing.mjs"], {
  cwd: ROOT,
  encoding: "utf8",
  env: process.env,
});

for (const line of signingExports.split("\n")) {
  const m = line.match(/^export (\w+)='(.*)'$/);
  if (m) process.env[m[1]] = m[2].replace(/'\\''/g, "'");
}

const versionName = process.env.APP_VERSION || "1.0.0";
const versionCode = process.env.BUILD_NUMBER || "1";

process.env.MOBILE_SYNC_SKIP_PROVISION = "1";
execFileSync(process.execPath, ["scripts/mobile-sync.mjs", variant], { cwd: ROOT, stdio: "inherit", env: process.env });

const gradleCmd =
  process.platform === "win32"
    ? `"${gradlew}" bundleRelease -PplayVersionCode=${versionCode} "-PplayVersionName=${versionName}"`
    : `"${gradlew}" bundleRelease -PplayVersionCode=${versionCode} -PplayVersionName=${versionName}`;
const result = spawnSync(gradleCmd, {
  cwd: path.join(ROOT, androidDir),
  stdio: "inherit",
  env: process.env,
  shell: true,
});

if (result.status !== 0) process.exit(result.status ?? 1);

const aab = path.join(ROOT, androidDir, "app/build/outputs/bundle/release/app-release.aab");
console.log(`\n✅ Release AAB: ${aab}`);
