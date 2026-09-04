#!/usr/bin/env node
/**
 * Capture configuration inventory (no secret values) into a backup folder.
 */
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, writeJson } from "./lib/paths.mjs";

function listFilesRecursive(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, base));
    } else {
      files.push(path.relative(base, fullPath).replace(/\\/g, "/"));
    }
  }

  return files.sort();
}

function readEnvKeyInventory() {
  const examplePath = path.join(PROJECT_ROOT, ".env.example");
  if (!fs.existsSync(examplePath)) return [];

  return fs
    .readFileSync(examplePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.split("=")[0].trim());
}

export function snapshotConfigInventory(outputDir) {
  const configDir = path.join(outputDir, "configuration");
  fs.mkdirSync(configDir, { recursive: true });

  const inventory = {
    capturedAt: new Date().toISOString(),
    migrations: listFilesRecursive(path.join(PROJECT_ROOT, "supabase", "migrations")),
    edgeFunctions: listFilesRecursive(path.join(PROJECT_ROOT, "supabase", "functions")),
    githubWorkflows: listFilesRecursive(path.join(PROJECT_ROOT, ".github", "workflows")),
    envVarKeys: readEnvKeyInventory(),
    vercelConfigExists: fs.existsSync(path.join(PROJECT_ROOT, "vercel.json")),
    electronEntry: fs.existsSync(path.join(PROJECT_ROOT, "electron", "main.cjs")),
    notes: [
      "Secret values are never written into backups — only key names from .env.example.",
      "Apply migrations from database/migrations/ when restoring to a fresh Postgres instance.",
      "Redeploy edge functions from supabase/functions/ after database restore.",
    ],
  };

  writeJson(path.join(configDir, "inventory.json"), inventory);

  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"));
  writeJson(path.join(configDir, "package-scripts.json"), {
    backup: pkg.scripts?.backup,
    backupOffsite: pkg.scripts?.["backup:offsite"],
    backupRestoreDrill: pkg.scripts?.["backup:restore-drill"],
    dbPush: pkg.scripts?.["db:push"],
  });

  return inventory;
}

async function main() {
  const outputDir = process.argv[2];
  if (!outputDir) {
    console.error("Usage: node scripts/backup/snapshot-config.mjs <output-dir>");
    process.exit(1);
  }

  const inventory = snapshotConfigInventory(outputDir);
  console.log(`Configuration inventory written (${inventory.migrations.length} migrations, ${inventory.edgeFunctions.length} function files)`);
}

const isMain = import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/") || "\0");
if (isMain) {
  void main();
}
