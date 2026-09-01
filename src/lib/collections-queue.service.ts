import { supabase } from "./supabase";
import { getChargeOutstandingMinor, type EstateChargeRow } from "./estate-ledger";

const collectionsDb = supabase as any;

export type CollectionQueueStatus = "new" | "contacted" | "promise" | "plan" | "escalated";

export interface CollectionQueueItem {
  caseId: string | null;
  unitId: string;
  estateId: string;
  totalOutstandingMinor: number;
  oldestDueDate: string;
  daysOverdue: number;
  agingBucket: "current" | "1_30" | "31_60" | "61_90" | "90_plus";
  priorityScore: number;
  status: CollectionQueueStatus;
  assignedToUserId: string | null;
  activePromiseId: string | null;
  lastActionAt: string | null;
  nextFollowUpDate: string | null;
  charges: EstateChargeRow[];
}

function agingBucket(daysOverdue: number): CollectionQueueItem["agingBucket"] {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "1_30";
  if (daysOverdue <= 60) return "31_60";
  if (daysOverdue <= 90) return "61_90";
  return "90_plus";
}

function priorityScore(totalOutstandingMinor: number, daysOverdue: number, actionCount: number) {
  const amountPoints = Math.min(40, Math.floor(totalOutstandingMinor / 100000));
  const agePoints = Math.min(40, Math.floor(daysOverdue / 3));
  const contactPoints = Math.min(20, actionCount * 4);
  return Math.min(100, amountPoints + agePoints + contactPoints);
}

export const collectionsQueueService = {
  async createCase(input: { unitId: string; assignedToUserId?: string; nextFollowUpAt?: string; note?: string }) {
    const { data, error } = await collectionsDb.rpc("create_collection_case", {
      p_unit_id: input.unitId, p_assigned_to_user_id: input.assignedToUserId || null,
      p_next_follow_up_at: input.nextFollowUpAt || null, p_note: input.note || null,
    });
    if (error) throw error;
    return data;
  },

  async createPromise(input: { collectionCaseId: string; amountMinor: number; currency: string; promisedFor: string; createdBy: string; notes?: string }) {
    const { data, error } = await collectionsDb.from("estate_promise_to_pay").insert({
      collection_case_id: input.collectionCaseId, amount_minor: input.amountMinor, currency: input.currency,
      promised_for: input.promisedFor, created_by: input.createdBy, notes: input.notes || null,
    }).select("*").single();
    if (error) throw error;
    await collectionsDb.from("estate_collection_case_events").insert({ collection_case_id: input.collectionCaseId, event_type: "promise_created", actor_user_id: input.createdBy, note: input.notes || null });
    await collectionsDb.from("estate_collection_cases").update({ status: "promise_active", next_follow_up_at: `${input.promisedFor}T09:00:00Z`, updated_at: new Date().toISOString() }).eq("id", input.collectionCaseId);
    return data;
  },

  async listCases(estateIds: string[]) {
    if (!estateIds.length) return [];
    const { data, error } = await collectionsDb.from("estate_collection_cases").select("*, estate_promise_to_pay(*)").in("estate_id", estateIds).order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getQueue(organizationId: string, filters?: {
    agingBucket?: CollectionQueueItem["agingBucket"];
    status?: CollectionQueueStatus;
    limit?: number;
  }): Promise<CollectionQueueItem[]> {
    const { data: estates, error: estateError } = await collectionsDb
      .from("managed_estates")
      .select("id")
      .eq("organization_id", organizationId);
    if (estateError) throw estateError;

    const estateIds = (estates || []).map((estate: { id: string }) => estate.id);
    if (estateIds.length === 0) return [];

    const { data: units, error: unitError } = await collectionsDb
      .from("estate_units")
      .select("id, estate_id")
      .in("estate_id", estateIds);
    if (unitError) throw unitError;

    const unitIds = (units || []).map((unit: { id: string }) => unit.id);
    if (unitIds.length === 0) return [];

    const [{ data: charges, error: chargeError }, { data: actions, error: actionError }, { data: cases, error: caseError }] = await Promise.all([
      collectionsDb
        .from("unit_charges")
        .select("id, unit_id, amount_minor, currency, due_date, type, description, payment_allocations(amount_minor)")
        .in("unit_id", unitIds)
        .order("due_date"),
      collectionsDb
        .from("estate_collection_actions")
        .select("unit_id, action_type, created_at, promised_date")
        .in("unit_id", unitIds)
        .order("created_at", { ascending: false }),
      collectionsDb
        .from("estate_collection_cases")
        .select("id, unit_id, status, assigned_to_user_id, next_follow_up_at, estate_promise_to_pay(id, status, promised_for)")
        .in("unit_id", unitIds)
        .not("status", "in", "(resolved,closed)")
        .order("updated_at", { ascending: false }),
    ]);
    if (chargeError) throw chargeError;
    if (actionError) throw actionError;
    if (caseError) throw caseError;

    const today = new Date();
    const queue = new Map<string, CollectionQueueItem>();
    for (const charge of (charges || []) as EstateChargeRow[]) {
      const outstanding = getChargeOutstandingMinor(charge);
      if (outstanding <= 0) continue;

      const unit = (units || []).find((candidate: { id: string }) => candidate.id === charge.unit_id);
      if (!unit) continue;
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - new Date(charge.due_date).getTime()) / 86400000));
      const unitActions = (actions || []).filter((action: { unit_id: string }) => action.unit_id === charge.unit_id);
      const activeCase = (cases || []).find((candidate: { unit_id: string }) => candidate.unit_id === charge.unit_id);
      const activePromise = activeCase?.estate_promise_to_pay?.find((promise: { status: string }) => promise.status === "active");
      const existing = queue.get(charge.unit_id);
      const item = existing || {
        caseId: activeCase?.id || null,
        unitId: charge.unit_id,
        estateId: unit.estate_id,
        totalOutstandingMinor: 0,
        oldestDueDate: charge.due_date,
        daysOverdue,
        agingBucket: agingBucket(daysOverdue),
        priorityScore: 0,
        status: activeCase ? this.statusFromCase(activeCase.status) : "new" as CollectionQueueStatus,
        assignedToUserId: activeCase?.assigned_to_user_id || null,
        activePromiseId: activePromise?.id || null,
        lastActionAt: unitActions[0]?.created_at || null,
        nextFollowUpDate: activeCase?.next_follow_up_at || unitActions.find((action: { promised_date?: string | null }) => action.promised_date)?.promised_date || null,
        charges: [],
      };

      item.totalOutstandingMinor += outstanding;
      if (charge.due_date < item.oldestDueDate) {
        item.oldestDueDate = charge.due_date;
        item.daysOverdue = daysOverdue;
        item.agingBucket = agingBucket(daysOverdue);
      }
      item.status = activeCase ? this.statusFromCase(activeCase.status) : unitActions[0]?.action_type === "escalation"
        ? "escalated"
        : unitActions[0]?.action_type === "payment_plan"
          ? "plan"
          : unitActions[0]?.action_type === "promise_to_pay"
            ? "promise"
            : unitActions.length > 0 ? "contacted" : "new";
      item.priorityScore = priorityScore(item.totalOutstandingMinor, item.daysOverdue, unitActions.length);
      item.charges.push(charge);
      queue.set(charge.unit_id, item);
    }

    return [...queue.values()]
      .filter((item) => !filters?.agingBucket || item.agingBucket === filters.agingBucket)
      .filter((item) => !filters?.status || item.status === filters.status)
      .sort((left, right) => right.priorityScore - left.priorityScore || right.totalOutstandingMinor - left.totalOutstandingMinor)
      .slice(0, filters?.limit || 100);
  },

  statusFromCase(status: string): CollectionQueueStatus {
    if (status === "escalated") return "escalated";
    if (status === "promise_active") return "promise";
    if (status === "payment_plan") return "plan";
    if (status === "contacted") return "contacted";
    return "new";
  },
};
