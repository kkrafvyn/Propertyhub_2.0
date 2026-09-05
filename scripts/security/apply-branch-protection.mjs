#!/usr/bin/env node
/**
 * Apply branch protection to main when GitHub plan supports it.
 * Usage: npm run security:branch-protection
 */
import { spawnSync } from "node:child_process";

const REPO = process.env.GITHUB_REPOSITORY || "kkrafvyn/Propertyhub_2.0";
const BRANCH = process.env.PROTECTION_BRANCH || "main";

const REQUIRED_CHECKS = [
  "build-and-test",
  "Analyze (javascript-typescript)",
  "security-sast",
  "security-sca",
  "security-secrets",
  "security-summary",
];

const payload = {
  required_status_checks: {
    strict: true,
    contexts: REQUIRED_CHECKS,
  },
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: false,
    required_approving_review_count: 1,
  },
  restrictions: null,
  required_linear_history: false,
  allow_force_pushes: false,
  allow_deletions: false,
};

function main() {
  console.log(`Applying branch protection to ${REPO}@${BRANCH}…`);
  console.log("Required checks:");
  for (const check of REQUIRED_CHECKS) console.log(`  - ${check}`);

  const result = spawnSync(
    "gh",
    ["api", "-X", "PUT", `repos/${REPO}/branches/${BRANCH}/protection`, "--input", "-"],
    {
      input: JSON.stringify(payload),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32",
    },
  );

  if (result.status === 0) {
    console.log("\nBranch protection applied successfully.");
    return;
  }

  const message = `${result.stderr || result.stdout}`;
  if (/Upgrade to GitHub Pro|make this repository public/i.test(message)) {
    console.error("\nBranch protection is not available on this plan for private repositories.");
    console.error("Options:");
    console.error("  1. Upgrade to GitHub Pro: https://github.com/settings/billing/plans");
    console.error("  2. Move the repo to a GitHub Organization on Team/Enterprise");
    console.error("  3. Re-run this script after upgrading: npm run security:branch-protection");
    console.error("\nRequired checks to enable manually:");
    for (const check of REQUIRED_CHECKS) console.log(`  - ${check}`);
    process.exit(2);
  }

  console.error(message);
  process.exit(result.status ?? 1);
}

main();
