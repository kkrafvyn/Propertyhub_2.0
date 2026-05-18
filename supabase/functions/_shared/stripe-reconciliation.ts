import { HttpError } from "./http.ts";
import { reconcilePropertyPayment } from "./payment-reconciliation.ts";
import { verifyStripeTransaction } from "./payment-gateways.ts";
import { createAdminClient } from "./supabase.ts";

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
  return `BM-STRIPE-${new Date().getUTCFullYear()}-${suffix}`;
}

function getStripeReference(session: any) {
  return (
    session?.metadata?.providerReference ||
    session?.client_reference_id ||
    session?.metadata?.reference ||
    ""
  );
}

function stripeTimeToIso(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : new Date().toISOString();
}

async function insertBillingEvent(input: {
  organizationId: string;
  subscriptionId?: string | null;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("organization_billing_events").insert({
    organization_id: input.organizationId,
    subscription_id: input.subscriptionId || null,
    event_type: input.eventType,
    message: input.message,
    metadata: input.metadata || {},
  });
}

export async function reconcileStripeCheckoutSession(session: any, source: "webhook" | "manual_verify") {
  const reference = getStripeReference(session);
  if (!reference) {
    throw new HttpError(400, "Stripe checkout session is missing provider reference metadata");
  }

  if (session.mode === "subscription") {
    return reconcileStripeOrganizationSubscriptionCheckout(session, source);
  }

  const verifiedTransaction = await verifyStripeTransaction(session.id);
  return reconcilePropertyPayment({
    provider: "stripe",
    reference,
    verifiedTransaction,
    source,
  });
}

export async function reconcileStripeOrganizationSubscriptionCheckout(
  session: any,
  source: "webhook" | "manual_verify"
) {
  const reference = getStripeReference(session);
  if (!reference) {
    throw new HttpError(400, "Stripe subscription checkout is missing provider reference metadata");
  }

  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("organization_subscription_payments")
    .select("*")
    .eq("provider", "stripe")
    .or(`provider_reference.eq.${reference},stripe_checkout_session_id.eq.${session.id}`)
    .maybeSingle();

  if (paymentError) {
    throw new HttpError(500, paymentError.message);
  }

  if (!payment) return null;

  if (payment.status === "success" && session.payment_status === "paid") {
    const { data: subscription } = await admin
      .from("organization_subscriptions")
      .select("*")
      .eq("id", payment.subscription_id)
      .maybeSingle();

    return {
      payment,
      subscription,
      alreadyProcessed: true,
    };
  }

  const paid = session.payment_status === "paid" || session.status === "complete";
  const paidAt = stripeTimeToIso(session.created);
  const periodEnd = addMonths(new Date(paidAt), 1).toISOString();
  const status = paid ? "success" : session.status === "expired" ? "abandoned" : "pending";

  const { data: updatedPayment, error: updatePaymentError } = await admin
    .from("organization_subscription_payments")
    .update({
      status,
      paid_at: paid ? paidAt : null,
      provider_transaction_id: session.payment_intent || session.id,
      payment_channel: "stripe_checkout",
      gateway_response: session.payment_status || session.status,
      stripe_payment_intent_id: session.payment_intent || null,
      stripe_checkout_session_id: session.id,
      metadata: {
        ...(payment.metadata || {}),
        stripeCheckoutSession: session,
        reconciliationSource: source,
      },
    })
    .eq("id", payment.id)
    .select("*")
    .single();

  if (updatePaymentError) {
    throw new HttpError(500, updatePaymentError.message);
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from("organization_subscriptions")
    .select("*")
    .eq("id", payment.subscription_id)
    .single();

  if (subscriptionError || !subscription) {
    throw new HttpError(500, subscriptionError?.message || "Subscription not found");
  }

  if (!paid) {
    return {
      payment: updatedPayment,
      subscription,
      alreadyProcessed: false,
    };
  }

  const { data: updatedSubscription, error: updateSubscriptionError } = await admin
    .from("organization_subscriptions")
    .update({
      status: "active",
      provider: "stripe",
      provider_reference: reference,
      authorization_url: null,
      stripe_customer_id:
        typeof session.customer === "string" ? session.customer : subscription.stripe_customer_id,
      stripe_subscription_id:
        typeof session.subscription === "string"
          ? session.subscription
          : subscription.stripe_subscription_id,
      stripe_checkout_session_id: session.id,
      current_period_start: paidAt,
      current_period_end: periodEnd,
      next_payment_at: periodEnd,
      grace_period_ends_at: null,
      activated_at: subscription.activated_at || paidAt,
      suspended_at: null,
      metadata: {
        ...(subscription.metadata || {}),
        lastSuccessfulPaymentReference: reference,
        lastSuccessfulPaymentAt: paidAt,
        stripeCheckoutSession: session.id,
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
      invoice_number: buildInvoiceNumber(reference),
      amount_minor: updatedPayment.amount_minor,
      currency: updatedPayment.currency || "USD",
      status: "paid",
      period_start: paidAt,
      period_end: periodEnd,
      issued_at: paidAt,
      paid_at: paidAt,
      metadata: {
        provider: "stripe",
        providerReference: reference,
        stripeCheckoutSessionId: session.id,
        source,
      },
    },
    { onConflict: "invoice_number" }
  );

  await insertBillingEvent({
    organizationId: subscription.organization_id,
    subscriptionId: subscription.id,
    eventType: "subscription_payment_success",
    message: "Stripe confirmed a diaspora subscription payment and the workspace is active.",
    metadata: {
      reference,
      stripeCheckoutSessionId: session.id,
      source,
    },
  });

  return {
    payment: updatedPayment,
    subscription: updatedSubscription,
    alreadyProcessed: false,
  };
}

export async function reconcileStripeInvoicePaid(invoice: any) {
  const stripeSubscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!stripeSubscriptionId) return null;

  const admin = createAdminClient();
  const { data: subscription, error } = await admin
    .from("organization_subscriptions")
    .select("*")
    .eq("provider", "stripe")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!subscription) return null;

  const reference = invoice.payment_intent || invoice.id;
  const paidAt = stripeTimeToIso(invoice.status_transitions?.paid_at || invoice.created);
  const periodEnd = invoice.lines?.data?.[0]?.period?.end
    ? stripeTimeToIso(invoice.lines.data[0].period.end)
    : addMonths(new Date(paidAt), 1).toISOString();

  const { data: payment, error: paymentError } = await admin
    .from("organization_subscription_payments")
    .upsert(
      {
        organization_id: subscription.organization_id,
        subscription_id: subscription.id,
        provider: "stripe",
        provider_reference: reference,
        provider_transaction_id: invoice.payment_intent || invoice.id,
        amount_minor: invoice.amount_paid || invoice.amount_due || 0,
        currency: String(invoice.currency || "USD").toUpperCase(),
        status: "success",
        paid_at: paidAt,
        payment_channel: "stripe_invoice",
        gateway_response: invoice.status,
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id:
          typeof invoice.payment_intent === "string" ? invoice.payment_intent : null,
        metadata: {
          stripeInvoice: invoice,
        },
      },
      { onConflict: "provider,provider_reference" }
    )
    .select("*")
    .single();

  if (paymentError) throw new HttpError(500, paymentError.message);

  const { data: updatedSubscription, error: updateError } = await admin
    .from("organization_subscriptions")
    .update({
      status: "active",
      current_period_start: paidAt,
      current_period_end: periodEnd,
      next_payment_at: periodEnd,
      grace_period_ends_at: null,
      suspended_at: null,
      metadata: {
        ...(subscription.metadata || {}),
        lastStripeInvoiceId: invoice.id,
        lastSuccessfulPaymentAt: paidAt,
      },
    })
    .eq("id", subscription.id)
    .select("*")
    .single();

  if (updateError) throw new HttpError(500, updateError.message);

  await admin.from("subscription_invoices").upsert(
    {
      organization_id: subscription.organization_id,
      subscription_id: subscription.id,
      payment_id: payment.id,
      invoice_number: buildInvoiceNumber(reference),
      amount_minor: payment.amount_minor,
      currency: payment.currency,
      status: "paid",
      period_start: paidAt,
      period_end: periodEnd,
      issued_at: paidAt,
      paid_at: paidAt,
      invoice_pdf_url: invoice.invoice_pdf || null,
      metadata: {
        provider: "stripe",
        stripeInvoiceId: invoice.id,
      },
    },
    { onConflict: "invoice_number" }
  );

  await insertBillingEvent({
    organizationId: subscription.organization_id,
    subscriptionId: subscription.id,
    eventType: "subscription_renewal_success",
    message: "Stripe confirmed a recurring subscription invoice.",
    metadata: {
      stripeInvoiceId: invoice.id,
      reference,
    },
  });

  return {
    payment,
    subscription: updatedSubscription,
  };
}

export async function reconcileStripeInvoiceFailed(invoice: any) {
  const stripeSubscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!stripeSubscriptionId) return null;

  const admin = createAdminClient();
  const { data: subscription, error } = await admin
    .from("organization_subscriptions")
    .select("*")
    .eq("provider", "stripe")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!subscription) return null;

  const graceEndsAt = addDays(new Date(), 7).toISOString();
  const { data: updatedSubscription, error: updateError } = await admin
    .from("organization_subscriptions")
    .update({
      status: subscription.status === "pending_payment" ? "past_due" : "grace_period",
      grace_period_ends_at: graceEndsAt,
      metadata: {
        ...(subscription.metadata || {}),
        lastStripeInvoiceFailureId: invoice.id,
        lastStripeFailureAt: new Date().toISOString(),
      },
    })
    .eq("id", subscription.id)
    .select("*")
    .single();

  if (updateError) throw new HttpError(500, updateError.message);

  await insertBillingEvent({
    organizationId: subscription.organization_id,
    subscriptionId: subscription.id,
    eventType: "subscription_payment_failed",
    message: "Stripe reported a failed subscription payment. A 7-day billing recovery window is now active.",
    metadata: {
      stripeInvoiceId: invoice.id,
      graceEndsAt,
    },
  });

  return updatedSubscription;
}

export async function reconcileStripeSubscriptionDeleted(subscriptionPayload: any) {
  const stripeSubscriptionId =
    typeof subscriptionPayload.id === "string" ? subscriptionPayload.id : "";
  if (!stripeSubscriptionId) return null;

  const admin = createAdminClient();
  const { data: subscription, error } = await admin
    .from("organization_subscriptions")
    .select("*")
    .eq("provider", "stripe")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!subscription) return null;

  const hasRemainingAccess =
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() > Date.now();
  const nextStatus = hasRemainingAccess ? "cancelled" : "suspended";

  const { data: updatedSubscription, error: updateError } = await admin
    .from("organization_subscriptions")
    .update({
      status: nextStatus,
      cancel_at_period_end: hasRemainingAccess,
      cancelled_at: nextStatus === "cancelled" ? new Date().toISOString() : null,
      suspended_at: nextStatus === "suspended" ? new Date().toISOString() : null,
      metadata: {
        ...(subscription.metadata || {}),
        stripeSubscriptionDeleted: subscriptionPayload,
      },
    })
    .eq("id", subscription.id)
    .select("*")
    .single();

  if (updateError) throw new HttpError(500, updateError.message);

  await insertBillingEvent({
    organizationId: subscription.organization_id,
    subscriptionId: subscription.id,
    eventType: "subscription_disabled",
    message:
      nextStatus === "cancelled"
        ? "Stripe cancelled renewal. Workspace access continues until the paid period ends."
        : "Stripe cancelled the subscription and workspace billing access is suspended.",
    metadata: { stripeSubscriptionId, status: nextStatus },
  });

  return updatedSubscription;
}
