#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

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

const env = {
  ...loadEnvFile(path.join(projectRoot, ".env")),
  ...loadEnvFile(path.join(projectRoot, "supabase", ".env.local")),
  ...process.env,
};

if (env.SUPABASE_DB_URL) {
  console.log(env.SUPABASE_DB_URL);
  process.exit(0);
}

const ref =
  env.SUPABASE_PROJECT_REF ||
  (env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0] : "");

const password = env.SUPABASE_DB_PASSWORD;
if (!ref || !password) {
  console.error("Missing SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD in supabase/.env.local");
  process.exit(1);
}

const region = env.SUPABASE_DB_REGION || "eu-west-1";
const host = env.SUPABASE_DB_HOST || `aws-0-${region}.pooler.supabase.com`;
const port = env.SUPABASE_DB_PORT || "5432";
const user = `postgres.${ref}`;
const encodedPassword = encodeURIComponent(password);
console.log(`postgresql://${user}:${encodedPassword}@${host}:${port}/postgres`);
