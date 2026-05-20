import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canProviderGoLive,
  getMissingSandboxScenarios,
  REQUIRED_PAYMENT_SANDBOX_SCENARIOS,
  summarizeLaunchReadiness,
  type ExternalProviderReadiness,
  type LaunchReadinessItem,
} from "./launch-readiness.service";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const migration = read("supabase/migrations/20260519233002_launch_readiness_and_moat_foundations.sql");
const statusDoc = read("docs/reference/baytmiftah-v4-checklist-status.md");

function buildItem(
  id: string,
  status: LaunchReadinessItem["status"],
  priority: LaunchReadinessItem["priority"] = "high"
): LaunchReadinessItem {
  return {
    id,
    workstream: "payment_sandbox",
    title: id,
    description: null,
    status,
    priority,
    owner_team: null,
    due_at: null,
    reviewed_by: null,
    reviewed_at: null,
    metadata: {},
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

describe("launch readiness foundations", () => {
  it("adds database foundations for every remaining launch workstream", () => {
    for (const tableName of [
      "launch_readiness_items",
      "launch_readiness_evidence",
      "external_provider_readiness",
      "provider_sandbox_events",
      "backup_restore_drills",
      "official_verification_checks",
      "hyperlocal_data_sources",
      "neighborhood_community_spaces",
      "community_contributions",
      "affordability_payment_plans",
      "ai_investment_scores",
      "referral_reward_ledger",
      "advanced_fraud_signals",
      "construction_progress_updates",
      "contributor_profiles",
      "contributor_payout_items",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${tableName}`);
      expect(migration).toContain(`ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY`);
    }

    for (const workstream of [
      "legal_compliance",
      "backup_restore",
      "payment_sandbox",
      "audit_anchoring",
      "iot_activation",
      "sms_ussd",
      "identity_verification",
      "land_registry",
      "hyperlocal_data",
      "community",
      "affordability_payments",
      "ai_investment",
      "referral_rewards",
      "fraud_prevention",
      "construction_intelligence",
      "user_monetization",
    ]) {
      expect(migration).toContain(workstream);
    }
  });

  it("keeps readiness records admin-governed and avoids public secret storage", () => {
    expect(migration).toContain("private.can_manage_platform()");
    expect(migration).toContain("private.is_organization_member");
    expect(migration).toContain("credential_storage TEXT NOT NULL DEFAULT 'server_env_or_vault'");
    expect(migration).not.toContain("secret_key");
    expect(migration).not.toContain("api_key TEXT");
  });

  it("summarizes launch readiness for admin dashboards", () => {
    const summary = summarizeLaunchReadiness([
      buildItem("legal", "approved", "critical"),
      buildItem("sandbox", "ready_for_review", "critical"),
      buildItem("iot", "blocked", "critical"),
      buildItem("community", "not_started", "medium"),
      buildItem("referral", "live", "medium"),
    ]);

    expect(summary.total).toBe(5);
    expect(summary.ready).toBe(2);
    expect(summary.inProgress).toBe(1);
    expect(summary.blocked).toBe(1);
    expect(summary.notStarted).toBe(1);
    expect(summary.percentReady).toBe(40);
    expect(summary.criticalBlocked).toBe(1);
  });

  it("requires all payment sandbox scenarios before a provider is complete", () => {
    const missing = getMissingSandboxScenarios(
      [
        { provider_key: "paystack", scenario: "successful_payment", status: "passed" },
        { provider_key: "paystack", scenario: "failed_payment", status: "passed" },
        { provider_key: "paystack", scenario: "refund", status: "failed" },
      ],
      "paystack"
    );

    expect(missing).toContain("refund");
    expect(missing).toContain("duplicate_webhook");
    expect(missing.length).toBe(REQUIRED_PAYMENT_SANDBOX_SCENARIOS.length - 2);
  });

  it("requires secrets, webhook, sandbox proof, and approval before provider go-live", () => {
    const provider = {
      has_live_secret: true,
      webhook_configured: true,
      sandbox_verified_at: new Date(0).toISOString(),
      status: "approved",
    } as ExternalProviderReadiness;

    expect(canProviderGoLive(provider)).toBe(true);
    expect(canProviderGoLive({ ...provider, webhook_configured: false })).toBe(false);
    expect(canProviderGoLive({ ...provider, status: "configured" })).toBe(false);
  });

  it("documents the new readiness foundation as locally complete", () => {
    expect(statusDoc).toContain("Launch readiness control plane");
    expect(statusDoc).toContain("Remaining workstreams now have auditable tables");
  });
});
