import {
  buildInboundMessagePayload,
  parseWhatsAppWebhookPayload,
  resolveOrganizationByPhoneNumberId,
  sendWhatsAppTextMessage,
  verifyWhatsAppWebhookSignature,
} from "../_shared/whatsapp-cloud.ts";
import {
  normalizeGroupBotAliases,
  processGroupBotMessage,
  resolveNextBotSessionState,
  shouldOpenMaintenanceFromSession,
  shouldRespondInGroup,
  stripGroupBotPrefix,
} from "../_shared/whatsapp-bot-core.ts";
import { lookupPendingLeaseSignForPhone } from "../_shared/whatsapp-lease-sign.ts";
import {
  applyWhatsAppBotMutations,
  loadWhatsAppBotContext,
} from "../_shared/whatsapp-tenant-context.ts";
import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  groupAcknowledgementForSensitiveCommand,
  isSensitiveBotResponse,
  redactBotReplyForStorage,
  safeGroupMessageWhenDmFails,
} from "../_shared/whatsapp-privacy.ts";
import { resolveWhatsAppDedupeId } from "../_shared/whatsapp-dedupe.ts";

type GroupChannelRow = {
  id: string;
  organization_id: string;
  group_id: string;
  group_name: string | null;
  bot_aliases: string[];
  respond_without_mention: boolean;
  is_active: boolean;
};

async function getOrCreateGroupChannel(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  groupId: string,
  groupName?: string | null
): Promise<GroupChannelRow> {
  const { data: existing } = await admin
    .from("whatsapp_group_channels")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (existing) return existing as GroupChannelRow;

  const { data: created, error } = await admin
    .from("whatsapp_group_channels")
    .insert({
      organization_id: organizationId,
      group_id: groupId,
      group_name: groupName || `Group ${groupId.slice(-6)}`,
      is_active: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return created as GroupChannelRow;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN")?.trim();
  if (!verifyToken) {
    return jsonResponse(503, { error: "WhatsApp webhook verification is not configured" }, req);
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200, headers: getCorsHeaders(req) });
    }
    return jsonResponse(403, { error: "Verification failed" }, req);
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, req);
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");

    if (!(await verifyWhatsAppWebhookSignature(rawBody, signature, appSecret))) {
      throw new HttpError(401, "Invalid WhatsApp webhook signature");
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const messages = parseWhatsAppWebhookPayload(payload);
    const admin = createAdminClient();
    const results: Array<Record<string, unknown>> = [];

    for (const msg of messages) {
      const integration = await resolveOrganizationByPhoneNumberId(admin, msg.phoneNumberId);
      const organizationId = integration?.organizationId ?? null;
      const messagePayload = buildInboundMessagePayload(msg);

      if (!organizationId) {
        console.warn("whatsapp-webhook: unmatched phone_number_id; skipping message", msg.phoneNumberId);
        results.push({ messageId: msg.messageId, skipped: true, reason: "unresolved_organization" });
        continue;
      }

      const dedupeId = resolveWhatsAppDedupeId({
        messageId: msg.messageId,
        organizationId,
        senderPhone: msg.from,
        messageText: msg.text,
        timestamp: msg.timestamp,
      });

      if (!dedupeId) {
        results.push({ messageId: msg.messageId, skipped: true, reason: "missing_dedupe_key" });
        continue;
      }

      let inboundClaimId: string | null = null;
      const { data: claimRows, error: claimError } = await admin.rpc("claim_whatsapp_inbound_message", {
        p_organization_id: organizationId,
        p_wa_message_id: dedupeId,
      });
      if (claimError) throw claimError;
      const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
      if (claim && claim.claimed === false) {
        results.push({ messageId: dedupeId, skipped: true, reason: "duplicate_webhook" });
        continue;
      }
      inboundClaimId = claim?.inbound_id ?? null;

      let groupChannel: GroupChannelRow | null = null;
      if (msg.isGroup && msg.groupId) {
        const { data: linkedGroup } = await admin
          .from("whatsapp_group_channels")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("group_id", msg.groupId)
          .maybeSingle();
        if (linkedGroup) {
          groupChannel = linkedGroup as GroupChannelRow;
        } else {
          groupChannel = await getOrCreateGroupChannel(admin, organizationId, msg.groupId);
        }
      }

      if (groupChannel && !groupChannel.is_active) {
        if (inboundClaimId) {
          await admin.from("whatsapp_inbound_messages").update({
            group_channel_id: groupChannel.id,
            sender_phone: msg.from,
            sender_name: msg.senderName || null,
            group_id: msg.groupId,
            is_group: true,
            message_text: msg.text,
            message_type: msg.messageType,
            processing_status: "skipped",
            raw_payload: messagePayload,
          }).eq("id", inboundClaimId);
        }
        results.push({ messageId: msg.messageId, skipped: true, reason: "group_pending_approval" });
        continue;
      }

      const aliases = normalizeGroupBotAliases(groupChannel?.bot_aliases);
      const respondWithoutMention = groupChannel?.respond_without_mention ?? false;

      if (msg.isGroup && !shouldRespondInGroup(msg.text, aliases, respondWithoutMention)) {
        if (inboundClaimId) {
          await admin.from("whatsapp_inbound_messages").update({
            group_channel_id: groupChannel?.id || null,
            sender_phone: msg.from,
            sender_name: msg.senderName || null,
            group_id: msg.groupId,
            is_group: true,
            message_text: msg.text,
            message_type: msg.messageType,
            bot_replied: false,
            processing_status: "skipped",
            raw_payload: messagePayload,
          }).eq("id", inboundClaimId);
        }
        results.push({ messageId: msg.messageId, skipped: true, reason: "no_mention" });
        continue;
      }

      const commandText = msg.isGroup ? stripGroupBotPrefix(msg.text, aliases) : msg.text;

      let priorSessionState = "idle";
      {
        let sessionQuery = admin
          .from("whatsapp_bot_sessions")
          .select("session_state")
          .eq("organization_id", organizationId)
          .eq("sender_phone", msg.from);
        sessionQuery = msg.groupId
          ? sessionQuery.eq("group_id", msg.groupId)
          : sessionQuery.is("group_id", null);
        const { data: priorSession } = await sessionQuery.maybeSingle();
        priorSessionState = String(priorSession?.session_state || "idle");
      }

      const forceMaintenance = shouldOpenMaintenanceFromSession(priorSessionState, commandText);

      const leasePending = await lookupPendingLeaseSignForPhone(admin, organizationId, msg.from);
      let botContext = await loadWhatsAppBotContext(admin, organizationId, msg.from, leasePending);
      botContext = await applyWhatsAppBotMutations(admin, organizationId, msg.from, commandText, botContext, {
        forceMaintenanceDescription: forceMaintenance,
      });

      const botResponse = processGroupBotMessage(msg.from, commandText, msg.isGroup, botContext);
      const sensitive = msg.isGroup && isSensitiveBotResponse(botResponse.actionRequired);
      const groupReplyText = sensitive
        ? groupAcknowledgementForSensitiveCommand()
        : botResponse.replyMessage;
      const privateReplyText = sensitive ? botResponse.replyMessage : null;
      const replyTarget = msg.isGroup && msg.groupId ? msg.groupId : msg.from;

      let sendResult: { success: boolean; messageId?: string; simulated?: boolean } = { success: false };
      let dmResult: { success: boolean } = { success: false };
      try {
        if (integration?.phoneNumberId && integration.accessToken) {
          sendResult = await sendWhatsAppTextMessage({
            to: replyTarget,
            text: groupReplyText,
            phoneNumberId: integration.phoneNumberId,
            accessToken: integration.accessToken,
          });
          if (privateReplyText) {
            dmResult = await sendWhatsAppTextMessage({
              to: msg.from,
              text: privateReplyText,
              phoneNumberId: integration.phoneNumberId,
              accessToken: integration.accessToken,
            });
            if (!dmResult.success && msg.isGroup) {
              sendResult = await sendWhatsAppTextMessage({
                to: replyTarget,
                text: safeGroupMessageWhenDmFails(),
                phoneNumberId: integration.phoneNumberId,
                accessToken: integration.accessToken,
              });
            }
          }
        }
      } catch (sendError) {
        console.error("WhatsApp reply failed:", sendError);
      }

      const storedReply = redactBotReplyForStorage(botResponse.replyMessage, botResponse.actionRequired);
      let inboundRow: { id: string } | null = null;
      if (inboundClaimId) {
        const { data: updated } = await admin
          .from("whatsapp_inbound_messages")
          .update({
            group_channel_id: groupChannel?.id || null,
            sender_phone: msg.from,
            sender_name: msg.senderName || null,
            group_id: msg.groupId,
            is_group: msg.isGroup,
            message_text: msg.text,
            message_type: msg.messageType,
            bot_replied: sendResult.success,
            bot_reply_text: storedReply,
            processing_status: "completed",
            raw_payload: messagePayload,
          })
          .eq("id", inboundClaimId)
          .select("id")
          .single();
        inboundRow = updated;
      } else {
        const { data: inserted } = await admin
          .from("whatsapp_inbound_messages")
          .insert({
            organization_id: organizationId,
            group_channel_id: groupChannel?.id || null,
            wa_message_id: msg.messageId || null,
            sender_phone: msg.from,
            sender_name: msg.senderName || null,
            group_id: msg.groupId,
            is_group: msg.isGroup,
            message_text: msg.text,
            message_type: msg.messageType,
            bot_replied: sendResult.success,
            bot_reply_text: storedReply,
            processing_status: "completed",
            raw_payload: messagePayload,
          })
          .select("id")
          .single();
        inboundRow = inserted;
      }

      {
        const sessionPayload = {
          organization_id: organizationId,
          sender_phone: msg.from,
          group_id: msg.groupId || null,
          session_state: resolveNextBotSessionState(commandText, priorSessionState),
          context: {
            lastMessage: msg.text,
            lastReply: botResponse.replyMessage,
            isGroup: msg.isGroup,
            actionRequired: botResponse.actionRequired || "NONE",
          },
          updated_at: new Date().toISOString(),
        };

        let sessionQuery = admin
          .from("whatsapp_bot_sessions")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("sender_phone", msg.from);

        sessionQuery = msg.groupId
          ? sessionQuery.eq("group_id", msg.groupId)
          : sessionQuery.is("group_id", null);

        const { data: existingSession } = await sessionQuery.maybeSingle();

        if (existingSession?.id) {
          await admin.from("whatsapp_bot_sessions").update(sessionPayload).eq("id", existingSession.id);
        } else {
          await admin.from("whatsapp_bot_sessions").insert(sessionPayload);
        }

        if (groupChannel?.id) {
          await admin
            .from("whatsapp_group_channels")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", groupChannel.id);
        }
      }

      results.push({
        messageId: msg.messageId,
        inboundId: inboundRow?.id,
        replied: sendResult.success,
        simulated: sendResult.simulated,
        isGroup: msg.isGroup,
      });
    }

    return jsonResponse(200, { success: true, processed: results.length, results }, req);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }
    console.error("whatsapp-webhook error:", error);
    return jsonResponse(500, { error: safeErrorMessage(error, "WhatsApp webhook failed") }, req);
  }
});
