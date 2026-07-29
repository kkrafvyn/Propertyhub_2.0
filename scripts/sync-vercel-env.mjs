#!/usr/bin/env node
/**
 * Sync VITE_* client env vars from root .env to Vercel (production, preview, development).
 *
 * Usage:
 *   npm run vercel:env
 *   npm run vercel:env -- --dry-run
 */
import { spawnSync } from "node:child_process";
import { CLIENT_KEYS } from "./env-schema.mjs";
import { loadProjectEnv } from "./load-project-env.mjs";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const environments = ["production", "preview", "development"];

function runVercel(argsList, input = "") {
  const result = spawnSync("npx", ["vercel", ...argsList], {
    input,
    encoding: "utf8",
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout?.trim() || "",
    stderr: result.stderr?.trim() || "",
    status: result.status,
  };
}

function main() {
  const env = loadProjectEnv();
  const entries = CLIENT_KEYS.map((key) => [key, env[key]?.trim() || ""]).filter(
    ([, value]) => value.length > 0,
  );

  if (!entries.length) {
    console.error("No VITE_* values found in .env to sync.");
    process.exit(1);
  }

  console.log(`Syncing ${entries.length} client env vars to Vercel...`);
  if (dryRun) {
    for (const [key, value] of entries) {
      console.log(`  ${key}=${value.length > 8 ? `${value.slice(0, 4)}…` : value}`);
    }
    return;
  }

  const whoami = runVercel(["whoami"]);
  if (!whoami.ok) {
    console.error("Vercel CLI not authenticated. Run: npx vercel login");
    process.exit(1);
  }

  let updated = 0;
  let failed = 0;

  for (const [key, value] of entries) {
    for (const target of environments) {
      runVercel(["env", "rm", key, target, "--yes"]);

      const add = runVercel(["env", "add", key, target], `${value}\n`);
      if (add.ok) {
        updated += 1;
        console.log(`  ✓ ${key} → ${target}`);
      } else {
        failed += 1;
        console.error(`  ✗ ${key} → ${target}: ${add.stderr || add.stdout}`);
      }
    }
  }

  console.log(`\nDone. ${updated} set, ${failed} failed.`);
  if (failed > 0) process.exit(1);

  console.log("\nRedeploy for changes to take effect:");
  console.log("  npx vercel --prod");
}

main();
