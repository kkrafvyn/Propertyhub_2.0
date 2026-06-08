import { getSupabaseClient } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";

function safeHeader(req: Request, name: string) {
  return req.headers.get(name) || "";
}

async function verifyWebhook(req: Request, provider: string, rawBody: string) {
  if (provider === "stripe") {
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    const header = safeHeader(req, "stripe-signature");
    if (!header) throw new Error("Missing Stripe signature");
    const timestamp = header.split(",").find((part) => part.startsWith("t="))?.slice(2);
    const expected = header.split(",").find((part) => part.startsWith("v1="))?.slice(3);
    if (!timestamp || !expected) throw new Error("Invalid Stripe signature header");
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
    const hex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    if (hex !== expected) throw new Error("Invalid Stripe signature");
    return true;
  }

  if (provider === "paystack") {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured");
    const signature = safeHeader(req, "x-paystack-signature");
    if (!signature) throw new Error("Missing Paystack signature");
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const hex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    if (hex !== signature) throw new Error("Invalid Paystack signature");
    return true;
  }

  throw new Error("Unsupported provider");
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") return errorResponse("Method not allowed", 405);
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") || "stripe";
    const rawBody = await req.text();
    await verifyWebhook(req, provider, rawBody);
    const payload = JSON.parse(rawBody);

    const event = provider === "stripe"
      ? {
          provider,
          event_id: payload.id,
          event_type: payload.type,
          status: payload.type?.includes("completed") ? "paid" : "received",
          listing_id: payload.data?.object?.metadata?.listing_id || null,
          organization_id: payload.data?.object?.metadata?.organization_id || null,
          amount: Number(payload.data?.object?.amount_total || 0) / 100,
          currency: String(payload.data?.object?.currency || "GHS").toUpperCase(),
          raw_payload: payload,
        }
      : {
          provider,
          event_id: payload.data?.reference || payload.event,
          event_type: payload.event,
          status: payload.event === "charge.success" ? "paid" : "received",
          listing_id: payload.data?.metadata?.listing_id || null,
          organization_id: payload.data?.metadata?.organization_id || null,
          amount: Number(payload.data?.amount || 0) / 100,
          currency: payload.data?.currency || "GHS",
          raw_payload: payload,
        };

    const { data, error } = await supabase
      .from("payment_events")
      .upsert(event, { onConflict: "provider,event_id" })
      .select()
      .single();
    if (error) throw error;

    if (event.status === "paid" && event.organization_id) {
      await supabase.from("billing_history").insert([{
        organization_id: event.organization_id,
        provider,
        description: "Featured listing boost",
        amount: event.amount || 0,
        currency: event.currency || "GHS",
        status: "paid",
        metadata: { payment_event_id: data.id, listing_id: event.listing_id },
      }]);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    return errorResponse(error.message || "Webhook failed", 400);
  }
});
