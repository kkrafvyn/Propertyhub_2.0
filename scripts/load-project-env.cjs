const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const ROOT_ENV_PATH = path.join(PROJECT_ROOT, ".env");

const SERVER_KEYS = [
  "PUBLIC_APP_URL",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "INTERNAL_AUTOMATIONS_KEY",
  "RESEND_API_KEY",
  "NOTIFICATION_EMAIL_FROM",
  "NOTIFICATION_EMAIL_REPLY_TO",
  "WEB_PUSH_PUBLIC_KEY",
  "WEB_PUSH_PRIVATE_KEY",
  "WEB_PUSH_CONTACT_EMAIL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "MLS_API_KEY",
  "MLS_API_SECRET",
  "ZILLOW_API_KEY",
  "REALTOR_API_KEY",
];

function parseEnvFile(filePath) {
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

function loadProjectEnv() {
  const rootEnv = parseEnvFile(ROOT_ENV_PATH);
  const legacyPayments = parseEnvFile(path.join(PROJECT_ROOT, "supabase", ".env.payments"));
  const legacyLocal = parseEnvFile(path.join(PROJECT_ROOT, "supabase", ".env.local"));
  return { ...legacyPayments, ...legacyLocal, ...rootEnv, ...process.env };
}

function buildServerSecrets(env = loadProjectEnv()) {
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

function writeServerSecretsFile(targetPath, env = loadProjectEnv()) {
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

module.exports = {
  PROJECT_ROOT,
  ROOT_ENV_PATH,
  loadProjectEnv,
  buildServerSecrets,
  writeServerSecretsFile,
};
