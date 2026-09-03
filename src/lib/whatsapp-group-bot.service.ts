import { supabase } from "./supabase";
import {
  getWebhookUrlHint,
  mapBotContextFromRpc,
  normalizeGroupBotAliases,
  processGroupBotMessage,
  shouldRespondInGroup,
  stripGroupBotPrefix,
  type GroupBotContext,
} from "./whatsapp-group-bot-core";

const db = supabase as any;

export type WhatsAppGroupChannel = {
  id: string;
  organization_id: string;
  estate_id: string | null;
  group_id: string;
  group_name: string | null;
  bot_aliases: string[];
  respond_without_mention: boolean;
  is_active: boolean;
  linked_at: string;
  last_message_at: string | null;
};

export type WhatsAppInboundMessage = {
  id: string;
  organization_id: string | null;
  group_channel_id: string | null;
  sender_phone: string;
  sender_name: string | null;
  group_id: string | null;
  is_group: boolean;
  message_text: string;
  bot_replied: boolean;
  bot_reply_text: string | null;
  received_at: string;
};

export const whatsappGroupBotService = {
  getWebhookUrl: getWebhookUrlHint,

  normalizeGroupBotAliases,
  shouldRespondInGroup,
  stripGroupBotPrefix,
  processGroupBotMessage,

  async listGroups(organizationId: string): Promise<WhatsAppGroupChannel[]> {
    const { data, error } = await db
      .from("whatsapp_group_channels")
      .select("*")
      .eq("organization_id", organizationId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return data || [];
  },

  async linkGroup(input: {
    organizationId: string;
    groupId: string;
    groupName: string;
    estateId?: string | null;
    respondWithoutMention?: boolean;
    linkedBy?: string;
  }): Promise<WhatsAppGroupChannel> {
    const { data, error } = await db
      .from("whatsapp_group_channels")
      .upsert(
        {
          organization_id: input.organizationId,
          group_id: input.groupId.trim(),
          group_name: input.groupName.trim(),
          estate_id: input.estateId || null,
          respond_without_mention: Boolean(input.respondWithoutMention),
          is_active: true,
          linked_by: input.linkedBy || null,
          linked_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,group_id" }
      )
      .select("*")
      .single();
    if (error) throw error;
    return data as WhatsAppGroupChannel;
  },

  async updateGroup(
    channelId: string,
    patch: Partial<Pick<WhatsAppGroupChannel, "group_name" | "respond_without_mention" | "is_active" | "bot_aliases">>
  ) {
    const { data, error } = await db
      .from("whatsapp_group_channels")
      .update(patch)
      .eq("id", channelId)
      .select("*")
      .single();
    if (error) throw error;
    return data as WhatsAppGroupChannel;
  },

  async listInboundMessages(organizationId: string, limit = 50): Promise<WhatsAppInboundMessage[]> {
    const { data, error } = await db
      .from("whatsapp_inbound_messages")
      .select(
        "id, organization_id, group_channel_id, sender_phone, sender_name, group_id, is_group, message_text, bot_replied, bot_reply_text, received_at"
      )
      .eq("organization_id", organizationId)
      .order("received_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async loadBotContext(organizationId: string, phone: string): Promise<GroupBotContext> {
    const { data, error } = await db.rpc("get_whatsapp_bot_context", {
      p_organization_id: organizationId,
      p_phone: phone,
    });
    if (error) throw error;
    return mapBotContextFromRpc(data as Record<string, unknown> | null);
  },

  simulateGroupMessage(input: {
    text: string;
    senderPhone: string;
    aliases?: string[];
    respondWithoutMention?: boolean;
    context?: GroupBotContext;
    pendingLeaseSignUrl?: string | null;
    pendingLeaseDocumentName?: string | null;
    jurisdictionLabel?: string | null;
  }) {
    const aliases = normalizeGroupBotAliases(input.aliases);
    if (!shouldRespondInGroup(input.text, aliases, input.respondWithoutMention)) {
      return { responded: false as const, reason: "no_mention" as const };
    }
    const command = stripGroupBotPrefix(input.text, aliases);
    const context: GroupBotContext = {
      ...(input.context || {}),
      pendingLeaseSignUrl: input.pendingLeaseSignUrl ?? input.context?.pendingLeaseSignUrl,
      pendingLeaseDocumentName:
        input.pendingLeaseDocumentName ?? input.context?.pendingLeaseDocumentName,
      jurisdictionLabel: input.jurisdictionLabel ?? input.context?.jurisdictionLabel,
    };
    const bot = processGroupBotMessage(input.senderPhone, command, true, context);
    return { responded: true as const, command, bot };
  },

  async simulateGroupMessageLive(input: {
    organizationId: string;
    text: string;
    senderPhone: string;
    aliases?: string[];
    respondWithoutMention?: boolean;
    pendingLeaseSignUrl?: string | null;
    pendingLeaseDocumentName?: string | null;
    jurisdictionLabel?: string | null;
  }) {
    let context: GroupBotContext = {};
    try {
      context = await whatsappGroupBotService.loadBotContext(input.organizationId, input.senderPhone);
    } catch {
      context = {};
    }
    if (input.pendingLeaseSignUrl) {
      context.pendingLeaseSignUrl = input.pendingLeaseSignUrl;
      context.pendingLeaseDocumentName = input.pendingLeaseDocumentName;
      context.jurisdictionLabel = input.jurisdictionLabel;
    }
    return whatsappGroupBotService.simulateGroupMessage({ ...input, context });
  },
};
