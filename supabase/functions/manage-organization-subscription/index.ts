import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import {
  disablePaystackSubscription,
  enablePaystackSubscription,
  generatePaystackSubscriptionManageLink,
  initializePaystackTransaction,
} from "../_shared/paystack.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

type ManageAction =
  | "upgrade"
  | "downgrade"
  | "change_tier"
  | "cancel_at_period_end"
  | "resume"
  | "retry_payment"
  | "manage_payment_method";

function getAppUrl(req: Request) {
  return (
    Deno.env.get("PUBLIC_APP_URL") ||
    Deno.env.get("VITE_PUBLIC_APP_URL") ||
    Deno.env.get("SITE_URL") ||
    `${new URL(req.url).protocol}//${new URL(req.url).host}`
  ).replace(/\/+$/, "");
}

function buildReference() {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 18);
  return `bm-sub-${suffix}`;
}

function getPlanCode(tierId: string, tierPlanCode?: string | null) {
  const normalizedTier = tierId.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return (
    tierPlanCode ||
    Deno.env.get(`PAYSTACK_PLAN_CODE_${normalizedTier}`) ||
    Deno.env.get(`PAYSTACK_${normalizedTier}_PLAN_CODE`) ||
    Deno.env.get(`PAYSTACK_PLAN_${normalizedTier}`) ||
    ""
  );
}

async function requireOwner(input: {
  organizationId: string;
  userId: string;
}) {
  const admin = createAdminClient();
  const { data: membership, error } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (!membership || membership.role !== "owner") {
    throw new HttpError(403, "Only the organization owner can manage billing");
  }
}

async function logBillingEvent(input: {
  organizationId: string;
  subscriptionId: string;
  actorUserId: string;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("organization_billing_events").insert({
    organization_id: input.organizationId,
    subscription_id: input.subscriptionId,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    message: input.message,
    metadata: input.metadata || {},
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { user } = await requireAuthenticatedUser(authHeader);
    const requestBody = await req.json().catch(() => null);
    const organizationId =
      typeof requestBody?.organizationId === "string" ? requestBody.organizationId.trim() : "";
    const action = requestBody?.action as ManageAction;

    if (!organizationId) {
      throw new HttpError(400, "organizationId is required");
    }

    if (!action) {
      throw new HttpError(400, "action is required");
    }

    await requireOwner({ organizationId, userId: user.id });

    const admin = createAdminClient();
    const { data: subscription, error: subscriptionError } = await admin
      .from("organization_subscriptions")
      .select("*, tier:subscription_tiers(*)")
      .eq("organization_id", organizationId)
      .single();

    if (subscriptionError || !subscription) {
      throw new HttpError(404, subscriptionError?.message || "Subscription not found");
    }

    if (action === "retry_payment") {
      if (!user.email) {
        throw new HttpError(400, "Your account needs an email address before billing can restart");
      }

      const tier = Array.isArray(subscription.tier) ? subscription.tier[0] : subscription.tier;
      const planCode = getPlanCode(subscription.tier_id, tier?.paystack_plan_code);
      if (!tier || !planCode) {
        throw new HttpError(500, "Missing Paystack plan code for this tier");
      }

      const { data: organization, error: organizationError } = await admin
        .from("organizations")
        .select("slug")
        .eq("id", organizationId)
        .single();

      if (organizationError) {
        throw new HttpError(500, organizationError.message);
      }

      const reference = buildReference();
      const callbackUrl = `${getAppUrl(req)}/workspace?billing=verify&organization=${encodeURIComponent(
        organization.slug
      )}`;
      const metadata = {
        paymentType: "organization_subscription",
        organizationId,
        organizationSlug: organization.slug,
        subscriptionId: subscription.id,
        tierId: subscription.tier_id,
        ownerUserId: user.id,
        retry: true,
      };

      const { data: payment, error: paymentError } = await admin
        .from("organization_subscription_payments")
        .insert({
          organization_id: organizationId,
          subscription_id: subscription.id,
          provider: "paystack",
          provider_reference: reference,
          amount_minor: tier.price_minor,
          currency: tier.currency || "GHS",
          status: "initialized",
          metadata,
        })
        .select("*")
        .single();

      if (paymentError) {
        throw new HttpError(500, paymentError.message);
      }

      const paystack = await initializePaystackTransaction({
        amount: String(tier.price_minor),
        email: user.email,
        currency: tier.currency || "GHS",
        reference,
        callback_url: callbackUrl,
        plan: planCode,
        metadata,
      });

      const { data: updatedPayment, error: updatePaymentError } = await admin
        .from("organization_subscription_payments")
        .update({
          status: "pending",
          authorization_url: paystack.authorization_url,
          access_code: paystack.access_code,
        })
        .eq("id", payment.id)
        .select("*")
        .single();

      if (updatePaymentError) {
        throw new HttpError(500, updatePaymentError.message);
      }

      await admin
        .from("organization_subscriptions")
        .update({
          status: "pending_payment",
          authorization_url: paystack.authorization_url,
          provider_reference: reference,
        })
        .eq("id", subscription.id);

      await logBillingEvent({
        organizationId,
        subscriptionId: subscription.id,
        actorUserId: user.id,
        eventType: "subscription_retry_checkout_initialized",
        message: "A subscription payment retry checkout was initialized.",
        metadata: { reference, tierId: tier.id },
      });

      return jsonResponse(200, {
        subscription: {
          ...subscription,
          status: "pending_payment",
          authorization_url: paystack.authorization_url,
          provider_reference: reference,
        },
        payment: updatedPayment,
        authorizationUrl: paystack.authorization_url,
        accessCode: paystack.access_code,
        reference: paystack.reference,
        callbackUrl,
      });
    }

    if (action === "manage_payment_method") {
      if (!subscription.paystack_subscription_code) {
        throw new HttpError(400, "This subscription does not have a Paystack subscription code yet");
      }

      const result = await generatePaystackSubscriptionManageLink(
        subscription.paystack_subscription_code
      );

      return jsonResponse(200, {
        manageUrl: result.link,
      });
    }

    if (action === "cancel_at_period_end") {
      if (subscription.paystack_subscription_code && subscription.paystack_email_token) {
        await disablePaystackSubscription({
          code: subscription.paystack_subscription_code,
          token: subscription.paystack_email_token,
        });
      }

      const { data: updatedSubscription, error: updateError } = await admin
        .from("organization_subscriptions")
        .update({
          status: "cancelled",
          cancel_at_period_end: true,
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)
        .select("*")
        .single();

      if (updateError) {
        throw new HttpError(500, updateError.message);
      }

      await logBillingEvent({
        organizationId,
        subscriptionId: subscription.id,
        actorUserId: user.id,
        eventType: "subscription_cancel_at_period_end",
        message: "Subscription renewal was cancelled. Workspace access remains available until the paid period ends.",
      });

      return jsonResponse(200, { subscription: updatedSubscription });
    }

    if (action === "resume") {
      if (subscription.paystack_subscription_code && subscription.paystack_email_token) {
        await enablePaystackSubscription({
          code: subscription.paystack_subscription_code,
          token: subscription.paystack_email_token,
        });
      }

      const stillPaid =
        subscription.current_period_end &&
        new Date(subscription.current_period_end).getTime() > Date.now();
      const nextStatus = stillPaid ? "active" : "pending_payment";
      const { data: updatedSubscription, error: updateError } = await admin
        .from("organization_subscriptions")
        .update({
          status: nextStatus,
          cancel_at_period_end: false,
          cancelled_at: null,
          suspended_at: null,
        })
        .eq("id", subscription.id)
        .select("*")
        .single();

      if (updateError) {
        throw new HttpError(500, updateError.message);
      }

      await logBillingEvent({
        organizationId,
        subscriptionId: subscription.id,
        actorUserId: user.id,
        eventType: "subscription_resumed",
        message:
          nextStatus === "active"
            ? "Subscription renewal was resumed."
            : "Subscription renewal was resumed, but payment is required to reactivate the workspace.",
      });

      return jsonResponse(200, { subscription: updatedSubscription });
    }

    if (["upgrade", "downgrade", "change_tier"].includes(action)) {
      const tierId = typeof requestBody?.tierId === "string" ? requestBody.tierId.trim() : "";
      if (!tierId) {
        throw new HttpError(400, "tierId is required for tier changes");
      }

      const { data: nextTier, error: tierError } = await admin
        .from("subscription_tiers")
        .select("*")
        .eq("id", tierId)
        .eq("is_active", true)
        .maybeSingle();

      if (tierError) {
        throw new HttpError(500, tierError.message);
      }

      if (!nextTier) {
        throw new HttpError(404, "Subscription tier not found");
      }

      const effectiveAt =
        subscription.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const isPendingPayment = subscription.status === "pending_payment";
      const { data: updatedSubscription, error: updateError } = await admin
        .from("organization_subscriptions")
        .update(
          isPendingPayment
            ? {
                tier_id: nextTier.id,
                pending_tier_id: null,
                pending_tier_effective_at: null,
                paystack_plan_code: getPlanCode(nextTier.id, nextTier.paystack_plan_code),
              }
            : {
                pending_tier_id: nextTier.id,
                pending_tier_effective_at: effectiveAt,
              }
        )
        .eq("id", subscription.id)
        .select("*")
        .single();

      if (updateError) {
        throw new HttpError(500, updateError.message);
      }

      await logBillingEvent({
        organizationId,
        subscriptionId: subscription.id,
        actorUserId: user.id,
        eventType: "subscription_tier_change_scheduled",
        message: isPendingPayment
          ? `Subscription tier changed to ${nextTier.name} before activation.`
          : `Subscription tier change to ${nextTier.name} scheduled for the next billing cycle.`,
        metadata: { tierId: nextTier.id, effectiveAt, immediate: isPendingPayment },
      });

      return jsonResponse(200, {
        subscription: updatedSubscription,
        tier: nextTier,
      });
    }

    throw new HttpError(400, "Unsupported subscription action");
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("manage-organization-subscription error:", error);
    return jsonResponse(500, { error: "Unable to manage organization subscription" });
  }
});
