#!/usr/bin/env node
/**
 * Reset public schema and migration history, then apply all local SQL migrations.
 * Use when the remote DB schema does not match this repository (legacy project data).
 *
 * Usage:
 *   node scripts/resetAndApplySchema.mjs --confirm
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";
import { verifiedDatabaseUrl } from "./secure-db-url.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function getDbConfig() {
  const env = {
    ...loadEnvFile(path.join(projectRoot, ".env")),
    ...loadEnvFile(path.join(projectRoot, "supabase", ".env.local")),
    ...process.env,
  };

  const ref = env.SUPABASE_PROJECT_REF ||
    (env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0] : "");
  const allowedRef = String(env.SUPABASE_RESET_ALLOWED_PROJECT_REF || "").trim();
  const productionRef = String(env.SUPABASE_PRODUCTION_PROJECT_REF || "").trim();
  if (env.SUPABASE_RESET_ENV !== "development") {
    throw new Error("Refusing schema reset: set SUPABASE_RESET_ENV=development for a non-production project");
  }
  if (!productionRef) {
    throw new Error("Refusing schema reset: set SUPABASE_PRODUCTION_PROJECT_REF so the production target can be denied");
  }
  if (!ref || !allowedRef || ref !== allowedRef || ref === productionRef) {
    throw new Error("Refusing schema reset: project ref must exactly match SUPABASE_RESET_ALLOWED_PROJECT_REF and differ from the production project");
  }

  if (env.SUPABASE_DB_URL) {
    const target = new URL(env.SUPABASE_DB_URL);
    if (["localhost", "127.0.0.1", "::1"].includes(target.hostname)) {
      if (ref !== "local" || allowedRef !== "local") {
        throw new Error("Local database resets require SUPABASE_PROJECT_REF=local and SUPABASE_RESET_ALLOWED_PROJECT_REF=local");
      }
    } else if (!target.hostname.endsWith(".supabase.co") && !target.hostname.includes("pooler.supabase.com")) {
      throw new Error("Refusing schema reset: database URL host is not a recognized Supabase endpoint");
    } else {
      const directRef = target.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1];
      const userRef = decodeURIComponent(target.username).match(/^postgres\.([a-z0-9]+)$/i)?.[1];
      const urlRef = directRef || userRef;
      if (!urlRef || urlRef !== ref) {
        throw new Error("Refusing schema reset: database URL project does not match SUPABASE_PROJECT_REF");
      }
    }
    return { connectionString: verifiedDatabaseUrl(env.SUPABASE_DB_URL), ssl: { rejectUnauthorized: true } };
  }

  const password = env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error("Set SUPABASE_DB_PASSWORD in root .env");
  }

  const region = env.SUPABASE_DB_REGION || "eu-west-1";
  const port = Number(env.SUPABASE_DB_PORT || 5432);
  const host = env.SUPABASE_DB_HOST || `aws-0-${region}.pooler.supabase.com`;

  return {
    host,
    port,
    user: `postgres.${ref}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: true },
  };
}

const RESET_SQL = `
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
DELETE FROM supabase_migrations.schema_migrations;
`;

async function applyMigrations(client) {
  const migrationsDir = path.join(projectRoot, "supabase", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const skipFiles = new Set(["001_create_schema_simple.sql"]);
  let appliedCount = 0;
  for (const file of files) {
    if (skipFiles.has(file)) {
      console.log(`Skipping duplicate ${file}`);
      continue;
    }
    const version = file.replace(/\.sql$/, "");
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}...`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        `insert into supabase_migrations.schema_migrations(version, name)
         values ($1, $2)`,
        [version, file]
      );
      await client.query("commit");
      appliedCount += 1;
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  return appliedCount;
}

const confirmed = process.argv.includes("--confirm");
if (!confirmed) {
  console.error("Refusing to reset without --confirm");
  console.error("Usage: node scripts/resetAndApplySchema.mjs --confirm");
  process.exit(1);
}

const client = new pg.Client(getDbConfig());
await client.connect();

try {
  console.log("Resetting public schema and migration history...");
  await client.query(RESET_SQL);
  console.log("Applying local migrations...");
  const count = await applyMigrations(client);
  console.log(`Done. Applied ${count} migration file(s).`);
} finally {
  await client.end();
}
