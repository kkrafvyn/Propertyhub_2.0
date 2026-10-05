import { supabase } from "./supabase";
import { fraudDetectionService } from "./fraud-detection.service";
import { platformOperationsService } from "./platform-operations.service";
import { adminService } from "./admin.service";
import type { PlatformConsoleGrant } from "./platform-console-grants";
import { PLATFORM_CONSOLE_GRANTS } from "./platform-console-grants";
import {
  detectPlatformRolePreset,
  normalizePlatformGrants,
} from "./platform-console-grants";

export type PlatformStaffRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_platform_admin: boolean;
  is_platform_manager: boolean;
  platform_console_grants: string[];
  preset: string;
};

export type CommandCenterSnapshot = {
  moderationOverview: Awaited<ReturnType<typeof fraudDetectionService.getModerationOverview>> | null;
  health: Awaited<ReturnType<typeof platformOperationsService.checkHealth>> | null;
  events: Awaited<ReturnType<typeof platformOperationsService.events>>;
  staffCounts: { admins: number; delegates: number; byPreset: Record<string, number> };
  roleAudit: Array<{
    id: string;
    action: string;
    admin_id: string | null;
    target_id: string | null;
    created_at: string | null;
  }>;
  paymentCount24h: number | null;
  pendingAiActions: number | null;
  failedDeliveries24h: number | null;
};

function sinceIso(hours: number) {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

export async function listPlatformStaff(limit = 200): Promise<PlatformStaffRow[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, is_platform_admin, is_platform_manager, platform_console_grants")
    .or("is_platform_admin.eq.true,is_platform_manager.eq.true")
    .order("is_platform_admin", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((row) => {
    const grants = normalizePlatformGrants(row.platform_console_grants);
    return {
      ...row,
      platform_console_grants: grants,
      preset: row.is_platform_admin ? "owner" : detectPlatformRolePreset(grants),
    };
  });
}

export async function listRoleChangeAudit(limit = 15) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, admin_id, target_id, created_at")
    .eq("action", "admin_set_user_platform_access")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function listPlatformPayments(limit = 50) {
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("id, user_id, amount, currency, status, payment_provider, external_transaction_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function listPlatformAiActions(limit = 50) {
  const { data, error } = await supabase
    .from("estate_ai_action_logs")
    .select("id, organization_id, agent_type, trigger_type, action_status, created_at, risk_level")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function listCommunicationDeliveries(limit = 50) {
  const { data, error } = await supabase
    .from("communication_delivery_attempts")
    .select("id, organization_id, channel, status, attempted_at, error_message")
    .order("attempted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function countPayments24h() {
  const { count, error } = await supabase
    .from("payment_transactions")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso(24));
  if (error) return null;
  return count ?? 0;
}

async function countPendingAiActions() {
  const { count, error } = await supabase
    .from("estate_ai_action_logs")
    .select("id", { count: "exact", head: true })
    .eq("action_status", "recommended");
  if (error) return null;
  return count ?? 0;
}

async function countFailedDeliveries24h() {
  const { count, error } = await supabase
    .from("communication_delivery_attempts")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("attempted_at", sinceIso(24));
  if (error) return null;
  return count ?? 0;
}

function staffCountsFromRows(staff: PlatformStaffRow[]) {
  const byPreset: Record<string, number> = {};
  let admins = 0;
  let delegates = 0;
  for (const row of staff) {
    if (row.is_platform_admin) admins += 1;
    else delegates += 1;
    const key = row.preset || "custom";
    byPreset[key] = (byPreset[key] || 0) + 1;
  }
  return { admins, delegates, byPreset };
}

export async function loadOwnerCommandCenterSnapshot(): Promise<CommandCenterSnapshot> {
  const staff = await listPlatformStaff(500).catch(() => []);
  const [moderationOverview, health, events, roleAudit, paymentCount24h, pendingAiActions, failedDeliveries24h] =
    await Promise.all([
      fraudDetectionService.getModerationOverview().catch(() => null),
      platformOperationsService.checkHealth().catch(() => null),
      platformOperationsService.events().catch(() => []),
      listRoleChangeAudit(),
      countPayments24h(),
      countPendingAiActions(),
      countFailedDeliveries24h(),
    ]);

  return {
    moderationOverview,
    health,
    events,
    staffCounts: staffCountsFromRows(staff),
    roleAudit,
    paymentCount24h,
    pendingAiActions,
    failedDeliveries24h,
  };
}

export async function loadStaffCommandCenterSnapshot(
  grants: PlatformConsoleGrant[],
): Promise<Partial<CommandCenterSnapshot>> {
  const tasks: Promise<void>[] = [];
  const snapshot: Partial<CommandCenterSnapshot> = {
    events: [],
    staffCounts: { admins: 0, delegates: 0, byPreset: {} },
    roleAudit: [],
  };

  const grantSet = new Set(grants);

  if (grantSet.has(PLATFORM_CONSOLE_GRANTS.moderation)) {
    tasks.push(
      fraudDetectionService.getModerationOverview().then((v) => {
        snapshot.moderationOverview = v;
      }),
    );
  }
  if (grantSet.has(PLATFORM_CONSOLE_GRANTS.integrations)) {
    tasks.push(
      platformOperationsService.checkHealth().then((v) => {
        snapshot.health = v;
      }),
    );
    tasks.push(
      platformOperationsService.events().then((v) => {
        snapshot.events = v;
      }),
    );
  }
  if (grantSet.has(PLATFORM_CONSOLE_GRANTS.payments) || grantSet.has(PLATFORM_CONSOLE_GRANTS.revenue)) {
    tasks.push(countPayments24h().then((v) => { snapshot.paymentCount24h = v; }));
  }
  if (grantSet.has(PLATFORM_CONSOLE_GRANTS.ai_governance)) {
    tasks.push(countPendingAiActions().then((v) => { snapshot.pendingAiActions = v; }));
  }
  if (
    grantSet.has(PLATFORM_CONSOLE_GRANTS.communications) ||
    grantSet.has(PLATFORM_CONSOLE_GRANTS.support)
  ) {
    tasks.push(countFailedDeliveries24h().then((v) => { snapshot.failedDeliveries24h = v; }));
  }

  await Promise.all(tasks.map((t) => t.catch(() => undefined)));
  return snapshot;
}

export async function countPlatformEntities() {
  const [users, orgs, listings] = await Promise.all([
    adminService.listUsers(1).then((rows) => rows.length),
    adminService.listOrganizationsWithStats(1).then((rows) => rows.length),
    adminService.listListings(1).then((rows) => rows.length),
  ]);
  return { usersSample: users, orgsSample: orgs, listingsSample: listings };
}
