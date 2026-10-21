import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { describe, it } from "vitest";
import { getDbConfig } from "./backup/lib/db-config.mjs";
import { loadProjectEnv } from "./load-project-env.mjs";

const root = path.resolve(import.meta.dirname, "..");
const env = loadProjectEnv();
const hasDb = Boolean(env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_URL);

describe("supabase migration manifest", () => {
  it.skipIf(!hasDb)("local migration files match remote schema_migrations", async () => {
    const local = new Set(
      fs
        .readdirSync(path.join(root, "supabase/migrations"))
        .filter((f) => f.endsWith(".sql"))
        .map((f) => f.replace(/\.sql$/, "")),
    );

    const client = new pg.Client(getDbConfig(env));
    await client.connect();
    const { rows } = await client.query("select version from supabase_migrations.schema_migrations");
    await client.end();

    const remote = rows.map((r) => r.version);
    const remoteOnly = remote.filter((v) => !local.has(v));
    const pending = [...local].filter((v) => !remote.includes(v));

    assert.equal(pending.length, 0, `pending local migrations: ${pending.join(", ")}`);
    assert.equal(remoteOnly.length, 0, `remote-only versions: ${remoteOnly.join(", ")}`);
  });
});
