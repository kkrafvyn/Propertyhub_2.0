import { jsonResponse } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  getPremblyReference,
  getPremblySubmissionId,
  mapPremblyResult,
  verifyPremblyWebhookSignature,
} from "../_shared/prembly.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, req);
  const rawBody = await req.text();
  const signature = req.headers.get("x-prembly-signature")?.trim() || "";
  const token = req.headers.get("token")?.trim() || "";
  const publicKey = Deno.env.get("PREMBLY_PUBLIC_KEY")?.trim() || "";
  if (!token || !await verifyPremblyWebhookSignature(rawBody, signature, publicKey)) {
    return jsonResponse(401, { error: "Invalid Prembly webhook signature" }, req);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON payload" }, req);
  }
  const submissionId = getPremblySubmissionId(payload);
  if (!submissionId) return jsonResponse(400, { error: "Missing submission metadata" }, req);

  const admin = createAdminClient();
  const { error: eventError } = await admin.from("kyc_provider_webhook_events").insert({
    provider: "prembly",
    event_token: token,
    submission_id: submissionId,
  });
  if (eventError) {
    if (eventError.code === "23505") return jsonResponse(200, { ok: true, duplicate: true }, req);
    console.error("Unable to record Prembly webhook token", eventError);
    return jsonResponse(500, { error: "Unable to record webhook" }, req);
  }

  const { data: submission, error: lookupError } = await admin.from("kyc_submissions")
    .select("id,provider_engine").eq("id", submissionId).maybeSingle();
  if (lookupError || !submission || submission.provider_engine !== "prembly") {
    return jsonResponse(409, { error: "Prembly submission not found" }, req);
  }
  const eventData = payload.data && typeof payload.data === "object"
    ? payload.data as Record<string, unknown>
    : payload;
  const resultPayload = eventData.verification_response && typeof eventData.verification_response === "object"
    ? eventData.verification_response as Record<string, unknown>
    : eventData;
  const mapped = mapPremblyResult(resultPayload);
  const reference = getPremblyReference(resultPayload);
  const { error: updateError } = await admin.from("kyc_submissions").update({
    status: "in_review",
    provider_status: mapped.provider_status,
    provider_reference: reference,
    provider_job_id: reference,
    ai_recommendation: mapped.ai_recommendation,
    ai_screening_status: mapped.ai_screening_status,
    ai_summary: mapped.ai_summary,
    ai_source: "prembly-widget",
    ai_screened_at: new Date().toISOString(),
  }).eq("id", submissionId);
  if (updateError) return jsonResponse(500, { error: "Unable to update KYC submission" }, req);
  return jsonResponse(200, { ok: true }, req);
});
