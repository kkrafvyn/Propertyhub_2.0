import { getCorsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";
import {
  getPremblyReference,
  isPremblyConfigured,
  mapPremblyResult,
  submitPremblyVerification,
} from "../_shared/prembly.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, req);

  try {
    if (!isPremblyConfigured()) {
      return jsonResponse(503, { error: "Prembly is not configured", configured: false }, req);
    }
    const { user } = await requireAuthenticatedUser(req.headers.get("Authorization"));
    const body = await req.json().catch(() => null);
    const submissionId = typeof body?.submissionId === "string" ? body.submissionId.trim() : "";
    if (!submissionId) throw new HttpError(400, "submissionId is required");

    const admin = createAdminClient();
    const { data: submission, error } = await admin.from("kyc_submissions").select("*").eq("id", submissionId).maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (!submission) throw new HttpError(404, "KYC submission not found");
    if (submission.user_id !== user.id) throw new HttpError(403, "You can only verify your own submission");
    if (submission.provider_engine !== "prembly") throw new HttpError(409, "Submission is not assigned to Prembly");
    if (!submission.document_number?.trim()) throw new HttpError(400, "Document number is required");

    await admin.from("kyc_submissions").update({ provider_status: "submitted", status: "in_review" }).eq("id", submissionId);
    const providerResponse = await submitPremblyVerification({
      idNumber: submission.document_number.trim(),
      country: submission.jurisdiction_id || "GH",
      documentType: submission.document_type,
      fullName: submission.full_name,
      dob: submission.date_of_birth,
      reference: submissionId,
    });
    const mapped = mapPremblyResult(providerResponse);
    const reference = getPremblyReference(providerResponse) || submissionId;
    const { data: updated, error: updateError } = await admin.from("kyc_submissions").update({
      provider_job_id: reference,
      provider_reference: reference,
      provider_status: mapped.provider_status,
      ai_recommendation: mapped.ai_recommendation,
      ai_screening_status: mapped.ai_screening_status,
      ai_summary: mapped.ai_summary,
      ai_source: "prembly",
      ai_screened_at: new Date().toISOString(),
      ai_extracted_data: {
        provider: "prembly",
        response_code: providerResponse.response_code ?? null,
        endpoint_name: providerResponse.endpoint_name ?? null,
      },
    }).eq("id", submissionId).select("*").single();
    if (updateError) throw new HttpError(500, updateError.message);
    return jsonResponse(200, { ok: true, submission: updated }, req);
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse(error.status, { error: error.message }, req);
    console.error("kyc-prembly-verify error:", error);
    return jsonResponse(500, { error: "Unable to submit Prembly verification" }, req);
  }
});
