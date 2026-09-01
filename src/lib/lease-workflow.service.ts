import { supabase } from "./supabase";
import { documentCenterService } from "./document-center.service";
import { notificationService } from "./notification.service";
import { calculateDepositSettlement, leaseDepositService } from "./lease-deposit.service";

export const leaseWorkflowService = {
  async getRentSchedule(leaseId: string) {
    const { data, error } = await supabase
      .from("lease_rent_schedule")
      .select("*")
      .eq("lease_id", leaseId)
      .order("due_date", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async ensureRentSchedule(lease: {
    id: string;
    start_date: string;
    end_date?: string | null;
    rent_minor: number;
    currency?: string;
    next_rent_due_at?: string | null;
  }) {
    const existing = await this.getRentSchedule(lease.id);
    if (existing.length > 0) return existing;

    const rows: Array<{
      lease_id: string;
      due_date: string;
      amount_minor: number;
      currency: string;
      status: "upcoming" | "paid" | "overdue";
    }> = [];

    const start = new Date(`${lease.start_date}T00:00:00`);
    const end = lease.end_date
      ? new Date(`${lease.end_date}T00:00:00`)
      : new Date(start);
    if (!lease.end_date) {
      end.setMonth(end.getMonth() + 12);
    }

    const today = new Date().toISOString().slice(0, 10);

    for (let cursor = new Date(start); cursor <= end; cursor.setMonth(cursor.getMonth() + 1)) {
      const dueDate = cursor.toISOString().slice(0, 10);
      rows.push({
        lease_id: lease.id,
        due_date: dueDate,
        amount_minor: lease.rent_minor,
        currency: lease.currency || "GHS",
        status: dueDate < today ? "overdue" : "upcoming",
      });
      if (rows.length >= 12) break;
    }

    if (rows.length === 0) return [];

    const { data, error } = await supabase
      .from("lease_rent_schedule")
      .insert(rows)
      .select("*");

    if (error) throw error;

    const overdueRows = (data || []).filter((row) => row.status === "overdue");
    await Promise.all(
      overdueRows.map((row) =>
        notificationService.notifyRentDue(
          lease.id,
          row.due_date,
          row.amount_minor,
          row.currency || lease.currency || "GHS"
        )
      )
    );

    return data || [];
  },

  async requestRenewal(leaseId: string) {
    const { data, error } = await supabase
      .from("leases")
      .update({
        renewal_status: "requested",
        renewal_notice_at: new Date().toISOString(),
      })
      .eq("id", leaseId)
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyLeaseEvent(leaseId, "renewal_requested");

    return data;
  },

  async getPendingLeaseDocument(
    lease: { deal_case_id?: string | null },
    userId: string
  ) {
    if (!lease.deal_case_id) return null;
    const documents = await documentCenterService.getUserDocuments(userId);
    return (
      documents.find(
        (doc: any) =>
          doc.deal_case_id === lease.deal_case_id &&
          doc.document_type === "lease_contract" &&
          doc.signature_required &&
          !["signed", "archived"].includes(String(doc.status))
      ) || null
    );
  },

  async signLeaseDocument(input: {
    leaseId: string;
    userId: string;
    signerName: string;
    signerEmail?: string | null;
  }) {
    const { data: lease, error: leaseError } = await supabase
      .from("leases")
      .select("id, deal_case_id")
      .eq("id", input.leaseId)
      .single();

    if (leaseError) throw leaseError;

    const pendingDocument = await this.getPendingLeaseDocument(lease, input.userId);
    if (pendingDocument) {
      await documentCenterService.signDocument({
        documentId: pendingDocument.id,
        signerUserId: input.userId,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
        signerRole: "tenant",
      });
    }

    return this.markLeaseSigned(input.leaseId);
  },

  async markLeaseSigned(leaseId: string) {
    const { data, error } = await supabase
      .from("leases")
      .update({
        signing_status: "signed",
        signed_at: new Date().toISOString(),
      })
      .eq("id", leaseId)
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyLeaseEvent(leaseId, "signed");

    return data;
  },

  async createESignatureRequest(input: { organizationId: string; leaseId: string; documentId?: string; provider: string; signers: Array<{ email: string; name: string; role: string }>; expiresAt?: string; createdBy: string }) {
    if (!input.provider.trim() || !input.signers.length) throw new Error("Signature provider and at least one signer are required");
    const { data, error } = await supabase.from("esignature_requests").insert({
      organization_id: input.organizationId,
      lease_id: input.leaseId,
      document_id: input.documentId || null,
      provider: input.provider.trim().toLowerCase(),
      signers: input.signers,
      expires_at: input.expiresAt || null,
      created_by: input.createdBy,
    }).select("*").single();
    if (error) throw error;
    return data;
  },

  async updateESignatureStatus(requestId: string, status: "sent" | "viewed" | "partially_signed" | "completed" | "declined" | "expired" | "failed", providerRequestId?: string, signingUrl?: string) {
    const { data, error } = await supabase.from("esignature_requests").update({ status, provider_request_id: providerRequestId || null, signing_url: signingUrl || null, updated_at: new Date().toISOString() }).eq("id", requestId).select("*").single();
    if (error) throw error;
    if (status === "completed") await this.markLeaseSigned(data.lease_id);
    return data;
  },

  async respondToRenewal(leaseId: string, status: "approved" | "declined") {
    const { data, error } = await supabase
      .from("leases")
      .update({ renewal_status: status })
      .eq("id", leaseId)
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyLeaseEvent(leaseId, "renewal_responded", {
      renewalStatus: status,
    });

    return data;
  },

  async completeMoveOut(input: { leaseId: string; occupancyId: string; depositAmountMinor: number; deductionsMinor: number; currency: string; recordedBy: string; deductionReason?: string }) {
    const { data: checklist, error: checklistError } = await supabase.from("move_checklist_items").select("completed").eq("lease_id", input.leaseId).eq("checklist_type", "move_out");
    if (checklistError) throw checklistError;
    if (!checklist?.length || checklist.some((item: { completed: boolean }) => !item.completed)) throw new Error("Complete every move-out checklist item before settlement");
    const settlement = calculateDepositSettlement(input.depositAmountMinor, input.deductionsMinor);
    const deposit = await leaseDepositService.upsert({ leaseId: input.leaseId, ...settlement, currency: input.currency, reason: input.deductionReason, recordedBy: input.recordedBy });
    const { data: moveEvent, error: moveError } = await supabase.from("estate_move_events").insert({ occupancy_id: input.occupancyId, event_type: "move_out", notes: input.deductionReason || "Move-out settlement completed", recorded_by: input.recordedBy }).select("*").single();
    if (moveError) throw moveError;
    return { deposit, moveEvent };
  },
};
