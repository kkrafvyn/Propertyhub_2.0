import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { confirmSmileSignature, resolveSmileConfig } from "../_shared/smile-identity.ts";

function mapSmileResult(payload: Record<string, unknown>) {
  const resultCode =
    payload.ResultCode ??
    payload.result_code ??
    payload.resultCode ??
    payload.code;
  const resultText = String(
    payload.ResultText ?? payload.result_text ?? payload.resultText ?? "",
  ).toLowerCase();

  const approved =
    resultCode === "1012" ||
    resultCode === 1012 ||
    resultText.includes("verified") ||
    resultText.includes("exact match");

  const rejected =
    resultCode === "1013" ||
    resultCode === 1013 ||
    resultText.includes("not verified") ||
    resultText.includes("no match") ||
    resultText.includes("failed");

  if (approved) {
    return {
      provider_status: "verified",
      ai_recommendation: "approve" as const,
      ai_screening_status: "completed" as const,
      ai_summary: "Smile Identity returned a verified match. Human review still recommended before final approval.",
    };
  }

  if (rejected) {
    return {
      provider_status: "rejected",
      ai_recommendation: "reject" as const,
      ai_screening_status: "completed" as const,
      ai_summary: "Smile Identity could not verify the submitted identity document.",
    };
  }

  return {
    provider_status: "review",
    ai_recommendation: "review" as const,
    ai_screening_status: "completed" as const,
    ai_summary: "Smile Identity returned an inconclusive result. Manual review required.",
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
    const config = resolveSmileConfig();
    if (!config) {
      throw new HttpError(503, "Smile Identity is not configured");
    }

    const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload) {
      throw new HttpError(400, "Invalid webhook payload");
    }

    const timestamp = String(payload.timestamp ?? "");
    const signature = String(payload.signature ?? "");
    if (timestamp && signature) {
      const valid = await confirmSmileSignature(
        config.partnerId,
        config.apiKey,
        timestamp,
        signature,
      );
      if (!valid) {
        throw new HttpError(401, "Invalid Smile Identity webhook signature");
      }
    }

    const partnerParams =
      (payload.partner_params as Record<string, unknown> | undefined) ||
      (payload.PartnerParams as Record<string, unknown> | undefined) ||
      {};
    const submissionId = String(partnerParams.job_id ?? partnerParams.jobId ?? "").trim();
    if (!submissionId) {
      throw new HttpError(400, "Missing partner_params.job_id");
    }

    const mapped = mapSmileResult(payload);
    const admin = createAdminClient();

    const { data: updated, error } = await admin
      .from("kyc_submissions")
      .update({
        ...mapped,
        ai_source: "smile-identity",
        ai_confidence_score:
          mapped.ai_recommendation === "approve"
            ? 92
            : mapped.ai_recommendation === "reject"
              ? 15
              : 55,
        ai_flags: Array.isArray(payload.Flags)
          ? payload.Flags
          : Array.isArray(payload.flags)
            ? payload.flags
            : [],
        ai_extracted_data: {
          provider: "smile-identity",
          webhook: payload,
        },
        ai_screened_at: new Date().toISOString(),
        provider_job_id: String(payload.smile_job_id ?? payload.SmileJobID ?? submissionId),
        status: "in_review",
      })
      .eq("id", submissionId)
      .select("*")
      .single();

    if (error) {
      throw new HttpError(500, error.message);
    }

    return jsonResponse(200, { ok: true, submission: updated });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error("kyc-smile-webhook error:", error);
    return jsonResponse(500, { error: "Unable to process Smile Identity webhook" });
  }
});
