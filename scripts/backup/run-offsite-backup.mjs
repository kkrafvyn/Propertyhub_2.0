#!/usr/bin/env node
/**
 * Full offsite backup pipeline:
 *   1. Local full backup (DB + storage + configuration inventory)
 *   2. Restore drill integrity check
 *   3. Encrypted upload to AWS S3
 *   4. Retention cleanup
 *
 * Usage:
 *   npm run backup:offsite
 *   npm run backup:offsite -- --tier weekly
 *   npm run backup:offsite -- --db-only
 *   npm run backup:pre-migration
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadProjectEnv } from "../load-project-env.mjs";
import { backupDatabase } from "./backup-database.mjs";
import { backupStorage } from "./backup-storage.mjs";
import { snapshotConfigInventory } from "./snapshot-config.mjs";
import { createBackupDir, PROJECT_ROOT, writeJson } from "./lib/paths.mjs";
import { getProjectRef } from "./lib/db-config.mjs";
import { uploadBackupDirectory } from "./lib/s3-upload.mjs";
import { resolveAutoTier } from "./lib/retention.mjs";
import { CRITICAL_TABLES } from "./lib/critical-tables.mjs";

function parseArgs(argv) {
  return {
    tier:
      argv.find((arg) => arg.startsWith("--tier="))?.split("=")[1] ||
      (argv.includes("--tier") ? argv[argv.indexOf("--tier") + 1] : null),
    autoTier: argv.includes("--auto-tier"),
    dbOnly: argv.includes("--db-only"),
    storageOnly: argv.includes("--storage-only"),
    skipDrill: argv.includes("--skip-drill"),
    skipUpload: argv.includes("--skip-upload"),
    skipRetention: argv.includes("--skip-retention"),
    verifyDb: argv.includes("--verify-db"),
    label:
      argv.find((arg) => arg.startsWith("--label="))?.split("=")[1] ||
      (argv.includes("--label") ? argv[argv.indexOf("--label") + 1] : "full"),
  };
}

function runRestoreDrill(backupDir, verifyDb = false) {
  const drillArgs = ["scripts/backup/restore-drill.mjs", "--path", backupDir, "--write-evidence"];
  if (verifyDb) drillArgs.push("--verify-db");

  const result = spawnSync(process.execPath, drillArgs, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error("Restore drill failed — offsite upload aborted");
  }
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
  const tier = args.tier || (args.autoTier ? resolveAutoTier() : "daily");
  const outputDir = createBackupDir(`${args.label}_${tier}`);
  const evidencePath = path.join(PROJECT_ROOT, 'backups', 'latest-run.json');
  const evidence = { status: 'running', startedAt: new Date().toISOString(), database: false, storage: false, offsite: false, integrityVerified: false, databaseRestored: false };
  writeJson(evidencePath, evidence);

  console.log(`\nBaytMiftah offsite backup`);
  console.log(`  Local dir: ${path.relative(PROJECT_ROOT, outputDir)}`);
  console.log(`  Tier: ${tier}\n`);

  const summary = {
    createdAt: new Date().toISOString(),
    projectRef: getProjectRef(env),
    tier,
    outputDir: path.relative(PROJECT_ROOT, outputDir),
    database: null,
    storage: null,
    configuration: null,
    criticalTablesPresent: [],
    offsite: null,
  };

  if (!args.storageOnly) {
    console.log("[1/5] Database");
    summary.database = await backupDatabase(outputDir);
    summary.criticalTablesPresent = CRITICAL_TABLES.filter((table) =>
      summary.database.tables.some((entry) => entry.table === table),
    );
  }

  if (!args.dbOnly) {
    console.log("\n[2/5] Storage");
    summary.storage = await backupStorage(outputDir);
  }

  console.log("\n[3/5] Configuration inventory");
  summary.configuration = snapshotConfigInventory(outputDir);
  await copyEnvTemplate(outputDir);
  writeJson(path.join(outputDir, "backup-manifest.json"), summary);

  if (!args.skipDrill) {
    console.log("\n[4/5] Restore drill (local integrity)");
    runRestoreDrill(outputDir, args.verifyDb);
  } else {
    console.log("\n[4/5] Restore drill skipped");
  }

  if (!args.skipUpload) {
    console.log("\n[5/5] Encrypted S3 upload");
    summary.offsite = await uploadBackupDirectory(outputDir, tier);
    writeJson(path.join(outputDir, "backup-manifest.json"), summary);
  } else {
    console.log("\n[5/5] S3 upload skipped");
  }

  if (!args.skipRetention && !args.skipUpload) {
    const retention = spawnSync(
      process.execPath,
      ["scripts/backup/apply-retention.mjs"],
      { cwd: PROJECT_ROOT, stdio: "inherit", env: process.env },
    );
    if (retention.status !== 0) {
      throw new Error("Retention cleanup failed after upload");
    }
  }

  console.log("\n✓ Offsite backup pipeline complete");
  console.log(`  Critical tables in backup: ${summary.criticalTablesPresent.length}/${CRITICAL_TABLES.length}`);
  if (summary.offsite) {
    console.log(`  S3: s3://${summary.offsite.bucket}/${summary.offsite.prefix}`);
  }
  console.log("");
  writeJson(evidencePath, { ...evidence,
    status: args.skipUpload || args.skipDrill || args.storageOnly || args.dbOnly ? 'partial' : 'completed',
    completedAt: new Date().toISOString(), database: Boolean(summary.database), storage: Boolean(summary.storage),
    offsite: Boolean(summary.offsite), integrityVerified: !args.skipDrill,
    backupDir: path.relative(PROJECT_ROOT, outputDir),
  });
}

main().catch((error) => {
  writeJson(path.join(PROJECT_ROOT, 'backups', 'latest-run.json'), { status: 'failed', checkedAt: new Date().toISOString(), reason: 'Backup pipeline failed; inspect protected runner logs' });
  console.error("\nOffsite backup failed:", error.message || error);
  process.exit(1);
});
