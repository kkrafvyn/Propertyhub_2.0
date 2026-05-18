import { HttpError } from "./http.ts";
import type {
  PaystackInvoiceWebhookData,
  PaystackSubscriptionData,
  PaystackTransactionData,
} from "./paystack.ts";
import { createAdminClient } from "./supabase.ts";

type SubscriptionPaymentRow = {
  id: string;
  organization_id: string;
  subscription_id: string;
  provider_reference: string;
  amount_minor: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown> | null;
};

type OrganizationSubscriptionRow = {
  id: string;
  organization_id: string;
  tier_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  metadata: Record<string, unknown> | null;
};

function normalizePaymentStatus(status?: string) {
  switch (status) {
    case "success":
    case "successful":
      return "success";
    case "abandoned":
    case "cancelled":
    case "canceled":
      return "abandoned";
    case "reversed":
      return "reversed";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

function addMonths(value: Date, months: number) {
  const next = new Date(value);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildInvoiceNumber(reference: string) {
  const suffix = reference.replace(/[^a-zA-Z0-9]/g, "").slice(-12).toUpperCase();
  return `BM-SUB-${new Date().getUTCFullYear()}-${suffix}`;
}

function getCustomerCode(value: PaystackTransactionData | PaystackSubscriptionData) {
  const customer = value.customer;
  if (!customer || typeof customer !== "object") return null;
  return customer.customer_code || null;
}

function getSubscriptionCodeFromTransaction(value: PaystackTransactionData) {
  return value.subscription?.subscription_code || null;
}

function getSubscriptionTokenFromTransaction(value: PaystackTransactionData) {
  return value.subscription?.email_token || null;
}

function getSubscriptionCode(value: PaystackSubscriptionData | PaystackInvoiceWebhookData) {
  if ("subscription_code" in value && value.subscription_code) {
    return value.subscription_code;
  }

  return value.subscription?.subscription_code || null;
}

function getEmailToken(value: PaystackSubscriptionData | PaystackInvoiceWebhookData) {
  if ("email_token" in value && value.email_token) {
    return value.email_token;
  }

  return value.subscription?.email_token || null;
}

async function insertBillingEvent(input: {
  organizationId: string;
  subscriptionId?: string | null;
  actorUserId?: string | null;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("organization_billing_events").insert({
    organization_id: input.organizationId,
    subscription_id: input.subscriptionId || null,
    actor_user_id: input.actorUserId || null,
    event_type: input.eventType,
    message: input.message,
    metadata: input.metadata || {},
  });
}

async function fetchSubscriptionByPaystackCode(code: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_subscriptions")
    .select("*")
    .eq("paystack_subscription_code", code)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  return data as OrganizationSubscriptionRow | null;
}

async function setSubscriptionPaymentFailure(subscription: OrganizationSubscriptionRow, event: string) {
  const admin = createAdminClient();
  const now = new Date();
  const graceEndsAt = addDays(now, 7).toISOString();
  const nextStatus = subscription.status === "pending_payment" ? "past_due" : "grace_period";

  const { data: updatedSubscription, error } = await admin
    .from("organization_subscriptions")
    .update({
      status: nextStatus,
      grace_period_ends_at: graceEndsAt,
      metadata: {
        ...(subscription.metadata || {}),
        lastFailureEvent: event,
        lastFailureAt: now.toISOString(),
      },
    })
    .eq("id", subscription.id)
    .select("*")
    .single();

  if (error) {
    throw new HttpError(500, error.message);
  }

  await insertBillingEvent({
    organizationId: subscription.organization_id,
    subscriptionId: subscription.id,
    eventType: "subscription_payment_failed",
    message: "Paystack reported a failed subscription payment. A 7-day billing recovery window is now active.",
    metadata: { event, graceEndsAt },
  });

  return updatedSubscription;
}

export async function reconcileOrganizationSubscriptionPayment(input: {
  reference: string;
  verifiedTransaction: PaystackTransactionData;
  source: "webhook" | "manual_verify";
}) {
  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("organization_subscription_payments")
    .select("*")
    .eq("provider", "paystack")
    .eq("provider_reference", input.reference)
    .maybeSingle();

  if (paymentError) {
    throw new HttpError(500, paymentError.message);
  }

  if (!payment) {
    return null;
  }

  const subscriptionPayment = payment as SubscriptionPaymentRow;
  const normalizedStatus = normalizePaymentStatus(input.verifiedTransaction.status);
  const providerTransactionId =
    input.verifiedTransaction.id !== undefined ? String(input.verifiedTransaction.id) : null;
  const paidAt = input.verifiedTransaction.paid_at || new Date().toISOString();
  const mergedMetadata = {
    ...(subscriptionPayment.metadata || {}),
    paystack: input.verifiedTransaction,
    reconciliationSource: input.source,
  };

  if (subscriptionPayment.status === "success" && normalizedStatus === "success") {
    const { data: subscription } = await admin
      .from("organization_subscriptions")
      .select("*")
      .eq("id", subscriptionPayment.subscription_id)
      .maybeSingle();

    return {
      payment: subscriptionPayment,
      subscription,
      alreadyProcessed: true,
    };
  }

  if (normalizedStatus !== "success") {
    const { data: updatedPayment, error: updateError } = await admin
      .from("organization_subscription_payments")
      .update({
        status: normalizedStatus,
        provider_transaction_id: providerTransactionId,
        payment_channel: input.verifiedTransaction.channel || null,
        gateway_response: input.verifiedTransaction.gateway_response || null,
        metadata: mergedMetadata,
      })
      .eq("id", subscriptionPayment.id)
      .select("*")
      .single();

    if (updateError) {
      throw new HttpError(500, updateError.message);
    }

    return {
      payment: updatedPayment,
      subscription: null,
      alreadyProcessed: false,
    };
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from("organization_subscriptions")
    .select("*")
    .eq("id", subscriptionPayment.subscription_id)
    .single();

  if (subscriptionError || !subscription) {
    throw new HttpError(500, subscriptionError?.message || "Subscription not found");
  }

  const paidDate = new Date(paidAt);
  const nextPaymentAt =
    input.verifiedTransaction.subscription?.next_payment_date ||
    addMonths(paidDate, 1).toISOString();
  const periodEnd = nextPaymentAt || addMonths(paidDate, 1).toISOString();
  const paystackSubscriptionCode = getSubscriptionCodeFromTransaction(input.verifiedTransaction);
  const paystackEmailToken = getSubscriptionTokenFromTransaction(input.verifiedTransaction);
  const paystackCustomerCode = getCustomerCode(input.verifiedTransaction);

  const { data: updatedPayment, error: updatePaymentError } = await admin
    .from("organization_subscription_payments")
    .update({
      status: "success",
      provider_transaction_id: providerTransactionId,
      paid_at: paidAt,
      payment_channel: input.verifiedTransaction.channel || null,
      gateway_response: input.verifiedTransaction.gateway_response || null,
      metadata: mergedMetadata,
    })
    .eq("id", subscriptionPayment.id)
    .select("*")
    .single();

  if (updatePaymentError) {
    throw new HttpError(500, updatePaymentError.message);
  }

  const { data: updatedSubscription, error: updateSubscriptionError } = await admin
    .from("organization_subscriptions")
    .update({
      status: "active",
      paystack_customer_code: paystackCustomerCode || subscription.paystack_customer_code,
      paystack_subscription_code:
        paystackSubscriptionCode || subscription.paystack_subscription_code,
      paystack_email_token: paystackEmailToken || subscription.paystack_email_token,
      provider_reference: input.reference,
      authorization_url: null,
      current_period_start: paidAt,
      current_period_end: periodEnd,
      next_payment_at: nextPaymentAt,
      grace_period_ends_at: null,
      activated_at: subscription.activated_at || paidAt,
      suspended_at: null,
      metadata: {
        ...(subscription.metadata || {}),
        lastSuccessfulPaymentReference: input.reference,
        lastSuccessfulPaymentAt: paidAt,
      },
    })
    .eq("id", subscription.id)
    .select("*")
    .single();

  if (updateSubscriptionError) {
    throw new HttpError(500, updateSubscriptionError.message);
  }

  await admin.from("subscription_invoices").upsert(
    {
      organization_id: subscription.organization_id,
      subscription_id: subscription.id,
      payment_id: updatedPayment.id,
      invoice_number: buildInvoiceNumber(input.reference),
      amount_minor: updatedPayment.amount_minor,
      currency: updatedPayment.currency || "GHS",
      status: "paid",
      period_start: paidAt,
      period_end: periodEnd,
      issued_at: paidAt,
      paid_at: paidAt,
      metadata: {
        provider: "paystack",
        providerReference: input.reference,
        source: input.source,
      },
    },
    {
      onConflict: "invoice_number",
    }
  );

  await insertBillingEvent({
    organizationId: subscription.organization_id,
    subscriptionId: subscription.id,
    eventType: "subscription_payment_success",
    message: "Paystack confirmed a subscription payment and the workspace is active.",
    metadata: {
      reference: input.reference,
      source: input.source,
      amountMinor: updatedPayment.amount_minor,
      currency: updatedPayment.currency,
    },
  });

  return {
    payment: updatedPayment,
    subscription: updatedSubscription,
    alreadyProcessed: false,
  };
}

export async function reconcilePaystackSubscriptionCreated(data: PaystackSubscriptionData) {
  const code = getSubscriptionCode(data);
  if (!code) return null;

  const admin = createAdminClient();
  const customerCode = getCustomerCode(data);
  const emailToken = getEmailToken(data);

  const { data: subscriptions, error } = await admin
    .from("organization_subscriptions")
    .select("*")
    .or(
      [
        `paystack_subscription_code.eq.${code}`,
        customerCode ? `paystack_customer_code.eq.${customerCode}` : "",
      ]
        .filter(Boolean)
        .join(",")
    )
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new HttpError(500, error.message);
  }

  const subscription = subscriptions?.[0] as OrganizationSubscriptionRow | undefined;
  if (!subscription) return null;

  const { data: updatedSubscription, error: updateError } = await admin
    .from("organization_subscriptions")
    .update({
      paystack_subscription_code: code,
      paystack_email_token: emailToken || null,
      paystack_customer_code: customerCode || null,
      next_payment_at: data.next_payment_date || null,
      metadata: {
        ...(subscription.metadata || {}),
        paystackSubscriptionCreate: data,
      },
    })
    .eq("id", subscription.id)
    .select("*")
    .single();

  if (updateError) {
    throw new HttpError(500, updateError.message);
  }

  await insertBillingEvent({
    organizationId: subscription.organization_id,
    subscriptionId: subscription.id,
    eventType: "subscription_created",
    message: "Paystack created the recurring subscription.",
    metadata: { paystackSubscriptionCode: code },
  });

  return updatedSubscription;
}

export async function reconcilePaystackSubscriptionFailure(input: {
  event: string;
  data: PaystackInvoiceWebhookData;
}) {
  const code = getSubscriptionCode(input.data);
  if (!code) return null;

  const subscription = await fetchSubscriptionByPaystackCode(code);
  if (!subscription) return null;

  return setSubscriptionPaymentFailure(subscription, input.event);
}

export async function reconcilePaystackSubscriptionDisabled(input: {
  event: string;
  data: PaystackSubscriptionData;
}) {
  const code = getSubscriptionCode(input.data);
  if (!code) return null;

  const subscription = await fetchSubscriptionByPaystackCode(code);
  if (!subscription) return null;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const hasRemainingAccess =
    subscription.current_period_end && new Date(subscription.current_period_end).getTime() > Date.now();
  const nextStatus = hasRemainingAccess ? "cancelled" : "suspended";

  const { data: updatedSubscription, error } = await admin
    .from("organization_subscriptions")
    .update({
      status: nextStatus,
      cancel_at_period_end: hasRemainingAccess,
      cancelled_at: nextStatus === "cancelled" ? now : null,
      suspended_at: nextStatus === "suspended" ? now : null,
      metadata: {
        ...(subscription.metadata || {}),
        paystackDisableEvent: input.data,
        disabledAt: now,
      },
    })
    .eq("id", subscription.id)
    .select("*")
    .single();

  if (error) {
    throw new HttpError(500, error.message);
  }

  await insertBillingEvent({
    organizationId: subscription.organization_id,
    subscriptionId: subscription.id,
    eventType: "subscription_disabled",
    message:
      nextStatus === "cancelled"
        ? "Paystack disabled renewal. Workspace access continues until the paid period ends."
        : "Paystack disabled the subscription and workspace billing access is suspended.",
    metadata: { event: input.event, status: nextStatus },
  });

  return updatedSubscription;
}
