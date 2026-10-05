/** Stable dedupe key for WhatsApp inbound messages when Meta omits wa_message_id. */
export function resolveWhatsAppDedupeId(input: {
  messageId?: string | null;
  organizationId: string;
  senderPhone?: string | null;
  messageText?: string | null;
  timestamp?: string | null;
}): string | null {
  const trimmed = input.messageId?.trim();
  if (trimmed) return trimmed;

  const org = input.organizationId?.trim();
  const sender = (input.senderPhone || "unknown").trim();
  const body = (input.messageText || "").trim().slice(0, 512);
  const ts = (input.timestamp || "").trim();
  if (!org || (!body && !ts)) return null;

  const raw = `${org}|${sender}|${ts}|${body}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `syn:${org}:${Math.abs(hash).toString(36)}`;
}
