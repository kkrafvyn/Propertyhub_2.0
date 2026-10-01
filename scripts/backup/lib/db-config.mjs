import fs from "node:fs";
import path from "node:path";
import { loadProjectEnv } from "../../load-project-env.mjs";
import { verifiedDatabaseUrl } from "../../secure-db-url.mjs";

function resolveSsl(env) {
  if (!env.SUPABASE_DB_SSL_ROOT_CERT) return { rejectUnauthorized: true };
  const certificatePath = path.resolve(process.cwd(), env.SUPABASE_DB_SSL_ROOT_CERT);
  return { ca: fs.readFileSync(certificatePath, "utf8"), rejectUnauthorized: true };
}

export function getProjectRef(env = loadProjectEnv()) {
  if (env.SUPABASE_PROJECT_REF) return env.SUPABASE_PROJECT_REF;
  if (env.VITE_SUPABASE_URL) {
    return new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
  }
  throw new Error("Missing SUPABASE_PROJECT_REF or VITE_SUPABASE_URL in .env");
}

export function getDbConfig(env = loadProjectEnv()) {
  if (env.SUPABASE_DB_URL) {
    return { connectionString: verifiedDatabaseUrl(env.SUPABASE_DB_URL), ssl: resolveSsl(env) };
  }

  const password = env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error("Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in root .env");
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
    ssl: resolveSsl(env),
  };
}
