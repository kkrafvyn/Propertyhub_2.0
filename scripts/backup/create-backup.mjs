#!/usr/bin/env node
/**
 * Full BaytMiftah backup: database tables + storage files + manifest.
 *
 * Usage:
 *   npm run backup
 *   npm run backup -- --db-only
 *   npm run backup -- --storage-only
 */
import fs from "node:fs";
import path from "node:path";
import { loadProjectEnv } from "../load-project-env.mjs";
import { getProjectRef } from "./lib/db-config.mjs";
import { backupDatabase } from "./backup-database.mjs";
import { backupStorage } from "./backup-storage.mjs";
import { createBackupDir, PROJECT_ROOT, writeJson } from "./lib/paths.mjs";

function parseArgs(argv) {
  return {
    dbOnly: argv.includes("--db-only"),
    storageOnly: argv.includes("--storage-only"),
    label: argv.find((arg) => arg.startsWith("--label="))?.split("=")[1] || "full",
  };
}

async function copyEnvTemplate(outputDir) {
  const examplePath = path.join(PROJECT_ROOT, ".env.example");
  const dest = path.join(outputDir, "env.example.snapshot");
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, dest);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadProjectEnv();
  const outputDir = createBackupDir(args.label);

  console.log(`\nBaytMiftah backup → ${path.relative(PROJECT_ROOT, outputDir)}\n`);

  const summary = {
    createdAt: new Date().toISOString(),
    projectRef: getProjectRef(env),
    outputDir: path.relative(PROJECT_ROOT, outputDir),
    database: null,
    storage: null,
  };

  if (!args.storageOnly) {
    console.log("[1/2] Database");
    summary.database = await backupDatabase(outputDir);
  }

  if (!args.dbOnly) {
    console.log("\n[2/2] Storage");
    summary.storage = await backupStorage(outputDir);
  }

  await copyEnvTemplate(outputDir);
  writeJson(path.join(outputDir, "backup-manifest.json"), summary);

  console.log("\n✓ Backup complete");
  console.log(`  Location: ${outputDir}`);
  console.log("  Restore guide: docs/setup/BACKUP_GUIDE.md\n");
}

main().catch((error) => {
  console.error("\nBackup failed:", error.message || error);
  process.exit(1);
});
