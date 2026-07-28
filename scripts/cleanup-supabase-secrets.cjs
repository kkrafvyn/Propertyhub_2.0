#!/usr/bin/env node
/**
 * Remove deprecated Supabase secrets (e.g. Flutterwave).
 * Usage: npm run supabase:cleanup-secrets
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { loadProjectEnv } = require("./load-project-env.cjs");

const DEPRECATED_SECRETS = [
  "FLUTTERWAVE_SECRET_KEY",
  "VITE_FLUTTERWAVE_PUBLIC_KEY",
];

const projectRoot = path.resolve(__dirname, "..");
const env = loadProjectEnv();
const projectRef = env.SUPABASE_PROJECT_REF;

if (!env.SUPABASE_ACCESS_TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in root .env");
  process.exit(1);
}

if (!projectRef) {
  console.error("Missing SUPABASE_PROJECT_REF in root .env");
  process.exit(1);
}

function run(args, label) {
  console.log(`\n==> ${label}`);
  const result = spawnSync("npx", ["supabase", ...args], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN,
    },
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run(
  ["login", "--token", env.SUPABASE_ACCESS_TOKEN],
  "Authenticate CLI",
);
run(
  ["link", "--project-ref", projectRef, "--workdir", ".", "--yes"],
  "Link project",
);

for (const secret of DEPRECATED_SECRETS) {
  console.log(`\n==> Unset ${secret}`);
  const result = spawnSync(
    "npx",
    ["supabase", "secrets", "unset", secret, "--project-ref", projectRef, "--workdir", "."],
    {
      cwd: projectRoot,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN,
      },
    },
  );
  if (result.status !== 0) {
    console.warn(`Skipped ${secret} (may not exist on project).`);
  }
}

console.log("\nDeprecated secrets cleanup complete.");
