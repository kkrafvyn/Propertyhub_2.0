import { supabase } from "./supabase";
import { validateStoragePath } from "./security/upload-validation";
import type { EstateChargeRow } from "./estate-ledger";
import { ownerOversightService } from "./owner-oversight.service";

// Database types are regenerated during deployment after the estate-operations
// migration is applied. Keeping this boundary isolated prevents the generated
// marketplace types from leaking into this new domain module.
const estateDb = supabase as any;

async function maybeNotifyCriticalIssue(issue: {
  estate_id: string;
  title: string;
  priority?: string | null;
}) {
  const priority = String(issue.priority || "").toLowerCase();
  if (priority !== "critical" && priority !== "urgent") return;
  try {
    const agreement = await ownerOversightService.findAgreementForEstate(issue.estate_id);
    if (!agreement) return;
    const { data: estate } = await estateDb
      .from("managed_estates")
      .select("organization_id, organization:organizations(slug)")
      .eq("id", issue.estate_id)
      .maybeSingle();
    if (!estate?.organization_id) return;
    await ownerOversightService.notifyOwnerCritical({
      ownerUserId: agreement.owner_user_id,
      organizationId: estate.organization_id,
      organizationSlug: estate.organization?.slug || null,
      kind: "critical_maintenance",
      subject: "Critical maintenance reported",
      content: issue.title,
      tab: "maintenance",
    });
  } catch (error) {
    console.error("Owner critical maintenance notify failed:", error);
  }
}

async function maybeRequestOwnerSpendApproval(input: {
  estateId: string;
  amountMinor: number | null | undefined;
  requestedBy: string;
  title: string;
  workOrderId?: string;
  issueId?: string;
  currency?: string;
}) {
  const amount = Number(input.amountMinor || 0);
  if (!amount) return;
  try {
    const agreement = await ownerOversightService.findAgreementForEstate(input.estateId);
    if (!agreement) return;
    const { data: estate } = await estateDb
      .from("managed_estates")
      .select("organization_id, currency, organization:organizations(slug)")
      .eq("id", input.estateId)
      .maybeSingle();
    if (!estate?.organization_id) return;
    await ownerOversightService.maybeRequestOwnerApproval({
      agreement,
      organizationId: estate.organization_id,
      requestedBy: input.requestedBy,
      title: input.title,
      amountMinor: amount,
      workOrderId: input.workOrderId,
      issueId: input.issueId,
      currency: input.currency || estate.currency || "GHS",
      organizationSlug: estate.organization?.slug || null,
    });
  } catch (error) {
    console.error("Owner spend approval request failed:", error);
  }
}

export type ManagedEstate = {
  id: string;
  organization_id: string;
  property_id?: string | null;
  name: string;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string;
  currency: string;
  allocation_strategy: "oldest_due" | "largest_balance" | "manual";
};

export type EstateUnit = {
  id: string;
  estate_id: string;
  identifier: string;
  block: string | null;
  floor: string | null;
  status: "active" | "inactive" | "under_maintenance";
};

export type EstateOccupancy = {
  id: string;
  unit_id: string;
  user_id: string;
  role: "owner" | "tenant" | "buyer";
  start_date: string;
  end_date: string | null;
};

export type EstateIssue = {
  id: string;
  estate_id: string;
  unit_id: string | null;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "reported" | "triaged" | "assigned" | "resolved" | "closed" | "reopened";
  title: string;
  description: string | null;
  sla_target_at: string | null;
  created_at: string;
};

export type EstateChargeSchedule = {
  id: string;
  estate_id: string;
  name: string;
  type: "service_charge" | "water" | "rent" | "penalty" | "levy" | "other";
  amount_minor: number;
  currency: string;
  frequency: "monthly" | "quarterly" | "annual" | "one_off";
  occupancy_role: "owner" | "tenant" | "buyer" | null;
  active: boolean;
};

export type EstateWorkOrder = {
  id: string;
  issue_id: string;
  estate_id: string;
  status: "open" | "scheduled" | "in_progress" | "completed" | "cancelled";
  vendor_id: string | null;
  scheduled_for: string | null;
  assigned_to_user_id: string | null;
  estimated_cost_minor: number | null;
  actual_cost_minor: number | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  quotes?: EstateWorkOrderQuote[];
  evidence?: EstateWorkOrderEvidence[];
  approvals?: EstateWorkOrderApproval[];
};

export type EstateWorkOrderQuote = {
  id: string;
  work_order_id: string;
  vendor_id: string | null;
  amount_minor: number;
  currency: string;
  status: "submitted" | "approved" | "rejected" | "withdrawn";
  note: string | null;
  submitted_at: string;
  approved_at: string | null;
  approved_by: string | null;
};

export type EstateWorkOrderEvidence = {
  id: string;
  work_order_id: string;
  storage_path: string;
  media_type: "photo" | "video" | "document";
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type EstateWorkOrderApproval = {
  id: string;
  work_order_id: string;
  approval_type: "quote" | "budget" | "completion" | "chargeable_cost";
  status: "pending" | "approved" | "rejected";
  requested_by: string | null;
  decided_by: string | null;
  note: string | null;
  created_at: string;
  decided_at: string | null;
};

export type EstateWorkOrderMaterial = {
  id: string;
  work_order_id: string;
  description: string;
  quantity: number;
  unit_cost_minor: number;
  currency: string;
  receipt_storage_path: string | null;
  added_by: string | null;
  created_at: string;
};

export type EstatePreventiveMaintenancePlan = {
  id: string;
  estate_id: string;
  name: string;
  category: string;
  frequency_days: number;
  next_due_date: string;
  default_vendor_id: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
};

export type EstatePaymentPlan = {
  id: string;
  unit_id: string;
  occupancy_id: string | null;
  plan_type: "rent" | "sale" | "deposit" | "service_charge" | "other";
  total_minor: number;
  deposit_minor: number;
  currency: string;
  frequency: "weekly" | "monthly" | "quarterly" | "custom";
  start_date: string;
  status: "draft" | "active" | "completed" | "cancelled";
  installments?: EstateInstallment[];
};

export type EstateInstallment = {
  id: string;
  plan_id: string;
  installment_number: number;
  due_date: string;
  amount_minor: number;
  status: "upcoming" | "due" | "partially_paid" | "paid" | "overdue" | "waived" | "cancelled";
  charge_id: string | null;
};

export type EstateReconciliation = {
  id: string;
  estate_id: string;
  account_name: string;
  statement_date: string;
  opening_balance_minor: number;
  closing_balance_minor: number;
  currency: string;
  status: "open" | "reviewed" | "closed";
  notes: string | null;
  lines?: EstateReconciliationLine[];
};

export type EstateReconciliationLine = {
  id: string;
  reconciliation_id: string;
  unit_payment_id: string | null;
  statement_reference: string;
  amount_minor: number;
  matched: boolean;
  matched_at: string | null;
  note: string | null;
};

export type EstateCollectionAction = {
  id: string;
  unit_id: string;
  charge_id: string | null;
  action_type: "reminder" | "call" | "promise_to_pay" | "payment_plan" | "escalation" | "note";
  channel: "in_app" | "email" | "sms" | "whatsapp" | "phone" | null;
  note: string | null;
  promised_amount_minor: number | null;
  promised_date: string | null;
  created_at: string;
};

export type EstateNotice = {
  id: string;
  estate_id: string;
  audience_json: { role?: "all" | "owner" | "tenant" | "buyer" };
  subject: string;
  body: string;
  channels: Array<"sms" | "email" | "in_app" | "whatsapp" | "push">;
  sent_at: string | null;
  created_at: string;
  deliveries?: EstateNoticeDelivery[];
};

export type EstateNoticeDelivery = {
  id: string;
  notice_id: string;
  user_id: string;
  channel: "sms" | "email" | "in_app" | "whatsapp" | "push";
  status: "queued" | "sent" | "delivered" | "failed" | "read";
  delivered_at: string | null;
  read_at: string | null;
};

export const estateOperationsService = {
  async getEstates(organizationId: string): Promise<ManagedEstate[]> {
    const { data, error } = await estateDb
      .from("managed_estates")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");
    if (error) throw error;
    return data || [];
  },

  async getUnits(estateIds: string[]): Promise<EstateUnit[]> {
    if (estateIds.length === 0) return [];
    const { data, error } = await estateDb
      .from("estate_units")
      .select("*")
      .in("estate_id", estateIds)
      .order("identifier");
    if (error) throw error;
    return data || [];
  },

  async getIssues(estateIds: string[]): Promise<EstateIssue[]> {
    if (estateIds.length === 0) return [];
    const { data, error } = await estateDb
      .from("estate_issues")
      .select("*")
      .in("estate_id", estateIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getOccupancies(unitIds: string[]): Promise<EstateOccupancy[]> {
    if (unitIds.length === 0) return [];
    const { data, error } = await estateDb.from("unit_occupancies").select("*").in("unit_id", unitIds).order("start_date", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getCharges(unitIds: string[]): Promise<EstateChargeRow[]> {
    if (unitIds.length === 0) return [];
    const { data, error } = await estateDb
      .from("unit_charges")
      .select("id, unit_id, amount_minor, currency, due_date, type, description, payment_allocations(amount_minor)")
      .in("unit_id", unitIds)
      .order("due_date");
    if (error) throw error;
    return data || [];
  },

  async getChargeSchedules(estateIds: string[]): Promise<EstateChargeSchedule[]> {
    if (estateIds.length === 0) return [];
    const { data, error } = await estateDb
      .from("estate_charge_schedules")
      .select("*")
      .in("estate_id", estateIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createChargeSchedule(input: {
    estateId: string;
    name: string;
    type: EstateChargeSchedule["type"];
    amountMinor: number;
    frequency: EstateChargeSchedule["frequency"];
    occupancyRole?: EstateChargeSchedule["occupancy_role"];
    createdBy: string;
  }) {
    const { data, error } = await estateDb
      .from("estate_charge_schedules")
      .insert({
        estate_id: input.estateId,
        name: input.name.trim(),
        type: input.type,
        amount_minor: input.amountMinor,
        frequency: input.frequency,
        occupancy_role: input.occupancyRole || null,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as EstateChargeSchedule;
  },

  async runChargeSchedule(input: { scheduleId: string; period: string; dueDate: string; createdBy: string }) {
    const { data, error } = await estateDb.rpc("run_estate_charge_schedule", {
      p_schedule_id: input.scheduleId,
      p_period: input.period,
      p_due_date: input.dueDate,
      p_created_by: input.createdBy,
    });
    if (error) throw error;
    return Number(data || 0);
  },

  async recordEstatePayment(input: {
    unitId: string;
    amountMinor: number;
    currency: string;
    method: "momo" | "card" | "bank_transfer" | "cash";
    providerReference: string;
    recordedByUserId: string;
    allocations: Array<{ charge_id: string; amount_minor: number }>;
  }) {
    const { data, error } = await estateDb.rpc("record_estate_payment", {
      p_unit_id: input.unitId,
      p_paid_by_user_id: null,
      p_amount_minor: input.amountMinor,
      p_currency: input.currency,
      p_method: input.method,
      p_provider_reference: input.providerReference,
      p_recorded_by_user_id: input.recordedByUserId,
      p_allocations: input.allocations,
    });
    if (error) throw error;
    return data;
  },

  async recordEstatePaymentAutomatically(input: {
    unitId: string; amountMinor: number; currency: string;
    method: "momo" | "card" | "bank_transfer" | "cash"; providerReference: string; recordedByUserId: string;
  }) {
    const { data, error } = await estateDb.rpc("record_estate_payment_auto_allocate", {
      p_unit_id: input.unitId, p_paid_by_user_id: null, p_amount_minor: input.amountMinor,
      p_currency: input.currency, p_method: input.method, p_provider_reference: input.providerReference,
      p_recorded_by_user_id: input.recordedByUserId,
    });
    if (error) throw error;
    return data;
  },

  async createEstate(input: {
    organizationId: string;
    name: string;
    address?: string;
    city?: string;
    region?: string;
    propertyId?: string;
  }): Promise<ManagedEstate> {
    const { data, error } = await estateDb
      .from("managed_estates")
      .insert({
        organization_id: input.organizationId,
        name: input.name.trim(),
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        region: input.region?.trim() || null,
        property_id: input.propertyId || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async createUnit(input: { estateId: string; identifier: string; block?: string; floor?: string }) {
    const { data, error } = await estateDb
      .from("estate_units")
      .insert({
        estate_id: input.estateId,
        identifier: input.identifier.trim(),
        block: input.block?.trim() || null,
        floor: input.floor?.trim() || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as EstateUnit;
  },

  async createIssue(input: {
    estateId: string;
    unitId?: string;
    reportedByUserId: string;
    title: string;
    category: string;
    priority: EstateIssue["priority"];
    description?: string;
  }) {
    const { data, error } = await estateDb
      .from("estate_issues")
      .insert({
        estate_id: input.estateId,
        unit_id: input.unitId || null,
        reported_by_user_id: input.reportedByUserId,
        title: input.title.trim(),
        category: input.category.trim(),
        priority: input.priority,
        description: input.description?.trim() || null,
      })
      .select("*")
      .single();
    if (error) throw error;

    const { error: eventError } = await estateDb.from("estate_issue_events").insert({
      issue_id: data.id,
      event_type: "reported",
      actor_user_id: input.reportedByUserId,
    });
    if (eventError) throw eventError;
    void maybeNotifyCriticalIssue(data as EstateIssue);
    return data as EstateIssue;
  },

  async updateIssueStatus(issueId: string, status: EstateIssue["status"]) {
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "resolved") patch.resolved_at = new Date().toISOString();
    if (status === "closed") patch.closed_at = new Date().toISOString();
    const { data, error } = await estateDb
      .from("estate_issues")
      .update(patch)
      .eq("id", issueId)
      .select("*")
      .single();
    if (error) throw error;
    return data as EstateIssue;
  },

  async getWorkOrders(estateIds: string[]): Promise<EstateWorkOrder[]> {
    if (estateIds.length === 0) return [];
    const { data, error } = await estateDb
      .from("estate_work_orders")
      .select("*, quotes:estate_work_order_quotes(*), evidence:estate_work_order_evidence(*), approvals:estate_work_order_approvals(*)")
      .in("estate_id", estateIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getMaintenanceCostAnalytics(estateIds: string[]) {
    const orders = await this.getWorkOrders(estateIds);
    return orders.reduce((summary, order) => {
      const actual = Number(order.actual_cost_minor || 0);
      const estimated = Number(order.estimated_cost_minor || 0);
      summary.totalActualMinor += actual;
      summary.totalEstimatedMinor += estimated;
      summary.byStatus[order.status] = (summary.byStatus[order.status] || 0) + actual;
      return summary;
    }, {
      totalActualMinor: 0,
      totalEstimatedMinor: 0,
      byStatus: {} as Record<EstateWorkOrder["status"], number>,
    });
  },

  async createWorkOrder(input: {
    estateId: string;
    issueId: string;
    createdBy: string;
    vendorId?: string;
    assignedToUserId?: string;
    scheduledFor?: string;
    estimatedCostMinor?: number;
    notes?: string;
  }) {
    const { data, error } = await estateDb.from("estate_work_orders").insert({
      estate_id: input.estateId,
      issue_id: input.issueId,
      created_by: input.createdBy,
      vendor_id: input.vendorId || null,
      assigned_to_user_id: input.assignedToUserId || null,
      scheduled_for: input.scheduledFor || null,
      estimated_cost_minor: input.estimatedCostMinor ?? null,
      notes: input.notes?.trim() || null,
    }).select("*").single();
    if (error) throw error;
    void maybeRequestOwnerSpendApproval({
      estateId: input.estateId,
      amountMinor: input.estimatedCostMinor,
      requestedBy: input.createdBy,
      title: "Work order estimated cost",
      workOrderId: data.id,
      issueId: input.issueId,
    });
    return data as EstateWorkOrder;
  },

  async updateWorkOrder(
    workOrderId: string,
    patch: {
      status?: EstateWorkOrder["status"];
      vendor_id?: string | null;
      assigned_to_user_id?: string | null;
      scheduled_for?: string | null;
      estimated_cost_minor?: number | null;
      actual_cost_minor?: number | null;
      notes?: string | null;
    }
  ) {
    const { data, error } = await estateDb
      .from("estate_work_orders")
      .update({
        ...patch,
        completed_at: patch.status === "completed" ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workOrderId)
      .select("*")
      .single();
    if (error) throw error;
    const amount = patch.actual_cost_minor ?? patch.estimated_cost_minor;
    if (amount != null && data.created_by) {
      void maybeRequestOwnerSpendApproval({
        estateId: data.estate_id,
        amountMinor: amount,
        requestedBy: data.created_by,
        title: "Work order cost update",
        workOrderId: data.id,
        issueId: data.issue_id,
      });
    }
    return data as EstateWorkOrder;
  },

  async createWorkOrderApproval(input: {
    workOrderId: string;
    approvalType: EstateWorkOrderApproval["approval_type"];
    requestedBy: string;
    note?: string;
  }) {
    const { data, error } = await estateDb
      .from("estate_work_order_approvals")
      .insert({
        work_order_id: input.workOrderId,
        approval_type: input.approvalType,
        requested_by: input.requestedBy,
        note: input.note?.trim() || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as EstateWorkOrderApproval;
  },

  async decideWorkOrderApproval(input: { approvalId: string; status: "approved" | "rejected"; decidedBy: string }) {
    const { data, error } = await estateDb
      .from("estate_work_order_approvals")
      .update({
        status: input.status,
        decided_by: input.decidedBy,
        decided_at: new Date().toISOString(),
      })
      .eq("id", input.approvalId)
      .select("*")
      .single();
    if (error) throw error;
    return data as EstateWorkOrderApproval;
  },

  async getWorkOrderQuotes(workOrderId: string): Promise<EstateWorkOrderQuote[]> {
    const { data, error } = await estateDb
      .from("estate_work_order_quotes")
      .select("*")
      .eq("work_order_id", workOrderId)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createWorkOrderQuote(input: {
    workOrderId: string;
    vendorId?: string;
    amountMinor: number;
    currency: string;
    note?: string;
    approvedBy?: string;
  }) {
    const { data, error } = await estateDb
      .from("estate_work_order_quotes")
      .insert({
        work_order_id: input.workOrderId,
        vendor_id: input.vendorId || null,
        amount_minor: input.amountMinor,
        currency: input.currency,
        note: input.note?.trim() || null,
        approved_by: input.approvedBy || null,
      })
      .select("*")
      .single();
    if (error) throw error;

    const { data: workOrder } = await estateDb
      .from("estate_work_orders")
      .select("id, estate_id, issue_id, created_by")
      .eq("id", input.workOrderId)
      .maybeSingle();
    if (workOrder) {
      void maybeRequestOwnerSpendApproval({
        estateId: workOrder.estate_id,
        amountMinor: input.amountMinor,
        requestedBy: input.approvedBy || workOrder.created_by,
        title: "Work order quote",
        workOrderId: workOrder.id,
        issueId: workOrder.issue_id,
        currency: input.currency,
      });
    }

    return data as EstateWorkOrderQuote;
  },

  async addWorkOrderEvidence(input: {
    workOrderId: string;
    storagePath: string;
    mediaType: EstateWorkOrderEvidence["media_type"];
    caption?: string;
    uploadedBy?: string;
  }) {
    const { data, error } = await estateDb
      .from("estate_work_order_evidence")
      .insert({
        work_order_id: input.workOrderId,
        storage_path: validateStoragePath(input.storagePath),
        media_type: input.mediaType,
        caption: input.caption?.trim() || null,
        uploaded_by: input.uploadedBy || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as EstateWorkOrderEvidence;
  },

  async getWorkOrderMaterials(workOrderId: string): Promise<EstateWorkOrderMaterial[]> {
    const { data, error } = await estateDb.from("estate_work_order_materials").select("*").eq("work_order_id", workOrderId).order("created_at");
    if (error) throw error;
    return data || [];
  },

  async addWorkOrderMaterial(input: { workOrderId: string; description: string; quantity: number; unitCostMinor: number; currency: string; receiptStoragePath?: string; addedBy: string }) {
    if (!input.description.trim() || input.quantity <= 0 || input.unitCostMinor < 0) throw new Error("Material description, quantity, and cost are required");
    const { data, error } = await estateDb.from("estate_work_order_materials").insert({
      work_order_id: input.workOrderId,
      description: input.description.trim(),
      quantity: input.quantity,
      unit_cost_minor: input.unitCostMinor,
      currency: input.currency,
      receipt_storage_path: input.receiptStoragePath ? validateStoragePath(input.receiptStoragePath) : null,
      added_by: input.addedBy,
    }).select("*").single();
    if (error) throw error;
    return data as EstateWorkOrderMaterial;
  },

  async getPreventivePlans(estateIds: string[]): Promise<EstatePreventiveMaintenancePlan[]> {
    if (estateIds.length === 0) return [];
    const { data, error } = await estateDb
      .from("estate_preventive_maintenance_plans")
      .select("*")
      .in("estate_id", estateIds)
      .order("next_due_date");
    if (error) throw error;
    return data || [];
  },

  async createPreventivePlan(input: {
    estateId: string;
    name: string;
    category: string;
    frequencyDays: number;
    nextDueDate: string;
    defaultVendorId?: string;
    createdBy: string;
  }) {
    const { data, error } = await estateDb
      .from("estate_preventive_maintenance_plans")
      .insert({
        estate_id: input.estateId,
        name: input.name.trim(),
        category: input.category.trim(),
        frequency_days: input.frequencyDays,
        next_due_date: input.nextDueDate,
        default_vendor_id: input.defaultVendorId || null,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as EstatePreventiveMaintenancePlan;
  },

  async runDuePreventiveMaintenance(asOfDate?: string) {
    const { data, error } = await estateDb.rpc("run_due_preventive_maintenance", { p_as_of_date: asOfDate || new Date().toISOString().slice(0, 10) });
    if (error) throw error;
    return Number(data) || 0;
  },

  async getPaymentPlans(unitIds: string[]): Promise<EstatePaymentPlan[]> {
    if (unitIds.length === 0) return [];
    const { data, error } = await estateDb
      .from("estate_payment_plans")
      .select("*, installments:estate_installments(*)")
      .in("unit_id", unitIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createPaymentPlan(input: {
    unitId: string;
    occupancyId?: string;
    planType: EstatePaymentPlan["plan_type"];
    totalMinor: number;
    depositMinor: number;
    currency: string;
    frequency: EstatePaymentPlan["frequency"];
    startDate: string;
    installmentCount: number;
    createdBy: string;
  }) {
    const { data, error } = await estateDb.rpc("create_estate_payment_plan", {
      p_unit_id: input.unitId,
      p_occupancy_id: input.occupancyId || null,
      p_plan_type: input.planType,
      p_total_minor: input.totalMinor,
      p_deposit_minor: input.depositMinor,
      p_currency: input.currency,
      p_frequency: input.frequency,
      p_start_date: input.startDate,
      p_installment_count: input.installmentCount,
      p_created_by: input.createdBy,
    });
    if (error) throw error;
    return data as EstatePaymentPlan;
  },

  async getReconciliations(estateIds: string[]): Promise<EstateReconciliation[]> {
    if (estateIds.length === 0) return [];
    const { data, error } = await estateDb
      .from("estate_bank_reconciliations")
      .select("*, lines:estate_reconciliation_lines(*)")
      .in("estate_id", estateIds)
      .order("statement_date", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createReconciliation(input: { estateId: string; accountName: string; statementDate: string; openingBalanceMinor: number; closingBalanceMinor: number; currency: string; notes?: string; createdBy: string }) {
    const { data, error } = await estateDb.from("estate_bank_reconciliations").insert({
      estate_id: input.estateId, account_name: input.accountName.trim(), statement_date: input.statementDate,
      opening_balance_minor: input.openingBalanceMinor, closing_balance_minor: input.closingBalanceMinor,
      currency: input.currency, notes: input.notes?.trim() || null, created_by: input.createdBy,
    }).select("*").single();
    if (error) throw error;
    return data as EstateReconciliation;
  },

  async addReconciliationLine(input: { reconciliationId: string; statementReference: string; amountMinor: number; unitPaymentId?: string; note?: string }) {
    const { data, error } = await estateDb.from("estate_reconciliation_lines").insert({
      reconciliation_id: input.reconciliationId, statement_reference: input.statementReference.trim(),
      amount_minor: input.amountMinor, unit_payment_id: input.unitPaymentId || null, note: input.note?.trim() || null,
    }).select("*").single();
    if (error) throw error;
    return data as EstateReconciliationLine;
  },

  async setReconciliationLineMatched(lineId: string, matched: boolean) {
    const { data, error } = await estateDb.from("estate_reconciliation_lines").update({
      matched, matched_at: matched ? new Date().toISOString() : null,
    }).eq("id", lineId).select("*").single();
    if (error) throw error;
    return data as EstateReconciliationLine;
  },

  async createCollectionAction(input: { unitId: string; chargeId?: string; actionType: EstateCollectionAction["action_type"]; channel?: EstateCollectionAction["channel"]; note?: string; promisedAmountMinor?: number; promisedDate?: string; createdBy: string }) {
    const { data, error } = await estateDb.from("estate_collection_actions").insert({
      unit_id: input.unitId, charge_id: input.chargeId || null, action_type: input.actionType,
      channel: input.channel || null, note: input.note?.trim() || null,
      promised_amount_minor: input.promisedAmountMinor || null, promised_date: input.promisedDate || null,
      created_by: input.createdBy,
    }).select("*").single();
    if (error) throw error;
    return data as EstateCollectionAction;
  },

  async getNotices(estateIds: string[]): Promise<EstateNotice[]> {
    if (estateIds.length === 0) return [];
    const { data, error } = await estateDb.from("estate_notices")
      .select("*, deliveries:estate_notice_deliveries(*)")
      .in("estate_id", estateIds).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async sendNotice(input: { estateId: string; subject: string; body: string; channels: EstateNotice["channels"]; audienceRole: "all" | "owner" | "tenant" | "buyer"; sentBy: string }) {
    const { data, error } = await estateDb.rpc("send_estate_notice", {
      p_estate_id: input.estateId, p_subject: input.subject.trim(), p_body: input.body.trim(),
      p_channels: input.channels, p_audience_role: input.audienceRole, p_sent_by: input.sentBy,
    });
    if (error) throw error;
    return data as EstateNotice;
  },
};
