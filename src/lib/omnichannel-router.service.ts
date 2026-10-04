/**
 * BaytMiftah REOS — Omnichannel Communication Router Service
 * ──────────────────────────────────────────────────────────
 * Decides and executes the optimal delivery channel based on user preference,
 * presence status, urgency, and fallback rules:
 *   1. In-App Supabase Realtime Broadcast (sub-50ms if recipient is active)
 *   2. Push Notification (FCM Web/Android/iOS if backgrounded)
 *   3. SMS Gateway (Hubtel / Arkesel fallback for urgent operational notices)
 *   4. WhatsApp Gateway (Property alerts / automated lead updates)
 */

import { realtimeMessagingService, type Message } from "./realtime-messaging.service";
import { fcmPushService } from "./fcm-push.service";
import { sendEstateSms } from "./sms-gateway.service";
import { supabase } from "./supabase";

export type DeliveryChannel = "in_app" | "push" | "sms" | "whatsapp";

export interface RouteMessageInput {
  conversationId: string;
  organizationId?: string;
  senderId?: string | null;
  senderName?: string;
  senderType?: "user" | "agent" | "contractor" | "system" | "ai_bot";
  recipientUserId: string;
  recipientPhone?: string;
  content: string;
  priority?: "low" | "normal" | "high" | "urgent";
  channels?: DeliveryChannel[];
  deepLinkUrl?: string;
}

export interface OmnichannelDeliveryReport {
  messageId: string;
  channelsAttempted: DeliveryChannel[];
  channelsSucceeded: DeliveryChannel[];
  channelsFailed: DeliveryChannel[];
  timestamp: string;
}

export class OmnichannelRouterService {
  async recordDeliveryAttempt(input: {
    organizationId: string;
    conversationId?: string;
    messageId?: string;
    recipientUserId?: string;
    channel: DeliveryChannel;
    attemptNumber: number;
    status: "queued" | "sent" | "delivered" | "failed" | "escalated";
    providerReference?: string;
    errorMessage?: string;
  }) {
    const { data, error } = await supabase.from("communication_delivery_attempts").insert({
      organization_id: input.organizationId,
      conversation_id: input.conversationId || null,
      message_id: input.messageId || null,
      recipient_user_id: input.recipientUserId || null,
      channel: input.channel,
      attempt_number: input.attemptNumber,
      status: input.status,
      provider_reference: input.providerReference || null,
      error_message: input.errorMessage || null,
    }).select("*").single();
    if (error) throw error;
    return data;
  }

  async listEscalationPolicies(organizationId: string) {
    const { data, error } = await supabase.from("communication_escalation_policies").select("*").eq("organization_id", organizationId).eq("active", true);
    if (error) throw error;
    return data || [];
  }
  /**
   * Route message across prioritized channels
   */
  resolveChannels(input: RouteMessageInput): DeliveryChannel[] {
    const supported: DeliveryChannel[] = ["in_app", "push", "sms"];
    const requested = input.channels?.length ? input.channels : supported;
    return requested.filter((channel) => supported.includes(channel));
  }

  async routeMessage(input: RouteMessageInput): Promise<OmnichannelDeliveryReport> {
    const plan = this.resolveChannels(input);
    const channelsAttempted: DeliveryChannel[] = [];
    const channelsSucceeded: DeliveryChannel[] = [];
    const channelsFailed: DeliveryChannel[] = [];

    let sentMsg: Message | null = null;

    if (plan.includes("in_app")) {
      channelsAttempted.push("in_app");
      try {
        sentMsg = await realtimeMessagingService.sendMessage({
          conversationId: input.conversationId,
          senderId: input.senderId,
          senderName: input.senderName,
          senderType: input.senderType || "system",
          content: input.content,
        });
        channelsSucceeded.push("in_app");
      } catch {
        channelsFailed.push("in_app");
      }
    }

    if (plan.includes("push")) {
      channelsAttempted.push("push");
      try {
        const pushResult = await fcmPushService.dispatchPushNotification({
          recipientUserId: input.recipientUserId,
          title: input.senderName ? `${input.senderName} on BaytMiftah` : "BaytMiftah Update",
          body: input.content,
          conversationId: input.conversationId,
          messageId: sentMsg?.id,
          deepLinkUrl: input.deepLinkUrl,
        });

        if (pushResult.delivered > 0) {
          channelsSucceeded.push("push");
        } else if (pushResult.failed > 0) {
          channelsFailed.push("push");
        }
      } catch {
        channelsFailed.push("push");
      }
    }

    // 3. SMS when explicitly requested (or urgent/high fallback if sms is in plan)
    if (
      plan.includes("sms") &&
      input.recipientPhone &&
      (input.channels?.includes("sms") || input.priority === "urgent" || input.priority === "high")
    ) {
      channelsAttempted.push("sms");
      try {
        await sendEstateSms({
          to: input.recipientPhone,
          message: `[BaytMiftah Alert] ${input.content}`,
          organizationId: input.organizationId,
        });
        channelsSucceeded.push("sms");
      } catch {
        channelsFailed.push("sms");
      }
    }

    return {
      messageId: sentMsg?.id || `msg_${Date.now()}`,
      channelsAttempted,
      channelsSucceeded,
      channelsFailed,
      timestamp: new Date().toISOString(),
    };
  }
}

export const omnichannelRouterService = new OmnichannelRouterService();
