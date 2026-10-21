#!/usr/bin/env node
/**
 * Decode upload keystore from env and export ANDROID_KEYSTORE_* for Gradle.
 * Prefix env vars with PLAY_<VARIANT>_ e.g. PLAY_CONSUMER_KEYSTORE_B64.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

const b64 = required(`${prefix}KEYSTORE_B64`);
const storePassword = required(`${prefix}KEYSTORE_PASSWORD`);
const keyAlias = required(`${prefix}KEY_ALIAS`);
const keyPassword = required(`${prefix}KEY_PASSWORD`);

const dir = process.env.PLAY_SIGNING_DIR || path.join(os.tmpdir(), `play-signing-${variant.toLowerCase()}`);
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

const keystorePath = path.join(dir, "upload.keystore");
fs.writeFileSync(keystorePath, Buffer.from(b64, "base64"), { mode: 0o600 });

process.stdout.write(
  [
    `export ANDROID_KEYSTORE_FILE='${keystorePath.replace(/'/g, "'\\''")}'`,
    `export ANDROID_KEYSTORE_PASSWORD='${storePassword.replace(/'/g, "'\\''")}'`,
    `export ANDROID_KEY_ALIAS='${keyAlias.replace(/'/g, "'\\''")}'`,
    `export ANDROID_KEY_PASSWORD='${keyPassword.replace(/'/g, "'\\''")}'`,
  ].join("\n") + "\n",
);
