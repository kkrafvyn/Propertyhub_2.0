import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

function compactText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatMoney(amount: unknown, currency = "GHS") {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "price on request";
  return `${currency} ${numeric.toLocaleString("en-GH")}`;
}

function buildConciergeResponse(input: {
  prompt: string;
  listing?: Record<string, any> | null;
  dealCase?: Record<string, any> | null;
}) {
  const listing = input.listing || input.dealCase?.listing || {};
  const property = listing.property || {};
  const address = compactText(property.address, "this property");
  const city = compactText(property.city, "the local market");
  const listingType = compactText(listing.listing_type, input.dealCase?.case_type === "purchase_offer" ? "sale" : "rental");
  const price = formatMoney(listing.price, compactText(listing.currency, "GHS"));
  const stage = compactText(input.dealCase?.pipeline_stage || input.dealCase?.status, "shortlist");
  const isSale = listingType === "sale" || input.dealCase?.case_type === "purchase_offer";

  const riskChecks = isSale
    ? "confirm title or mandate proof, seller authority, closing timeline, financing readiness, and protected payment conditions"
    : "confirm lease term, deposit handling, utility responsibility, inventory condition, and move-in access";
  const nextStep = isSale
    ? "Ask the team for title or mandate evidence before sending any deposit, then keep offer terms inside the deal room."
    : "Book or confirm a walkthrough first, then request lease, inventory, and deposit terms in writing.";

  return [
    `For ${address} in ${city}, I would treat this as a ${stage} decision, not a rush-to-pay moment.`,
    `Use ${price} as the anchor, then ${riskChecks}.`,
    nextStep,
    "If family, a lawyer, or a local representative is involved, invite them into the buying group so approvals, questions, documents, and receipts stay in one place.",
    `Prompt handled: ${input.prompt}`,
  ].join(" ");
}

async function getAuthorizedDealCase(admin: ReturnType<typeof createAdminClient>, dealCaseId: string, userId: string) {
  const { data: dealCase, error } = await admin
    .from("deal_cases")
    .select(
      `
      *,
      listing:listings(
        id,
        price,
        currency,
        listing_type,
        verification_status,
        property:properties(address, city, region, bedrooms, bathrooms, square_meters)
      )
    `
    )
    .eq("id", dealCaseId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!dealCase) throw new HttpError(404, "Deal case not found");

  if (dealCase.user_id === userId) return dealCase;

  const { data: membership, error: membershipError } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", dealCase.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw new HttpError(500, membershipError.message);
  if (!membership) throw new HttpError(403, "You are not allowed to use this deal room context");

  return dealCase;
}

async function getListing(admin: ReturnType<typeof createAdminClient>, listingId: string) {
  const { data, error } = await admin
    .from("listings")
    .select(
      `
      id,
      price,
      currency,
      listing_type,
      verification_status,
      property:properties(address, city, region, bedrooms, bathrooms, square_meters)
    `
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, "Listing not found");
  return data;
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
    const body = await req.json().catch(() => null);
    const prompt = compactText(body?.prompt);
    const listingId = compactText(body?.listingId);
    const dealCaseId = compactText(body?.dealCaseId);
    const context = body?.context && typeof body.context === "object" ? body.context : {};

    if (!prompt) {
      throw new HttpError(400, "prompt is required");
    }

    if (prompt.length > 4000) {
      throw new HttpError(400, "prompt is too long");
    }

    const admin = createAdminClient();
    const dealCase = dealCaseId ? await getAuthorizedDealCase(admin, dealCaseId, user.id) : null;
    const listing = dealCase?.listing || (listingId ? await getListing(admin, listingId) : null);
    const response = buildConciergeResponse({ prompt, listing, dealCase });

    const { data: conversation, error: conversationError } = await admin
      .from("ai_concierge_conversations")
      .insert({
        user_id: user.id,
        listing_id: listing?.id || dealCase?.listing_id || null,
        deal_case_id: dealCase?.id || null,
        prompt,
        response,
        context: {
          ...context,
          source: "edge_function",
          listingType: listing?.listing_type || null,
          dealStage: dealCase?.pipeline_stage || dealCase?.status || null,
        },
        model: "propertyhub-rules-concierge-v1",
        status: "completed",
      })
      .select()
      .single();

    if (conversationError) {
      throw new HttpError(500, conversationError.message);
    }

    await admin.from("analytics_events").insert({
      user_id: user.id,
      organization_id: dealCase?.organization_id || null,
      listing_id: listing?.id || dealCase?.listing_id || null,
      deal_case_id: dealCase?.id || null,
      event_type: "ai_concierge_answered",
      source: "edge",
      metadata: {
        promptLength: prompt.length,
      },
    });

    return jsonResponse(200, {
      response,
      conversation,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("ai-concierge error:", error);
    return jsonResponse(500, { error: "Unable to answer concierge prompt" });
  }
});
