import { supabase } from "./supabase";

const db = supabase as any;

export type LaunchWorkstream =
  | "legal_compliance"
  | "backup_restore"
  | "payment_sandbox"
  | "audit_anchoring"
  | "iot_activation"
  | "sms_ussd"
  | "identity_verification"
  | "land_registry"
  | "hyperlocal_data"
  | "community"
  | "affordability_payments"
  | "ai_investment"
  | "referral_rewards"
  | "fraud_prevention"
  | "construction_intelligence"
  | "user_monetization";

export type LaunchStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "ready_for_review"
  | "approved"
  | "live"
  | "rejected";

export type ProviderCategory =
  | "payment"
  | "iot"
  | "sms"
  | "ussd"
  | "identity"
  | "registry"
  | "hyperlocal_data"
  | "ai"
  | "fraud"
  | "communications";

export interface LaunchReadinessItem {
  id: string;
  workstream: LaunchWorkstream;
  title: string;
  description: string | null;
  status: LaunchStatus;
  priority: "critical" | "high" | "medium" | "low";
  owner_team: string | null;
  due_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExternalProviderReadiness {
  id: string;
  provider_category: ProviderCategory;
  provider_key: string;
  display_name: string;
  environment: "sandbox" | "production";
  status:
    | "not_configured"
    | "credentials_pending"
    | "configured"
    | "sandbox_testing"
    | "approved"
    | "live"
    | "disabled";
  fallback_provider_key: string | null;
  has_live_secret: boolean;
  webhook_configured: boolean;
  sandbox_verified_at: string | null;
  production_verified_at: string | null;
  last_checked_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
}

export interface ProviderSandboxEventInput {
  providerReadinessId?: string | null;
  providerKey: string;
  scenario:
    | "successful_payment"
    | "failed_payment"
    | "duplicate_webhook"
    | "subscription_renewal"
    | "subscription_failure"
    | "refund"
    | "chargeback"
    | "transfer_release"
    | "provider_fallback"
    | "device_command"
    | "sms_delivery"
    | "ussd_handoff"
    | "identity_verification"
    | "registry_check"
    | "other";
  status?: "pending" | "passed" | "failed" | "blocked";
  reference?: string | null;
  observedAt?: string | null;
  evidence?: Record<string, unknown>;
  createdBy?: string | null;
}

export interface ReadinessSummary {
  total: number;
  ready: number;
  blocked: number;
  inProgress: number;
  notStarted: number;
  percentReady: number;
  criticalBlocked: number;
  byWorkstream: Record<LaunchWorkstream, LaunchReadinessItem[]>;
}

export const LAUNCH_WORKSTREAM_LABELS: Record<LaunchWorkstream, string> = {
  legal_compliance: "Legal and compliance signoff",
  backup_restore: "Backup and restore proof",
  payment_sandbox: "Provider sandbox testing",
  audit_anchoring: "Scheduled audit anchoring",
  iot_activation: "Live IoT provider activation",
  sms_ussd: "SMS and USSD activation",
  identity_verification: "Ghana Card and liveness verification",
  land_registry: "Land Registry and Lands Commission checks",
  hyperlocal_data: "Hyperlocal data feeds",
  community: "Community features",
  affordability_payments: "Affordability payment plans",
  ai_investment: "AI investment scoring",
  referral_rewards: "Referral rewards",
  fraud_prevention: "Advanced fraud prevention",
  construction_intelligence: "Construction intelligence",
  user_monetization: "User monetization",
};

export const REQUIRED_PAYMENT_SANDBOX_SCENARIOS = [
  "successful_payment",
  "failed_payment",
  "duplicate_webhook",
  "subscription_renewal",
  "subscription_failure",
  "refund",
  "chargeback",
  "transfer_release",
  "provider_fallback",
] as const;

function isReadyStatus(status: LaunchStatus) {
  return status === "approved" || status === "live";
}

export function summarizeLaunchReadiness(items: LaunchReadinessItem[]): ReadinessSummary {
  const byWorkstream = Object.keys(LAUNCH_WORKSTREAM_LABELS).reduce((acc, key) => {
    acc[key as LaunchWorkstream] = [];
    return acc;
  }, {} as Record<LaunchWorkstream, LaunchReadinessItem[]>);

  for (const item of items) {
    byWorkstream[item.workstream]?.push(item);
  }

  const ready = items.filter((item) => isReadyStatus(item.status)).length;
  const blocked = items.filter((item) => item.status === "blocked" || item.status === "rejected").length;
  const inProgress = items.filter((item) =>
    ["in_progress", "ready_for_review"].includes(item.status)
  ).length;
  const notStarted = items.filter((item) => item.status === "not_started").length;
  const criticalBlocked = items.filter(
    (item) => item.priority === "critical" && ["blocked", "rejected", "not_started"].includes(item.status)
  ).length;

  return {
    total: items.length,
    ready,
    blocked,
    inProgress,
    notStarted,
    percentReady: items.length ? Math.round((ready / items.length) * 100) : 0,
    criticalBlocked,
    byWorkstream,
  };
}

export function getMissingSandboxScenarios(
  events: Array<{ provider_key: string; scenario: string; status: string }>,
  providerKey: string
) {
  const passed = new Set(
    events
      .filter((event) => event.provider_key === providerKey && event.status === "passed")
      .map((event) => event.scenario)
  );

  return REQUIRED_PAYMENT_SANDBOX_SCENARIOS.filter((scenario) => !passed.has(scenario));
}

export function canProviderGoLive(provider: ExternalProviderReadiness) {
  return (
    provider.has_live_secret &&
    provider.webhook_configured &&
    Boolean(provider.sandbox_verified_at) &&
    ["approved", "live"].includes(provider.status)
  );
}

export const launchReadinessService = {
  async getReadinessItems() {
    const { data, error } = await db
      .from("launch_readiness_items")
      .select("*")
      .order("priority", { ascending: true })
      .order("workstream", { ascending: true });

    if (error) throw error;
    return (data || []) as LaunchReadinessItem[];
  },

  async getReadinessSummary() {
    const items = await this.getReadinessItems();
    return summarizeLaunchReadiness(items);
  },

  async updateReadinessStatus(input: {
    itemId: string;
    status: LaunchStatus;
    reviewedBy?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("launch_readiness_items")
      .update({
        status: input.status,
        reviewed_by: input.reviewedBy || null,
        reviewed_at: ["approved", "rejected", "live"].includes(input.status)
          ? new Date().toISOString()
          : null,
        metadata: input.metadata || {},
      })
      .eq("id", input.itemId)
      .select()
      .single();

    if (error) throw error;
    return data as LaunchReadinessItem;
  },

  async submitEvidence(input: {
    readinessItemId: string;
    organizationId?: string | null;
    submittedBy?: string | null;
    evidenceType:
      | "legal_document"
      | "provider_dashboard"
      | "sandbox_log"
      | "backup_restore_log"
      | "security_report"
      | "data_source_contract"
      | "device_test_log"
      | "policy_signoff"
      | "manual_sop"
      | "other";
    title: string;
    summary?: string | null;
    externalUrl?: string | null;
    storagePath?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("launch_readiness_evidence")
      .insert({
        readiness_item_id: input.readinessItemId,
        organization_id: input.organizationId || null,
        submitted_by: input.submittedBy || null,
        evidence_type: input.evidenceType,
        title: input.title,
        summary: input.summary || null,
        external_url: input.externalUrl || null,
        storage_path: input.storagePath || null,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getProviderReadiness(category?: ProviderCategory) {
    let query = db
      .from("external_provider_readiness")
      .select("*")
      .order("provider_category", { ascending: true })
      .order("provider_key", { ascending: true });

    if (category) query = query.eq("provider_category", category);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ExternalProviderReadiness[];
  },

  async recordSandboxEvent(input: ProviderSandboxEventInput) {
    const { data, error } = await db
      .from("provider_sandbox_events")
      .insert({
        provider_readiness_id: input.providerReadinessId || null,
        provider_key: input.providerKey,
        scenario: input.scenario,
        status: input.status || "pending",
        reference: input.reference || null,
        observed_at: input.observedAt || new Date().toISOString(),
        evidence: input.evidence || {},
        created_by: input.createdBy || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createBackupRestoreDrill(input: {
    drillName: string;
    environment?: "local" | "staging" | "production";
    backupSource: string;
    restoreTarget: string;
    status?: "planned" | "running" | "passed" | "failed" | "cancelled";
    evidenceUrl?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("backup_restore_drills")
      .insert({
        drill_name: input.drillName,
        environment: input.environment || "staging",
        backup_source: input.backupSource,
        restore_target: input.restoreTarget,
        status: input.status || "planned",
        evidence_url: input.evidenceUrl || null,
        notes: input.notes || null,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
