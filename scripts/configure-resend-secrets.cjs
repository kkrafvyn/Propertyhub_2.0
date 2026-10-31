#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { loadProjectEnv, writeServerSecretsFile } = require("./load-project-env.cjs");

const projectRoot = path.resolve(__dirname, "..");
const env = loadProjectEnv();
const projectRef = env.SUPABASE_PROJECT_REF || process.env.SUPABASE_PROJECT_REF;

if (!env.RESEND_API_KEY || !env.RESEND_API_KEY.trim()) {
  console.error(
    [
      "RESEND_API_KEY is missing in .env.",
      "",
      "1. Create an API key at https://resend.com/api-keys",
      "2. Add to .env:",
      "   RESEND_API_KEY=re_...",
      "   NOTIFICATION_EMAIL_FROM=noreply@your-verified-domain.com",
      "   NOTIFICATION_EMAIL_REPLY_TO=support@your-domain.com",
      "3. Re-run: npm run supabase:secrets:resend",
    ].join("\n"),
  );
  process.exit(1);
}

if (!projectRef) {
  console.error("SUPABASE_PROJECT_REF is required in .env");
  process.exit(1);
}

if (env.SUPABASE_ACCESS_TOKEN) {
  process.env.SUPABASE_ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN;
}

const secretsFile = path.join(projectRoot, "supabase", ".env.payments");
writeServerSecretsFile(secretsFile, env);

const secretsFileQuoted = JSON.stringify(secretsFile);
const result = spawnSync(
  `npx --yes supabase secrets set --env-file ${secretsFileQuoted} --project-ref ${JSON.stringify(projectRef)}`,
  { cwd: projectRoot, stdio: "inherit", shell: true },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("\nResend secrets applied to Supabase project:", projectRef);
console.log("Deploy enrollment email function:");
console.log("  npm run supabase:deploy:payments -- --skip-db");

const wire = spawnSync("npm", ["run", "integrations:wire"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
});

process.exit(wire.status ?? 0);
