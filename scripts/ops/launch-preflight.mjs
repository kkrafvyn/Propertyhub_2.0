#!/usr/bin/env node
/**
 * Non-destructive launch readiness summary (repo + local env).
 * Does not print secret values.
 */
import { execSync } from "node:child_process";

const steps = [
  { name: "production:check:repo", cmd: "npm run production:check:repo" },
  { name: "workspace:audit:shell", cmd: "npm run workspace:audit:shell" },
  { name: "supabase:audit:edge", cmd: "npm run supabase:audit:edge", optional: true },
];

console.log("BaytMiftah launch preflight\n");

let failed = 0;
for (const step of steps) {
  process.stdout.write(`→ ${step.name}... `);
  try {
    execSync(step.cmd, { stdio: "pipe", encoding: "utf8" });
    console.log("ok");
  } catch (error) {
    if (step.optional) {
      console.log("skipped (optional — check Supabase CLI / network)");
    } else {
      console.log("FAILED");
      failed += 1;
      const out = error.stdout || error.stderr || "";
      if (out) console.log(out.slice(0, 2000));
    }
  }
}

console.log("\nManual tracks: docs/deployment/LAUNCH_OPERATOR_RUNBOOK.md");
console.log("P0 acceptance: docs/ops/P0_ADMIN_ACCEPTANCE.md");
process.exit(failed > 0 ? 1 : 0);
