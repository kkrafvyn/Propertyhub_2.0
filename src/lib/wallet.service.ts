import { supabase } from "./supabase";

function formatWalletAmount(amountMinor?: number | null, currency = "GHS") {
  if (!amountMinor) return `${currency} 0.00`;
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export const walletService = {
  formatWalletAmount,

  async getWallet(userId: string, currency = "GHS") {
    const { data, error } = await supabase
      .from("user_wallets")
      .select("*")
      .eq("user_id", userId)
      .eq("currency", currency)
      .maybeSingle();

    if (error) throw error;

    return (
      data ?? {
        id: "",
        user_id: userId,
        currency,
        available_minor: 0,
        pending_minor: 0,
        created_at: null,
        updated_at: null,
      }
    );
  },

  async getLedger(userId: string, currency = "GHS", limit = 20) {
    const wallet = await this.getWallet(userId, currency);
    if (!wallet.id) return [];

    const { data, error } = await supabase
      .from("wallet_ledger")
      .select("*")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async requestPayout(input: {
    userId: string;
    amountMinor: number;
    currency?: string;
    payoutMethod?: "mobile_money" | "bank_transfer";
    payoutDestination: string;
    notes?: string;
  }) {
    const { data, error } = await supabase.rpc("request_wallet_payout", {
      p_user_id: input.userId,
      p_amount_minor: input.amountMinor,
      p_currency: input.currency || "GHS",
      p_payout_method: input.payoutMethod || "mobile_money",
      p_payout_destination: input.payoutDestination,
      p_notes: input.notes || null,
    });

    if (error) throw error;
    return data;
  },

  async processPayoutRequest(
    requestId: string,
    action: "approve" | "mark_paid" | "reject",
    processorNote?: string
  ) {
    const { data, error } = await supabase.rpc("process_wallet_payout_request", {
      p_request_id: requestId,
      p_action: action,
      p_processor_note: processorNote || null,
    });

    if (error) throw error;
    return data;
  },

  async getSavedPaymentMethods(userId: string) {
    const { data, error } = await supabase
      .from("saved_payment_methods")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async savePaymentMethod(input: {
    userId: string;
    label: string;
    methodType?: "mobile_money" | "card" | "bank_transfer";
    lastFour?: string;
    isDefault?: boolean;
  }) {
    if (input.isDefault) {
      await supabase
        .from("saved_payment_methods")
        .update({ is_default: false })
        .eq("user_id", input.userId);
    }

    const { data, error } = await supabase
      .from("saved_payment_methods")
      .insert({
        user_id: input.userId,
        label: input.label,
        method_type: input.methodType || "mobile_money",
        last_four: input.lastFour || null,
        is_default: input.isDefault ?? false,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async getPayoutRequests(userId: string, limit = 10) {
    const { data, error } = await supabase
      .from("wallet_payout_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};
