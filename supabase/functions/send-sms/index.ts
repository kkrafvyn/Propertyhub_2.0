import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";
import { enforceRateLimit, rateLimitKey } from "../_shared/rate-limit.ts";
import { sendSms, sendOtp, verifyOtp } from "../_shared/arkesel.ts";
import {
  requireEstateMessagingMembership,
  requireVisitorPassInOrg,
} from "../_shared/org-auth.ts";
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
      action = "send_sms",
      to,
      message,
      code,
      passId,
      invoiceId,
      expiry = 5,
      organizationId: rawOrganizationId,
    } = body;

    const organizationId =
      typeof rawOrganizationId === "string" ? rawOrganizationId.trim() : "";

    const admin = createAdminClient();

    if (action === "send_otp") {
      if (!to || typeof to !== "string") {
        throw new HttpError(400, "Phone number is required for OTP");
      }
      if (!organizationId) throw new HttpError(400, "organizationId is required for OTP");
      await enforceRateLimit({
        bucket: rateLimitKey("sms-otp", user.id),
        maxHits: 5,
        windowSeconds: 3600,
      });
      await enforceRateLimit({
        bucket: rateLimitKey("sms-otp-target", to.replace(/\D/g, "")),
        maxHits: 3,
        windowSeconds: 3600,
      });
      await requireEstateMessagingMembership(admin, user.id, organizationId);
      const { data: accountPhone, error: phoneError } = await admin
        .from("users")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();
      if (phoneError || !accountPhone?.phone || String(accountPhone.phone).replace(/\D/g, "") !== to.replace(/\D/g, "")) {
        throw new HttpError(403, "OTP can only be sent to the phone number registered to your account");
      }

      const result = await sendOtp({
        to,
        expiry: Number(expiry) || 5,
        placeholder: message || "Your BaytMiftah verification code is %otp_code%. Valid for 5 minutes.",
      });

      return jsonResponse(200, { success: true, action: "send_otp", ...result }, req);
    }

    if (action === "verify_otp") {
      await enforceRateLimit({
        bucket: rateLimitKey("sms-otp-verify", user.id),
        maxHits: 10,
        windowSeconds: 900,
      });
      if (!to || !code) {
        throw new HttpError(400, "Phone and code are required to verify OTP");
      }

      const result = await verifyOtp({ to: String(to), code: String(code) });
      return jsonResponse(200, { action: "verify_otp", ...result }, req);
    }

    if (!organizationId) {
      throw new HttpError(400, "organizationId is required for estate SMS");
    }

    await requireEstateMessagingMembership(admin, user.id, organizationId);
    await enforceRateLimit({
      bucket: rateLimitKey("sms-send-org", organizationId),
      maxHits: 100,
      windowSeconds: 60,
    });

    if (!to) {
      throw new HttpError(400, "Recipient phone number(s) required");
    }
    const recipientCount = Array.isArray(to) ? to.length : 1;
    if (recipientCount < 1 || recipientCount > 10) {
      throw new HttpError(400, "Send to between one and ten recipients per request");
    }
    if (!message || typeof message !== "string") {
      throw new HttpError(400, "Message body is required");
    }

    if (passId) {
      await requireVisitorPassInOrg(admin, String(passId), organizationId);
    }

    if (invoiceId) {
      const { data: charge, error: chargeError } = await admin
        .from("unit_charges")
        .select("id, unit:estate_units(estate:managed_estates(organization_id))")
        .eq("id", String(invoiceId))
        .maybeSingle();

      if (chargeError) {
        throw new HttpError(500, chargeError.message);
      }

      const chargeOrgId = (
        charge?.unit as { estate?: { organization_id?: string } | null } | null
      )?.estate?.organization_id;

      if (!charge || chargeOrgId !== organizationId) {
        throw new HttpError(403, "Invoice does not belong to this organization");
      }
    }

    const result = await sendSms({
      to,
      message,
      type: "transactional",
    });

    if (passId) {
      await admin
        .from("estate_visitor_passes")
        .update({
          sms_sent: true,
          sms_reference: result.reference,
        })
        .eq("id", String(passId));
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
      req,
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }

    console.error("send-sms error:", error);
    return jsonResponse(500, { error: safeErrorMessage(error, "Failed to send SMS") }, req);
  }
});
