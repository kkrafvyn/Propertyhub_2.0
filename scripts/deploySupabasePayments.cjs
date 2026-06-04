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
      "  node scripts/deploySupabasePayments.cjs --project-ref <ref> [--env-file <file>] [--skip-secrets] [--dry-run]",
      "",
      "Examples:",
      "  node scripts/deploySupabasePayments.cjs --project-ref paobdnhpjmqsovideexo --env-file supabase/.env.payments",
      "  npm run supabase:deploy:payments -- --project-ref paobdnhpjmqsovideexo --env-file supabase/.env.payments",
      "  npm run supabase:deploy:functions -- --dry-run --skip-secrets",
    ].join("\n")
  );
}

const projectRef = readFlag("--project-ref") || process.env.SUPABASE_PROJECT_REF;
const envFile =
  readFlag("--env-file") ||
  process.env.SUPABASE_SECRETS_ENV_FILE ||
  path.join("supabase", ".env.payments");
const skipSecrets = hasFlag("--skip-secrets");
const dryRun = hasFlag("--dry-run");

if (hasFlag("--help") || hasFlag("-h")) {
  printUsage();
  process.exit(0);
}

if (!projectRef && !dryRun) {
  printUsage();
  process.exit(1);
}

if (!skipSecrets && !dryRun) {
  const resolvedEnvFile = path.resolve(projectRoot, envFile);
  if (!fs.existsSync(resolvedEnvFile)) {
    console.error(
      `Secrets file not found at ${resolvedEnvFile}. Copy supabase/.env.payments.example to supabase/.env.payments or pass --env-file.`
    );
    process.exit(1);
  }
}

const targetProjectRef = projectRef || "<project-ref>";
const publicFunctionNames = new Set([
  "anchor-integrity-audit",
  "automation-dispatcher",
  "flutterwave-webhook",
  "payment-webhook",
  "paystack-webhook",
  "public-verification-key",
]);
const functionDeployments = [
  ["ai-concierge", "Deploy ai-concierge"],
  ["initialize-property-payment", "Deploy initialize-property-payment"],
  ["verify-property-payment", "Deploy verify-property-payment"],
  ["initialize-organization-subscription", "Deploy initialize-organization-subscription"],
  ["verify-organization-subscription", "Deploy verify-organization-subscription"],
  ["manage-organization-subscription", "Deploy manage-organization-subscription"],
  ["send-organization-invite", "Deploy send-organization-invite"],
  ["initialize-paystack-payment", "Deploy legacy initialize-paystack-payment"],
  ["verify-paystack-payment", "Deploy legacy verify-paystack-payment"],
  ["initiate-paystack-refund", "Deploy initiate-paystack-refund"],
  ["manage-property-escrow", "Deploy manage-property-escrow"],
  ["manage-smart-access", "Deploy manage-smart-access"],
  ["payment-webhook", "Deploy payment-webhook"],
  ["paystack-webhook", "Deploy paystack-webhook"],
  ["flutterwave-webhook", "Deploy flutterwave-webhook"],
  ["public-verification-key", "Deploy public-verification-key"],
  ["anchor-integrity-audit", "Deploy anchor-integrity-audit"],
  ["automation-dispatcher", "Deploy automation-dispatcher"],
  ["dispatch-notification", "Deploy dispatch-notification"],
];

function runSupabase(commandArgs, label) {
  console.log(`\n==> ${label}`);
  if (dryRun) {
    console.log(`npx supabase ${commandArgs.join(" ")}`);
    return;
  }

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

runSupabase(["link", "--project-ref", targetProjectRef, "--workdir", ".", "--yes"], "Link project");
runSupabase(
  ["db", "push", "--include-all", "--workdir", ".", "--yes"],
  "Apply remote migrations"
);

if (!skipSecrets) {
  runSupabase(
    ["secrets", "set", "--project-ref", targetProjectRef, "--env-file", envFile, "--workdir", "."],
    "Upload Edge Function secrets"
  );
}

for (const [functionName, label] of functionDeployments) {
  const commandArgs = [
    "functions",
    "deploy",
    functionName,
    "--project-ref",
    targetProjectRef,
    "--workdir",
    ".",
    "--use-api",
  ];

  if (publicFunctionNames.has(functionName)) {
    commandArgs.push("--no-verify-jwt");
  }

  runSupabase(commandArgs, label);
}

console.log(`\nSupabase function deployment ${dryRun ? "dry run" : "complete"}: ${functionDeployments.length} functions.`);
