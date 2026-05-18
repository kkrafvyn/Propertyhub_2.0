import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { createSubscription } from "../_shared/payment-service.ts";
import { initializePaystackTransaction } from "../_shared/paystack.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

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

function buildStripeReference() {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 18);
  return `bm-st-sub-${suffix}`;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function normalizeSubscriptionProvider(value: unknown, currency: string) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "stripe" || ["USD", "GBP", "EUR"].includes(currency)) return "stripe";
  return "paystack";
}

function normalizeCurrency(value: unknown) {
  const currency = typeof value === "string" ? value.trim().toUpperCase() : "GHS";
  return ["GHS", "USD", "GBP", "EUR"].includes(currency) ? currency : "GHS";
}

function getStripePriceId(tier: any, currency: string) {
  const normalizedTier = String(tier.id || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const normalizedCurrency = currency.toUpperCase();
  const columnName = `stripe_price_id_${normalizedCurrency.toLowerCase()}`;
  return (
    tier[columnName] ||
    Deno.env.get(`STRIPE_PRICE_ID_${normalizedTier}_${normalizedCurrency}`) ||
    Deno.env.get(`STRIPE_${normalizedTier}_${normalizedCurrency}_PRICE_ID`) ||
    ""
  );
}

function getStripeAmountMinor(tier: any, currency: string) {
  const normalizedTier = String(tier.id || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const configured = Deno.env.get(`STRIPE_PRICE_AMOUNT_MINOR_${normalizedTier}_${currency}`);
  const parsed = Number(configured || "");
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : Number(tier.price_minor || 0);
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePropertyTypes(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
    .filter(Boolean)
    .slice(0, 12);
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
    const organizationInput = requestBody?.organization || {};
    const tierId = normalizeString(requestBody?.tierId) || "starter";
    const currency = normalizeCurrency(requestBody?.currency);
    const provider = normalizeSubscriptionProvider(requestBody?.provider, currency);

    const name = normalizeString(organizationInput.name);
    const slug = normalizeSlug(String(organizationInput.slug || organizationInput.name || ""));
    const admin = createAdminClient();

    await enforceRateLimit({
      admin,
      req,
      route: "initialize-organization-subscription",
      userId: user.id,
      limit: 12,
      windowSeconds: 60,
    });

    if (!user.email) {
      throw new HttpError(400, "Your account needs an email address before billing can start");
    }

    if (!name || !slug) {
      throw new HttpError(400, "Organization name and workspace slug are required");
    }

    const { data: tier, error: tierError } = await admin
      .from("subscription_tiers")
      .select("*")
      .eq("id", tierId)
      .eq("is_active", true)
      .maybeSingle();

    if (tierError) {
      throw new HttpError(500, tierError.message);
    }

    if (!tier) {
      throw new HttpError(404, "Subscription tier not found");
    }

    const planCode = provider === "paystack" ? getPlanCode(tier.id, tier.paystack_plan_code) : "";
    if (provider === "paystack" && !planCode) {
      throw new HttpError(
        500,
        `Missing Paystack plan code for the ${tier.name} tier. Configure PAYSTACK_PLAN_CODE_${String(
          tier.id
        ).toUpperCase()} or subscription_tiers.paystack_plan_code.`
      );
    }

    const stripePriceId = provider === "stripe" ? getStripePriceId(tier, currency) : "";
    if (provider === "stripe" && !stripePriceId) {
      throw new HttpError(
        500,
        `Missing Stripe price ID for the ${tier.name} tier in ${currency}. Configure STRIPE_PRICE_ID_${String(
          tier.id
        ).toUpperCase()}_${currency} or subscription_tiers.stripe_price_id_${currency.toLowerCase()}.`
      );
    }

    const { data: existingOrganization } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingOrganization) {
      throw new HttpError(409, "That workspace slug is already taken");
    }

    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .insert({
        name,
        slug,
        description: normalizeString(organizationInput.description),
        email: normalizeString(organizationInput.email) || user.email,
        phone: normalizeString(organizationInput.phone),
        website: normalizeString(organizationInput.website),
        owner_id: user.id,
        business_address: normalizeString(organizationInput.businessAddress),
        license_number: normalizeString(organizationInput.licenseNumber),
        ghana_business_registration_number: normalizeString(
          organizationInput.registrationNumber || organizationInput.licenseNumber
        ),
        contact_person_name: normalizeString(organizationInput.contactPersonName),
        contact_person_phone: normalizeString(organizationInput.contactPersonPhone),
        property_types_handled: normalizePropertyTypes(organizationInput.propertyTypesHandled),
        diaspora_billing_currency: currency,
        verification_status: "submitted",
        verification_submitted_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (organizationError) {
      throw new HttpError(500, organizationError.message);
    }

    const { error: membershipError } = await admin.from("organization_members").insert({
      organization_id: organization.id,
      user_id: user.id,
      role: "owner",
    });

    if (membershipError) {
      throw new HttpError(500, membershipError.message);
    }

    const { data: subscription, error: subscriptionError } = await admin
      .from("organization_subscriptions")
      .insert({
        organization_id: organization.id,
        tier_id: tier.id,
        status: "pending_payment",
        provider,
        paystack_plan_code: provider === "paystack" ? planCode : null,
        stripe_price_id: provider === "stripe" ? stripePriceId : null,
        metadata: {
          createdBy: user.id,
          onboardingVersion: "phase1",
          billingProvider: provider,
          billingCurrency: currency,
        },
      })
      .select("*")
      .single();

    if (subscriptionError) {
      throw new HttpError(500, subscriptionError.message);
    }

    const reference = provider === "stripe" ? buildStripeReference() : buildReference();
    const callbackUrl = `${getAppUrl(req)}/workspace?billing=verify&provider=${encodeURIComponent(
      provider
    )}&organization=${encodeURIComponent(organization.slug)}&reference=${encodeURIComponent(
      reference
    )}`;
    const stripeSuccessUrl = `${callbackUrl}&stripe_session_id={CHECKOUT_SESSION_ID}`;
    const metadata = {
      paymentType: "organization_subscription",
      organizationId: organization.id,
      organizationSlug: organization.slug,
      subscriptionId: subscription.id,
      tierId: tier.id,
      ownerUserId: user.id,
      provider,
      currency,
    };

    const { data: payment, error: paymentError } = await admin
      .from("organization_subscription_payments")
      .insert({
        organization_id: organization.id,
        subscription_id: subscription.id,
        provider,
        provider_reference: reference,
        amount_minor: provider === "stripe" ? getStripeAmountMinor(tier, currency) : tier.price_minor,
        currency: provider === "stripe" ? currency : tier.currency || "GHS",
        status: "initialized",
        metadata,
      })
      .select("*")
      .single();

    if (paymentError) {
      throw new HttpError(500, paymentError.message);
    }

    const checkout =
      provider === "stripe"
        ? await createSubscription({
            provider: "stripe",
            email: user.email,
            reference,
            successUrl: stripeSuccessUrl,
            cancelUrl: callbackUrl,
            tierName: tier.name,
            stripePriceId,
            metadata,
          })
        : await initializePaystackTransaction({
            amount: String(tier.price_minor),
            email: user.email,
            currency: tier.currency || "GHS",
            reference,
            callback_url: callbackUrl,
            plan: planCode,
            metadata,
          }).then((paystack) => ({
            provider: "paystack" as const,
            authorizationUrl: paystack.authorization_url,
            accessCode: paystack.access_code,
            reference: paystack.reference,
            providerTransactionId: undefined,
            raw: paystack as Record<string, unknown>,
          }));

    await admin
      .from("organization_subscription_payments")
      .update({
        status: "pending",
        authorization_url: checkout.authorizationUrl,
        access_code: "accessCode" in checkout ? checkout.accessCode || null : null,
        provider_transaction_id: checkout.providerTransactionId || null,
        stripe_checkout_session_id:
          provider === "stripe" ? checkout.providerTransactionId || null : null,
        metadata: {
          ...metadata,
          checkout: checkout.raw,
        },
      })
      .eq("id", payment.id);

    await admin
      .from("organization_subscriptions")
      .update({
        authorization_url: checkout.authorizationUrl,
        provider_reference: reference,
        stripe_checkout_session_id:
          provider === "stripe" ? checkout.providerTransactionId || null : null,
      })
      .eq("id", subscription.id);

    await admin.from("organization_billing_events").insert({
      organization_id: organization.id,
      subscription_id: subscription.id,
      actor_user_id: user.id,
      event_type: "subscription_checkout_initialized",
      message: `Subscription checkout initialized for the ${tier.name} tier.`,
      metadata: {
        reference,
        tierId: tier.id,
        amountMinor: payment.amount_minor,
        provider,
        currency: payment.currency,
      },
    });

    return jsonResponse(200, {
      organization,
      subscription: {
        ...subscription,
        authorization_url: checkout.authorizationUrl,
        provider_reference: reference,
      },
      tier,
      authorizationUrl: checkout.authorizationUrl,
      accessCode: "accessCode" in checkout ? checkout.accessCode || null : null,
      reference: checkout.reference,
      callbackUrl,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("initialize-organization-subscription error:", error);
    return jsonResponse(500, { error: "Unable to initialize organization subscription" });
  }
});
