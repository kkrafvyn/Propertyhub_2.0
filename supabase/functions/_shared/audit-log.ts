import { createAdminClient } from "./supabase.ts";

export async function writeServerAuditLog(input: {
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  const admin = createAdminClient();

  const { error } = await admin.from("audit_logs").insert({
    admin_id: input.actorUserId || null,
    action: input.action,
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
    details: input.details || {},
  });

  if (error) {
    console.error("audit log write failed:", error.message);
  }
}

export async function recordWebhookEvent(input: {
  provider: string;
  eventId: string;
  reference?: string | null;
  payload?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("webhook_events").insert({
    provider: input.provider,
    event_id: input.eventId,
    reference: input.reference || null,
    payload: input.payload || null,
  });

  if (error?.code === "23505") {
    return { duplicate: true };
  }

  if (error) {
    console.error("webhook event record failed:", error.message);
  }

  return { duplicate: false };
}
