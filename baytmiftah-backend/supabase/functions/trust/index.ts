import { getSupabaseClient, maybeVerifyToken, requireOrganizationAccess, verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";

function missingTable(error: any) {
  return ["PGRST205", "42P01"].includes(error?.code);
}

function tierForScore(score: number) {
  if (score >= 86) return "verified";
  if (score >= 70) return "trusted";
  if (score >= 45) return "standard";
  return "low";
}

function calculateTrust(input: any) {
  const factors = [
    { key: "identity_verified", label: "Identity verified", value: Boolean(input.identityVerified), weight: 15 },
    { key: "agency_verified", label: "Agency verified", value: Boolean(input.agencyVerified), weight: 20 },
    { key: "documents_complete", label: "Documents complete", value: Boolean(input.documentsComplete), weight: 20 },
    { key: "positive_history", label: "Positive activity history", value: Number(input.positiveHistory || 0), weight: 15 },
    { key: "open_disputes", label: "Open disputes", value: Number(input.openDisputes || 0), weight: -20 },
    { key: "fraud_signals", label: "Open fraud signals", value: Number(input.openSignals || 0), weight: -18 },
  ];
  const score = Math.max(0, Math.min(100, 45 + factors.reduce((total, factor) => {
    if (typeof factor.value === "boolean") return total + (factor.value ? factor.weight : 0);
    const value = Number(factor.value || 0);
    if (factor.key === "positive_history") return total + Math.min(15, value * 3);
    return total + Math.max(factor.weight, value * factor.weight);
  }, 0)));

  return { score, tier: tierForScore(score), factors };
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "score";
    const authHeader = req.headers.get("Authorization") || undefined;
    const user = await maybeVerifyToken(authHeader);

    if (req.method === "POST" && action === "score") {
      const currentUser = user || await verifyToken(authHeader);
      const body = await req.json();
      if (body.organizationId || body.organization_id) {
        await requireOrganizationAccess(supabase, currentUser, body.organizationId || body.organization_id);
      }

      const result = calculateTrust(body);
      const subjectType = body.subjectType || "organization";
      const subjectId = body.subjectId || body.organizationId || body.organization_id;
      if (!subjectId) return jsonResponse(result);

      const payload = {
        subject_type: subjectType,
        subject_id: subjectId,
        score: result.score,
        tier: result.tier,
        factors: result.factors,
        calculated_by: "trust_edge_function",
        calculated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("trust_scores")
        .upsert(payload, { onConflict: "subject_type,subject_id" })
        .select()
        .single();

      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || payload);
    }

    if (req.method === "POST" && action === "signal") {
      const currentUser = user || await verifyToken(authHeader);
      const body = await req.json();
      const organizationId = body.organizationId || body.organization_id || null;
      if (organizationId) await requireOrganizationAccess(supabase, currentUser, organizationId);

      const payload = {
        subject_type: body.subjectType || body.subject_type || "listing",
        subject_id: body.subjectId || body.subject_id,
        organization_id: organizationId,
        signal_type: body.signalType || body.signal_type || "manual_review",
        severity: body.severity || "medium",
        status: body.status || "open",
        description: body.description || null,
        metadata: body.metadata || {},
        created_by: currentUser.id,
      };
      if (!payload.subject_id) return errorResponse("subjectId is required", 400);

      const { data, error } = await supabase.from("fraud_signals").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { ...payload, id: null }, error ? 200 : 201);
    }

    if (req.method === "GET" && action === "signals") {
      const currentUser = user || await verifyToken(authHeader);
      const organizationId = url.searchParams.get("organizationId");
      if (organizationId) await requireOrganizationAccess(supabase, currentUser, organizationId);

      let query = supabase.from("fraud_signals").select("*").order("created_at", { ascending: false }).limit(50);
      if (organizationId) query = query.eq("organization_id", organizationId);
      const { data, error } = await query;
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || []);
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
