import { getSupabaseClient, isAdmin, verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { asString, requireObject } from "../_shared/security.ts";

function missingTable(error: any) {
  return ["PGRST205", "42P01"].includes(error?.code);
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const user = await verifyToken(req.headers.get("Authorization") || undefined);
    if (!isAdmin(user)) return errorResponse("Admin access required", 403);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "queue";

    if (req.method === "GET" && action === "queue") {
      const status = url.searchParams.get("status");
      let query = supabase.from("listing_moderation_queue").select("*").order("created_at", { ascending: false }).limit(80);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "enqueue") {
      const body = requireObject(await req.json());
      const payload = {
        listing_id: asString(body.listingId || body.listing_id) || null,
        organization_id: asString(body.organizationId || body.organization_id) || null,
        status: "queued",
        priority: asString(body.priority) || "normal",
        reason_codes: body.reasonCodes || body.reason_codes || [],
        reviewer_notes: asString(body.notes) || null,
      };
      const { data, error } = await supabase.from("listing_moderation_queue").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { id: null, ...payload }, error ? 200 : 201);
    }

    if (req.method === "PUT" && action === "decision") {
      const body = requireObject(await req.json());
      const reviewId = asString(body.reviewId || body.id);
      if (!reviewId) return errorResponse("reviewId is required", 400);
      const update = {
        status: asString(body.status) || "reviewed",
        assigned_to: asString(body.assignedTo || body.assigned_to) || user.id,
        decision: asString(body.decision) || null,
        reason_codes: body.reasonCodes || body.reason_codes || [],
        reviewer_notes: asString(body.notes || body.reviewer_notes) || null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("listing_moderation_queue")
        .update(update)
        .eq("id", reviewId)
        .select()
        .single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { id: reviewId, ...update });
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Moderation failed", 400);
  }
});
