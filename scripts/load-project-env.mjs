import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLI_KEYS, SERVER_KEYS } from "./env-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.join(__dirname, "..");
export const ROOT_ENV_PATH = path.join(PROJECT_ROOT, ".env");

export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

/** Load the single root `.env` file (legacy supabase/.env.* files are optional fallbacks). */
export function loadProjectEnv() {
  const rootEnv = parseEnvFile(ROOT_ENV_PATH);
  const legacyPayments = parseEnvFile(path.join(PROJECT_ROOT, "supabase", ".env.payments"));
  const legacyLocal = parseEnvFile(path.join(PROJECT_ROOT, "supabase", ".env.local"));
  return { ...legacyPayments, ...legacyLocal, ...rootEnv, ...process.env };
}

export function getProjectRef(env = loadProjectEnv()) {
  if (env.SUPABASE_PROJECT_REF) return env.SUPABASE_PROJECT_REF;
  if (env.VITE_SUPABASE_URL) {
    return new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
  }
  return "";
}

export function buildServerSecrets(env = loadProjectEnv()) {
  const appUrl =
    env.PUBLIC_APP_URL ||
    env.VITE_PUBLIC_APP_URL ||
    env.VITE_SITE_URL ||
    "https://baytmiftah.com";

  const secrets = {
    PUBLIC_APP_URL: appUrl,
    NOTIFICATION_EMAIL_FROM: env.NOTIFICATION_EMAIL_FROM || "noreply@baytmiftah.com",
    NOTIFICATION_EMAIL_REPLY_TO: env.NOTIFICATION_EMAIL_REPLY_TO || "support@baytmiftah.com",
    WEB_PUSH_CONTACT_EMAIL: env.WEB_PUSH_CONTACT_EMAIL || "mailto:support@baytmiftah.com",
    OPENAI_MODEL: env.OPENAI_MODEL || "gpt-4o-mini",
  };

  for (const key of SERVER_KEYS) {
    if (env[key]) secrets[key] = env[key];
  }

  if (!secrets.WEB_PUSH_PUBLIC_KEY && env.VITE_WEB_PUSH_PUBLIC_KEY) {
    secrets.WEB_PUSH_PUBLIC_KEY = env.VITE_WEB_PUSH_PUBLIC_KEY;
  }

  return Object.fromEntries(SERVER_KEYS.map((key) => [key, secrets[key] || ""]));
}

export function writeServerSecretsFile(targetPath, env = loadProjectEnv()) {
  const secrets = buildServerSecrets(env);
  const lines = [
    "# Generated from root .env — do not commit",
    ...Object.entries(secrets).map(([key, value]) => `${key}=${value}`),
    "",
  ];
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, lines.join("\n"), "utf8");
  return targetPath;
}

export function upsertRootEnv(updates) {
  const current = parseEnvFile(ROOT_ENV_PATH);
  const lines = fs.existsSync(ROOT_ENV_PATH)
    ? fs.readFileSync(ROOT_ENV_PATH, "utf8").split(/\r?\n/)
    : [];
  const seen = new Set();
  const output = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      output.push(line);
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      output.push(line);
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    if (key in updates) {
      output.push(`${key}=${updates[key]}`);
      seen.add(key);
    } else {
      output.push(line);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key) && !(key in current)) {
      output.push(`${key}=${value}`);
    }
  }

  fs.writeFileSync(ROOT_ENV_PATH, `${output.join("\n").replace(/\n*$/, "\n")}`, "utf8");
}

export function missingCliKeys(env = loadProjectEnv()) {
  return CLI_KEYS.filter((key) => key !== "SUPABASE_DB_URL" && !env[key]);
}
