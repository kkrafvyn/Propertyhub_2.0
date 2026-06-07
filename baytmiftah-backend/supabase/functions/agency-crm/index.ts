import { getSupabaseClient, requireOrganizationAccess, verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";

const defaultStages = [
  { name: "New lead", slug: "new", sort_order: 10, probability: 10, color: "#64748b" },
  { name: "Contacted", slug: "contacted", sort_order: 20, probability: 25, color: "#2563eb" },
  { name: "Qualified", slug: "qualified", sort_order: 30, probability: 45, color: "#7c3aed" },
  { name: "Viewing booked", slug: "viewing", sort_order: 40, probability: 65, color: "#f59e0b" },
  { name: "Offer", slug: "offer", sort_order: 50, probability: 80, color: "#0f766e" },
  { name: "Won", slug: "won", sort_order: 60, probability: 100, color: "#16a34a", is_closed: true },
  { name: "Lost", slug: "lost", sort_order: 70, probability: 0, color: "#dc2626", is_closed: true },
];

function missingTable(error: any) {
  return ["PGRST205", "42P01", "42703"].includes(error?.code);
}

function leadIntentScore(input: any) {
  let score = 35;
  if (input.budget || input.estimated_budget) score += 15;
  if (input.preferredArea || input.preferred_area) score += 10;
  if (input.phone || input.email) score += 10;
  if (input.viewingRequested) score += 20;
  if (input.message?.length > 80) score += 10;
  return Math.max(0, Math.min(100, score));
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const user = await verifyToken(req.headers.get("Authorization") || undefined);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "pipeline";
    const organizationId = url.searchParams.get("organizationId");

    if (organizationId) await requireOrganizationAccess(supabase, user, organizationId);

    if (req.method === "GET" && action === "pipeline") {
      if (!organizationId) return jsonResponse(defaultStages);
      const { data, error } = await supabase
        .from("crm_pipeline_stages")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true });

      if (error && !missingTable(error)) throw error;
      if (data?.length) return jsonResponse(data);

      const rows = defaultStages.map((stage) => ({ organization_id: organizationId, ...stage }));
      const { data: inserted, error: insertError } = await supabase
        .from("crm_pipeline_stages")
        .upsert(rows, { onConflict: "organization_id,slug" })
        .select()
        .order("sort_order", { ascending: true });
      if (insertError && !missingTable(insertError)) throw insertError;
      return jsonResponse(inserted || rows);
    }

    if (req.method === "GET" && action === "activities") {
      const leadId = url.searchParams.get("leadId");
      let query = supabase.from("crm_activities").select("*").order("created_at", { ascending: false }).limit(100);
      if (organizationId) query = query.eq("organization_id", organizationId);
      if (leadId) query = query.eq("lead_id", leadId);
      const { data, error } = await query;
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "record-activity") {
      const body = await req.json();
      const orgId = body.organizationId || body.organization_id || organizationId;
      if (!orgId) return errorResponse("organizationId is required", 400);
      await requireOrganizationAccess(supabase, user, orgId);

      const payload = {
        organization_id: orgId,
        lead_id: body.leadId || body.lead_id || null,
        actor_id: user.id,
        activity_type: body.activityType || body.activity_type || "note",
        title: body.title || "CRM activity",
        notes: body.notes || null,
        due_at: body.dueAt || body.due_at || null,
        completed_at: body.completedAt || body.completed_at || null,
        metadata: body.metadata || {},
      };
      const { data, error } = await supabase.from("crm_activities").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { ...payload, id: null }, error ? 200 : 201);
    }

    if (req.method === "POST" && action === "lead-intent") {
      const body = await req.json();
      const score = leadIntentScore(body);
      const leadId = body.leadId || body.lead_id;
      if (!leadId) return jsonResponse({ intentScore: score });

      const { data, error } = await supabase
        .from("leads")
        .update({ intent_score: score })
        .eq("id", leadId)
        .select()
        .single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { leadId, intentScore: score });
    }

    if (req.method === "PUT" && action === "update-lead") {
      const body = await req.json();
      const leadId = body.leadId || body.lead_id || url.searchParams.get("leadId");
      if (!leadId) return errorResponse("leadId is required", 400);
      const update: Record<string, any> = {
        pipeline_stage_id: body.pipelineStageId || body.pipeline_stage_id,
        intent_score: body.intentScore || body.intent_score,
        follow_up_status: body.followUpStatus || body.follow_up_status,
        next_follow_up_at: body.nextFollowUpAt || body.next_follow_up_at,
        lead_source: body.leadSource || body.lead_source,
        estimated_budget: body.estimatedBudget || body.estimated_budget,
        preferred_area: body.preferredArea || body.preferred_area,
      };
      Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
      const { data, error } = await supabase.from("leads").update(update).eq("id", leadId).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { leadId, ...update });
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
