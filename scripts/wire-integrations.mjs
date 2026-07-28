#!/usr/bin/env node
/**
 * Wire optional integrations (everything except Twilio).
 * - Generates web-push VAPID keys when missing
 * - Generates INTERNAL_AUTOMATIONS_KEY when missing
 * - Builds supabase/.env.payments from root .env + generated values
 * - Updates root .env client flags (VITE_WEB_PUSH_PUBLIC_KEY, VITE_OPENAI_ENABLED, etc.)
 *
 * Usage: npm run integrations:wire
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import webpush from "web-push";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const PAYMENTS_PATH = path.join(ROOT, "supabase", ".env.payments");
const PAYMENTS_EXAMPLE = path.join(ROOT, "supabase", ".env.payments.example");

const SERVER_KEYS = [
  "PUBLIC_APP_URL",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_WEBHOOK_SECRET",
  "INTERNAL_AUTOMATIONS_KEY",
  "RESEND_API_KEY",
  "NOTIFICATION_EMAIL_FROM",
  "NOTIFICATION_EMAIL_REPLY_TO",
  "WEB_PUSH_PUBLIC_KEY",
  "WEB_PUSH_PRIVATE_KEY",
  "WEB_PUSH_CONTACT_EMAIL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "STRIPE_SECRET_KEY",
  "MLS_API_KEY",
  "MLS_API_SECRET",
  "ZILLOW_API_KEY",
  "REALTOR_API_KEY",
];

const CLIENT_KEYS = [
  "VITE_PUBLIC_APP_URL",
  "VITE_SITE_URL",
  "VITE_PAYSTACK_PUBLIC_KEY",
  "VITE_STRIPE_PUBLIC_KEY",
  "VITE_WEB_PUSH_PUBLIC_KEY",
  "VITE_EXCHANGE_RATE_API_KEY",
  "VITE_OPENAI_ENABLED",
  "VITE_RESEND_CONFIGURED",
  "VITE_PROPERTY_TOKEN_ADDRESS",
  "VITE_PROPERTY_ESCROW_ADDRESS",
  "VITE_PROPERTY_OWNERSHIP_ADDRESS",
  "VITE_PROPERTY_LEASE_ADDRESS",
  "VITE_VERIFICATION_REGISTRY_ADDRESS",
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

function serializeEnvFile(values, header = "") {
  const lines = header ? [header, ""] : [];
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    lines.push(`${key}=${value}`);
  }
  lines.push("");
  return lines.join("\n");
}

function upsertEnvValues(filePath, updates) {
  const current = parseEnvFile(filePath);
  const merged = { ...current, ...updates };
  const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").split(/\r?\n/) : [];
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

  fs.writeFileSync(filePath, `${output.join("\n").replace(/\n*$/, "\n")}`, "utf8");
}

function writeStructuredPaymentsFile(filePath, values) {
  let template = fs.existsSync(PAYMENTS_EXAMPLE)
    ? fs.readFileSync(PAYMENTS_EXAMPLE, "utf8")
    : serializeEnvFile(values, "# Synced by scripts/wire-integrations.mjs — do not commit");

  template = template.replace(
    /^# =+\n# BaytMiftah — SERVER secrets[\s\S]*?# =+\n\n/m,
    [
      "# =============================================================================",
      "# BaytMiftah — SERVER secrets (Supabase Edge Functions)",
      "# Synced by scripts/wire-integrations.mjs — do not commit",
      "# =============================================================================",
      "",
    ].join("\n"),
  );

  const output = template.replace(/^([A-Z0-9_]+)=.*$/gm, (line, key) => {
    if (key in values) {
      return `${key}=${values[key] ?? ""}`;
    }
    return line;
  });

  fs.writeFileSync(filePath, output.replace(/\n*$/, "\n"), "utf8");
}

function randomKey(bytes = 32) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  const random = crypto.getRandomValues(new Uint8Array(bytes));
  for (const byte of random) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
}

function main() {
  const rootEnv = parseEnvFile(ENV_PATH);
  const existingPayments = parseEnvFile(PAYMENTS_PATH);
  const payments = { ...parseEnvFile(PAYMENTS_EXAMPLE), ...existingPayments };

  const appUrl =
    rootEnv.VITE_PUBLIC_APP_URL ||
    rootEnv.VITE_SITE_URL ||
    payments.PUBLIC_APP_URL ||
    "https://baytmiftah.com";

  payments.PUBLIC_APP_URL = appUrl;
  payments.NOTIFICATION_EMAIL_FROM =
    payments.NOTIFICATION_EMAIL_FROM || rootEnv.NOTIFICATION_EMAIL_FROM || "noreply@baytmiftah.com";
  payments.NOTIFICATION_EMAIL_REPLY_TO =
    payments.NOTIFICATION_EMAIL_REPLY_TO ||
    rootEnv.NOTIFICATION_EMAIL_REPLY_TO ||
    "support@baytmiftah.com";
  payments.WEB_PUSH_CONTACT_EMAIL =
    payments.WEB_PUSH_CONTACT_EMAIL || "mailto:support@baytmiftah.com";
  payments.OPENAI_MODEL = payments.OPENAI_MODEL || rootEnv.OPENAI_MODEL || "gpt-4o-mini";

  if (!payments.INTERNAL_AUTOMATIONS_KEY) {
    payments.INTERNAL_AUTOMATIONS_KEY = randomKey(48);
    console.log("Generated INTERNAL_AUTOMATIONS_KEY");
  }

  if (!payments.WEB_PUSH_PUBLIC_KEY || !payments.WEB_PUSH_PRIVATE_KEY) {
    const vapid = webpush.generateVAPIDKeys();
    payments.WEB_PUSH_PUBLIC_KEY = vapid.publicKey;
    payments.WEB_PUSH_PRIVATE_KEY = vapid.privateKey;
    console.log("Generated web-push VAPID keys");
  }

  for (const key of SERVER_KEYS) {
    if (!payments[key] && rootEnv[key]) {
      payments[key] = rootEnv[key];
    }
  }

  const paymentsBody = Object.fromEntries(
    SERVER_KEYS.map((key) => [key, payments[key] || ""]),
  );
  writeStructuredPaymentsFile(PAYMENTS_PATH, paymentsBody);
  console.log(`Wrote ${path.relative(ROOT, PAYMENTS_PATH)}`);

  const clientUpdates = {
    VITE_WEB_PUSH_PUBLIC_KEY: payments.WEB_PUSH_PUBLIC_KEY,
    VITE_OPENAI_ENABLED: payments.OPENAI_API_KEY ? "true" : rootEnv.VITE_OPENAI_ENABLED || "",
    VITE_RESEND_CONFIGURED: payments.RESEND_API_KEY ? "true" : rootEnv.VITE_RESEND_CONFIGURED || "",
  };

  if (!rootEnv.VITE_PUBLIC_APP_URL) clientUpdates.VITE_PUBLIC_APP_URL = appUrl;
  if (!rootEnv.VITE_SITE_URL) clientUpdates.VITE_SITE_URL = appUrl;

  for (const key of [
    "VITE_PAYSTACK_PUBLIC_KEY",
    "VITE_STRIPE_PUBLIC_KEY",
    "VITE_EXCHANGE_RATE_API_KEY",
    "VITE_PROPERTY_TOKEN_ADDRESS",
    "VITE_PROPERTY_ESCROW_ADDRESS",
    "VITE_PROPERTY_OWNERSHIP_ADDRESS",
    "VITE_PROPERTY_LEASE_ADDRESS",
    "VITE_VERIFICATION_REGISTRY_ADDRESS",
  ]) {
    if (rootEnv[key]) clientUpdates[key] = rootEnv[key];
  }

  upsertEnvValues(ENV_PATH, clientUpdates);
  console.log(`Updated ${path.relative(ROOT, ENV_PATH)}`);

  const configured = {
    paystack: Boolean(payments.PAYSTACK_SECRET_KEY && rootEnv.VITE_PAYSTACK_PUBLIC_KEY),
    resend: Boolean(payments.RESEND_API_KEY),
    webPush: Boolean(payments.WEB_PUSH_PUBLIC_KEY && payments.WEB_PUSH_PRIVATE_KEY),
    openAi: Boolean(payments.OPENAI_API_KEY),
    stripe: Boolean(payments.STRIPE_SECRET_KEY && rootEnv.VITE_STRIPE_PUBLIC_KEY),
    exchangeRates: Boolean(rootEnv.VITE_EXCHANGE_RATE_API_KEY),
    blockchain: Boolean(
      rootEnv.VITE_PROPERTY_TOKEN_ADDRESS ||
        rootEnv.VITE_PROPERTY_ESCROW_ADDRESS ||
        rootEnv.VITE_VERIFICATION_REGISTRY_ADDRESS
    ),
    mls: Boolean(payments.MLS_API_KEY || payments.ZILLOW_API_KEY || payments.REALTOR_API_KEY),
  };

  console.log("\nIntegration status:");
  for (const [name, ok] of Object.entries(configured)) {
    console.log(`  ${ok ? "✓" : "○"} ${name}`);
  }

  const missing = [];
  if (!configured.paystack) {
    missing.push("Paystack: VITE_PAYSTACK_PUBLIC_KEY in .env + PAYSTACK_SECRET_KEY in supabase/.env.payments");
  }
  if (!configured.resend) missing.push("Resend: RESEND_API_KEY in supabase/.env.payments");
  if (!configured.openAi) missing.push("OpenAI: OPENAI_API_KEY in supabase/.env.payments");
  if (!configured.stripe) {
    missing.push("Stripe: VITE_STRIPE_PUBLIC_KEY in .env + STRIPE_SECRET_KEY in supabase/.env.payments");
  }
  if (!configured.blockchain) missing.push("Deploy contracts + VITE_PROPERTY_*_ADDRESS");
  if (!configured.mls) missing.push("MLS/Zillow/Realtor keys (optional — or connect per agency in workspace)");

  if (missing.length) {
    console.log("\nStill needs API keys in .env (then re-run this script):");
    missing.forEach((item) => console.log(`  - ${item}`));
  }

  console.log("\nNext: npm run supabase:deploy:payments -- --skip-db");
}

main();
