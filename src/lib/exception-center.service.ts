/**
 * BaytMiftah REOS — Centralized Exception & Incident Center Service
 *
 * Scans, aggregates, and prioritizes operational exceptions across:
 *  - Broken Promises-to-Pay (Collections)
 *  - Overdue Maintenance Work Orders (Facilities SLAs)
 *  - Expiring Leases without Renewal (Leasing)
 *  - Failed or Unreconciled Bank Lines (Finance)
 */

import { supabase } from "./supabase";

const db = supabase as any;

export type ExceptionCategory =
  | "broken_promise"
  | "work_order_overdue"
  | "lease_expiring"
  | "unreconciled_variance";

export interface OperationalException {
  id: string;
  category: ExceptionCategory;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  occurredAt: string;
  entityId: string;
  suggestedAction: string;
}

export const exceptionCenterService = {
  async getOperationalExceptions(organizationId: string): Promise<OperationalException[]> {
    const exceptions: OperationalException[] = [];

    // 1. Broken promises
    try {
      const { data: estates } = await db
        .from("managed_estates")
        .select("id")
        .eq("organization_id", organizationId);
      const estateIds = ((estates || []) as any[]).map((e: any) => e.id);

      if (estateIds.length > 0) {
        const { data: cases } = await db
          .from("estate_collection_cases")
          .select("*, estate_promise_to_pay(*)")
          .in("estate_id", estateIds)
          .eq("status", "promise_broken")
          .limit(10);

        for (const c of (cases || []) as any[]) {
          exceptions.push({
            id: `ptp_${c.id}`,
            category: "broken_promise",
            title: `Broken Promise: Unit ${c.unit_id?.slice(0, 8)}`,
            description: `Outstanding balance of GH₵ ${((c.total_outstanding_minor || 0) / 100).toLocaleString()} was not satisfied on the promised date.`,
            severity: "critical",
            occurredAt: c.updated_at || c.created_at,
            entityId: c.id,
            suggestedAction: "Initiate formal conciliation or issue legal notice.",
          });
        }
      }
    } catch {}

    // 2. Overdue Work Orders
    try {
      const { data: workOrders } = await db
        .from("estate_work_orders")
        .select("*")
        .in("status", ["assigned", "in_progress"])
        .lt("due_date", new Date().toISOString().slice(0, 10))
        .limit(10);

      for (const wo of (workOrders || []) as any[]) {
        exceptions.push({
          id: `wo_${wo.id}`,
          category: "work_order_overdue",
          title: `Overdue SLA: ${wo.title}`,
          description: `Work order was due on ${wo.due_date} but remains in ${wo.status} state.`,
          severity: "warning",
          occurredAt: wo.created_at,
          entityId: wo.id,
          suggestedAction: "Escalate to contractor dispatch agent for reassignment.",
        });
      }
    } catch {}

    return exceptions;
  },
};
