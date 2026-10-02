export type ParsedWhatsAppMessage = {
  messageId: string;
  from: string;
  senderName?: string;
  text: string;
  messageType: string;
  groupId?: string | null;
  isGroup: boolean;
  phoneNumberId?: string;
  timestamp: string;
};

export type WhatsAppIntegrationConfig = {
  organizationId: string;
  phoneNumberId?: string;
  accessToken?: string;
};

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function parseWhatsAppWebhookPayload(body: Record<string, unknown>): ParsedWhatsAppMessage[] {
  const entries = (body.entry as Array<Record<string, unknown>>) || [];
  const messages: ParsedWhatsAppMessage[] = [];

  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>>) || [];
    for (const change of changes) {
      const value = (change.value as Record<string, unknown>) || {};
      const phoneNumberId = value.metadata
        ? String((value.metadata as Record<string, unknown>).phone_number_id || "")
        : "";
      const contacts = (value.contacts as Array<Record<string, unknown>>) || [];
      const contactName = contacts[0]?.profile
        ? String((contacts[0].profile as Record<string, unknown>).name || "")
        : "";

      for (const raw of (value.messages as Array<Record<string, unknown>>) || []) {
        const from = normalizePhone(String(raw.from || ""));
        const context = raw.context as Record<string, unknown> | undefined;
        const groupId = context?.group_id ? String(context.group_id) : null;
        const messageType = String(raw.type || "text");
        let text = "";

        if (messageType === "text") {
          text = String((raw.text as Record<string, unknown>)?.body || "");
        } else if (messageType === "button") {
          text = String((raw.button as Record<string, unknown>)?.text || "");
        } else if (messageType === "interactive") {
          const interactive = raw.interactive as Record<string, unknown>;
          text = String(
            (interactive?.button_reply as Record<string, unknown>)?.title ||
              (interactive?.list_reply as Record<string, unknown>)?.title ||
              ""
          );
        } else {
          text = `[${messageType} message]`;
        }

        if (!from || !text.trim()) continue;

        messages.push({
          messageId: String(raw.id || ""),
          from,
          senderName: contactName || undefined,
          text: text.trim(),
          messageType,
          groupId,
          isGroup: Boolean(groupId),
          phoneNumberId: phoneNumberId || undefined,
          timestamp: String(raw.timestamp || Date.now()),
        });
      }
    }
  }

  return messages;
}

export async function verifyWhatsAppWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined
): Promise<boolean> {
  if (!appSecret) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = await hmacSha256Hex(appSecret, rawBody);
  const received = signatureHeader.slice("sha256=".length).trim().toLowerCase();
  return received.length === expected.length &&
    received.split("").every((char, index) => char === expected[index]);
}

export async function sendWhatsAppTextMessage(input: {
  to: string;
  text: string;
  phoneNumberId?: string;
  accessToken?: string;
}): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
  const token = input.accessToken || Deno.env.get("WHATSAPP_CLOUD_TOKEN");
  const phoneNumberId = input.phoneNumberId || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!token || !phoneNumberId) {
    throw new Error("WhatsApp Cloud API is not configured");
  }

  const baseUrl = (Deno.env.get("WHATSAPP_GRAPH_URL") || "https://graph.facebook.com/v21.0").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: input.to.includes("@g.us") || input.to.length > 15 ? "group" : "individual",
      to: input.to,
      type: "text",
      text: { preview_url: true, body: input.text },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`WhatsApp send failed: ${detail.slice(0, 240)}`);
  }

  const result = await response.json();
  return {
    success: true,
    messageId: String(result.messages?.[0]?.id || ""),
  };
}

type AdminClient = ReturnType<typeof import("./supabase.ts").createAdminClient>;

export async function resolveWhatsAppCredentialsForOrg(
  admin: AdminClient,
  organizationId: string
): Promise<WhatsAppIntegrationConfig | null> {
  const { data: row, error } = await admin
    .from("organization_integrations")
    .select("organization_id, config, status")
    .eq("organization_id", organizationId)
    .eq("catalog_slug", "whatsapp-business")
    .in("status", ["connected", "available"])
    .maybeSingle();

  if (error) {
    console.error("resolveWhatsAppCredentialsForOrg:", error);
  }

  if (row) {
    const cfg = (row.config || {}) as Record<string, unknown>;
    const phoneNumberId = String(cfg.phone_number_id || cfg.phoneNumberId || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "");
    const accessToken = String(
      cfg.access_token || cfg.accessToken || Deno.env.get("WHATSAPP_CLOUD_TOKEN") || ""
    );
    if (phoneNumberId && accessToken) {
      return { organizationId, phoneNumberId, accessToken };
    }
  }

  const fallbackOrgId = Deno.env.get("WHATSAPP_DEFAULT_ORG_ID");
  if (fallbackOrgId && fallbackOrgId === organizationId) {
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || undefined;
    const accessToken = Deno.env.get("WHATSAPP_CLOUD_TOKEN") || undefined;
    if (phoneNumberId && accessToken) {
      return { organizationId, phoneNumberId, accessToken };
    }
  }

  return null;
}

export async function resolveOrganizationByPhoneNumberId(
  admin: AdminClient,
  phoneNumberId: string | undefined
): Promise<WhatsAppIntegrationConfig | null> {
  if (!phoneNumberId) return null;

  const { data: rows, error } = await admin
    .from("organization_integrations")
    .select("organization_id, config, status")
    .eq("catalog_slug", "whatsapp-business")
    .in("status", ["connected", "available"]);

  if (error) {
    console.error("resolveOrganizationByPhoneNumberId:", error);
  }

  const match = (rows || []).find((row) => {
    const cfg = (row.config || {}) as Record<string, unknown>;
    const configuredId = String(cfg.phone_number_id || cfg.phoneNumberId || "");
    return !configuredId || configuredId === phoneNumberId;
  }) as { organization_id: string; config: Record<string, unknown> } | undefined;

  if (match) {
    return {
      organizationId: match.organization_id,
      phoneNumberId,
      accessToken: String(
        match.config?.access_token || match.config?.accessToken || Deno.env.get("WHATSAPP_CLOUD_TOKEN") || ""
      ),
    };
  }

  const fallbackOrgId = Deno.env.get("WHATSAPP_DEFAULT_ORG_ID");
  if (fallbackOrgId) {
    return {
      organizationId: fallbackOrgId,
      phoneNumberId,
      accessToken: Deno.env.get("WHATSAPP_CLOUD_TOKEN") || undefined,
    };
  }

  return null;
}
