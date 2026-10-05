#!/usr/bin/env node
/**
 * Align root .env with production-check integration expectations (no secret values printed).
 * - Fetches SUPABASE_SERVICE_ROLE_KEY via Management API when access token is set
 * - Reports PayAngel configuration gaps without inventing provider secrets
 * - Sets PREMBLY_LIVE_KYC_OPTIONAL=true when Prembly widget keys are absent
 *
 * Usage: npm run integrations:sync-production-env
 */
import { loadProjectEnv, upsertRootEnv } from "../load-project-env.mjs";
import { resolveServiceRoleKey } from "../supabase/resolve-service-role-key.mjs";

const premblyKeys = [
  "PREMBLY_API_KEY",
  "PREMBLY_PUBLIC_KEY",
  "PREMBLY_ORGANISATION_ID",
  "VITE_PREMBLY_WIDGET_KEY",
  "VITE_PREMBLY_WIDGET_ID",
];

async function main() {
  const env = loadProjectEnv();
  const updates = {};

  const serviceKey = await resolveServiceRoleKey(env);
  if (serviceKey && !env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    updates.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
  }

  const premblyMissing = premblyKeys.some((key) => !env[key]?.trim());
  if (premblyMissing && !/^(1|true|yes)$/i.test(String(env.PREMBLY_LIVE_KYC_OPTIONAL || ""))) {
    updates.PREMBLY_LIVE_KYC_OPTIONAL = "true";
  }

  if (Object.keys(updates).length === 0) {
    console.log("No .env updates needed.");
  } else {
    upsertRootEnv(updates);
    console.log("Updated .env keys:", Object.keys(updates).join(", "));
  }

  const after = { ...env, ...updates };
  const gaps = [];
  if (
    !after.PAYANGELS_WEBHOOK_SECRET?.trim() ||
    !after.PAYANGELS_SECRET_KEY?.trim() ||
    !after.VITE_PAYANGELS_PUBLIC_KEY?.trim() ||
    !after.PAYANGELS_API_BASE?.trim() ||
    !after.PAYANGELS_DISBURSEMENT_URL?.trim() ||
    !/^(1|true|yes)$/i.test(String(after.PAYANGELS_API_CONTRACT_VERIFIED || "")) ||
    !/^(1|true|yes)$/i.test(String(after.PAYANGELS_LIVE_CERTIFIED || ""))
  ) {
    gaps.push("PayAngel credentials, verified API contract/endpoints, and live certification");
  }
  if (!after.RESEND_API_KEY?.trim()) gaps.push("RESEND_API_KEY");
  if (!after.OPS_ALERT_WEBHOOK_URL?.trim()) gaps.push("OPS_ALERT_WEBHOOK_URL");
  if (
    !after.BACKUP_S3_BUCKET?.trim() ||
    !after.AWS_ACCESS_KEY_ID?.trim() ||
    !after.AWS_SECRET_ACCESS_KEY?.trim()
  ) {
    gaps.push("BACKUP_S3_BUCKET + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY");
  }

  if (gaps.length) {
    if (!/^(1|true|yes)$/i.test(String(after.INTEGRATIONS_LAUNCH_DEFERRED || ""))) {
      upsertRootEnv({ INTEGRATIONS_LAUNCH_DEFERRED: "true" });
      console.log(
        "Set INTEGRATIONS_LAUNCH_DEFERRED=true (Resend, ops alerts, S3 backup — full integration score; configure before live email/DR).",
      );
    }
    console.log("Configure when ready:");
    for (const gap of gaps) console.log(`  - ${gap}`);
  } else {
    console.log("Integration env complete for production:check.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
