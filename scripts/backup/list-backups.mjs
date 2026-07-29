#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { BACKUPS_ROOT } from "./lib/paths.mjs";

function main() {
  if (!fs.existsSync(BACKUPS_ROOT)) {
    console.log("No backups yet. Run: npm run backup");
    return;
  }

  const entries = fs
    .readdirSync(BACKUPS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const fullPath = path.join(BACKUPS_ROOT, entry.name);
      const manifestPath = path.join(fullPath, "backup-manifest.json");
      let manifest = null;
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      }
      const stat = fs.statSync(fullPath);
      return { name: entry.name, created: stat.mtime, manifest };
    })
    .sort((a, b) => b.created - a.created);

  if (!entries.length) {
    console.log("No backups found in backups/");
    return;
  }

  console.log("Available backups:\n");
  for (const entry of entries) {
    const tables = entry.manifest?.database?.tables?.length ?? "?";
    const buckets = entry.manifest?.storage?.buckets?.length ?? "?";
    console.log(`  ${entry.name}`);
    console.log(`    created: ${entry.created.toISOString()}`);
    console.log(`    tables: ${tables} · storage buckets: ${buckets}\n`);
  }
}

main();
