/**
 * BaytMiftah REOS — Unified Approval Center Service
 *
 * Consolidates pending multi-domain governance decisions into a single queue:
 *  - Procurement Purchase Requests & Orders
 *  - 3-Way Match Invoice Variances
 *  - Public Lease Applications
 *  - Owner Rental Disbursement Runs
 *  - Owner expense approvals (management spend thresholds)
 *  - Draft Journal Entries
 */

import { supabase } from "./supabase";
import { ownerOversightService } from "./owner-oversight.service";

const db = supabase as any;

export type ApprovalDomain =
  | "procurement_request"
  | "invoice_variance"
  | "lease_application"
  | "owner_disbursement"
  | "owner_expense"
  | "journal_entry";

export interface PendingApprovalItem {
  id: string;
  domain: ApprovalDomain;
  title: string;
  subtitle: string;
  amountMinor?: number;
  currency: string;
  requestedBy?: string;
  urgency: "low" | "medium" | "high" | "critical";
  createdAt: string;
  metadata?: Record<string, any>;
}

export const approvalCenterService = {
  async getPendingApprovals(organizationId: string): Promise<PendingApprovalItem[]> {
    const items: PendingApprovalItem[] = [];

    try {
      const { data: apps } = await db
        .from("public_lease_applications")
        .select("*")
        .eq("status", "PENDING")
        .limit(15);

      for (const a of (apps || []) as any[]) {
        items.push({
          id: a.id,
          domain: "lease_application",
          title: `Lease App: ${a.applicant_name || "Applicant"}`,
          subtitle: `Income: GH₵ ${a.monthly_income || "N/A"} — ${a.applicant_email}`,
          currency: "GHS",
          urgency: "medium",
          createdAt: a.created_at,
          metadata: a,
        });
      }
    } catch (error) {
      console.warn("Approval Center could not load lease applications", error);
    }

    try {
      const { data: estates } = await db
        .from("managed_estates")
        .select("id")
        .eq("organization_id", organizationId);
      const estateIds = ((estates || []) as any[]).map((e: any) => e.id);

      if (estateIds.length > 0) {
        const { data: requests } = await db
          .from("estate_procurement_requests")
          .select("*")
          .in("estate_id", estateIds)
          .eq("status", "requested")
          .limit(15);

        for (const req of (requests || []) as any[]) {
          items.push({
            id: req.id,
            domain: "procurement_request",
            title: `Purchase Request: ${req.title}`,
            subtitle: req.description || "Procurement material approval",
            amountMinor: req.amount_minor || 0,
            currency: req.currency || "GHS",
            urgency: (req.amount_minor || 0) > 500000 ? "high" : "medium",
            createdAt: req.created_at,
            metadata: req,
          });
        }

        const { data: distributions } = await db
          .from("estate_distribution_approvals")
          .select("*, statement:estate_owner_statement_runs(estate_id, currency, net_distributable_minor)")
          .eq("status", "pending")
          .limit(20);

        for (const row of (distributions || []) as any[]) {
          const estateId = row.statement?.estate_id;
          if (estateId && !estateIds.includes(estateId)) continue;
          items.push({
            id: row.id,
            domain: "owner_disbursement",
            title: "Owner disbursement approval",
            subtitle: row.payout_reference || "Pending owner payout",
            amountMinor: row.requested_amount_minor || row.statement?.net_distributable_minor || 0,
            currency: row.currency || row.statement?.currency || "GHS",
            urgency: "high",
            createdAt: row.requested_at || row.created_at || new Date().toISOString(),
            metadata: row,
          });
        }
      }
    } catch (error) {
      console.warn("Approval Center could not load procurement or disbursement approvals", error);
    }

    try {
      const ownerExpenses = await ownerOversightService.listOrgExpenseApprovals(
        organizationId,
        "pending",
      );
      for (const row of ownerExpenses) {
        items.push({
          id: row.id,
          domain: "owner_expense",
          title: row.title,
          subtitle: row.description || "Owner spend threshold approval",
          amountMinor: row.amount_minor,
          currency: row.currency || "GHS",
          urgency: row.amount_minor > 500000 ? "critical" : "high",
          createdAt: row.created_at,
          metadata: row,
        });
      }
    } catch (error) {
      console.warn("Approval Center could not load owner expense approvals", error);
    }

    try {
      const { data: jes } = await db
        .from("journal_entries")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "DRAFT")
        .limit(10);

      for (const je of (jes || []) as any[]) {
        items.push({
          id: je.id,
          domain: "journal_entry",
          title: `Journal Post: ${je.description}`,
          subtitle: `Ref: ${je.reference_number || "JE-Draft"} • Entry Date: ${je.entry_date}`,
          currency: "GHS",
          urgency: "low",
          createdAt: je.created_at || new Date().toISOString(),
          metadata: je,
        });
      }
    } catch (error) {
      console.warn("Approval Center could not load draft journal entries", error);
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async resolveApproval(input: {
    id: string;
    domain: ApprovalDomain;
    decision: "approved" | "rejected";
    note?: string;
  }) {
    if (input.domain === "owner_expense") {
      return ownerOversightService.reviewExpenseApproval({
        approvalId: input.id,
        status: input.decision,
        reviewNote: input.note,
      });
    }

    if (input.domain === "owner_disbursement") {
      const { data, error } = await db
        .from("estate_distribution_approvals")
        .update({
          status: input.decision === "approved" ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }

    if (input.domain === "lease_application") {
      const { data, error } = await db
        .from("public_lease_applications")
        .update({
          status: input.decision === "approved" ? "APPROVED" : "REJECTED",
        })
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }

    if (input.domain === "procurement_request") {
      const { data, error } = await db
        .from("estate_procurement_requests")
        .update({
          status: input.decision === "approved" ? "approved" : "rejected",
        })
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }

    if (input.domain === "journal_entry") {
      const { data, error } = await db
        .from("journal_entries")
        .update({
          status: input.decision === "approved" ? "POSTED" : "VOID",
        })
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }

    throw new Error(`Unsupported approval domain: ${input.domain}`);
  },
};
