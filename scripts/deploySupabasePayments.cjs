#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

function readFlag(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function hasFlag(name) {
  return args.includes(name);
}

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node scripts/deploySupabasePayments.cjs --project-ref <ref> [--env-file <file>] [--skip-secrets]",
      "",
      "Examples:",
      "  node scripts/deploySupabasePayments.cjs --project-ref paobdnhpjmqsovideexo --env-file supabase/.env.payments",
      "  npm run supabase:deploy:payments -- --project-ref paobdnhpjmqsovideexo --env-file supabase/.env.payments",
    ].join("\n")
  );
}

const projectRef = readFlag("--project-ref") || process.env.SUPABASE_PROJECT_REF;
const envFile =
  readFlag("--env-file") ||
  process.env.SUPABASE_SECRETS_ENV_FILE ||
  path.join("supabase", ".env.payments");
const skipSecrets = hasFlag("--skip-secrets");

if (hasFlag("--help") || hasFlag("-h")) {
  printUsage();
  process.exit(0);
}

if (!projectRef) {
  printUsage();
  process.exit(1);
}

if (!skipSecrets) {
  const resolvedEnvFile = path.resolve(projectRoot, envFile);
  if (!fs.existsSync(resolvedEnvFile)) {
    console.error(
      `Secrets file not found at ${resolvedEnvFile}. Copy supabase/.env.payments.example to supabase/.env.payments or pass --env-file.`
    );
    process.exit(1);
  }
}

function runSupabase(commandArgs, label) {
  console.log(`\n==> ${label}`);
  const result = spawnSync("npx", ["supabase", ...commandArgs], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

runSupabase(["link", "--project-ref", projectRef, "--workdir", ".", "--yes"], "Link project");
runSupabase(
  ["db", "push", "--include-all", "--workdir", ".", "--yes"],
  "Apply remote migrations"
);

if (!skipSecrets) {
  runSupabase(
    ["secrets", "set", "--project-ref", projectRef, "--env-file", envFile, "--workdir", "."],
    "Upload Edge Function secrets"
  );
}

runSupabase(
  ["functions", "deploy", "initialize-property-payment", "--project-ref", projectRef, "--workdir", ".", "--use-api"],
  "Deploy initialize-property-payment"
);
runSupabase(
  ["functions", "deploy", "verify-property-payment", "--project-ref", projectRef, "--workdir", ".", "--use-api"],
  "Deploy verify-property-payment"
);
runSupabase(
  [
    "functions",
    "deploy",
    "initialize-organization-subscription",
    "--project-ref",
    projectRef,
    "--workdir",
    ".",
    "--use-api",
  ],
  "Deploy initialize-organization-subscription"
);
runSupabase(
  [
    "functions",
    "deploy",
    "verify-organization-subscription",
    "--project-ref",
    projectRef,
    "--workdir",
    ".",
    "--use-api",
  ],
  "Deploy verify-organization-subscription"
);
runSupabase(
  [
    "functions",
    "deploy",
    "manage-organization-subscription",
    "--project-ref",
    projectRef,
    "--workdir",
    ".",
    "--use-api",
  ],
  "Deploy manage-organization-subscription"
);
runSupabase(
  ["functions", "deploy", "send-organization-invite", "--project-ref", projectRef, "--workdir", ".", "--use-api"],
  "Deploy send-organization-invite"
);
runSupabase(
  ["functions", "deploy", "initialize-paystack-payment", "--project-ref", projectRef, "--workdir", ".", "--use-api"],
  "Deploy legacy initialize-paystack-payment"
);
runSupabase(
  ["functions", "deploy", "verify-paystack-payment", "--project-ref", projectRef, "--workdir", ".", "--use-api"],
  "Deploy legacy verify-paystack-payment"
);
runSupabase(
  ["functions", "deploy", "initiate-paystack-refund", "--project-ref", projectRef, "--workdir", ".", "--use-api"],
  "Deploy initiate-paystack-refund"
);
runSupabase(
  ["functions", "deploy", "manage-property-escrow", "--project-ref", projectRef, "--workdir", ".", "--use-api"],
  "Deploy manage-property-escrow"
);
runSupabase(
  ["functions", "deploy", "manage-smart-access", "--project-ref", projectRef, "--workdir", ".", "--use-api"],
  "Deploy manage-smart-access"
);
runSupabase(
  [
    "functions",
    "deploy",
    "payment-webhook",
    "--project-ref",
    projectRef,
    "--workdir",
    ".",
    "--use-api",
    "--no-verify-jwt",
  ],
  "Deploy payment-webhook"
);
runSupabase(
  [
    "functions",
    "deploy",
    "paystack-webhook",
    "--project-ref",
    projectRef,
    "--workdir",
    ".",
    "--use-api",
    "--no-verify-jwt",
  ],
  "Deploy paystack-webhook"
);
runSupabase(
  [
    "functions",
    "deploy",
    "flutterwave-webhook",
    "--project-ref",
    projectRef,
    "--workdir",
    ".",
    "--use-api",
    "--no-verify-jwt",
  ],
  "Deploy flutterwave-webhook"
);
runSupabase(
  [
    "functions",
    "deploy",
    "public-verification-key",
    "--project-ref",
    projectRef,
    "--workdir",
    ".",
    "--use-api",
    "--no-verify-jwt",
  ],
  "Deploy public-verification-key"
);
runSupabase(
  [
    "functions",
    "deploy",
    "anchor-integrity-audit",
    "--project-ref",
    projectRef,
    "--workdir",
    ".",
    "--use-api",
    "--no-verify-jwt",
  ],
  "Deploy anchor-integrity-audit"
);

console.log("\nSupabase payment deployment complete.");
