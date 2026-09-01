#!/usr/bin/env node
/**
 * Backup restore drill — validates the latest (or specified) backup without mutating production.
 *
 * Usage:
 *   npm run backup:restore-drill
 *   npm run backup:restore-drill -- --path backups/2026-09-01-full
 *   npm run backup:restore-drill -- --verify-db   # row-count spot check (requires DB env)
 */
import fs from "node:fs";
import path from "node:path";
import { loadProjectEnv } from "../load-project-env.mjs";
import { BACKUPS_ROOT, PROJECT_ROOT } from "./lib/paths.mjs";

function parseArgs(argv) {
  const pathArg = argv.find((arg) => arg.startsWith("--path="))?.split("=")[1];
  return {
    backupPath: pathArg ? path.resolve(PROJECT_ROOT, pathArg) : null,
    verifyDb: argv.includes("--verify-db"),
  };
}

function findLatestBackupDir() {
  if (!fs.existsSync(BACKUPS_ROOT)) return null;
  const entries = fs
    .readdirSync(BACKUPS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(BACKUPS_ROOT, entry.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return entries[0] || null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function verifyDatabaseCounts(manifestTables) {
  const pg = (await import("pg")).default;
  const { getDbConfig } = await import("./lib/db-config.mjs");
  const client = new pg.Client(getDbConfig());
  await client.connect();

  const mismatches = [];
  try {
    for (const { table, rows } of manifestTables) {
      const { rows: countRows } = await client.query(
        `SELECT COUNT(*)::int AS count FROM public."${table}"`,
      );
      const liveCount = countRows[0]?.count ?? 0;
      if (typeof rows === "number" && liveCount < rows) {
        mismatches.push({ table, backupRows: rows, liveRows: liveCount });
      }
    }
  } finally {
    await client.end();
  }

  return mismatches;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadProjectEnv();

  const backupDir = args.backupPath || findLatestBackupDir();
  if (!backupDir || !fs.existsSync(backupDir)) {
    throw new Error("No backup directory found. Run `npm run backup` first.");
  }

  const manifestPath = path.join(backupDir, "backup-manifest.json");
  const dbManifestPath = path.join(backupDir, "database", "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing backup manifest: ${manifestPath}`);
  }

  const manifest = readJson(manifestPath);
  const dbManifest = fs.existsSync(dbManifestPath) ? readJson(dbManifestPath) : null;
  const dataDir = path.join(backupDir, "database", "data");

  const checks = {
    backupDir: path.relative(PROJECT_ROOT, backupDir),
    createdAt: manifest.createdAt,
    tablesValidated: 0,
    rowsValidated: 0,
    jsonErrors: [],
    dbSpotCheck: null,
  };

  if (!dbManifest?.tables?.length) {
    throw new Error("Backup is missing database/table manifest");
  }

  for (const entry of dbManifest.tables) {
    const jsonPath = path.join(dataDir, `${entry.table}.json`);
    if (!fs.existsSync(jsonPath)) {
      checks.jsonErrors.push(`Missing JSON export for ${entry.table}`);
      continue;
    }

    const rows = readJson(jsonPath);
    if (!Array.isArray(rows)) {
      checks.jsonErrors.push(`${entry.table}.json is not an array`);
      continue;
    }

    if (rows.length !== entry.rows) {
      checks.jsonErrors.push(`${entry.table}: manifest=${entry.rows}, file=${rows.length}`);
    }

    checks.tablesValidated += 1;
    checks.rowsValidated += rows.length;
  }

  if (checks.jsonErrors.length > 0) {
    console.error("\nRestore drill FAILED — backup integrity issues:");
    for (const issue of checks.jsonErrors) console.error(`  - ${issue}`);
    process.exit(1);
  }

  if (args.verifyDb) {
    const mismatches = await verifyDatabaseCounts(dbManifest.tables);
    checks.dbSpotCheck = {
      checked: dbManifest.tables.length,
      mismatches,
    };

    if (mismatches.length > 0) {
      console.error("\nRestore drill FAILED — live DB row counts lower than backup:");
      for (const row of mismatches) {
        console.error(`  - ${row.table}: backup=${row.backupRows}, live=${row.liveRows}`);
      }
      process.exit(1);
    }
  }

  console.log("\n✓ Backup restore drill passed");
  console.log(`  Backup: ${checks.backupDir}`);
  console.log(`  Created: ${checks.createdAt}`);
  console.log(`  Tables validated: ${checks.tablesValidated}`);
  console.log(`  Rows validated: ${checks.rowsValidated}`);
  if (args.verifyDb) {
    console.log(`  DB spot-check tables: ${checks.dbSpotCheck.checked}`);
  } else {
    console.log("  Tip: add --verify-db to compare live DB row counts against backup manifest");
  }
  console.log("");
}

main().catch((error) => {
  console.error("\nRestore drill failed:", error.message || error);
  process.exit(1);
});
