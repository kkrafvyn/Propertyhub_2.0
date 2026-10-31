#!/usr/bin/env node
/**
 * Render BaytMiftah ad compositions (listings phone, logo, compare, tagline).
 * Usage: node scripts/render-brag-ads.mjs [--quality draft|high] [--only name]
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "brag-output");

const quality = process.argv.includes("--quality")
  ? process.argv[process.argv.indexOf("--quality") + 1]
  : "high";

const onlyArg = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1]
  : null;

const jobs = [
  { dir: "composition-ad-listings-iphone", out: "ad-listings-iphone.mp4", key: "listings" },
  { dir: "composition-ad-logo", out: "ad-logo.mp4", key: "logo" },
  { dir: "composition-ad-logo-square", out: "ad-logo-square.mp4", key: "logo-square" },
  { dir: "composition-ad-compare", out: "ad-compare.mp4", key: "compare" },
  { dir: "composition-ad-tagline", out: "ad-tagline.mp4", key: "tagline" },
];

for (const { dir, out, key } of jobs) {
  if (onlyArg && key !== onlyArg && dir !== onlyArg) continue;
  const cwd = path.join(OUT, dir);
  const index = path.join(cwd, "index.html");
  if (!existsSync(index)) {
    console.error(`Skip ${dir}: missing index.html`);
    continue;
  }
  const output = path.join(OUT, out);
  console.log(`\n=== Rendering ${out} (${quality}) ===\n`);
  execFileSync(
    "npx hyperframes render --quality " +
      quality +
      " --browser-timeout 120 --output " +
      JSON.stringify(output),
    { cwd, stdio: "inherit", env: process.env, shell: true },
  );
  console.log(`Done: ${output}`);
}

console.log("\nAll ad renders finished.");
