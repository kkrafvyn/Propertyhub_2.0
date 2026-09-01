/**
 * BaytMiftah REOS — Unified Approval Center Service
 *
 * Consolidates pending multi-domain governance decisions into a single queue:
 *  - Procurement Purchase Requests & Orders
 *  - 3-Way Match Invoice Variances
 *  - Public Lease Applications
 *  - Owner Rental Disbursement Runs
 *  - Draft Journal Entries
 */

import { supabase } from "./supabase";

const db = supabase as any;

export type ApprovalDomain =
  | "procurement_request"
  | "invoice_variance"
  | "lease_application"
  | "owner_disbursement"
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

    // 1. Fetch pending lease applications
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
    } catch {}

    // 2. Fetch pending procurement requests
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
      }
    } catch {}

    // 3. Fetch draft journal entries
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
    } catch {}

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
};
