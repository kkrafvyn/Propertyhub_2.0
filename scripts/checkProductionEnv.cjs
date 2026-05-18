#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const args = process.argv.slice(2);
const explicitEnvFiles = args
  .filter((arg) => arg.startsWith("--env-file="))
  .map((arg) => arg.replace("--env-file=", "").trim())
  .filter(Boolean);
const strictMobile = args.includes("--strict-mobile") || args.includes("--strict-all");
const strictIot = args.includes("--strict-iot") || args.includes("--strict-all");

const defaultEnvFiles = [
  ".env",
  ".env.local",
  ".env.production",
  "supabase/.env.payments",
  "supabase/.env.payments.local",
];

const envFiles = explicitEnvFiles.length ? explicitEnvFiles : defaultEnvFiles;
const loadedFiles = [];
const env = { ...process.env };

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadEnvFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return;

  loadedFiles.push(relativePath);
  const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripQuotes(trimmed.slice(separatorIndex + 1));
    if (key && !env[key]) env[key] = value;
  }
}

for (const envFile of envFiles) {
  loadEnvFile(envFile);
}

function isPresent(key) {
  return Boolean(env[key] && String(env[key]).trim());
}

const requiredGroups = [
  {
    name: "Core web and Supabase",
    keys: [
      "SUPABASE_PROJECT_REF",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_PUBLIC_APP_URL",
      "PUBLIC_APP_URL",
    ],
  },
  {
    name: "Paystack Ghana billing and escrow",
    keys: [
      "VITE_PAYSTACK_PUBLIC_KEY",
      "PAYSTACK_SECRET_KEY",
      "PAYSTACK_WEBHOOK_SECRET",
      "PAYSTACK_PLAN_CODE_STARTER",
      "PAYSTACK_PLAN_CODE_GROWTH",
      "PAYSTACK_PLAN_CODE_PRO",
      "PAYSTACK_DEFAULT_ESCROW_RECIPIENT_CODE",
    ],
  },
  {
    name: "Stripe diaspora billing and escrow",
    keys: [
      "VITE_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_ID_STARTER_USD",
      "STRIPE_PRICE_ID_GROWTH_USD",
      "STRIPE_PRICE_ID_PRO_USD",
      "STRIPE_PRICE_ID_STARTER_GBP",
      "STRIPE_PRICE_ID_GROWTH_GBP",
      "STRIPE_PRICE_ID_PRO_GBP",
    ],
  },
  {
    name: "Transactional email",
    keys: ["RESEND_API_KEY", "NOTIFICATION_EMAIL_FROM"],
  },
  {
    name: "Integrity audit and public anchoring",
    keys: [
      "AUDIT_RSA_PRIVATE_KEY_PEM",
      "AUDIT_RSA_PUBLIC_KEY_PEM",
      "AUDIT_RSA_PUBLIC_KEY_ID",
      "ANCHOR_JOB_SECRET",
      "GITHUB_ANCHOR_REPO",
      "GITHUB_ANCHOR_TOKEN",
    ],
  },
];

const advisoryGroups = [
  {
    name: "Browser push",
    strict: strictMobile,
    keys: ["WEB_PUSH_PUBLIC_KEY", "WEB_PUSH_PRIVATE_KEY", "WEB_PUSH_CONTACT_EMAIL"],
  },
  {
    name: "Android push",
    strict: strictMobile,
    anyOf: [["FCM_SERVER_KEY"], ["FCM_PROJECT_ID", "FCM_ACCESS_TOKEN"]],
  },
  {
    name: "iOS push",
    strict: strictMobile,
    keys: ["APNS_BEARER_TOKEN", "APNS_BUNDLE_ID", "APNS_USE_SANDBOX"],
  },
  {
    name: "Flutterwave Nigeria expansion",
    strict: env.FLUTTERWAVE_ENABLED === "true",
    keys: ["VITE_FLUTTERWAVE_PUBLIC_KEY", "FLUTTERWAVE_SECRET_KEY", "FLUTTERWAVE_WEBHOOK_SECRET_HASH"],
  },
  {
    name: "IT Consortium optional Ghana processor",
    strict: env.IT_CONSORTIUM_ENABLED === "true",
    keys: ["IT_CONSORTIUM_USERNAME", "IT_CONSORTIUM_API_KEY", "IT_CONSORTIUM_MERCHANT_ID"],
  },
];

const iotProviders = [
  {
    name: "TTLock",
    keys: ["TTLOCK_COMMAND_ENDPOINT", "TTLOCK_ACCESS_TOKEN"],
  },
  {
    name: "Yale",
    keys: ["YALE_COMMAND_ENDPOINT", "YALE_ACCESS_TOKEN"],
  },
  {
    name: "Tuya",
    keys: ["TUYA_COMMAND_ENDPOINT", "TUYA_ACCESS_TOKEN"],
  },
];

const failures = [];
const warnings = [];
const passes = [];

function checkKeyGroup(group, strict = true) {
  const missing = (group.keys || []).filter((key) => !isPresent(key));
  if (missing.length) {
    const message = `${group.name}: missing ${missing.join(", ")}`;
    if (strict) failures.push(message);
    else warnings.push(message);
    return;
  }

  passes.push(`${group.name}: all required values are present`);
}

function checkAnyOfGroup(group, strict = true) {
  const satisfied = group.anyOf.some((option) => option.every((key) => isPresent(key)));
  if (satisfied) {
    passes.push(`${group.name}: at least one valid credential set is present`);
    return;
  }

  const choices = group.anyOf.map((option) => option.join(" + ")).join(" OR ");
  const message = `${group.name}: missing one of ${choices}`;
  if (strict) failures.push(message);
  else warnings.push(message);
}

for (const group of requiredGroups) {
  checkKeyGroup(group);
}

for (const group of advisoryGroups) {
  if (group.anyOf) checkAnyOfGroup(group, group.strict);
  else checkKeyGroup(group, group.strict);
}

const readyIotProviders = iotProviders.filter((provider) => provider.keys.every((key) => isPresent(key)));
if (readyIotProviders.length) {
  passes.push(`Smart Property Access: provider credentials present for ${readyIotProviders.map((provider) => provider.name).join(", ")}`);
} else {
  const message = "Smart Property Access: no complete TTLock, Yale, or Tuya credential set is present";
  if (strictIot) failures.push(message);
  else warnings.push(message);
}

console.log(`Production env files loaded: ${loadedFiles.length ? loadedFiles.join(", ") : "none; process.env only"}`);

for (const message of passes) {
  console.log(`[pass] ${message}`);
}

for (const message of warnings) {
  console.warn(`[warn] ${message}`);
}

for (const message of failures) {
  console.error(`[fail] ${message}`);
}

if (failures.length) {
  console.error(
    "\nProduction environment is not ready. Add the missing values in your deployment provider or pass --env-file=.env.production to check a local file."
  );
  process.exitCode = 1;
} else {
  console.log("\nProduction environment check passed.");
}
