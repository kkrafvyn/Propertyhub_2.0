import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";
import { enforceRateLimit, rateLimitKey } from "../_shared/rate-limit.ts";
import { sendSms, sendOtp, verifyOtp } from "../_shared/arkesel.ts";
import { requireAuthenticatedUser, createAdminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { user } = await requireAuthenticatedUser(authHeader);

    await enforceRateLimit({
      bucket: rateLimitKey("sms-send", user.id),
      maxHits: 50,
      windowSeconds: 60,
    });

    const body = await req.json().catch(() => null);
    if (!body) {
      throw new HttpError(400, "Invalid JSON body");
    }

    const {
      action = "send_sms", // 'send_sms' | 'send_otp' | 'verify_otp'
      to,                   // Ghana phone string or array of phones
      message,              // SMS body
      code,                 // OTP verification code
      passId,               // Optional visitor pass ID
      invoiceId,            // Optional utility invoice ID
      expiry = 5,
    } = body;

    const admin = createAdminClient();

    if (action === "send_otp") {
      if (!to || typeof to !== "string") {
        throw new HttpError(400, "Phone number is required for OTP");
      }

      const result = await sendOtp({
        to,
        expiry: Number(expiry) || 5,
        placeholder: message || "Your BaytMiftah verification code is %otp_code%. Valid for 5 minutes.",
      });

      return jsonResponse(200, { success: true, action: "send_otp", ...result }, req);
    }

    if (action === "verify_otp") {
      if (!to || !code) {
        throw new HttpError(400, "Phone and code are required to verify OTP");
      }

      const result = await verifyOtp({ to: String(to), code: String(code) });
      return jsonResponse(200, { action: "verify_otp", ...result }, req);
    }

    // Default: 'send_sms'
    if (!to) {
      throw new HttpError(400, "Recipient phone number(s) required");
    }
    if (!message || typeof message !== "string") {
      throw new HttpError(400, "Message body is required");
    }

    const result = await sendSms({
      to,
      message,
      type: "transactional",
    });

    // If linked to visitor pass, update sms_sent status
    if (passId) {
      await admin
        .from("estate_visitor_passes")
        .update({
          sms_sent: true,
          sms_reference: result.reference,
        })
        .eq("id", passId);
    }

    return jsonResponse(
      200,
      {
        success: true,
        action: "send_sms",
        reference: result.reference,
        recipients: result.recipients,
        status: result.status,
      },
      req
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }

    console.error("send-sms error:", error);
    return jsonResponse(500, { error: safeErrorMessage(error, "Failed to send SMS") }, req);
  }
});
