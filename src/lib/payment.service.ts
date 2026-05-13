import { supabase } from "./supabase";

const PROPERTY_TRANSACTION_SELECT = `
  *,
  listing:listings(
    id,
    listing_type,
    price,
    currency,
    property:properties(address, city, region)
  ),
  organization:organizations(name),
  payer:users(id, full_name, email, phone),
  receipt:transaction_receipts(
    *,
    blockchain_record:blockchain_records(
      id,
      transaction_hash,
      chain_id,
      record_type,
      status
    )
  ),
  refunds:property_refunds(*)
`;

export interface InitializePropertyPaymentInput {
  listingId: string;
  amount: number | string;
  purpose?:
    | "deposit"
    | "rent"
    | "lease_fee"
    | "inspection_fee"
    | "booking_fee"
    | "purchase_installment"
    | "other";
  dealCaseId?: string | null;
  customerName?: string;
  customerPhone?: string;
}

export interface InitiatePropertyRefundInput {
  transactionId: string;
  amount?: number | string | null;
  reason: string;
  customerNote?: string;
  merchantNote?: string;
}

export const paymentService = {
  async initializePropertyPayment(input: InitializePropertyPaymentInput) {
    const { data, error } = await supabase.functions.invoke("initialize-paystack-payment", {
      body: input,
    });

    if (error) throw error;
    return data as {
      transaction: any;
      authorizationUrl: string;
      accessCode: string;
      reference: string;
      callbackUrl: string;
    };
  },

  async verifyPropertyPayment(reference: string) {
    const { data, error } = await supabase.functions.invoke("verify-paystack-payment", {
      body: { reference },
    });

    if (error) throw error;
    return data as {
      status: string;
      transaction: any;
      receipt: any;
      blockchainRecord: any;
      alreadyProcessed: boolean;
    };
  },

  async initiatePropertyRefund(input: InitiatePropertyRefundInput) {
    const { data, error } = await supabase.functions.invoke("initiate-paystack-refund", {
      body: input,
    });

    if (error) throw error;
    return data as {
      transaction: any;
      refund: any;
      refundableBalanceMinor: number;
    };
  },

  async getUserPropertyTransactions(userId: string) {
    const { data, error } = await supabase
      .from("property_transactions")
      .select(PROPERTY_TRANSACTION_SELECT)
      .eq("payer_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getOrganizationPropertyTransactions(organizationId: string) {
    const { data, error } = await supabase
      .from("property_transactions")
      .select(PROPERTY_TRANSACTION_SELECT)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getReceiptDownloadUrl(bucket: string, path: string) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5);

    if (error) throw error;
    return data.signedUrl;
  },
};
