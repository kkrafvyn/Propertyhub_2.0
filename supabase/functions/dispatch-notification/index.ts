import { createClient } from "supabase";
import webpush from "web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotificationChannel = "email" | "sms" | "push" | "in_app" | "whatsapp";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizePhoneNumber(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("+") ? trimmed : trimmed;
}

function normalizeWhatsAppNumber(phone: string) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return "";
  return normalized.startsWith("whatsapp:") ? normalized : `whatsapp:${normalized}`;
}

function getRequestBodyValue(body: unknown, key: string) {
  if (!body || typeof body !== "object") return undefined;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_EMAIL_FROM");
  const replyTo = Deno.env.get("NOTIFICATION_EMAIL_REPLY_TO");

  if (!resendApiKey || !from) {
    return { success: false, error: "Email provider is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      reply_to: replyTo || undefined,
    }),
  });

  if (!response.ok) {
    return {
      success: false,
      error: await response.text(),
    };
  }

  return { success: true };
}

async function sendTwilioMessage(params: {
  to: string;
  from: string;
  body: string;
}) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!accountSid || !authToken) {
    return { success: false, error: "Twilio is not configured" };
  }

  const encoded = new URLSearchParams({
    To: params.to,
    From: params.from,
    Body: params.body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: encoded.toString(),
    }
  );

  if (!response.ok) {
    return {
      success: false,
      error: await response.text(),
    };
  }

  return { success: true };
}

function parseSubscriptionKey(raw: string | null) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as
      | { p256dh?: string; auth?: string; keys?: { p256dh?: string; auth?: string } }
      | null;

    if (!parsed) return null;

    const p256dh = parsed.p256dh || parsed.keys?.p256dh;
    const auth = parsed.auth || parsed.keys?.auth;

    if (!p256dh || !auth) return null;

    return {
      p256dh,
      auth,
    };
  } catch {
    return null;
  }
}

async function sendPushNotifications(params: {
  adminClient: ReturnType<typeof createClient>;
  userId: string;
  subject: string;
  content: string;
  actionUrl?: string | null;
  notificationId: string;
}) {
  const vapidPublicKey = Deno.env.get("WEB_PUSH_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("WEB_PUSH_PRIVATE_KEY");
  const vapidContactEmail =
    Deno.env.get("WEB_PUSH_CONTACT_EMAIL") || "mailto:support@propertyhub.app";

  if (!vapidPublicKey || !vapidPrivateKey) {
    return { success: false, error: "Web push is not configured" };
  }

  webpush.setVapidDetails(vapidContactEmail, vapidPublicKey, vapidPrivateKey);

  const { data: devices, error: devicesError } = await params.adminClient
    .from("mobile_devices")
    .select("id")
    .eq("user_id", params.userId);

  if (devicesError) {
    return { success: false, error: devicesError.message };
  }

  const deviceIds = (devices || []).map((device) => device.id);
  if (deviceIds.length === 0) {
    return { success: false, error: "No registered devices for this user" };
  }

  const { data: subscriptions, error: subscriptionsError } = await params.adminClient
    .from("push_subscriptions")
    .select("id, subscription_endpoint, subscription_key")
    .in("device_id", deviceIds)
    .eq("active", true);

  if (subscriptionsError) {
    return { success: false, error: subscriptionsError.message };
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { success: false, error: "No active push subscriptions for this user" };
  }

  const payload = JSON.stringify({
    title: params.subject,
    body: params.content,
    url: params.actionUrl || "/app/messages",
    notificationId: params.notificationId,
  });

  let delivered = 0;

  for (const subscription of subscriptions) {
    const keys = parseSubscriptionKey(subscription.subscription_key);

    if (!subscription.subscription_endpoint || !keys) {
      continue;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.subscription_endpoint,
          keys,
        },
        payload
      );
      delivered += 1;
    } catch (error) {
      const statusCode =
        error && typeof error === "object" && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;

      if (statusCode === 404 || statusCode === 410) {
        await params.adminClient
          .from("push_subscriptions")
          .update({ active: false })
          .eq("id", subscription.id);
      }

      console.error("Push delivery failed:", error);
    }
  }

  return delivered > 0
    ? { success: true }
    : { success: false, error: "No push subscriptions accepted the message" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing Supabase environment configuration" });
  }

  if (!authHeader) {
    return jsonResponse(401, { error: "Missing authorization header" });
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: "You must be signed in to dispatch notifications" });
  }

  const requestBody = await req.json().catch(() => null);
  const notificationId = getRequestBodyValue(requestBody, "notificationId");

  if (!notificationId) {
    return jsonResponse(400, { error: "notificationId is required" });
  }

  const { data: notification, error: notificationError } = await adminClient
    .from("notification_logs")
    .select("*")
    .eq("id", notificationId)
    .maybeSingle();

  if (notificationError || !notification) {
    return jsonResponse(404, {
      error: notificationError?.message || "Notification not found",
    });
  }

  if (notification.delivered) {
    return jsonResponse(200, { success: true, alreadyDelivered: true });
  }

  let authorized = notification.user_id === user.id;

  if (
    !authorized &&
    notification.actor_user_id === user.id &&
    notification.conversation_id
  ) {
    const { data: conversation } = await adminClient
      .from("conversations")
      .select("participant_1_id, participant_2_id")
      .eq("id", notification.conversation_id)
      .maybeSingle();

    if (conversation) {
      const participants = [conversation.participant_1_id, conversation.participant_2_id];
      authorized = participants.includes(user.id) && participants.includes(notification.user_id);
    }
  }

  if (!authorized) {
    return jsonResponse(403, { error: "You are not allowed to dispatch this notification" });
  }

  if (!notification.channel || notification.channel === "in_app") {
    return jsonResponse(400, { error: "This function only dispatches external channels" });
  }

  const { data: recipient, error: recipientError } = await adminClient
    .from("users")
    .select("email, phone")
    .eq("id", notification.user_id)
    .maybeSingle();

  if (recipientError || !recipient) {
    return jsonResponse(404, {
      error: recipientError?.message || "Notification recipient not found",
    });
  }

  const channel = notification.channel as NotificationChannel;
  const subject = notification.subject || "Property Hub notification";
  const content = notification.content || "You have a new update in Property Hub.";

  let deliveryResult:
    | { success: boolean; error?: string }
    | { success: boolean };

  switch (channel) {
    case "email":
      if (!recipient.email) {
        deliveryResult = { success: false, error: "Recipient has no email address" };
        break;
      }
      deliveryResult = await sendEmail({
        to: recipient.email,
        subject,
        text: content,
      });
      break;
    case "sms": {
      const from = Deno.env.get("TWILIO_SMS_FROM");
      if (!recipient.phone || !from) {
        deliveryResult = {
          success: false,
          error: "SMS recipient or sender number is missing",
        };
        break;
      }
      deliveryResult = await sendTwilioMessage({
        to: normalizePhoneNumber(recipient.phone),
        from: normalizePhoneNumber(from),
        body: content,
      });
      break;
    }
    case "whatsapp": {
      const from = Deno.env.get("TWILIO_WHATSAPP_FROM");
      if (!recipient.phone || !from) {
        deliveryResult = {
          success: false,
          error: "WhatsApp recipient or sender is missing",
        };
        break;
      }
      deliveryResult = await sendTwilioMessage({
        to: normalizeWhatsAppNumber(recipient.phone),
        from: normalizeWhatsAppNumber(from),
        body: content,
      });
      break;
    }
    case "push":
      deliveryResult = await sendPushNotifications({
        adminClient,
        userId: notification.user_id,
        subject,
        content,
        actionUrl: notification.action_url,
        notificationId: notification.id,
      });
      break;
    default:
      deliveryResult = { success: false, error: "Unsupported notification channel" };
      break;
  }

  if (!deliveryResult.success) {
    return jsonResponse(200, {
      success: false,
      error: deliveryResult.error || "Delivery failed",
    });
  }

  await adminClient
    .from("notification_logs")
    .update({
      delivered: true,
      delivered_at: new Date().toISOString(),
    })
    .eq("id", notification.id);

  return jsonResponse(200, { success: true });
});
