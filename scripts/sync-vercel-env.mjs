#!/usr/bin/env node
/**
 * Sync VITE_* client env vars from root .env to Vercel (production, preview, development).
 *
 * Usage:
 *   npm run vercel:env
 *   npm run vercel:env -- --dry-run
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CLIENT_KEYS } from "./env-schema.mjs";
import { loadProjectEnv, PROJECT_ROOT } from "./load-project-env.mjs";

const vercelDir = path.join(PROJECT_ROOT, ".vercel");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const environments = ["production", "preview", "development"];

function runVercel(argsList) {
  const result = spawnSync("npx", ["vercel", ...argsList], {
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    cwd: PROJECT_ROOT,
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

  const projectFile = path.join(vercelDir, "project.json");
  const projectId = env.VERCEL_PROJECT_ID?.trim();
  if (!fs.existsSync(projectFile) && !projectId) {
    console.error(
      "No linked Vercel project (.vercel/project.json). Run: npx vercel link\n" +
        "Or set VERCEL_PROJECT_ID in .env and re-run.",
    );
    process.exit(1);
  }

  const projectArgs = projectId ? ["--project", projectId] : [];

  let updated = 0;
  let failed = 0;

  for (const [key, value] of entries) {
    for (const target of environments) {
      runVercel(["env", "rm", key, target, "--yes", ...projectArgs]);

      const add = runVercel([
        "env",
        "add",
        key,
        target,
        "--value",
        value,
        "--yes",
        ...projectArgs,
      ]);
      if (add.ok) {
        updated += 1;
        console.log(`  ✓ ${key} → ${target}`);
      } else {
        failed += 1;
        const detail = [add.stderr, add.stdout].filter(Boolean).join("\n").trim();
        console.error(`  ✗ ${key} → ${target}: ${detail || "vercel env add failed"}`);
      }
    }
  }

  console.log(`\nDone. ${updated} set, ${failed} failed.`);
  if (failed > 0) process.exit(1);

  console.log("\nRedeploy for changes to take effect:");
  console.log("  npx vercel --prod");
}

main();
