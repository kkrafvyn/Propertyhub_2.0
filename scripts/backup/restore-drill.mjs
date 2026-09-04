#!/usr/bin/env node
/**
 * Backup restore drill — validates backup integrity without mutating production.
 *
 * Usage:
 *   npm run backup:restore-drill
 *   npm run backup:restore-drill -- --path backups/2026-09-01-full
 *   npm run backup:restore-drill -- --verify-db
 *   npm run backup:restore-drill -- --write-evidence
 */
import fs from "node:fs";
import path from "node:path";
import { loadProjectEnv } from "../load-project-env.mjs";
import { BACKUPS_ROOT, PROJECT_ROOT, writeJson } from "./lib/paths.mjs";
import { CRITICAL_TABLES, RELATIONSHIP_CHECKS } from "./lib/critical-tables.mjs";

function parseArgs(argv) {
  const equalsPath = argv.find((arg) => arg.startsWith("--path="))?.split("=")[1];
  const pathFlagIndex = argv.indexOf("--path");
  const spacedPath =
    pathFlagIndex >= 0 && argv[pathFlagIndex + 1] && !argv[pathFlagIndex + 1].startsWith("--")
      ? argv[pathFlagIndex + 1]
      : null;
  return {
    backupPath: equalsPath || spacedPath ? path.resolve(PROJECT_ROOT, equalsPath || spacedPath) : null,
    verifyDb: argv.includes("--verify-db"),
    writeEvidence: argv.includes("--write-evidence"),
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

async function verifyRelationships() {
  const pg = (await import("pg")).default;
  const { getDbConfig } = await import("./lib/db-config.mjs");
  const client = new pg.Client(getDbConfig());
  await client.connect();

  const issues = [];
  try {
    for (const check of RELATIONSHIP_CHECKS) {
      const { rows } = await client.query(check.sql);
      const orphans = rows[0]?.orphans ?? 0;
      if (orphans > 0) {
        issues.push({ check: check.name, orphans });
      }
    }
  } finally {
    await client.end();
  }

  return issues;
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
    verifiedAt: new Date().toISOString(),
    backupDir: path.relative(PROJECT_ROOT, backupDir),
    createdAt: manifest.createdAt,
    tablesValidated: 0,
    rowsValidated: 0,
    criticalTablesMissing: [],
    jsonErrors: [],
    dbSpotCheck: null,
    relationshipChecks: null,
    passed: true,
  };

  if (!dbManifest?.tables?.length) {
    throw new Error("Backup is missing database/table manifest");
  }

  const exportedTables = new Set(dbManifest.tables.map((entry) => entry.table));
  const isFixture = backupDir.includes(`${path.sep}fixtures${path.sep}`);

  if (!isFixture) {
    checks.criticalTablesMissing = CRITICAL_TABLES.filter((table) => !exportedTables.has(table));

    if (checks.criticalTablesMissing.length > 0) {
      console.error("\nRestore drill FAILED — critical tables missing from backup:");
      for (const table of checks.criticalTablesMissing) console.error(`  - ${table}`);
      process.exit(1);
    }
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

    const relationshipIssues = await verifyRelationships();
    checks.relationshipChecks = {
      checked: RELATIONSHIP_CHECKS.length,
      issues: relationshipIssues,
    };

    if (relationshipIssues.length > 0) {
      console.error("\nRestore drill FAILED — relationship integrity issues in live DB:");
      for (const issue of relationshipIssues) {
        console.error(`  - ${issue.check}: ${issue.orphans} orphan rows`);
      }
      process.exit(1);
    }
  }

  console.log("\n✓ Backup restore drill passed");
  console.log(`  Backup: ${checks.backupDir}`);
  console.log(`  Created: ${checks.createdAt}`);
  console.log(`  Tables validated: ${checks.tablesValidated}`);
  console.log(`  Rows validated: ${checks.rowsValidated}`);
  console.log(`  Critical tables: ${isFixture ? "skipped (fixture)" : `${CRITICAL_TABLES.length}/${CRITICAL_TABLES.length}`}`);
  if (args.verifyDb) {
    console.log(`  DB spot-check tables: ${checks.dbSpotCheck.checked}`);
    console.log(`  Relationship checks: ${checks.relationshipChecks.checked}`);
  } else {
    console.log("  Tip: add --verify-db to compare live DB counts and FK relationships");
  }
  console.log("");

  if (args.writeEvidence) {
    const evidencePath = path.join(PROJECT_ROOT, "scripts", "backup", "RESTORE_DRILL_EVIDENCE.json");
    const existing = fs.existsSync(evidencePath) ? readJson(evidencePath) : {};
    writeJson(evidencePath, {
      ...existing,
      lastVerifiedAt: checks.verifiedAt,
      liveBackup: {
        path: checks.backupDir,
        tablesValidated: checks.tablesValidated,
        rowsValidated: checks.rowsValidated,
        criticalTables: CRITICAL_TABLES.length,
        dbSpotCheck: Boolean(args.verifyDb),
        relationshipChecks: Boolean(args.verifyDb),
      },
    });
  }
}

main().catch((error) => {
  console.error("\nRestore drill failed:", error.message || error);
  process.exit(1);
});
