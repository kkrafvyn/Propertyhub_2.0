import { supabase } from "./supabase";
import { attachEscrowMilestonesToTransactions } from "./escrow-milestones";

export type PaymentGatewayProvider = "paystack" | "stripe" | "flutterwave" | "it_consortium";

export interface PaymentGatewayOption {
  id: PaymentGatewayProvider;
  label: string;
  helper: string;
  enabled: boolean;
}

export const PAYMENT_GATEWAY_OPTIONS: PaymentGatewayOption[] = [
  {
    id: "paystack",
    label: "Paystack",
    helper: "Secure checkout, escrow release, and refunds. Live now with your Paystack key.",
    enabled: true,
  },
  {
    id: "stripe",
    label: "Stripe",
    helper: "Same checkout, escrow, and refund flow. Falls back to Paystack until Stripe keys are added.",
    enabled: true,
  },
  {
    id: "flutterwave",
    label: "Flutterwave",
    helper: "Same checkout, escrow, and refund flow. Falls back to Paystack until Flutterwave keys are added.",
    enabled: true,
  },
  {
    id: "it_consortium",
    label: "IT Consortium",
    helper: "Prepared for TheTeller once operations enables merchant credentials.",
    enabled: import.meta.env.VITE_IT_CONSORTIUM_ENABLED === "true",
  },
];

export function getPaymentGatewayLabel(provider?: string | null) {
  switch (provider) {
    case "stripe":
      return "Stripe";
    case "flutterwave":
      return "Flutterwave";
    case "it_consortium":
      return "IT Consortium";
    default:
      return "Paystack";
  }
}

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
  receipt:transaction_receipts(*),
  refunds:property_refunds(*),
  escrow:property_escrows(
    *,
    documents:property_escrow_documents(*),
    events:property_escrow_events(*)
  )
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
  provider?: PaymentGatewayProvider;
  fallbackProviders?: PaymentGatewayProvider[];
  allowGatewayFallback?: boolean;
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
    const { data, error } = await supabase.functions.invoke("initialize-property-payment", {
      body: input,
    });

    if (error) throw error;
    return data as {
      transaction: any;
      authorizationUrl: string;
      accessCode: string;
      reference: string;
      provider: PaymentGatewayProvider;
      requestedProvider?: PaymentGatewayProvider;
      fallbackAttempted?: boolean;
      fallbackAttempts?: Array<{
        provider: PaymentGatewayProvider;
        reference: string;
        error: string;
      }>;
      callbackUrl: string;
    };
  },

  async verifyPropertyPayment(reference: string) {
    const { data, error } = await supabase.functions.invoke("verify-property-payment", {
      body: { reference },
    });

    if (error) throw error;
    return data as {
      status: string;
      transaction: any;
      receipt: any;
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
    return attachEscrowMilestonesToTransactions(data || []);
  },

  async getOrganizationPropertyTransactions(organizationId: string) {
    const { data, error } = await supabase
      .from("property_transactions")
      .select(PROPERTY_TRANSACTION_SELECT)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return attachEscrowMilestonesToTransactions(data || []);
  },

  async getReceiptDownloadUrl(bucket: string, path: string) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5);

    if (error) throw error;
    return data.signedUrl;
  },
};
