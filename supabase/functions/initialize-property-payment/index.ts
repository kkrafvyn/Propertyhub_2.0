import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import {
  getPaymentGatewayFallbackOrder,
  getPaymentGatewayLabel,
  normalizePaymentGatewayProvider,
  type PaymentGatewayProvider,
} from "../_shared/payment-gateways.ts";
import { initiateEscrow } from "../_shared/payment-service.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { requireAuthenticatedUser, createAdminClient } from "../_shared/supabase.ts";

function getAppUrl(req: Request) {
  return (
    Deno.env.get("PUBLIC_APP_URL") ||
    Deno.env.get("VITE_PUBLIC_APP_URL") ||
    Deno.env.get("SITE_URL") ||
    `${new URL(req.url).protocol}//${new URL(req.url).host}`
  ).replace(/\/+$/, "");
}

function parseAmountToMinorUnits(amount: unknown) {
  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    return Math.round(amount * 100);
  }

  if (typeof amount === "string") {
    const normalized = Number.parseFloat(amount);
    if (Number.isFinite(normalized) && normalized > 0) {
      return Math.round(normalized * 100);
    }
  }

  throw new HttpError(400, "amount is required and must be greater than zero");
}

function buildReference(provider: PaymentGatewayProvider) {
  if (provider === "it_consortium") {
    const suffix = Date.now().toString().slice(-8);
    const randomBytes = crypto.getRandomValues(new Uint8Array(4));
    const randomDigits = Array.from(randomBytes, (byte) => String(byte % 10)).join("");
    return `${suffix}${randomDigits}`;
  }

  const prefix = provider === "flutterwave" ? "flw" : provider === "stripe" ? "st" : "ps";
  const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 18);
  return `bm-${prefix}-${uuid}`;
}

function buildCallbackUrl(req: Request, reference: string) {
  const callbackUrl = new URL(`${getAppUrl(req)}/app/payments`);
  callbackUrl.searchParams.set("reference", reference);
  return callbackUrl.toString();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Payment gateway initialization failed";
}

function getCaseTypeFromListingType(listingType?: string) {
  switch (listingType) {
    case "sale":
      return "purchase_offer";
    case "lease":
      return "lease_application";
    default:
      return "rental_application";
  }
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

    const listingId =
      typeof requestBody?.listingId === "string" ? requestBody.listingId.trim() : "";
    const dealCaseId =
      typeof requestBody?.dealCaseId === "string" ? requestBody.dealCaseId.trim() : null;
    const purpose =
      typeof requestBody?.purpose === "string" && requestBody.purpose.trim()
        ? requestBody.purpose.trim()
        : "other";
    const customerPhone =
      typeof requestBody?.customerPhone === "string" ? requestBody.customerPhone.trim() : "";
    const customerName =
      typeof requestBody?.customerName === "string" ? requestBody.customerName.trim() : "";
    const provider = normalizePaymentGatewayProvider(requestBody?.provider);
    const fallbackProviders = Array.isArray(requestBody?.fallbackProviders)
      ? requestBody.fallbackProviders.map((item: unknown) => normalizePaymentGatewayProvider(item))
      : undefined;
    const allowGatewayFallback = requestBody?.allowGatewayFallback !== false;

    if (!listingId) {
      throw new HttpError(400, "listingId is required");
    }

    const amountMinor = parseAmountToMinorUnits(requestBody?.amount);
    const admin = createAdminClient();
    await enforceRateLimit({
      admin,
      req,
      route: "initialize-property-payment",
      userId: user.id,
      limit: 12,
      windowSeconds: 60,
    });

    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("id, property_id, organization_id, listing_type, price, currency, status")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError) {
      throw new HttpError(500, listingError.message);
    }

    if (!listing) {
      throw new HttpError(404, "Listing not found");
    }

    if (!["listed", "under_offer", "occupied", "leased", "sold"].includes(listing.status)) {
      throw new HttpError(400, "This listing is not available for payment");
    }

    if (!user.email) {
      throw new HttpError(400, "Authenticated user is missing an email address");
    }

    let resolvedDealCaseId = dealCaseId;

    if (resolvedDealCaseId) {
      const { data: existingCase, error: existingCaseError } = await admin
        .from("deal_cases")
        .select("id")
        .eq("id", resolvedDealCaseId)
        .eq("organization_id", listing.organization_id)
        .eq("listing_id", listing.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingCaseError) {
        throw new HttpError(500, existingCaseError.message);
      }

      if (!existingCase) {
        resolvedDealCaseId = null;
      }
    }

    if (!resolvedDealCaseId) {
      const { data: existingLeadCase, error: existingLeadCaseError } = await admin
        .from("deal_cases")
        .select("id")
        .eq("organization_id", listing.organization_id)
        .eq("listing_id", listing.id)
        .eq("user_id", user.id)
        .in("status", ["pending", "approved"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingLeadCaseError) {
        throw new HttpError(500, existingLeadCaseError.message);
      }

      if (existingLeadCase) {
        resolvedDealCaseId = existingLeadCase.id;
      } else {
        const { data: createdLeadCase, error: createdLeadCaseError } = await admin
          .from("deal_cases")
          .insert({
            listing_id: listing.id,
            user_id: user.id,
            organization_id: listing.organization_id,
            case_type: getCaseTypeFromListingType(listing.listing_type),
            status: "pending",
            message: "Payment flow started from the property page.",
            pipeline_stage: "payment_pending",
            priority: "high",
            last_stage_updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (createdLeadCaseError) {
          throw new HttpError(500, createdLeadCaseError.message);
        }

        resolvedDealCaseId = createdLeadCase.id;
      }
    }

    if (resolvedDealCaseId) {
      const { error: updateDealCaseError } = await admin
        .from("deal_cases")
        .update({
          pipeline_stage: "payment_pending",
          last_stage_updated_at: new Date().toISOString(),
        })
        .eq("id", resolvedDealCaseId);

      if (updateDealCaseError) {
        throw new HttpError(500, updateDealCaseError.message);
      }
    }

    const currency = listing.currency || "GHS";
    const providerOrder = getPaymentGatewayFallbackOrder({
      primaryProvider: provider,
      currency,
      fallbackProviders,
      enableFallback: allowGatewayFallback,
    });
    const failedAttempts: Array<{
      provider: PaymentGatewayProvider;
      reference: string;
      error: string;
    }> = [];
    const baseMetadata = {
      listingId: listing.id,
      propertyId: listing.property_id,
      organizationId: listing.organization_id,
      payerUserId: user.id,
      dealCaseId: resolvedDealCaseId,
      purpose,
      customerPhone,
      customerName,
      requestedGatewayProvider: provider,
      gatewayFallbackEnabled: allowGatewayFallback,
      gatewayFallbackOrder: providerOrder,
    };

    for (const [attemptIndex, attemptProvider] of providerOrder.entries()) {
      const reference = buildReference(attemptProvider);
      const callbackUrl = buildCallbackUrl(req, reference);
      const metadata = {
        ...baseMetadata,
        gatewayProvider: attemptProvider,
        gatewayAttemptIndex: attemptIndex,
      };

      const { data: propertyTransaction, error: propertyTransactionError } = await admin
        .from("property_transactions")
        .insert({
          listing_id: listing.id,
          property_id: listing.property_id,
          organization_id: listing.organization_id,
          deal_case_id: resolvedDealCaseId,
          payer_user_id: user.id,
          provider: attemptProvider,
          provider_reference: reference,
          amount_minor: amountMinor,
          currency,
          purpose,
          status: "initialized",
          metadata,
        })
        .select("*")
        .single();

      if (propertyTransactionError) {
        throw new HttpError(500, propertyTransactionError.message);
      }

      let gateway: Awaited<ReturnType<typeof initiateEscrow>>;

      try {
        gateway = await initiateEscrow({
          provider: attemptProvider,
          amountMinor,
          email: user.email,
          currency,
          reference,
          callbackUrl,
          customerName,
          customerPhone,
          description: `${purpose.replace(/_/g, " ")} for BaytMiftah property ${listing.id}`,
          metadata,
        });
      } catch (gatewayError) {
        const errorMessage = getErrorMessage(gatewayError);
        failedAttempts.push({
          provider: attemptProvider,
          reference,
          error: errorMessage,
        });

        await admin
          .from("property_transactions")
          .update({
            status: "failed",
            metadata: {
              ...metadata,
              gatewayInitializeError: errorMessage,
              gatewayFailedAt: new Date().toISOString(),
            },
          })
          .eq("id", propertyTransaction.id);

        continue;
      }

      const { data: updatedTransaction, error: updatedTransactionError } = await admin
        .from("property_transactions")
        .update({
          status: "pending",
          authorization_url: gateway.authorizationUrl,
          access_code: gateway.accessCode || null,
          provider_transaction_id: gateway.providerTransactionId || null,
          metadata: {
            ...metadata,
            gatewayInitialize: gateway.raw,
            gatewayFallbackAttempts: failedAttempts,
          },
        })
        .eq("id", propertyTransaction.id)
        .select("*")
        .single();

      if (updatedTransactionError) {
        throw new HttpError(500, updatedTransactionError.message);
      }

      return jsonResponse(200, {
        transaction: updatedTransaction,
        authorizationUrl: gateway.authorizationUrl,
        accessCode: gateway.accessCode || null,
        reference: gateway.reference,
        provider: attemptProvider,
        requestedProvider: provider,
        fallbackAttempted: attemptIndex > 0,
        fallbackAttempts: failedAttempts,
        callbackUrl,
      });
    }

    throw new HttpError(
      502,
      providerOrder.length > 1
        ? "Unable to start checkout with any configured payment gateway. Try again shortly or choose another payment option."
        : `Unable to start ${getPaymentGatewayLabel(provider)} checkout right now.`
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("initialize-property-payment error:", error);
    return jsonResponse(500, { error: "Unable to initialize payment" });
  }
});
