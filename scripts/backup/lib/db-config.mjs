import { loadProjectEnv } from "../../load-project-env.mjs";

export function getProjectRef(env = loadProjectEnv()) {
  if (env.SUPABASE_PROJECT_REF) return env.SUPABASE_PROJECT_REF;
  if (env.VITE_SUPABASE_URL) {
    return new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
  }
  throw new Error("Missing SUPABASE_PROJECT_REF or VITE_SUPABASE_URL in .env");
}

export function getDbConfig(env = loadProjectEnv()) {
  if (env.SUPABASE_DB_URL) {
    return { connectionString: env.SUPABASE_DB_URL };
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
    ssl: { rejectUnauthorized: false },
  };
}
