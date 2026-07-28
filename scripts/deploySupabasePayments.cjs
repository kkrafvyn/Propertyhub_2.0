#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const {
  loadProjectEnv,
  writeServerSecretsFile,
} = require("./load-project-env.cjs");

const projectRoot = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

const EDGE_FUNCTIONS = [
  { name: "initialize-paystack-payment" },
  { name: "verify-paystack-payment" },
  { name: "initiate-paystack-refund" },
  { name: "paystack-webhook", noVerifyJwt: true },
  { name: "initialize-stripe-payment" },
  { name: "verify-stripe-payment" },
  { name: "parse-search-query" },
  { name: "dispatch-notification" },
  { name: "automation-dispatcher", noVerifyJwt: true },
  { name: "send-organization-invite" },
];

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
      "  node scripts/deploySupabasePayments.cjs [--project-ref <ref>] [--env-file <file>]",
      "                                        [--skip-secrets] [--skip-db]",
      "",
      "Auth (required on Windows):",
      "  Add SUPABASE_ACCESS_TOKEN to root .env",
      "  Or run: npm run supabase:login",
      "",
      "Examples:",
      "  npm run supabase:login",
      "  npm run supabase:deploy:payments -- --skip-db",
    ].join("\n")
  );
}

const projectEnv = loadProjectEnv();
if (projectEnv.SUPABASE_ACCESS_TOKEN) {
  process.env.SUPABASE_ACCESS_TOKEN = projectEnv.SUPABASE_ACCESS_TOKEN;
}
const projectRef =
  readFlag("--project-ref") || projectEnv.SUPABASE_PROJECT_REF || process.env.SUPABASE_PROJECT_REF;
const generatedSecretsFile = path.join("supabase", ".env.payments");
if (!readFlag("--env-file") && !process.env.SUPABASE_SECRETS_ENV_FILE) {
  writeServerSecretsFile(path.join(projectRoot, generatedSecretsFile), projectEnv);
}
const envFile =
  readFlag("--env-file") ||
  process.env.SUPABASE_SECRETS_ENV_FILE ||
  generatedSecretsFile;
const skipSecrets = hasFlag("--skip-secrets");
const skipDb = hasFlag("--skip-db") || !hasFlag("--with-db");

if (hasFlag("--help") || hasFlag("-h")) {
  printUsage();
  process.exit(0);
}

if (!projectRef) {
  printUsage();
  process.exit(1);
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error(
    [
      "Missing SUPABASE_ACCESS_TOKEN.",
      "",
      "Windows interactive `supabase login` often fails. Use token auth instead:",
      "  1. Run: npm run supabase:login",
      "  2. Or add SUPABASE_ACCESS_TOKEN=sbp_... to root .env",
      "     Create token: https://supabase.com/dashboard/account/tokens",
    ].join("\n")
  );
  process.exit(1);
}

if (!skipSecrets) {
  const resolvedEnvFile = path.resolve(projectRoot, envFile);
  if (!fs.existsSync(resolvedEnvFile)) {
    console.error(
      `Secrets file not found at ${resolvedEnvFile}. Add server keys to root .env or pass --env-file.`
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
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

runSupabase(
  ["login", "--token", process.env.SUPABASE_ACCESS_TOKEN],
  "Authenticate CLI with access token"
);
runSupabase(["link", "--project-ref", projectRef, "--workdir", ".", "--yes"], "Link project");

if (!skipDb) {
  runSupabase(
    ["db", "push", "--include-all", "--workdir", ".", "--yes"],
    "Apply remote migrations"
  );
} else {
  console.log("\n==> Skipping db push (schema already applied via npm run db:reset:apply)");
}

if (!skipSecrets) {
  runSupabase(
    ["secrets", "set", "--project-ref", projectRef, "--env-file", envFile, "--workdir", "."],
    "Upload Edge Function secrets"
  );
}

for (const fn of EDGE_FUNCTIONS) {
  const deployArgs = [
    "functions",
    "deploy",
    fn.name,
    "--project-ref",
    projectRef,
    "--workdir",
    ".",
    "--use-api",
  ];

  if (fn.noVerifyJwt) {
    deployArgs.push("--no-verify-jwt");
  }

  runSupabase(deployArgs, `Deploy ${fn.name}`);
}

console.log("\nSupabase backend deployment complete.");
