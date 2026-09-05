#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "dist-desktop");
const PUBLIC_DOWNLOADS = path.join(ROOT, "public", "downloads");
const TARGET_NAME = "baytmiftah-desktop-setup.exe";

function findInstaller() {
  if (!existsSync(OUTPUT_DIR)) return null;

  const direct = path.join(OUTPUT_DIR, TARGET_NAME);
  if (existsSync(direct)) return direct;

  for (const entry of readdirSync(OUTPUT_DIR)) {
    if (entry.endsWith(".exe") && entry.toLowerCase().includes("setup")) {
      return path.join(OUTPUT_DIR, entry);
    }
  }

  for (const entry of readdirSync(OUTPUT_DIR)) {
    if (entry.endsWith(".exe")) return path.join(OUTPUT_DIR, entry);
  }

  return null;
}

function main() {
  const installer = findInstaller();
  if (!installer) {
    console.error("No desktop installer found in dist-desktop/. Run: npm run desktop:pack:win");
    process.exit(1);
  }

  mkdirSync(PUBLIC_DOWNLOADS, { recursive: true });
  const target = path.join(PUBLIC_DOWNLOADS, TARGET_NAME);
  copyFileSync(installer, target);
  console.log(`Published desktop installer:\n  ${target}`);
}

main();
