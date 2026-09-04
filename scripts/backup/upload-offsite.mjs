#!/usr/bin/env node
/**
 * Upload an existing local backup directory to encrypted S3.
 *
 * Usage:
 *   npm run backup:upload -- --path backups/2026-09-03T..._full --tier daily
 */
import path from "node:path";
import fs from "node:fs";
import { loadProjectEnv } from "../load-project-env.mjs";
import { PROJECT_ROOT } from "./lib/paths.mjs";
import { uploadBackupDirectory } from "./lib/s3-upload.mjs";

function parseArgs(argv) {
  const tier =
    argv.find((arg) => arg.startsWith("--tier="))?.split("=")[1] ||
    (argv.includes("--tier") ? argv[argv.indexOf("--tier") + 1] : "daily");

  const pathArg =
    argv.find((arg) => arg.startsWith("--path="))?.split("=")[1] ||
    (argv.includes("--path") ? argv[argv.indexOf("--path") + 1] : null);

  return {
    tier,
    backupPath: pathArg ? path.resolve(PROJECT_ROOT, pathArg) : null,
  };
}

async function main() {
  loadProjectEnv();
  const args = parseArgs(process.argv.slice(2));

  if (!args.backupPath || !fs.existsSync(args.backupPath)) {
    throw new Error("Provide --path to an existing backup directory");
  }

  console.log(`\nUploading backup to S3 (tier: ${args.tier})...\n`);
  const manifest = await uploadBackupDirectory(args.backupPath, args.tier);

  console.log("\n✓ Offsite upload complete");
  console.log(`  Tier: ${manifest.tier}`);
  console.log(`  S3 prefix: s3://${manifest.bucket}/${manifest.prefix}`);
  console.log(`  Files: ${manifest.files}`);
  console.log(`  Bytes: ${manifest.totalBytes.toLocaleString()}`);
  console.log(`  Encryption: ${manifest.encryption}\n`);
}

main().catch((error) => {
  console.error("\nOffsite upload failed:", error.message || error);
  process.exit(1);
});
