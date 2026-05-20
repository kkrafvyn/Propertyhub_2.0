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
const strictPayments = args.includes("--strict-payments") || args.includes("--strict-all");
const strictComms = args.includes("--strict-comms") || args.includes("--strict-all");
const strictIdentity = args.includes("--strict-identity") || args.includes("--strict-all");
const strictData = args.includes("--strict-data") || args.includes("--strict-all");
const strictOps = args.includes("--strict-ops") || args.includes("--strict-all");

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

function isUrlKey(key) {
  return /URL|ENDPOINT/.test(key);
}

function isEmailLike(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function getPlaceholderReason(key) {
  if (!isPresent(key)) return null;

  const value = String(env[key]).trim();
  const lowerValue = value.toLowerCase();
  const upperKey = key.toUpperCase();

  if (isUrlKey(upperKey) && /(localhost|127\.0\.0\.1)/i.test(value)) {
    return "still points at localhost";
  }

  if (isUrlKey(upperKey) && /example\.supabase\.co|example\.com|example\.org/i.test(value)) {
    return "still points at an example host";
  }

  if (upperKey.includes("PUBLIC_APP_URL") && /^http:\/\//i.test(value)) {
    return "is not using HTTPS";
  }

  if (upperKey.includes("STRIPE") && /\b(?:pk|sk|rk)_test_/i.test(value)) {
    return "still uses Stripe test credentials";
  }

  if (upperKey.includes("PAYSTACK") && /\b(?:pk|sk)_test_/i.test(value)) {
    return "still uses Paystack test credentials";
  }

  if (upperKey.includes("FLUTTERWAVE") && /\bFLW(?:PUBK|SECK)_TEST-/i.test(value)) {
    return "still uses Flutterwave test credentials";
  }

  if (!isEmailLike(value) && /^(?:ci_|dummy_|placeholder_|sample_|your_|replace[-_]?me|changeme)/i.test(value)) {
    return "still uses placeholder text";
  }

  if (
    !isEmailLike(value) &&
    /(placeholder|dummy|changeme|replace[-_]?me|todo)/i.test(lowerValue)
  ) {
    return "still uses placeholder text";
  }

  return null;
}

function formatInvalidValues(keys) {
  return keys
    .map((key) => {
      const reason = getPlaceholderReason(key);
      return reason ? `${key} (${reason})` : null;
    })
    .filter(Boolean);
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
    name: "Transactional email",
    keys: ["RESEND_API_KEY", "NOTIFICATION_EMAIL_FROM"],
  },
];

const advisoryGroups = [
  {
    name: "Stripe diaspora billing and escrow",
    strict: strictPayments,
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
    name: "Integrity audit and public anchoring",
    strict: strictOps,
    keys: [
      "AUDIT_RSA_PRIVATE_KEY_PEM",
      "AUDIT_RSA_PUBLIC_KEY_PEM",
      "AUDIT_RSA_PUBLIC_KEY_ID",
      "ANCHOR_JOB_SECRET",
      "GITHUB_ANCHOR_REPO",
      "GITHUB_ANCHOR_TOKEN",
    ],
  },
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
    strict: strictPayments || env.FLUTTERWAVE_ENABLED === "true",
    keys: ["VITE_FLUTTERWAVE_PUBLIC_KEY", "FLUTTERWAVE_SECRET_KEY", "FLUTTERWAVE_WEBHOOK_SECRET_HASH"],
  },
  {
    name: "Stripe Connect payout lane",
    strict: strictPayments,
    keys: ["STRIPE_CONNECT_CLIENT_ID", "STRIPE_CONNECT_WEBHOOK_SECRET"],
  },
  {
    name: "IT Consortium optional Ghana processor",
    strict: env.IT_CONSORTIUM_ENABLED === "true",
    keys: ["IT_CONSORTIUM_USERNAME", "IT_CONSORTIUM_API_KEY", "IT_CONSORTIUM_MERCHANT_ID"],
  },
  {
    name: "SMS and WhatsApp communications",
    strict: strictComms,
    keys: ["SMS_PROVIDER", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_SMS_FROM", "TWILIO_WHATSAPP_FROM"],
  },
  {
    name: "USSD handoff provider",
    strict: strictComms,
    keys: ["USSD_PROVIDER_NAME", "USSD_SHORT_CODE", "USSD_API_ENDPOINT", "USSD_API_KEY", "USSD_WEBHOOK_SECRET"],
  },
  {
    name: "Ghana Card and liveness provider",
    strict: strictIdentity,
    keys: [
      "GHANA_CARD_PROVIDER",
      "GHANA_CARD_API_ENDPOINT",
      "GHANA_CARD_API_KEY",
      "LIVENESS_PROVIDER",
      "LIVENESS_API_KEY",
    ],
  },
  {
    name: "Lands Commission or manual registry provider",
    strict: strictIdentity,
    keys: ["LAND_REGISTRY_PROVIDER", "LAND_REGISTRY_API_ENDPOINT", "LAND_REGISTRY_API_KEY"],
  },
  {
    name: "Hyperlocal data feeds",
    strict: strictData,
    keys: [
      "HYPERLOCAL_DATA_PROVIDER",
      "HYPERLOCAL_DATA_API_KEY",
      "FLOOD_DATA_ENDPOINT",
      "POWER_RELIABILITY_DATA_ENDPOINT",
      "WATER_RELIABILITY_DATA_ENDPOINT",
      "SAFETY_DATA_ENDPOINT",
      "TRANSIT_DATA_ENDPOINT",
    ],
  },
  {
    name: "Advanced fraud providers",
    strict: strictIdentity,
    keys: [
      "FRAUD_IMAGE_AUTH_PROVIDER",
      "FRAUD_IMAGE_AUTH_API_KEY",
      "DEVICE_RISK_PROVIDER",
      "DEVICE_RISK_API_KEY",
      "SANCTIONS_SCREENING_PROVIDER",
      "SANCTIONS_SCREENING_API_KEY",
    ],
  },
  {
    name: "Monitoring and error reporting",
    strict: strictOps,
    keys: ["MONITORING_PROVIDER", "MONITORING_DSN", "UPTIME_MONITOR_URL", "LOG_DRAIN_ENDPOINT"],
  },
  {
    name: "Backup and restore evidence",
    strict: strictOps,
    keys: ["BACKUP_PROVIDER", "BACKUP_RESTORE_EVIDENCE_URL", "SUPABASE_PITR_ENABLED"],
  },
];

function checkMapProvider() {
  const rawProvider = String(env.VITE_MAP_PROVIDER || "openstreetmap").trim().toLowerCase();

  if (!["openstreetmap", "maptiler"].includes(rawProvider)) {
    warnings.push(
      `Public map tiles: unknown VITE_MAP_PROVIDER value "${rawProvider}". Falling back to OpenStreetMap in the client.`
    );
    return;
  }

  if (rawProvider === "maptiler") {
    if (!isPresent("VITE_MAPTILER_KEY")) {
      failures.push("Public map tiles: missing VITE_MAPTILER_KEY for MapTiler");
      return;
    }

    const invalid = formatInvalidValues(["VITE_MAPTILER_KEY"]);
    if (invalid.length) {
      failures.push(
        `Public map tiles: replace placeholder values for ${invalid.join(", ")}`
      );
      return;
    }

    passes.push("Public map tiles: MapTiler is configured for client map discovery");
    return;
  }

  passes.push("Public map tiles: OpenStreetMap fallback is configured for client map discovery");
}

const iotProviders = [
  {
    name: "TTLock",
    keys: ["TTLOCK_COMMAND_ENDPOINT", "TTLOCK_ACCESS_TOKEN"],
    anyOf: [
      ["TTLOCK_COMMAND_ENDPOINT", "TTLOCK_ACCESS_TOKEN"],
      [
        "TTLOCK_API_BASE_URL",
        "TTLOCK_CLIENT_ID",
        "TTLOCK_CLIENT_SECRET",
        "TTLOCK_GENERATE_VIEWING_CODE_ENDPOINT",
        "TTLOCK_REVOKE_ACCESS_GRANT_ENDPOINT",
      ],
    ],
  },
  {
    name: "Yale",
    keys: ["YALE_COMMAND_ENDPOINT", "YALE_ACCESS_TOKEN"],
    anyOf: [
      ["YALE_COMMAND_ENDPOINT", "YALE_ACCESS_TOKEN"],
      [
        "YALE_API_BASE_URL",
        "YALE_CLIENT_ID",
        "YALE_CLIENT_SECRET",
        "YALE_GENERATE_VIEWING_CODE_ENDPOINT",
        "YALE_REVOKE_ACCESS_GRANT_ENDPOINT",
      ],
    ],
  },
  {
    name: "Tuya",
    keys: ["TUYA_COMMAND_ENDPOINT", "TUYA_ACCESS_TOKEN"],
    anyOf: [
      ["TUYA_COMMAND_ENDPOINT", "TUYA_ACCESS_TOKEN"],
      [
        "TUYA_API_BASE_URL",
        "TUYA_ACCESS_ID",
        "TUYA_ACCESS_SECRET",
        "TUYA_PROJECT_ID",
        "TUYA_SYNC_DEVICE_HEALTH_ENDPOINT",
      ],
    ],
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

  const invalid = formatInvalidValues(group.keys || []);
  if (invalid.length) {
    const message = `${group.name}: replace placeholder values for ${invalid.join(", ")}`;
    if (strict) failures.push(message);
    else warnings.push(message);
    return;
  }

  passes.push(`${group.name}: all required values are present`);
}

function checkAnyOfGroup(group, strict = true) {
  const satisfied = group.anyOf.some((option) =>
    option.every((key) => isPresent(key) && !getPlaceholderReason(key))
  );
  if (satisfied) {
    passes.push(`${group.name}: at least one valid credential set is present`);
    return;
  }

  const choices = group.anyOf.map((option) => option.join(" + ")).join(" OR ");
  const invalid = formatInvalidValues(group.anyOf.flat());
  const message = invalid.length
    ? `${group.name}: replace placeholder values for ${invalid.join(", ")}`
    : `${group.name}: missing one of ${choices}`;
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

checkMapProvider();

function hasIotProviderCredentialSet(provider) {
  return provider.anyOf.some((option) =>
    option.every((key) => isPresent(key) && !getPlaceholderReason(key))
  );
}

const readyIotProviders = iotProviders.filter(hasIotProviderCredentialSet);
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
