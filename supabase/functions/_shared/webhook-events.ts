import { HttpError } from "./http.ts";

export async function beginWebhookEvent(input: {
  admin: any;
  provider: "paystack" | "stripe" | "flutterwave";
  providerEventId: string;
  eventType: string;
  signatureVerified: boolean;
  rawPayload: Record<string, unknown>;
}) {
  const { data: existing, error: existingError } = await input.admin
    .from("payment_webhook_events")
    .select("*")
    .eq("provider", input.provider)
    .eq("provider_event_id", input.providerEventId)
    .maybeSingle();

  if (existingError) {
    throw new HttpError(500, existingError.message);
  }

  if (existing) {
    return {
      row: existing,
      alreadyReceived: true,
      alreadyProcessed: ["processed", "ignored"].includes(existing.processing_status),
    };
  }

  const { data, error } = await input.admin
    .from("payment_webhook_events")
    .insert({
      provider: input.provider,
      provider_event_id: input.providerEventId,
      event_type: input.eventType,
      signature_verified: input.signatureVerified,
      processing_status: "received",
      raw_payload: input.rawPayload,
    })
    .select("*")
    .single();

  if (error) {
    throw new HttpError(500, error.message);
  }

  return {
    row: data,
    alreadyReceived: false,
    alreadyProcessed: false,
  };
}

export async function finishWebhookEvent(input: {
  admin: any;
  id: string;
  status: "processed" | "ignored" | "failed";
  processedPayload?: Record<string, unknown>;
  errorMessage?: string | null;
}) {
  const { data, error } = await input.admin
    .from("payment_webhook_events")
    .update({
      processing_status: input.status,
      processed_payload: input.processedPayload || {},
      error_message: input.errorMessage || null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw new HttpError(500, error.message);
  }

  return data;
}
