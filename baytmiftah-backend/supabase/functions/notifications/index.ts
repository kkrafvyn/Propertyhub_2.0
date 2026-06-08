import { getSupabaseClient, isAdmin, verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { asString, assertUserTarget, requireObject } from "../_shared/security.ts";

function missingTable(error: any) {
  return ["PGRST205", "42P01"].includes(error?.code);
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { skipped: true, reason: "RESEND_API_KEY missing" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("NOTIFICATION_FROM_EMAIL") || "BaytMiftah <notifications@baytmiftah.com>",
      to,
      subject,
      html,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || "Email send failed");
  return payload;
}

async function sendSms(to: string, message: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!sid || !token || !from) return { skipped: true, reason: "Twilio env missing" };
  const body = new URLSearchParams({ To: to, From: from, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || "SMS send failed");
  return payload;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "dispatch";
    const user = await verifyToken(req.headers.get("Authorization") || undefined);

    if (req.method === "POST" && action === "dispatch") {
      const body = requireObject(await req.json());
      const targetUserId = assertUserTarget(user, body.userId || body.user_id);
      const emailTo = asString(body.emailTo);
      const smsTo = asString(body.smsTo);

      if (emailTo && emailTo !== user.email && !isAdmin(user)) {
        return errorResponse("Cannot send email to another recipient", 403);
      }
      if (smsTo && !isAdmin(user)) {
        return errorResponse("SMS dispatch requires admin access", 403);
      }

      const payload = {
        user_id: targetUserId,
        organization_id: asString(body.organizationId || body.organization_id) || null,
        category: asString(body.category) || "system",
        title: asString(body.title) || "BaytMiftah notification",
        body: asString(body.body || body.message) || null,
        action_url: asString(body.actionUrl || body.action_url) || null,
        metadata: body.metadata || {},
      };

      const { data, error } = await supabase.from("notifications").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;

      const deliveries = [];
      if (emailTo) deliveries.push({ channel: "email", result: await sendEmail(emailTo, payload.title, payload.body || payload.title) });
      if (smsTo) deliveries.push({ channel: "sms", result: await sendSms(smsTo, payload.body || payload.title) });

      return jsonResponse({ notification: data || payload, deliveries }, error ? 200 : 201);
    }

    if (req.method === "GET" && action === "list") {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || []);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Notification function failed", 400);
  }
});
