#!/usr/bin/env node
/**
 * Lists workspace page modules missing WorkspacePageShell import.
 * Usage: node scripts/audit-workspace-shell.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const workspaceDir = join(process.cwd(), "src/app/pages/workspace");
const skip = new Set([
  "WorkspaceLayout.tsx",
  "WorkspaceEntry.tsx",
  "WorkspaceHost.tsx",
  "DesktopGateway.tsx",
  "DesktopMyWorkHome.tsx",
  "EnrollmentStatusPage.tsx",
  "CompanySetupWizard.tsx",
  "WorkspaceEntry.test.tsx",
  "NotificationSettings.test.tsx",
  "WorkspaceListings.test.tsx",
]);

const files = (await readdir(workspaceDir)).filter(
  (f) => f.endsWith(".tsx") && !skip.has(f),
);

const missing = [];
const has = [];

for (const file of files) {
  const text = await readFile(join(workspaceDir, file), "utf8");
  if (text.includes("WorkspacePageShell")) has.push(file);
  else missing.push(file);
}

const jsonMode = process.argv.includes("--json");
const payload = {
  total: files.length,
  hasShell: has.length,
  missing: missing.sort(),
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`Workspace modules: ${payload.total}`);
  console.log(`With WorkspacePageShell: ${payload.hasShell}`);
  console.log(`Missing shell: ${payload.missing.length}`);
  if (payload.missing.length) {
    console.log("\nMissing:");
    for (const f of payload.missing) console.log(`  - ${f}`);
  }
}
