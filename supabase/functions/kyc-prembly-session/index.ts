import { getCorsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";
import {
  fetchPremblySession,
  getPremblyReference,
  getPremblySubmissionId,
  mapPremblyResult,
} from "../_shared/prembly.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, req);
  try {
    const { user } = await requireAuthenticatedUser(req.headers.get("Authorization"));
    const body = await req.json().catch(() => null);
    const submissionId = typeof body?.submissionId === "string" ? body.submissionId.trim() : "";
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    if (!submissionId || !sessionId) throw new HttpError(400, "submissionId and sessionId are required");

    const admin = createAdminClient();
    const { data: submission, error } = await admin.from("kyc_submissions")
      .select("id,user_id,provider_engine").eq("id", submissionId).maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (!submission) throw new HttpError(404, "KYC submission not found");
    if (submission.user_id !== user.id) throw new HttpError(403, "You can only retrieve your own verification session");
    if (submission.provider_engine !== "prembly") throw new HttpError(409, "Submission is not assigned to Prembly");

    const session = await fetchPremblySession(sessionId);
    if (getPremblySubmissionId(session) !== submissionId) {
      throw new HttpError(409, "Prembly session metadata does not match this submission");
    }
    const resultPayload = session.data && typeof session.data === "object"
      ? session.data as Record<string, unknown>
      : session;
    const mapped = mapPremblyResult(resultPayload);
    const reference = getPremblyReference(resultPayload) || sessionId;
    const { data: updated, error: updateError } = await admin.from("kyc_submissions").update({
      status: "in_review",
      provider_job_id: sessionId,
      provider_reference: reference,
      provider_status: mapped.provider_status,
      ai_recommendation: mapped.ai_recommendation,
      ai_screening_status: mapped.ai_screening_status,
      ai_summary: mapped.ai_summary,
      ai_source: "prembly-widget",
      ai_screened_at: new Date().toISOString(),
    }).eq("id", submissionId).select("*").single();
    if (updateError) throw new HttpError(500, updateError.message);
    return jsonResponse(200, { ok: true, submission: updated }, req);
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse(error.status, { error: error.message }, req);
    console.error("kyc-prembly-session error", error);
    return jsonResponse(500, { error: "Unable to retrieve Prembly verification session" }, req);
  }
});
