import { getSupabaseClient, maybeVerifyToken, requireOrganizationAccess, verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";

const ghanaBaseline = {
  countryCode: "GH",
  country: "Ghana",
  currency: "GHS",
  saleDocuments: [
    "Land title certificate or registered indenture",
    "Stamped site plan",
    "Owner Ghana Card or company registration documents",
    "Tax identification number where applicable",
    "Agent authority letter when submitted by an agency",
  ],
  rentDocuments: [
    "Approved tenancy agreement template",
    "Owner authority letter",
    "Property manager or agent identity",
    "Utility and service-charge disclosure",
  ],
  operatingRules: [
    "Block public promotion when ownership documents are missing",
    "Flag unverified agencies for manual review",
    "Require seller or landlord authority before collecting buyer or tenant payments",
    "Keep a compliance audit trail for listing edits and approvals",
  ],
};

function missingTable(error: any) {
  return ["PGRST205", "42P01"].includes(error?.code);
}

function evaluateListing(input: any) {
  const listingType = input?.listingType || input?.listing_type || "sale";
  const supplied = new Set<string>((input?.documents || []).map((item: string) => item.toLowerCase()));
  const required = listingType === "rent" ? ghanaBaseline.rentDocuments : ghanaBaseline.saleDocuments;
  const missing = required.filter((label) => !supplied.has(label.toLowerCase()));
  const riskFlags = [
    ...(missing.length > 0 ? ["missing_required_documents"] : []),
    ...(input?.agencyVerified === false ? ["unverified_agency"] : []),
    ...(input?.priceAnomaly ? ["price_anomaly"] : []),
  ];
  const score = Math.max(0, 100 - missing.length * 14 - riskFlags.length * 8);
  const status = missing.length === 0 && riskFlags.length <= 1 ? "approved" : riskFlags.length >= 3 ? "blocked" : "needs_review";

  return {
    countryCode: "GH",
    listingType,
    requiredDocuments: required,
    missingDocuments: missing,
    riskFlags,
    score,
    status,
  };
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "ghana-baseline";
    const authHeader = req.headers.get("Authorization") || undefined;
    const user = await maybeVerifyToken(authHeader);

    if (req.method === "GET" && action === "ghana-baseline") {
      return jsonResponse(ghanaBaseline);
    }

    if (req.method === "POST" && action === "review-listing") {
      const reviewer = user || await verifyToken(authHeader);
      const body = await req.json();
      const listingId = body.listingId || body.listing_id;
      let listing = body.listing || null;

      if (listingId) {
        const { data, error } = await supabase
          .from("listings")
          .select("id, property_id, organization_id, verification_status")
          .eq("id", listingId)
          .maybeSingle();
        if (error) throw error;
        listing = data || listing;
      }

      const organizationId = body.organizationId || body.organization_id || listing?.organization_id;
      if (organizationId) await requireOrganizationAccess(supabase, reviewer, organizationId);

      const review = evaluateListing({
        ...body,
        listingType: body.listingType || body.listing_type || listing?.listing_type,
        documents: body.documents || [],
      });

      const payload = {
        listing_id: listingId || null,
        property_id: body.propertyId || body.property_id || listing?.property_id || null,
        organization_id: organizationId || null,
        country_code: "GH",
        status: review.status,
        score: review.score,
        required_documents: review.requiredDocuments,
        missing_documents: review.missingDocuments,
        risk_flags: review.riskFlags,
        reviewer_notes: body.notes || null,
        reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString(),
        metadata: { source: "compliance_edge_function" },
      };

      const { data, error } = await supabase
        .from("listing_compliance_reviews")
        .insert([payload])
        .select()
        .single();

      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { ...payload, id: null }, error ? 200 : 201);
    }

    if (req.method === "GET" && action === "listing-review") {
      const currentUser = user || await verifyToken(authHeader);
      const listingId = url.searchParams.get("listingId");
      if (!listingId) return errorResponse("listingId is required", 400);

      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .select("id, organization_id")
        .eq("id", listingId)
        .maybeSingle();
      if (listingError) throw listingError;
      if (listing?.organization_id) await requireOrganizationAccess(supabase, currentUser, listing.organization_id);

      const { data, error } = await supabase
        .from("listing_compliance_reviews")
        .select("*")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || null);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    const message = error.message || "Internal server error";
    const status = message.includes("Authentication") || message.includes("Invalid token")
      ? 401
      : message.includes("access required")
      ? 403
      : 500;
    return errorResponse(message, status);
  }
});
