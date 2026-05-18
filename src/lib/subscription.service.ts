import { supabase } from "./supabase";

export type SubscriptionStatus =
  | "pending_payment"
  | "active"
  | "grace_period"
  | "past_due"
  | "suspended"
  | "cancelled";

export interface SubscriptionTier {
  id: "starter" | "growth" | "pro" | string;
  name: string;
  description: string | null;
  currency: string;
  price_minor: number;
  billing_interval: "monthly" | string;
  agent_seat_limit: number | null;
  active_listing_limit: number | null;
  paystack_plan_code?: string | null;
  stripe_price_id_usd?: string | null;
  stripe_price_id_gbp?: string | null;
  stripe_price_id_eur?: string | null;
  feature_summary: string[];
  is_active: boolean;
  sort_order: number;
}

export interface OrganizationSubscription {
  id: string;
  organization_id: string;
  tier_id: string;
  pending_tier_id: string | null;
  pending_tier_effective_at: string | null;
  provider: "paystack" | "stripe" | string;
  status: SubscriptionStatus;
  authorization_url: string | null;
  provider_reference: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_payment_at: string | null;
  grace_period_ends_at: string | null;
  cancel_at_period_end: boolean;
  activated_at: string | null;
  suspended_at: string | null;
  cancelled_at: string | null;
  tier?: SubscriptionTier | null;
  pending_tier?: SubscriptionTier | null;
}

export interface SubscriptionPayment {
  id: string;
  organization_id: string;
  subscription_id: string;
  provider_reference: string;
  amount_minor: number;
  currency: string;
  status: string;
  paid_at: string | null;
  payment_channel: string | null;
  gateway_response: string | null;
  authorization_url: string | null;
  stripe_checkout_session_id?: string | null;
  created_at: string;
}

export interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  amount_minor: number;
  currency: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  issued_at: string;
  paid_at: string | null;
  invoice_pdf_url: string | null;
}

export interface BillingEvent {
  id: string;
  event_type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OrganizationBillingOverview {
  subscription: OrganizationSubscription | null;
  tier: SubscriptionTier | null;
  pendingTier: SubscriptionTier | null;
  payments: SubscriptionPayment[];
  invoices: SubscriptionInvoice[];
  events: BillingEvent[];
}

export interface LimitState {
  limit: number | null;
  used: number;
  remaining: number | null;
  isUnlimited: boolean;
  isAtLimit: boolean;
}

const db = supabase as any;

export function formatMinorCurrency(amountMinor: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function isSubscriptionPeriodStillPaid(subscription: OrganizationSubscription | null) {
  if (!subscription?.current_period_end) return false;
  return new Date(subscription.current_period_end).getTime() > Date.now();
}

export function getWorkspaceAccessState(subscription: OrganizationSubscription | null) {
  if (!subscription) {
    return {
      canAccess: false,
      canAct: false,
      severity: "blocked" as const,
      title: "Billing setup required",
      message: "This workspace needs an active subscription before the team can use it.",
    };
  }

  if (subscription.status === "active") {
    return {
      canAccess: true,
      canAct: true,
      severity: "ok" as const,
      title: "Workspace active",
      message: "Subscription billing is active.",
    };
  }

  if (subscription.status === "grace_period") {
    return {
      canAccess: true,
      canAct: true,
      severity: "warning" as const,
      title: "Payment recovery period",
      message:
        "The last renewal failed. Workspace access is still open during the 7-day grace period.",
    };
  }

  if (subscription.status === "cancelled" && isSubscriptionPeriodStillPaid(subscription)) {
    return {
      canAccess: true,
      canAct: true,
      severity: "warning" as const,
      title: "Subscription cancelled",
      message:
        "Renewal is cancelled, but the workspace remains available until the paid period ends.",
    };
  }

  if (subscription.status === "suspended") {
    return {
      canAccess: false,
      canAct: false,
      severity: "blocked" as const,
      title: "Workspace suspended",
      message: "Billing is suspended. The owner needs to restore payment before work continues.",
    };
  }

  return {
    canAccess: false,
    canAct: false,
    severity: "blocked" as const,
    title: "Payment required",
    message: "The first subscription payment must be completed before this workspace unlocks.",
  };
}

export function getSeatLimitState(params: {
  tier: Pick<SubscriptionTier, "agent_seat_limit"> | null;
  activeMembers: number;
  pendingInvitations?: number;
}): LimitState {
  const used = params.activeMembers + (params.pendingInvitations || 0);
  const limit = params.tier?.agent_seat_limit ?? null;

  return {
    limit,
    used,
    remaining: limit == null ? null : Math.max(limit - used, 0),
    isUnlimited: limit == null,
    isAtLimit: limit != null && used >= limit,
  };
}

export function getActiveListingLimitState(params: {
  tier: Pick<SubscriptionTier, "active_listing_limit"> | null;
  activeListings: number;
}): LimitState {
  const limit = params.tier?.active_listing_limit ?? null;

  return {
    limit,
    used: params.activeListings,
    remaining: limit == null ? null : Math.max(limit - params.activeListings, 0),
    isUnlimited: limit == null,
    isAtLimit: limit != null && params.activeListings >= limit,
  };
}

export function isPublicActiveListing(value: {
  status?: string | null;
  visibility?: string | null;
}) {
  return value.status === "listed" && value.visibility === "public";
}

async function fetchTier(tierId?: string | null) {
  if (!tierId) return null;

  const { data, error } = await db
    .from("subscription_tiers")
    .select("*")
    .eq("id", tierId)
    .maybeSingle();

  if (error) throw error;
  return data as SubscriptionTier | null;
}

export const subscriptionService = {
  async getSubscriptionTiers() {
    const { data, error } = await db
      .from("subscription_tiers")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return (data || []) as SubscriptionTier[];
  },

  async getOrganizationBillingOverview(
    organizationId: string
  ): Promise<OrganizationBillingOverview> {
    const { data: subscription, error: subscriptionError } = await db
      .from("organization_subscriptions")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    if (!subscription) {
      return {
        subscription: null,
        tier: null,
        pendingTier: null,
        payments: [],
        invoices: [],
        events: [],
      };
    }

    const [tier, pendingTier, paymentResult, invoiceResult, eventResult] = await Promise.all([
      fetchTier(subscription.tier_id),
      fetchTier(subscription.pending_tier_id),
      db
        .from("organization_subscription_payments")
        .select("*")
        .eq("subscription_id", subscription.id)
        .order("created_at", { ascending: false })
        .limit(12),
      db
        .from("subscription_invoices")
        .select("*")
        .eq("subscription_id", subscription.id)
        .order("issued_at", { ascending: false })
        .limit(12),
      db
        .from("organization_billing_events")
        .select("*")
        .eq("subscription_id", subscription.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (paymentResult.error) throw paymentResult.error;
    if (invoiceResult.error) throw invoiceResult.error;
    if (eventResult.error) throw eventResult.error;

    return {
      subscription: {
        ...(subscription as OrganizationSubscription),
        tier,
        pending_tier: pendingTier,
      },
      tier,
      pendingTier,
      payments: (paymentResult.data || []) as SubscriptionPayment[],
      invoices: (invoiceResult.data || []) as SubscriptionInvoice[],
      events: (eventResult.data || []) as BillingEvent[],
    };
  },

  async initializeOrganizationSubscription(input: {
    organization: {
      name: string;
      slug: string;
      description?: string;
      email?: string;
      phone?: string;
      website?: string;
      businessAddress?: string;
      licenseNumber?: string;
      registrationNumber?: string;
      contactPersonName?: string;
      contactPersonPhone?: string;
      propertyTypesHandled?: string[];
    };
    tierId: string;
    provider?: "paystack" | "stripe";
    currency?: "GHS" | "USD" | "GBP" | "EUR";
  }) {
    const { data, error } = await supabase.functions.invoke(
      "initialize-organization-subscription",
      {
        body: input,
      }
    );

    if (error) throw error;
    return data as {
      organization: any;
      subscription: OrganizationSubscription;
      tier: SubscriptionTier;
      authorizationUrl: string;
      accessCode: string | null;
      reference: string;
      callbackUrl: string;
    };
  },

  async verifyOrganizationSubscription(reference: string, stripeSessionId?: string | null) {
    const { data, error } = await supabase.functions.invoke(
      "verify-organization-subscription",
      {
        body: { reference, stripeSessionId },
      }
    );

    if (error) throw error;
    return data as {
      organization: any;
      subscription: OrganizationSubscription;
      payment: SubscriptionPayment;
      alreadyProcessed: boolean;
    };
  },

  async manageOrganizationSubscription(input: {
    organizationId: string;
    action:
      | "upgrade"
      | "downgrade"
      | "change_tier"
      | "cancel_at_period_end"
      | "resume"
      | "retry_payment"
      | "manage_payment_method";
    tierId?: string;
  }) {
    const { data, error } = await supabase.functions.invoke(
      "manage-organization-subscription",
      {
        body: input,
      }
    );

    if (error) throw error;
    return data as {
      subscription?: OrganizationSubscription;
      tier?: SubscriptionTier;
      payment?: SubscriptionPayment;
      authorizationUrl?: string;
      manageUrl?: string;
      reference?: string;
    };
  },
};
