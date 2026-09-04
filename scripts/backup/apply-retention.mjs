#!/usr/bin/env node
/**
 * Apply S3 retention policy — delete expired backup prefixes by tier.
 *
 * Usage:
 *   npm run backup:retention:apply
 *   npm run backup:retention:apply -- --dry-run
 */
import { loadProjectEnv } from "../load-project-env.mjs";
import { listBackupPrefixes, deleteBackupPrefix } from "./lib/s3-upload.mjs";
import { isBackupExpired, RETENTION_POLICY } from "./lib/retention.mjs";

function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadProjectEnv();

  console.log("\nApplying offsite backup retention...\n");

  const summary = [];

  for (const tier of Object.keys(RETENTION_POLICY)) {
    const policy = RETENTION_POLICY[tier];
    if (policy.retainForever) {
      console.log(`  ${tier}: retain forever (skip)`);
      continue;
    }

    const backupIds = await listBackupPrefixes(tier);
    const expired = backupIds.filter((backupId) => isBackupExpired(tier, backupId));

    console.log(`  ${tier}: ${backupIds.length} backups, ${expired.length} expired`);

    for (const backupId of expired) {
      if (args.dryRun) {
        console.log(`    [dry-run] would delete ${tier}/${backupId}`);
        continue;
      }

      const deletedObjects = await deleteBackupPrefix(tier, backupId);
      console.log(`    deleted ${tier}/${backupId} (${deletedObjects} objects)`);
    }

    summary.push({ tier, total: backupIds.length, expired: expired.length });
  }

  console.log("\n✓ Retention pass complete\n");
  return summary;
}

main().catch((error) => {
  console.error("\nRetention failed:", error.message || error);
  process.exit(1);
});
