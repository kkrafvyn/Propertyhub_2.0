#!/usr/bin/env node
/**
 * Export public schema table data to JSON (+ SQL inserts) without pg_dump.
 * Schema definitions are preserved in supabase/migrations/ (copied into backup).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { getDbConfig } from "./lib/db-config.mjs";
import { PROJECT_ROOT, writeJson } from "./lib/paths.mjs";

const EXCLUDED_TABLES = new Set([
  "schema_migrations",
]);

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function rowsToInsertSql(table, rows) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  const header = `INSERT INTO public."${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES\n`;
  const values = rows
    .map((row) => {
      const tuple = columns.map((col) => sqlLiteral(row[col])).join(", ");
      return `  (${tuple})`;
    })
    .join(",\n");
  return `${header}${values};\n`;
}

async function listPublicTables(client) {
  const { rows } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return rows.map((row) => row.table_name).filter((name) => !EXCLUDED_TABLES.has(name));
}

export async function backupDatabase(outputDir) {
  const dataDir = path.join(outputDir, "database", "data");
  const sqlDir = path.join(outputDir, "database", "sql");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(sqlDir, { recursive: true });

  const client = new pg.Client(getDbConfig());
  await client.connect();

  const manifest = {
    exportedAt: new Date().toISOString(),
    tables: [],
  };

  try {
    const tables = await listPublicTables(client);

    for (const table of tables) {
      const { rows } = await client.query(`SELECT * FROM public."${table}"`);
      const jsonPath = path.join(dataDir, `${table}.json`);
      fs.writeFileSync(jsonPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");

      if (rows.length > 0) {
        fs.writeFileSync(path.join(sqlDir, `${table}.sql`), rowsToInsertSql(table, rows), "utf8");
      }

      manifest.tables.push({ table, rows: rows.length });
      console.log(`  ✓ ${table} (${rows.length} rows)`);
    }

    const migrationResult = await client.query(`
      SELECT version, name
      FROM supabase_migrations.schema_migrations
      ORDER BY version
    `).catch(() => ({ rows: [] }));

    manifest.migrations = migrationResult.rows;
    writeJson(path.join(outputDir, "database", "manifest.json"), manifest);

    const migrationsSrc = path.join(PROJECT_ROOT, "supabase", "migrations");
    const migrationsDst = path.join(outputDir, "database", "migrations");
    fs.cpSync(migrationsSrc, migrationsDst, { recursive: true });

    return manifest;
  } finally {
    await client.end();
  }
}

async function main() {
  const outputDir = process.argv[2];
  if (!outputDir) {
    console.error("Usage: node scripts/backup/backup-database.mjs <output-dir>");
    process.exit(1);
  }

  console.log("Exporting database tables...");
  const manifest = await backupDatabase(outputDir);
  console.log(`Database backup complete: ${manifest.tables.length} tables`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  void main();
}
