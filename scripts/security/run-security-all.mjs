#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const steps = [
  ["security:actions-audit", "Actions audit"],
  ["security:sca", "SCA"],
  ["security:unit", "Security unit tests"],
  ["security:secrets:strict", "Secrets scan"],
  ["security:sast:strict", "SAST"],
  ["security:container:strict", "Filesystem scan"],
];

let hadFailure = false;

for (const [script, label] of steps) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) hadFailure = true;
}

console.log("\n=== Summary ===");
spawnSync("npm", ["run", "security:summary"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(hadFailure ? 1 : 0);
