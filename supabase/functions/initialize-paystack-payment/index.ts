import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { initializePaystackTransaction } from "../_shared/paystack.ts";
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

function buildReference() {
  const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 18);
  return `bm-ps-${uuid}`;
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

    if (!listingId) {
      throw new HttpError(400, "listingId is required");
    }

    const amountMinor = parseAmountToMinorUnits(requestBody?.amount);
    const admin = createAdminClient();

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

    const callbackUrl = `${getAppUrl(req)}/app/payments`;
    const reference = buildReference();

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

    const metadata = {
      listingId: listing.id,
      propertyId: listing.property_id,
      organizationId: listing.organization_id,
      payerUserId: user.id,
      dealCaseId: resolvedDealCaseId,
      purpose,
      customerPhone,
      customerName,
    };

    const { data: propertyTransaction, error: propertyTransactionError } = await admin
      .from("property_transactions")
      .insert({
        listing_id: listing.id,
        property_id: listing.property_id,
        organization_id: listing.organization_id,
        deal_case_id: resolvedDealCaseId,
        payer_user_id: user.id,
        provider: "paystack",
        provider_reference: reference,
        amount_minor: amountMinor,
        currency: listing.currency || "GHS",
        purpose,
        status: "initialized",
        metadata,
      })
      .select("*")
      .single();

    if (propertyTransactionError) {
      throw new HttpError(500, propertyTransactionError.message);
    }

    const paystack = await initializePaystackTransaction({
      amount: String(amountMinor),
      email: user.email,
      currency: listing.currency || "GHS",
      reference,
      callback_url: callbackUrl,
      channels: ["mobile_money", "card", "bank_transfer", "bank"],
      metadata,
    });

    const { data: updatedTransaction, error: updatedTransactionError } = await admin
      .from("property_transactions")
      .update({
        status: "pending",
        authorization_url: paystack.authorization_url,
        access_code: paystack.access_code,
      })
      .eq("id", propertyTransaction.id)
      .select("*")
      .single();

    if (updatedTransactionError) {
      throw new HttpError(500, updatedTransactionError.message);
    }

    return jsonResponse(200, {
      transaction: updatedTransaction,
      authorizationUrl: paystack.authorization_url,
      accessCode: paystack.access_code,
      reference: paystack.reference,
      callbackUrl,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("initialize-paystack-payment error:", error);
    return jsonResponse(500, { error: "Unable to initialize payment" });
  }
});
