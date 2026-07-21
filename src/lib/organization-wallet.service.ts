import { supabase } from "./supabase";

function formatWalletAmount(amountMinor?: number | null, currency = "GHS") {
  if (!amountMinor) return `${currency} 0.00`;
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export const organizationWalletService = {
  formatWalletAmount,

  async getOrganizationWallet(organizationId: string, currency = "GHS") {
    const { data, error } = await supabase
      .from("organization_wallets")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("currency", currency)
      .maybeSingle();

    if (error) throw error;

    return (
      data || {
        organization_id: organizationId,
        currency,
        available_minor: 0,
        pending_minor: 0,
      }
    );
  },

  async getOrganizationLedger(organizationId: string, currency = "GHS", limit = 20) {
    const wallet = await this.getOrganizationWallet(organizationId, currency);
    if (!wallet.id) return [];

    const { data, error } = await supabase
      .from("organization_wallet_ledger")
      .select("*")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async requestOrganizationPayout(input: {
    organizationId: string;
    requestedByUserId: string;
    amountMinor: number;
    currency?: string;
    payoutMethod?: "mobile_money" | "bank_transfer";
    payoutDestination: string;
    notes?: string;
  }) {
    const { data, error } = await supabase.rpc("request_organization_payout", {
      p_organization_id: input.organizationId,
      p_requested_by_user_id: input.requestedByUserId,
      p_amount_minor: input.amountMinor,
      p_currency: input.currency || "GHS",
      p_payout_method: input.payoutMethod || "mobile_money",
      p_payout_destination: input.payoutDestination,
      p_notes: input.notes || null,
    });

    if (error) throw error;
    return data;
  },

  async getOrganizationPayoutRequests(organizationId: string, limit = 20) {
    const { data, error } = await supabase
      .from("organization_payout_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async processOrganizationPayoutRequest(
    requestId: string,
    action: "approve" | "mark_paid" | "reject",
    processorNote?: string
  ) {
    const { data, error } = await supabase.rpc("process_organization_payout_request", {
      p_request_id: requestId,
      p_action: action,
      p_processor_note: processorNote || null,
    });

    if (error) throw error;
    return data;
  },
};
