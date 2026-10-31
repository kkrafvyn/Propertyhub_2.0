#!/usr/bin/env node
/**
 * Render all BaytMiftah brag-output variants (Hyperframes).
 * Usage: node scripts/render-brag-variants.mjs [--quality draft|high]
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

const jobs = [
  { dir: "composition", out: "brag.mp4" },
  { dir: "composition-vertical", out: "brag-vertical.mp4" },
  { dir: "composition-consumer-iphone", out: "brag-consumer-iphone.mp4" },
  { dir: "composition-workspace-iphone", out: "brag-workspace-iphone.mp4" },
];

for (const { dir, out } of jobs) {
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

console.log("\nAll brag renders finished.");
