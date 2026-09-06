import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";
import {
  isSmileConfigured,
  mapDocumentTypeToSmileIdType,
  submitSmileAsyncIdVerification,
} from "../_shared/smile-identity.ts";

function splitName(fullName?: string | null) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(" ") || parts[0] || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    if (!isSmileConfigured()) {
      return jsonResponse(503, {
        error: "Smile Identity is not configured",
        configured: false,
      });
    }

    const authHeader = req.headers.get("Authorization");
    const { user } = await requireAuthenticatedUser(authHeader);
    const body = await req.json().catch(() => null);
    const submissionId =
      typeof body?.submissionId === "string" ? body.submissionId.trim() : "";

    if (!submissionId) {
      throw new HttpError(400, "submissionId is required");
    }

    const admin = createAdminClient();
    const { data: submission, error: submissionError } = await admin
      .from("kyc_submissions")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) {
      throw new HttpError(500, submissionError.message);
    }
    if (!submission) {
      throw new HttpError(404, "KYC submission not found");
    }
    if (submission.user_id !== user.id) {
      throw new HttpError(403, "You can only verify your own submission");
    }
    if (!submission.document_number?.trim()) {
      throw new HttpError(400, "Document number is required for Smile Identity verification");
    }

    const jurisdiction = (submission.jurisdiction_id || "GH").toUpperCase();
    const idType = mapDocumentTypeToSmileIdType(submission.document_type, jurisdiction);
    const { firstName, lastName } = splitName(submission.full_name);

    await admin
      .from("kyc_submissions")
      .update({
        provider_engine: "smile-identity",
        provider_status: "submitted",
        status: "in_review",
      })
      .eq("id", submissionId);

    const providerResponse = await submitSmileAsyncIdVerification({
      country: jurisdiction,
      idType,
      idNumber: submission.document_number.trim(),
      firstName,
      lastName,
      dob: submission.date_of_birth,
      jobId: submissionId,
      userId: submission.user_id,
    });

    const smileJobId =
      typeof providerResponse.smile_job_id === "string"
        ? providerResponse.smile_job_id
        : typeof providerResponse.job_id === "string"
          ? providerResponse.job_id
          : submissionId;

    const { data: updated, error: updateError } = await admin
      .from("kyc_submissions")
      .update({
        provider_job_id: smileJobId,
        provider_reference: smileJobId,
        provider_status: "processing",
        ai_summary: "Smile Identity verification submitted. Awaiting provider callback.",
        ai_extracted_data: {
          provider: "smile-identity",
          id_type: idType,
          country: jurisdiction,
          provider_response: providerResponse,
        },
      })
      .eq("id", submissionId)
      .select("*")
      .single();

    if (updateError) {
      throw new HttpError(500, updateError.message);
    }

    return jsonResponse(200, { ok: true, submission: updated, providerResponse });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error("kyc-smile-verify error:", error);
    return jsonResponse(500, { error: "Unable to submit Smile Identity verification" });
  }
});
