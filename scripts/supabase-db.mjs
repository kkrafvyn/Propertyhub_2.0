#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

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

function getProjectRef(env) {
  if (env.SUPABASE_PROJECT_REF) return env.SUPABASE_PROJECT_REF;
  if (env.VITE_SUPABASE_URL) {
    return new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
  }
  throw new Error("Missing SUPABASE_PROJECT_REF or VITE_SUPABASE_URL");
}

function getDbConfig() {
  const env = {
    ...loadEnvFile(path.join(projectRoot, ".env")),
    ...loadEnvFile(path.join(projectRoot, "supabase", ".env.local")),
    ...process.env,
  };

  if (env.SUPABASE_DB_URL) {
    return { connectionString: env.SUPABASE_DB_URL };
  }

  const password = env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error(
      "Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in supabase/.env.local"
    );
  }

  const ref = getProjectRef(env);
  const region = env.SUPABASE_DB_REGION || "eu-west-1";
  const port = Number(env.SUPABASE_DB_PORT || 5432);
  const host = env.SUPABASE_DB_HOST || `aws-0-${region}.pooler.supabase.com`;

  return {
    host,
    port,
    user: `postgres.${ref}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

async function withClient(run) {
  const client = new pg.Client(getDbConfig());
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function cmdStatus() {
  return withClient(async (client) => {
    const migrations = await client.query(
      `select version, name
       from supabase_migrations.schema_migrations
       order by version desc
       limit 10`
    );
  const tables = await client.query(
      `select tablename
       from pg_tables
       where schemaname = 'public'
         and tablename in (
           'organization_wallets',
           'organization_payout_requests',
           'notification_logs',
           'user_wallets'
         )
       order by tablename`
    );
    console.log(JSON.stringify({ migrations: migrations.rows, tables: tables.rows }, null, 2));
  });
}

async function cmdQuery(sql) {
  return withClient(async (client) => {
    const result = await client.query(sql);
    console.log(JSON.stringify(result.rows, null, 2));
  });
}

async function cmdFile(fileArg) {
  const filePath = path.resolve(process.cwd(), fileArg);
  const sql = fs.readFileSync(filePath, "utf8");
  return withClient(async (client) => {
    await client.query(sql);
    console.log(`Applied SQL file: ${filePath}`);
  });
}

async function cmdPushPending() {
  const migrationsDir = path.join(projectRoot, "supabase", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  return withClient(async (client) => {
    const applied = await client.query(
      `select version from supabase_migrations.schema_migrations`
    );
    const appliedSet = new Set(applied.rows.map((row) => row.version));

    let appliedCount = 0;
    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      if (appliedSet.has(version)) continue;

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

    console.log(
      appliedCount === 0
        ? "Database is up to date."
        : `Applied ${appliedCount} migration file(s).`
    );
  });
}

function printHelp() {
  console.log(`Usage:
  node scripts/supabase-db.mjs status
  node scripts/supabase-db.mjs query "select now()"
  node scripts/supabase-db.mjs file path/to/script.sql
  node scripts/supabase-db.mjs push
`);
}

const [command, ...rest] = process.argv.slice(2);

try {
  switch (command) {
    case "status":
      await cmdStatus();
      break;
    case "query":
      await cmdQuery(rest.join(" "));
      break;
    case "file":
      await cmdFile(rest[0]);
      break;
    case "push":
      await cmdPushPending();
      break;
    default:
      printHelp();
      process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
