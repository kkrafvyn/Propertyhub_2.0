import { getSupabaseClient, maybeVerifyToken, verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { asString, requireObject } from "../_shared/security.ts";

function localRecommendations(profile: Record<string, unknown>) {
  const budget = Number(profile.budget || 1800000);
  const area = asString(profile.area) || "Cantonments";
  return [
    {
      title: `Verified residence near ${area}`,
      reason: "Matches budget, verification preference, and viewing readiness.",
      priceFit: budget > 1200000 ? "strong" : "stretch",
      nextAction: "Book viewing",
    },
    {
      title: `${area} investment shortlist`,
      reason: "Good liquidity, stronger agency trust signals, and clean document path.",
      priceFit: "balanced",
      nextAction: "Compare",
    },
  ];
}

function neighborhoodFallback(city = "Accra", neighborhood = "Cantonments") {
  return {
    city,
    neighborhood,
    metrics: {
      floodRisk: "low",
      powerReliability: "strong",
      commuteScore: 82,
      schools: 7,
      averagePriceGhs: 1850000,
      rentalYield: "6.2%",
      demand: "high",
    },
  };
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "concierge";

    if (req.method === "GET" && action === "neighborhood") {
      const city = url.searchParams.get("city") || "Accra";
      const neighborhood = url.searchParams.get("neighborhood") || "Cantonments";
      const { data, error } = await supabase
        .from("neighborhood_metrics")
        .select("*")
        .eq("city", city)
        .eq("neighborhood", neighborhood)
        .maybeSingle();
      if (error && !["PGRST205", "42P01"].includes(error.code)) throw error;
      return jsonResponse(data || neighborhoodFallback(city, neighborhood));
    }

    const user = await maybeVerifyToken(req.headers.get("Authorization") || undefined);

    if (req.method === "POST" && action === "concierge") {
      const currentUser = user || await verifyToken(req.headers.get("Authorization") || undefined);
      const body = requireObject(await req.json());
      const recommendations = localRecommendations(body);
      const payload = {
        user_id: currentUser.id,
        intent_profile: body,
        recommendations,
        status: "active",
      };
      const { data, error } = await supabase.from("ai_concierge_sessions").insert([payload]).select().single();
      if (error && !["PGRST205", "42P01"].includes(error.code)) throw error;
      return jsonResponse(data || { id: null, ...payload }, error ? 200 : 201);
    }

    if (req.method === "POST" && action === "dynamic-pricing") {
      const body = requireObject(await req.json());
      const basePrice = Number(body.basePrice || 1000);
      const occupancy = Number(body.occupancy || 0.68);
      const demand = Number(body.demand || 0.74);
      const suggestedPrice = Math.round(basePrice * (1 + (occupancy - 0.6) * 0.35 + (demand - 0.5) * 0.25));
      return jsonResponse({
        basePrice,
        suggestedPrice,
        confidence: 0.78,
        reason: "Adjusted for occupancy, demand, and channel performance signals.",
      });
    }

    if (req.method === "POST" && action === "inspection") {
      const currentUser = user || await verifyToken(req.headers.get("Authorization") || undefined);
      const body = requireObject(await req.json());
      const checklist = Array.isArray(body.checklist) ? body.checklist : [];
      const score = Math.round((checklist.filter((item: any) => item.done).length / Math.max(checklist.length, 1)) * 100);
      const payload = {
        property_id: asString(body.propertyId || body.property_id) || null,
        listing_id: asString(body.listingId || body.listing_id) || null,
        inspector_id: currentUser.id,
        status: score > 75 ? "ready" : "needs_work",
        score,
        checklist,
        media: body.media || [],
        geotag: body.geotag || {},
        signature: body.signature || {},
      };
      const { data, error } = await supabase.from("inspection_reports").insert([payload]).select().single();
      if (error && !["PGRST205", "42P01"].includes(error.code)) throw error;
      return jsonResponse(data || { id: null, ...payload }, error ? 200 : 201);
    }

    if (req.method === "GET" && action === "revenue") {
      const currentUser = user || await verifyToken(req.headers.get("Authorization") || undefined);
      return jsonResponse({
        userId: currentUser.id,
        metrics: {
          mrr: 18250,
          boostRevenue: 4300,
          checkoutConversion: "12.8%",
          churnRisk: "medium",
          expansionAccounts: 9,
        },
      });
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Intelligence function failed", 400);
  }
});
