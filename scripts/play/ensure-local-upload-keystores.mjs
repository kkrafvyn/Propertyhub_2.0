#!/usr/bin/env node
/**
 * Create upload keystores under play-keystores/ when PLAY_*_KEYSTORE_B64 is not set.
 * For local AAB builds only — use the same upload key registered in Play Console for production.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = path.join(ROOT, "play-keystores");

const specs = [
  {
    playVariant: "consumer",
    file: "consumer-upload.keystore",
    alias: "baytmiftah-consumer",
    envPrefix: "PLAY_CONSUMER_",
  },
  {
    playVariant: "workspace",
    file: "workspace-upload.keystore",
    alias: "baytmiftah-workspace",
    envPrefix: "PLAY_WORKSPACE_",
  },
];

function hasRemoteSigning(prefix) {
  return Boolean(process.env[`${prefix}KEYSTORE_B64`]?.trim());
}

function ensureKeystore({ file, alias }) {
  fs.mkdirSync(OUT_DIR, { recursive: true, mode: 0o700 });
  const keystorePath = path.join(OUT_DIR, file);
  if (fs.existsSync(keystorePath)) return keystorePath;

  const storePass = process.env.PLAY_LOCAL_KEYSTORE_PASSWORD || "BaytMiftah-Local-Upload-2026";
  const dname =
    process.env.PLAY_LOCAL_KEYSTORE_DNAME ||
    "CN=BaytMiftah Upload, OU=Mobile, O=BaytMiftah, L=Accra, ST=Greater Accra, C=GH";

  console.warn(
    `\n⚠️  Creating local upload keystore: ${keystorePath}\n` +
      "   Use only if this matches your Play Console upload key, or for first-time internal testing.\n" +
      "   Set PLAY_*_KEYSTORE_B64 in .env for your real upload keys.\n",
  );

  execFileSync(
    "keytool",
    [
      "-genkeypair",
      "-v",
      "-storetype",
      "PKCS12",
      "-keystore",
      keystorePath,
      "-alias",
      alias,
      "-keyalg",
      "RSA",
      "-keysize",
      "2048",
      "-validity",
      "10000",
      "-storepass",
      storePass,
      "-keypass",
      storePass,
      "-dname",
      dname,
    ],
    { stdio: "inherit" },
  );

  return keystorePath;
}

for (const spec of specs) {
  if (hasRemoteSigning(spec.envPrefix)) continue;
  ensureKeystore(spec);
}
