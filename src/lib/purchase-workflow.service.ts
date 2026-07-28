import { supabase } from "./supabase";
import { documentCenterService } from "./document-center.service";
import { notificationService } from "./notification.service";

const DEFAULT_CLOSING_ITEMS = [
  { item_key: "offer_accepted", label: "Offer accepted", sort_order: 1 },
  { item_key: "deposit_paid", label: "Deposit paid into escrow", sort_order: 2 },
  { item_key: "inspection", label: "Property inspection completed", sort_order: 3 },
  { item_key: "financing", label: "Mortgage / financing confirmed", sort_order: 4 },
  { item_key: "sale_agreement", label: "Sale agreement signed", sort_order: 5 },
  { item_key: "closing_funds", label: "Closing funds transferred", sort_order: 6 },
  { item_key: "handover", label: "Keys and handover completed", sort_order: 7 },
];

export const purchaseWorkflowService = {
  async getCounterOffers(dealCaseId: string) {
    const { data, error } = await supabase
      .from("deal_case_counter_offers")
      .select("*")
      .eq("deal_case_id", dealCaseId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async submitCounterOffer(input: {
    dealCaseId: string;
    userId: string;
    role: "buyer" | "seller";
    amountMinor: number;
    currency?: string;
    message?: string;
  }) {
    const { data, error } = await supabase
      .from("deal_case_counter_offers")
      .insert({
        deal_case_id: input.dealCaseId,
        offered_by_user_id: input.userId,
        offered_by_role: input.role,
        amount_minor: input.amountMinor,
        currency: input.currency || "GHS",
        message: input.message || null,
      })
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyCounterOfferEvent(input.dealCaseId, "submitted", {
      actorUserId: input.userId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      offeredByRole: input.role,
    });

    return data;
  },

  async respondToCounterOffer(
    offerId: string,
    status: "accepted" | "rejected" | "withdrawn",
    dealCaseId?: string
  ) {
    const { data, error } = await supabase
      .from("deal_case_counter_offers")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", offerId)
      .select("*")
      .single();

    if (error) throw error;

    if (status === "accepted" && dealCaseId) {
      await supabase
        .from("deal_cases")
        .update({
          pipeline_stage: "negotiation",
          status: "approved",
          last_stage_updated_at: new Date().toISOString(),
          message: `Counter-offer accepted at ${(data.amount_minor / 100).toLocaleString()} ${data.currency}`,
        })
        .eq("id", dealCaseId);

      await this.markChecklistByKey(dealCaseId, "offer_accepted", data.offered_by_user_id);
    }

    void notificationService.notifyCounterOfferEvent(dealCaseId || data.deal_case_id, "responded", {
      status,
      amountMinor: data.amount_minor,
      currency: data.currency,
    });

    return data;
  },

  async ensureClosingChecklist(dealCaseId: string) {
    const { data: existing, error: fetchError } = await supabase
      .from("closing_checklist_items")
      .select("id")
      .eq("deal_case_id", dealCaseId)
      .limit(1);

    if (fetchError) throw fetchError;
    if (existing && existing.length > 0) {
      return this.getClosingChecklist(dealCaseId);
    }

    const { error: insertError } = await supabase.from("closing_checklist_items").insert(
      DEFAULT_CLOSING_ITEMS.map((item) => ({
        deal_case_id: dealCaseId,
        ...item,
      }))
    );

    if (insertError) throw insertError;
    return this.getClosingChecklist(dealCaseId);
  },

  async getClosingChecklist(dealCaseId: string) {
    const { data, error } = await supabase
      .from("closing_checklist_items")
      .select("*")
      .eq("deal_case_id", dealCaseId)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async markChecklistByKey(
    dealCaseId: string,
    itemKey: string,
    userId: string,
    completed = true
  ) {
    const { data: item, error: fetchError } = await supabase
      .from("closing_checklist_items")
      .select("id")
      .eq("deal_case_id", dealCaseId)
      .eq("item_key", itemKey)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!item) {
      await this.ensureClosingChecklist(dealCaseId);
      const { data: retryItem, error: retryError } = await supabase
        .from("closing_checklist_items")
        .select("id")
        .eq("deal_case_id", dealCaseId)
        .eq("item_key", itemKey)
        .maybeSingle();

      if (retryError) throw retryError;
      if (!retryItem) return null;
      return this.toggleChecklistItem(retryItem.id, userId, completed);
    }

    return this.toggleChecklistItem(item.id, userId, completed);
  },

  async toggleChecklistItem(itemId: string, userId: string, completed: boolean) {
    const { data, error } = await supabase
      .from("closing_checklist_items")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? userId : null,
      })
      .eq("id", itemId)
      .select("*, deal_case:deal_cases(id, user_id, organization_id)")
      .single();

    if (error) throw error;

    if (completed && data?.deal_case_id && data.deal_case?.user_id) {
      void notificationService.notifyUser({
        userId: data.deal_case.user_id,
        notificationType: "closing_checklist_updated",
        subject: "Closing checklist updated",
        content: `${data.label} was marked complete on your purchase application.`,
        category: "Offers",
        actionUrl: "/app/applications",
        metadata: { dealCaseId: data.deal_case_id, itemId },
      });
    }

    return data;
  },

  async getPendingSignatureDocuments(dealCaseId: string, userId: string) {
    const documents = await documentCenterService.getUserDocuments(userId);
    return documents.filter(
      (doc: any) =>
        doc.deal_case_id === dealCaseId &&
        doc.signature_required &&
        !["signed", "archived"].includes(String(doc.status))
    );
  },

  async signDocumentAsConsumer(input: {
    documentId: string;
    userId: string;
    signerName: string;
    signerEmail?: string | null;
  }) {
    return documentCenterService.signDocument({
      documentId: input.documentId,
      signerUserId: input.userId,
      signerName: input.signerName,
      signerEmail: input.signerEmail,
      signerRole: "client",
    });
  },
};
