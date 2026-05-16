import { createClient } from "supabase";
import webpush from "web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotificationChannel = "email" | "sms" | "push" | "in_app" | "whatsapp";
type ParsedPushSubscription =
  | { kind: "web"; p256dh: string; auth: string }
  | { kind: "native"; provider: "apns" | "fcm"; token: string };

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

function parseSubscriptionKey(raw: string | null): ParsedPushSubscription | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as
      | {
          p256dh?: string;
          auth?: string;
          keys?: { p256dh?: string; auth?: string };
          provider?: string;
          token?: string;
        }
      | null;

    if (!parsed) return null;

    if (
      parsed.token &&
      (parsed.provider === "apns" || parsed.provider === "fcm")
    ) {
      return {
        kind: "native",
        provider: parsed.provider,
        token: parsed.token,
      };
    }

    const p256dh = parsed.p256dh || parsed.keys?.p256dh;
    const auth = parsed.auth || parsed.keys?.auth;

    if (!p256dh || !auth) return null;

    return {
      kind: "web",
      p256dh,
      auth,
    };
  } catch {
    return null;
  }
}

async function sendFcmNotification(params: {
  token: string;
  title: string;
  body: string;
  url: string;
  notificationId: string;
}) {
  const projectId = Deno.env.get("FCM_PROJECT_ID");
  const accessToken = Deno.env.get("FCM_ACCESS_TOKEN");
  const serverKey = Deno.env.get("FCM_SERVER_KEY");

  if (projectId && accessToken) {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: params.token,
            notification: {
              title: params.title,
              body: params.body,
            },
            data: {
              url: params.url,
              notificationId: params.notificationId,
            },
            android: {
              notification: {
                click_action: "OPEN_PROPERTY_HUB",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                },
              },
            },
          },
        }),
      }
    );

    return {
      ok: response.ok,
      status: response.status,
      error: response.ok ? undefined : await response.text(),
    };
  }

  if (serverKey) {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${serverKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: params.token,
        notification: {
          title: params.title,
          body: params.body,
        },
        data: {
          url: params.url,
          notificationId: params.notificationId,
        },
      }),
    });

    return {
      ok: response.ok,
      status: response.status,
      error: response.ok ? undefined : await response.text(),
    };
  }

  return {
    ok: false,
    status: 0,
    error: "FCM is not configured",
  };
}

async function sendApnsNotification(params: {
  token: string;
  title: string;
  body: string;
  url: string;
  notificationId: string;
}) {
  const bearerToken = Deno.env.get("APNS_BEARER_TOKEN");
  const bundleId = Deno.env.get("APNS_BUNDLE_ID");
  const useSandbox = Deno.env.get("APNS_USE_SANDBOX") === "true";
  const host = useSandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com";

  if (!bearerToken || !bundleId) {
    return {
      ok: false,
      status: 0,
      error: "APNS is not configured",
    };
  }

  const response = await fetch(`https://${host}/3/device/${params.token}`, {
    method: "POST",
    headers: {
      Authorization: `bearer ${bearerToken}`,
      "Content-Type": "application/json",
      "apns-topic": bundleId,
      "apns-push-type": "alert",
    },
    body: JSON.stringify({
      aps: {
        alert: {
          title: params.title,
          body: params.body,
        },
        sound: "default",
      },
      url: params.url,
      notificationId: params.notificationId,
    }),
  });

  return {
    ok: response.ok,
    status: response.status,
    error: response.ok ? undefined : await response.text(),
  };
}

async function deactivatePushSubscription(
  adminClient: ReturnType<typeof createClient>,
  subscriptionId: string
) {
  await adminClient
    .from("push_subscriptions")
    .update({ active: false })
    .eq("id", subscriptionId);
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
    Deno.env.get("WEB_PUSH_CONTACT_EMAIL") || "mailto:support@baytmiftah.app";
  const hasWebPushConfig = Boolean(vapidPublicKey && vapidPrivateKey);

  if (hasWebPushConfig) {
    webpush.setVapidDetails(vapidContactEmail, vapidPublicKey!, vapidPrivateKey!);
  }

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

  const payload = {
    title: params.subject,
    body: params.content,
    url: params.actionUrl || "/app/messages",
    notificationId: params.notificationId,
  };

  let delivered = 0;
  let skipped = 0;

  for (const subscription of subscriptions) {
    const parsedSubscription = parseSubscriptionKey(subscription.subscription_key);

    if (!subscription.subscription_endpoint || !parsedSubscription) {
      skipped += 1;
      continue;
    }

    try {
      if (parsedSubscription.kind === "web") {
        if (!hasWebPushConfig) {
          skipped += 1;
          continue;
        }

        await webpush.sendNotification(
          {
            endpoint: subscription.subscription_endpoint,
            keys: {
              p256dh: parsedSubscription.p256dh,
              auth: parsedSubscription.auth,
            },
          },
          JSON.stringify(payload)
        );
        delivered += 1;
        continue;
      }

      const nativeDelivery =
        parsedSubscription.provider === "apns"
          ? await sendApnsNotification({
              token: parsedSubscription.token,
              title: payload.title,
              body: payload.body,
              url: payload.url,
              notificationId: payload.notificationId,
            })
          : await sendFcmNotification({
              token: parsedSubscription.token,
              title: payload.title,
              body: payload.body,
              url: payload.url,
              notificationId: payload.notificationId,
            });

      if (nativeDelivery.ok) {
        delivered += 1;
        continue;
      }

      if ([400, 404, 410].includes(nativeDelivery.status)) {
        await deactivatePushSubscription(params.adminClient, subscription.id);
      }

      console.error("Native push delivery failed:", nativeDelivery.error);
    } catch (error) {
      const statusCode =
        error && typeof error === "object" && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;

      if (statusCode === 404 || statusCode === 410) {
        await deactivatePushSubscription(params.adminClient, subscription.id);
      }

      console.error("Push delivery failed:", error);
    }
  }

  return delivered > 0
    ? { success: true }
    : {
        success: false,
        error:
          skipped === subscriptions.length
            ? "No configured push providers matched the active subscriptions"
            : "No push subscriptions accepted the message",
      };
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
  const subject = notification.subject || "BaytMiftah notification";
  const content = notification.content || "You have a new update in BaytMiftah.";

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
