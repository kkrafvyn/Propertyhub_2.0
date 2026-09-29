import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { recordWebhookEvent } from "../_shared/audit-log.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  confirmSmileSignature,
  getSmileWebhookSignatureHeaders,
  mapSmileResult,
  resolveSmileConfig,
} from "../_shared/smile-identity.ts";

const MAX_CALLBACK_AGE_MS = 15 * 60 * 1000;

function isFreshCallbackTimestamp(timestamp: string) {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return false;
  const age = Date.now() - parsed;
  return age >= -60_000 && age <= MAX_CALLBACK_AGE_MS;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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

    const rawBody = await req.text();
    if (!rawBody || rawBody.length > 1_500_000) {
      throw new HttpError(400, "Invalid or oversized webhook payload");
    }
    const payload = JSON.parse(rawBody) as Record<string, unknown> | null;
    if (!payload) {
      throw new HttpError(400, "Invalid webhook payload");
    }

    const { timestamp, signature } = getSmileWebhookSignatureHeaders(req.headers);
    if (!timestamp || !signature) {
      throw new HttpError(401, "Missing Smile Identity webhook signature");
    }
    if (!isFreshCallbackTimestamp(timestamp)) {
      throw new HttpError(401, "Expired or invalid Smile Identity webhook timestamp");
    }
    const valid = await confirmSmileSignature(
      config.partnerId,
      config.apiKey,
      timestamp,
      signature,
    );
    if (!valid) {
      throw new HttpError(401, "Invalid Smile Identity webhook signature");
    }

    const partnerParams =
      (payload.partner_params as Record<string, unknown> | undefined) ||
      (payload.PartnerParams as Record<string, unknown> | undefined) ||
      {};
    const submissionId = String(partnerParams.job_id ?? partnerParams.jobId ?? "").trim();
    const partnerUserId = String(partnerParams.user_id ?? partnerParams.userId ?? "").trim();
    if (!submissionId) {
      throw new HttpError(400, "Missing partner_params.job_id");
    }

    const admin = createAdminClient();
    const { data: submission, error: submissionError } = await admin
      .from("kyc_submissions")
      .select("id, user_id, provider_engine, provider_job_id, provider_status")
      .eq("id", submissionId)
      .maybeSingle();
    if (submissionError) {
      throw new HttpError(500, "Unable to validate KYC submission");
    }
    if (!submission || submission.provider_engine !== "smile-identity" || submission.provider_status !== "processing") {
      throw new HttpError(409, "KYC submission is not awaiting a Smile Identity callback");
    }
    if (!partnerUserId || partnerUserId !== submission.user_id) {
      throw new HttpError(401, "Smile Identity callback user binding is invalid");
    }

    const callbackProviderJobId = String(payload.smile_job_id ?? payload.SmileJobID ?? "").trim();
    if (callbackProviderJobId && submission.provider_job_id && callbackProviderJobId !== submission.provider_job_id) {
      throw new HttpError(401, "Smile Identity callback job binding is invalid");
    }

    const replay = await recordWebhookEvent({
      provider: "smile-identity",
      eventId: await sha256Hex(rawBody),
      reference: submissionId,
    });
    if (replay.duplicate) {
      return jsonResponse(200, { ok: true, duplicate: true, submissionId });
    }

    const mapped = mapSmileResult(payload);

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
      .select("id")
      .single();

    if (error) {
      console.error("KYC webhook database update failed:", error.message);
      throw new HttpError(500, "Unable to process verification result");
    }

    return jsonResponse(200, { ok: true, submissionId: updated.id });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error("kyc-smile-webhook error:", error);
    return jsonResponse(500, { error: "Unable to process Smile Identity webhook" });
  }
});
