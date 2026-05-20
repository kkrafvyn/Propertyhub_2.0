import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { createSubscription } from "../_shared/payment-service.ts";
import { initializePaystackTransaction } from "../_shared/paystack.ts";
import { isPaymentGatewayConfigured } from "../_shared/payment-gateways.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

type SubscriptionProvider = "paystack" | "stripe" | "flutterwave";

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

function buildFlutterwaveReference() {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 18);
  return `bm-flw-sub-${suffix}`;
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

function normalizeSubscriptionProvider(value: unknown): SubscriptionProvider {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "stripe" || normalized === "flutterwave") return normalized;
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

function getFlutterwavePlanId(tier: any, currency: string) {
  const normalizedTier = String(tier.id || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const normalizedCurrency = currency.toUpperCase();
  const columnName = `flutterwave_plan_id_${normalizedCurrency.toLowerCase()}`;
  return (
    tier[columnName] ||
    Deno.env.get(`FLUTTERWAVE_PLAN_ID_${normalizedTier}_${normalizedCurrency}`) ||
    Deno.env.get(`FLUTTERWAVE_${normalizedTier}_${normalizedCurrency}_PLAN_ID`) ||
    Deno.env.get(`FLUTTERWAVE_PLAN_ID_${normalizedTier}`) ||
    ""
  );
}

function uniqueProviders(providers: SubscriptionProvider[]) {
  return providers.filter((provider, index) => providers.indexOf(provider) === index);
}

function getSubscriptionFallbackOrder(provider: SubscriptionProvider) {
  return uniqueProviders([provider, "paystack", "stripe", "flutterwave"]);
}

function getProviderReadiness(provider: SubscriptionProvider, tier: any, currency: string) {
  if (provider === "paystack") {
    const planCode = getPlanCode(tier.id, tier.paystack_plan_code);
    return {
      provider,
      ready: Boolean(planCode && isPaymentGatewayConfigured("paystack")),
      planCode,
      priceId: "",
      flutterwavePlanId: "",
      amountMinor: tier.price_minor,
      currency: tier.currency || "GHS",
      missing: !planCode ? "missing Paystack plan code" : "missing Paystack secret key",
    };
  }

  if (provider === "stripe") {
    const priceId = getStripePriceId(tier, currency);
    return {
      provider,
      ready: Boolean(priceId && isPaymentGatewayConfigured("stripe")),
      planCode: "",
      priceId,
      flutterwavePlanId: "",
      amountMinor: getStripeAmountMinor(tier, currency),
      currency,
      missing: !priceId ? "missing Stripe price ID" : "missing Stripe secret key",
    };
  }

  const flutterwavePlanId = getFlutterwavePlanId(tier, currency);
  return {
    provider,
    ready: Boolean(flutterwavePlanId && isPaymentGatewayConfigured("flutterwave")),
    planCode: "",
    priceId: "",
    flutterwavePlanId,
    amountMinor: tier.price_minor,
    currency,
    missing: !flutterwavePlanId
      ? "missing Flutterwave payment plan ID"
      : "missing Flutterwave secret key",
  };
}

function selectSubscriptionCheckoutProvider(input: {
  requestedProvider: SubscriptionProvider;
  tier: any;
  currency: string;
}) {
  const attempts = getSubscriptionFallbackOrder(input.requestedProvider).map((provider) =>
    getProviderReadiness(provider, input.tier, input.currency)
  );
  const selected = attempts.find((attempt) => attempt.ready);
  if (selected) return { selected, attempts };

  throw new HttpError(
    500,
    `No subscription payment provider is configured. Tried ${attempts
      .map((attempt) => `${attempt.provider}: ${attempt.missing}`)
      .join("; ")}.`
  );
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
    const requestedProvider = normalizeSubscriptionProvider(requestBody?.provider);

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

    const { selected, attempts } = selectSubscriptionCheckoutProvider({
      requestedProvider,
      tier,
      currency,
    });
    const provider = selected.provider;

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
        paystack_plan_code: provider === "paystack" ? selected.planCode : null,
        stripe_price_id: provider === "stripe" ? selected.priceId : null,
        flutterwave_payment_plan_id:
          provider === "flutterwave" ? String(selected.flutterwavePlanId) : null,
        metadata: {
          createdBy: user.id,
          onboardingVersion: "phase1",
          requestedBillingProvider: requestedProvider,
          billingProvider: provider,
          billingCurrency: selected.currency,
          providerFallbackAttempts: attempts.map((attempt) => ({
            provider: attempt.provider,
            ready: attempt.ready,
            missing: attempt.ready ? null : attempt.missing,
          })),
        },
      })
      .select("*")
      .single();

    if (subscriptionError) {
      throw new HttpError(500, subscriptionError.message);
    }

    const reference =
      provider === "stripe"
        ? buildStripeReference()
        : provider === "flutterwave"
          ? buildFlutterwaveReference()
          : buildReference();
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
      requestedProvider,
      currency: selected.currency,
      fallbackAttempted: requestedProvider !== provider,
      providerFallbackAttempts: attempts.map((attempt) => ({
        provider: attempt.provider,
        ready: attempt.ready,
        missing: attempt.ready ? null : attempt.missing,
      })),
    };

    const { data: payment, error: paymentError } = await admin
      .from("organization_subscription_payments")
      .insert({
        organization_id: organization.id,
        subscription_id: subscription.id,
        provider,
        provider_reference: reference,
        amount_minor: selected.amountMinor,
        currency: selected.currency,
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
            amountMinor: selected.amountMinor,
            currency: selected.currency,
            stripePriceId: selected.priceId,
            metadata,
          })
        : provider === "flutterwave"
          ? await createSubscription({
            provider: "flutterwave",
            email: user.email,
            reference,
            successUrl: callbackUrl,
            cancelUrl: callbackUrl,
            tierName: tier.name,
            amountMinor: selected.amountMinor,
            currency: selected.currency,
            flutterwavePaymentPlanId: selected.flutterwavePlanId,
            metadata,
          })
        : await initializePaystackTransaction({
            amount: String(selected.amountMinor),
            email: user.email,
            currency: selected.currency,
            reference,
            callback_url: callbackUrl,
            plan: selected.planCode,
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
        flutterwave_transaction_id:
          provider === "flutterwave" ? checkout.providerTransactionId || null : null,
        flutterwave_payment_plan_id:
          provider === "flutterwave" ? String(selected.flutterwavePlanId) : null,
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
        flutterwave_subscription_id:
          provider === "flutterwave" ? checkout.providerTransactionId || null : null,
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
        requestedProvider,
        provider,
        currency: payment.currency,
        fallbackAttempted: requestedProvider !== provider,
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
      requestedProvider,
      provider,
      fallbackAttempted: requestedProvider !== provider,
      fallbackAttempts: attempts.map((attempt) => ({
        provider: attempt.provider,
        ready: attempt.ready,
        missing: attempt.ready ? null : attempt.missing,
      })),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("initialize-organization-subscription error:", error);
    return jsonResponse(500, { error: "Unable to initialize organization subscription" });
  }
});
