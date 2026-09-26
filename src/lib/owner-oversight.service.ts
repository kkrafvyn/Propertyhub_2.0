import { supabase } from "./supabase";
import { ownerOperatorService, type ManagementMode } from "./owner-operator.service";
import { notificationService } from "./notification.service";
import type { TimelineActivity } from "../app/components/ux/ActivityTimeline";

const db = supabase as any;

/** Pure threshold check for owner expense approval gates. */
export function shouldRequestOwnerExpenseApproval(input: {
  amountMinor: number;
  autoApproveBelowMinor: number;
  approveExpenses: boolean;
}) {
  if (!input.approveExpenses) return false;
  if (input.amountMinor < 0) return false;
  return input.amountMinor >= (Number(input.autoApproveBelowMinor) || 0);
}

export type OwnerCriticalEventKind =
  | "critical_maintenance"
  | "large_expense"
  | "payment_failure"
  | "lease_termination";

export type OwnerAgreementPermissions = {
  view_financials: boolean;
  view_maintenance: boolean;
  view_leases: boolean;
  view_tenant_comms: boolean;
  approve_expenses: boolean;
};

export type PropertyManagementAgreement = {
  id: string;
  property_id: string;
  estate_id: string | null;
  owner_user_id: string;
  managing_organization_id: string;
  status: "active" | "ended";
  starts_at: string;
  ends_at: string | null;
  permissions: OwnerAgreementPermissions;
  auto_approve_below_minor: number;
  owner_approve_below_minor: number;
  dual_approve_above_minor: number;
  reporting_cadence: "daily_digest" | "weekly" | "none";
  created_at: string;
  updated_at: string;
  property?: { id: string; address: string | null; city: string | null } | null;
};

export type OwnerExpenseApproval = {
  id: string;
  agreement_id: string;
  organization_id: string;
  owner_user_id: string;
  property_id: string | null;
  work_order_id: string | null;
  issue_id: string | null;
  title: string;
  description: string | null;
  amount_minor: number;
  currency: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export type OwnerOversightPrefs = {
  user_id: string;
  immediate_critical_maintenance: boolean;
  immediate_large_expense: boolean;
  immediate_payment_failure: boolean;
  immediate_lease_termination: boolean;
  daily_digest: boolean;
  weekly_digest: boolean;
  digest_timezone?: string;
};

export type OwnerActivityCursor = { createdAt: string; id: string };
export type OwnerActivityRow = {
  id: string; event_type: string; title: string; detail: string;
  amount_minor: number | null; currency: string | null; property_id: string | null;
  created_at: string; href_hint: string | null;
};

export type OwnerPropertyOverview = {
  propertyId: string;
  address: string;
  city: string | null;
  estateId: string | null;
  agreementId: string | null;
  unitCount: number;
  occupiedCount: number;
  vacantCount: number;
  occupancyPct: number;
  collectedMinor: number;
  outstandingMinor: number;
  openMaintenanceCount: number;
  leasesExpiringSoon: number;
  lastActivityAt: string | null;
  currency: string;
};

function defaultPermissions(): OwnerAgreementPermissions {
  return {
    view_financials: true,
    view_maintenance: true,
    view_leases: true,
    view_tenant_comms: false,
    approve_expenses: true,
  };
}

export const ownerOversightService = {
  async listMyAgreements(ownerUserId: string) {
    const { data, error } = await db
      .from("property_management_agreements")
      .select("*, property:properties(id, address, city)")
      .eq("owner_user_id", ownerUserId)
      .eq("status", "active")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      permissions: { ...defaultPermissions(), ...(row.permissions || {}) },
    })) as PropertyManagementAgreement[];
  },

  async listOrganizationAgreements(organizationId: string) {
    const { data, error } = await db
      .from("property_management_agreements")
      .select("*, property:properties(id, address, city)")
      .eq("managing_organization_id", organizationId)
      .eq("status", "active")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []) as PropertyManagementAgreement[];
  },

  async upsertAgreement(input: {
    propertyId: string;
    ownerUserId: string;
    managingOrganizationId: string;
    estateId?: string | null;
    mode?: ManagementMode;
  }) {
    const { data, error } = await db.rpc("add_owner_property_access", {
      p_property_id: input.propertyId,
      p_owner_user_id: input.ownerUserId,
      p_managing_organization_id: input.managingOrganizationId,
      p_estate_id: input.estateId || null,
      p_management_mode: input.mode || "company_managed",
    });
    if (error) throw error;
    return data as PropertyManagementAgreement;
  },

  async updateAgreementSettings(
    agreementId: string,
    updates: Partial<{
      permissions: OwnerAgreementPermissions;
      auto_approve_below_minor: number;
      owner_approve_below_minor: number;
      dual_approve_above_minor: number;
      reporting_cadence: PropertyManagementAgreement["reporting_cadence"];
      status: "active" | "ended";
    }>,
  ) {
    const { data, error } = await db
      .from("property_management_agreements")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", agreementId)
      .select("*")
      .single();
    if (error) throw error;
    return data as PropertyManagementAgreement;
  },

  async setEstateManagementMode(input: {
    estateId: string;
    ownerUserId: string;
    mode: ManagementMode;
    managingOrganizationId?: string;
  }) {
    return ownerOperatorService.setMode(input);
  },

  async getActivityPage(input?: { ownerUserId?: string; propertyId?: string; limit?: number; before?: OwnerActivityCursor }) {
    const limit = Math.min(100, Math.max(1, Math.floor(input?.limit || 40)));
    const { data, error } = await db.rpc("get_owner_property_activity_page", {
      p_owner_user_id: input?.ownerUserId || null,
      p_property_id: input?.propertyId || null,
      p_limit: limit + 1,
      p_before_at: input?.before?.createdAt || null,
      p_before_id: input?.before?.id || null,
    });
    if (error) throw error;
    const rows = ((data || []) as OwnerActivityRow[]).slice(0, limit);
    const last = rows.at(-1);
    return { rows, nextCursor: data?.length > limit && last ? { createdAt: last.created_at, id: last.id } : null };
  },

  async getActivity(input?: { ownerUserId?: string; propertyId?: string; limit?: number }) {
    return (await this.getActivityPage(input)).rows;
  },

  toTimelineItems(
    rows: Awaited<ReturnType<typeof this.getActivity>>,
    workspaceBasePath: string,
  ): TimelineActivity[] {
    return rows.map((row) => ({
      id: row.id,
      message: `${row.title}${row.detail ? ` — ${row.detail}` : ""}`,
      createdAt: row.created_at,
      href: `${workspaceBasePath}/owner-oversight?tab=${row.href_hint || "activity"}`,
    }));
  },

  async getPropertyOverviews(ownerUserId: string): Promise<OwnerPropertyOverview[]> {
    const agreements = await this.listMyAgreements(ownerUserId);
    const overviews: OwnerPropertyOverview[] = [];

    for (const agreement of agreements) {
      const propertyId = agreement.property_id;
      let estateId = agreement.estate_id;
      if (!estateId) {
        const { data: estates } = await db
          .from("managed_estates")
          .select("id, currency")
          .eq("property_id", propertyId)
          .limit(1);
        estateId = estates?.[0]?.id || null;
      }

      let unitCount = 0;
      let occupiedCount = 0;
      let openMaintenanceCount = 0;
      let leasesExpiringSoon = 0;
      let collectedMinor = 0;
      let outstandingMinor = 0;
      let currency = "GHS";

      if (estateId) {
        const { data: units } = await db
          .from("estate_units")
          .select("id, status")
          .eq("estate_id", estateId);
        unitCount = (units || []).length;

        const unitIds = (units || []).map((u: any) => u.id);
        if (unitIds.length) {
          const { data: occ } = await db
            .from("unit_occupancies")
            .select("id, unit_id, role, end_date")
            .in("unit_id", unitIds)
            .is("end_date", null);
          occupiedCount = new Set(
            (occ || []).filter((o: any) => o.role === "tenant").map((o: any) => o.unit_id),
          ).size;
        }

        const { data: issues } = await db
          .from("estate_issues")
          .select("id, status")
          .eq("estate_id", estateId)
          .not("status", "in", '("resolved","closed","cancelled")');
        openMaintenanceCount = (issues || []).length;

        const { data: statements } = await db
          .from("estate_owner_statement_runs")
          .select("gross_collections_minor, expense_minor, currency, created_at")
          .eq("owner_user_id", ownerUserId)
          .eq("estate_id", estateId)
          .order("period_end", { ascending: false })
          .limit(1);
        if (statements?.[0]) {
          collectedMinor = Number(statements[0].gross_collections_minor) || 0;
          outstandingMinor = Math.max(
            0,
            (Number(statements[0].expense_minor) || 0) > collectedMinor
              ? 0
              : 0,
          );
          currency = statements[0].currency || "GHS";
        }

        const soon = new Date();
        soon.setDate(soon.getDate() + 60);
        const { data: leases } = await db
          .from("leases")
          .select("id, end_date, property_id")
          .eq("property_id", propertyId)
          .gte("end_date", new Date().toISOString().slice(0, 10))
          .lte("end_date", soon.toISOString().slice(0, 10));
        leasesExpiringSoon = (leases || []).length;
      }

      const vacantCount = Math.max(0, unitCount - occupiedCount);
      const occupancyPct = unitCount ? Math.round((occupiedCount / unitCount) * 100) : 0;

      const activity = await this.getActivity({
        ownerUserId,
        propertyId,
        limit: 1,
      }).catch(() => []);

      overviews.push({
        propertyId,
        address: agreement.property?.address || "Property",
        city: agreement.property?.city || null,
        estateId,
        agreementId: agreement.id,
        unitCount,
        occupiedCount,
        vacantCount,
        occupancyPct,
        collectedMinor,
        outstandingMinor,
        openMaintenanceCount,
        leasesExpiringSoon,
        lastActivityAt: activity[0]?.created_at || agreement.updated_at,
        currency,
      });
    }

    return overviews;
  },

  async listStatements(ownerUserId: string) {
    const { data, error } = await db
      .from("estate_owner_statement_runs")
      .select("*, estate:managed_estates(id, name, currency)")
      .eq("owner_user_id", ownerUserId)
      .order("period_end", { ascending: false })
      .limit(24);
    if (error) throw error;
    return data || [];
  },

  /** Expense drill-down from work-order costs on owned estates. */
  async listExpenseLines(ownerUserId: string) {
    const agreements = await this.listMyAgreements(ownerUserId);
    const estateIds = [
      ...new Set(
        (
          await Promise.all(
            agreements.map(async (agreement) => {
              if (agreement.estate_id) return agreement.estate_id;
              const { data } = await db
                .from("managed_estates")
                .select("id")
                .eq("property_id", agreement.property_id)
                .limit(1);
              return data?.[0]?.id as string | undefined;
            }),
          )
        ).filter(Boolean) as string[],
      ),
    ];
    if (!estateIds.length) return [];

    const { data, error } = await db
      .from("estate_work_orders")
      .select(
        "id, created_at, estimated_cost_minor, actual_cost_minor, notes, status, issue:estate_issues(title, unit:estate_units(identifier)), vendor:vendors(business_name)",
      )
      .in("estate_id", estateIds)
      .or("estimated_cost_minor.gt.0,actual_cost_minor.gt.0")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      date: row.created_at,
      unit: row.issue?.unit?.identifier || "—",
      work: row.issue?.title || row.notes || "Work order",
      vendor: row.vendor?.business_name || "—",
      amountMinor: Number(row.actual_cost_minor || row.estimated_cost_minor || 0),
      status: row.status,
    }));
  },

  async listMaintenance(ownerUserId: string) {
    const agreements = await this.listMyAgreements(ownerUserId);
    const estateIds = agreements.map((a) => a.estate_id).filter(Boolean) as string[];
    const propertyIds = agreements.map((a) => a.property_id);

    if (propertyIds.length) {
      const { data: estates } = await db
        .from("managed_estates")
        .select("id, property_id")
        .in("property_id", propertyIds);
      for (const e of estates || []) {
        if (e.id && !estateIds.includes(e.id)) estateIds.push(e.id);
      }
    }

    if (!estateIds.length) return [];

    const { data: issues, error } = await db
      .from("estate_issues")
      .select("*, work_order:estate_work_orders(*), unit:estate_units(identifier)")
      .in("estate_id", estateIds)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return issues || [];
  },

  async listExpenseApprovals(ownerUserId: string, status?: string) {
    let query = db
      .from("owner_expense_approvals")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as OwnerExpenseApproval[];
  },

  async listOrgExpenseApprovals(organizationId: string, status = "pending") {
    const { data, error } = await db
      .from("owner_expense_approvals")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", status)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as OwnerExpenseApproval[];
  },

  async createExpenseApproval(input: {
    agreementId: string;
    organizationId: string;
    ownerUserId: string;
    propertyId?: string | null;
    workOrderId?: string | null;
    issueId?: string | null;
    title: string;
    description?: string;
    amountMinor: number;
    currency?: string;
    requestedBy: string;
  }) {
    const { data, error } = await db
      .from("owner_expense_approvals")
      .insert({
        agreement_id: input.agreementId,
        organization_id: input.organizationId,
        owner_user_id: input.ownerUserId,
        property_id: input.propertyId || null,
        work_order_id: input.workOrderId || null,
        issue_id: input.issueId || null,
        title: input.title,
        description: input.description || null,
        amount_minor: input.amountMinor,
        currency: input.currency || "GHS",
        status: "pending",
        requested_by: input.requestedBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as OwnerExpenseApproval;
  },

  async reviewExpenseApproval(input: {
    approvalId: string;
    status: "approved" | "rejected";
    reviewNote?: string;
  }) {
    const { data, error } = await db.rpc("review_owner_expense_approval", {
      p_approval_id: input.approvalId,
      p_status: input.status,
      p_review_note: input.reviewNote || null,
    });
    if (error) throw error;
    return data as OwnerExpenseApproval;
  },

  async findAgreementForEstate(estateId: string) {
    const { data: estate } = await db
      .from("managed_estates")
      .select("id, property_id, organization_id")
      .eq("id", estateId)
      .maybeSingle();
    if (!estate?.property_id) return null;

    const { data, error } = await db
      .from("property_management_agreements")
      .select("*")
      .eq("property_id", estate.property_id)
      .eq("managing_organization_id", estate.organization_id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      permissions: { ...defaultPermissions(), ...(data.permissions || {}) },
      estate_id: data.estate_id || estate.id,
    } as PropertyManagementAgreement;
  },

  /** Create owner approval when amount exceeds auto-approve and is within owner gate. */
  async maybeRequestOwnerApproval(input: {
    agreement: PropertyManagementAgreement;
    organizationId: string;
    requestedBy: string;
    title: string;
    description?: string;
    amountMinor: number;
    workOrderId?: string;
    issueId?: string;
    currency?: string;
    organizationSlug?: string | null;
  }) {
    if (
      !shouldRequestOwnerExpenseApproval({
        amountMinor: input.amountMinor,
        autoApproveBelowMinor: input.agreement.auto_approve_below_minor,
        approveExpenses: Boolean(input.agreement.permissions?.approve_expenses),
      })
    ) {
      return null;
    }

    const approval = await this.createExpenseApproval({
      agreementId: input.agreement.id,
      organizationId: input.organizationId,
      ownerUserId: input.agreement.owner_user_id,
      propertyId: input.agreement.property_id,
      workOrderId: input.workOrderId,
      issueId: input.issueId,
      title: input.title,
      description: input.description,
      amountMinor: input.amountMinor,
      currency: input.currency,
      requestedBy: input.requestedBy,
    });

    void this.notifyOwnerCritical({
      ownerUserId: input.agreement.owner_user_id,
      organizationId: input.organizationId,
      organizationSlug: input.organizationSlug,
      kind: "large_expense",
      subject: "Expense needs your approval",
      content: `${input.title} (${Math.round(input.amountMinor / 100)} ${input.currency || "GHS"}) awaits owner approval.`,
      tab: "approvals",
    });

    return approval;
  },

  async notifyOwnerCritical(input: {
    ownerUserId: string;
    organizationId: string;
    organizationSlug?: string | null;
    kind: OwnerCriticalEventKind;
    subject: string;
    content: string;
    tab?: string;
  }) {
    const prefs = await this.getNotificationPrefs(input.ownerUserId);
    const enabled =
      (input.kind === "critical_maintenance" && prefs.immediate_critical_maintenance) ||
      (input.kind === "large_expense" && prefs.immediate_large_expense) ||
      (input.kind === "payment_failure" && prefs.immediate_payment_failure) ||
      (input.kind === "lease_termination" && prefs.immediate_lease_termination);
    if (!enabled) return null;

    const slug = input.organizationSlug;
    const actionUrl = slug
      ? `/workspace/${slug}/owner-oversight?tab=${input.tab || "activity"}`
      : "/app/workspace-access";

    return notificationService.notifyUser({
      userId: input.ownerUserId,
      notificationType: `owner_${input.kind}`,
      subject: input.subject,
      content: input.content,
      actionUrl,
      organizationId: input.organizationId,
      category: input.kind === "critical_maintenance" ? "Maintenance" : "System",
      metadata: {
        organization_id: input.organizationId,
        owner_oversight: true,
        kind: input.kind,
        daily_digest: prefs.daily_digest,
      },
      respectPreferences: false,
    });
  },

  async getNotificationPrefs(userId: string): Promise<OwnerOversightPrefs> {
    const { data, error } = await db
      .from("owner_oversight_notification_prefs")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as OwnerOversightPrefs;
    return {
      user_id: userId,
      immediate_critical_maintenance: true,
      immediate_large_expense: true,
      immediate_payment_failure: true,
      immediate_lease_termination: true,
      daily_digest: true,
      weekly_digest: false,
      digest_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };
  },

  async saveNotificationPrefs(prefs: OwnerOversightPrefs) {
    const { data, error } = await db
      .from("owner_oversight_notification_prefs")
      .upsert({ ...prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) throw error;
    return data as OwnerOversightPrefs;
  },

  async ensureOwnerScopedMembership(input: {
    organizationId: string;
    userId: string;
    propertyId: string;
    estateId?: string | null;
    mode?: ManagementMode;
  }) {
    return this.upsertAgreement({
      propertyId: input.propertyId,
      ownerUserId: input.userId,
      managingOrganizationId: input.organizationId,
      estateId: input.estateId,
      mode: input.mode,
    });
  },
};
