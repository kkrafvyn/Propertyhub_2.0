#!/usr/bin/env node
/**
 * Decode upload keystore from env and export ANDROID_KEYSTORE_* for Gradle.
 * Prefix env vars with PLAY_<VARIANT>_ e.g. PLAY_CONSUMER_KEYSTORE_B64.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const variant = (process.env.PLAY_VARIANT || "consumer").toUpperCase();
const prefix = `PLAY_${variant}_`;

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return value;
}

const b64 = process.env[`${prefix}KEYSTORE_B64`]?.trim();
let keystorePath;
let storePassword;
let keyAlias;
let keyPassword;

if (b64) {
  storePassword = required(`${prefix}KEYSTORE_PASSWORD`);
  keyAlias = required(`${prefix}KEY_ALIAS`);
  keyPassword = required(`${prefix}KEY_PASSWORD`);
  const dir = process.env.PLAY_SIGNING_DIR || path.join(os.tmpdir(), `play-signing-${variant.toLowerCase()}`);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  keystorePath = path.join(dir, "upload.keystore");
  fs.writeFileSync(keystorePath, Buffer.from(b64, "base64"), { mode: 0o600 });
} else {
  const localFile =
    variant === "WORKSPACE" ? "workspace-upload.keystore" : "consumer-upload.keystore";
  keystorePath = path.join(ROOT, "play-keystores", localFile);
  if (!fs.existsSync(keystorePath)) {
    console.error(
      `Missing ${prefix}KEYSTORE_B64 and local keystore ${keystorePath}. ` +
        "Run: node scripts/play/ensure-local-upload-keystores.mjs",
    );
    process.exit(1);
  }
  storePassword =
    process.env[`${prefix}KEYSTORE_PASSWORD`] ||
    process.env.PLAY_LOCAL_KEYSTORE_PASSWORD ||
    "BaytMiftah-Local-Upload-2026";
  keyAlias =
    process.env[`${prefix}KEY_ALIAS`] ||
    (variant === "WORKSPACE" ? "baytmiftah-workspace" : "baytmiftah-consumer");
  keyPassword =
    process.env[`${prefix}KEY_PASSWORD`] ||
    process.env.PLAY_LOCAL_KEYSTORE_PASSWORD ||
    storePassword;
}

process.stdout.write(
  [
    `export ANDROID_KEYSTORE_FILE='${keystorePath.replace(/'/g, "'\\''")}'`,
    `export ANDROID_KEYSTORE_PASSWORD='${storePassword.replace(/'/g, "'\\''")}'`,
    `export ANDROID_KEY_ALIAS='${keyAlias.replace(/'/g, "'\\''")}'`,
    `export ANDROID_KEY_PASSWORD='${keyPassword.replace(/'/g, "'\\''")}'`,
  ].join("\n") + "\n",
);
