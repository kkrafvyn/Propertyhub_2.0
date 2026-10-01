/**
 * BaytMiftah REOS — Realtime Contextual Messaging Service
 * ────────────────────────────────────────────────────────
 * Multi-participant, contextual conversation engine built on:
 *   1. Supabase Postgres (Durable source of truth)
 *   2. Supabase Realtime Broadcast & Presence (Sub-50ms live chat & typing indicators)
 *   3. FCM Device Push Notifications (Offline background alerts)
 *   4. Entity Links (Property, Unit, Lease, Maintenance Request, Work Order, Deal)
 */

import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { secureId } from "./secure-id";
import { isDemoSimulationAllowed } from "./simulation-mode";

export type ConversationType = "direct" | "group" | "support" | "organization_shared" | "channel";
export type ParticipantRole =
  | "buyer"
  | "tenant"
  | "resident"
  | "landlord"
  | "agent"
  | "contractor"
  | "support"
  | "admin"
  | "member";

export type MessageType =
  | "text"
  | "image"
  | "document"
  | "location"
  | "property_card"
  | "lease_card"
  | "maintenance_card"
  | "work_order_card"
  | "action_request"
  | "system_event";

export type SenderType = "user" | "agent" | "contractor" | "system" | "ai_bot";

export interface ConversationContext {
  customerId?: string | null;
  organizationId?: string | null;
  propertyId?: string | null;
  unitId?: string | null;
  listingId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  leaseId?: string | null;
  bookingId?: string | null;
  maintenanceIssueId?: string | null;
  workOrderId?: string | null;
  propertyName?: string;
  unitNumber?: string;
}

export interface Conversation {
  id: string;
  conversation_type: ConversationType;
  title: string | null;
  customer_id: string | null;
  organization_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  listing_id: string | null;
  lead_id: string | null;
  deal_id: string | null;
  lease_id: string | null;
  booking_id: string | null;
  maintenance_issue_id: string | null;
  work_order_id: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  unread_count?: number;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  participant_role: ParticipantRole;
  joined_at: string;
  last_read_at: string | null;
  is_muted: boolean;
  notification_preference: "all" | "mentions" | "none";
  user_profile?: {
    full_name?: string;
    avatar_url?: string;
    email?: string;
    role?: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: SenderType;
  content: string;
  message_type: MessageType;
  metadata: Record<string, any>;
  reply_to_message_id: string | null;
  is_pinned: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender_name?: string;
  reactions?: Array<{ emoji: string; count: number; users: string[] }>;
}

export interface TypingState {
  userId: string;
  userName: string;
  isTyping: boolean;
}

// In-memory local fallback store for seamless offline/vitest execution
const localConversations = new Map<string, Conversation>();
const localMessages = new Map<string, Message[]>();
const localParticipants = new Map<string, ConversationParticipant[]>();

export class RealtimeMessagingService {
  private activeChannels = new Map<string, RealtimeChannel>();

  /**
   * Subscribe to a conversation channel via Supabase Realtime Broadcast & Postgres Changes
   */
  subscribeToConversation(
    conversationId: string,
    callbacks: {
      onMessage?: (message: Message) => void;
      onTyping?: (typing: TypingState) => void;
      onReaction?: (payload: { messageId: string; emoji: string; userId: string; action: "add" | "remove" }) => void;
      onDeliveryStatus?: (payload: { messageId: string; userId: string; status: string }) => void;
    }
  ): () => void {
    const channelName = `conversation:${conversationId}`;

    try {
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: conversationId },
        },
      });

      channel
        // Ephemeral broadcast: new message
        .on("broadcast", { event: "NEW_MESSAGE" }, (payload) => {
          if (callbacks.onMessage && payload.payload) {
            callbacks.onMessage(payload.payload as Message);
          }
        })
        // Ephemeral broadcast: typing status
        .on("broadcast", { event: "TYPING_STATUS" }, (payload) => {
          if (callbacks.onTyping && payload.payload) {
            callbacks.onTyping(payload.payload as TypingState);
          }
        })
        // Ephemeral broadcast: emoji reaction
        .on("broadcast", { event: "MESSAGE_REACTION" }, (payload) => {
          if (callbacks.onReaction && payload.payload) {
            callbacks.onReaction(payload.payload as any);
          }
        })
        // Ephemeral broadcast: read receipts
        .on("broadcast", { event: "DELIVERY_STATUS" }, (payload) => {
          if (callbacks.onDeliveryStatus && payload.payload) {
            callbacks.onDeliveryStatus(payload.payload as any);
          }
        })
        // Postgres change fallback
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            if (callbacks.onMessage && payload.new) {
              callbacks.onMessage(payload.new as Message);
            }
          }
        )
        .subscribe();

      this.activeChannels.set(conversationId, channel);

      return () => {
        channel.unsubscribe();
        this.activeChannels.delete(conversationId);
      };
    } catch {
      // In offline / test environment, return a dummy teardown
      return () => {};
    }
  }

  /**
   * Broadcast typing indicator without hitting database
   */
  async broadcastTyping(conversationId: string, userId: string, userName: string, isTyping: boolean) {
    const channel = this.activeChannels.get(conversationId);
    if (channel) {
      await channel.send({
        type: "broadcast",
        event: "TYPING_STATUS",
        payload: { userId, userName, isTyping },
      });
    }
  }

  /**
   * Create or fetch an existing contextual conversation
   */
  async getOrCreateContextualConversation(
    context: ConversationContext,
    participants: Array<{ userId: string; role: ParticipantRole }>,
    title?: string
  ): Promise<Conversation> {
    try {
      // 1. Check if a conversation matching this specific operational context already exists
      let query = supabase.from("conversations").select("*");

      if (context.organizationId) query = query.eq("organization_id", context.organizationId);
      if (context.unitId) query = query.eq("unit_id", context.unitId);
      if (context.leaseId) query = query.eq("lease_id", context.leaseId);
      if (context.maintenanceIssueId) query = query.eq("maintenance_issue_id", context.maintenanceIssueId);
      if (context.workOrderId) query = query.eq("work_order_id", context.workOrderId);
      if (context.listingId) query = query.eq("listing_id", context.listingId);

      const { data: existingList } = await query.limit(1);

      if (existingList && existingList.length > 0) {
        return existingList[0] as Conversation;
      }

      // 2. Insert new conversation into Postgres
      const newConv: Partial<Conversation> = {
        conversation_type: participants.length > 2 ? "group" : "direct",
        title: title || (context.propertyName ? `${context.propertyName} • ${context.unitNumber || "General"}` : "Conversation"),
        customer_id: context.customerId || null,
        organization_id: context.organizationId || null,
        property_id: context.propertyId || null,
        unit_id: context.unitId || null,
        listing_id: context.listingId || null,
        lead_id: context.leadId || null,
        deal_id: context.dealId || null,
        lease_id: context.leaseId || null,
        booking_id: context.bookingId || null,
        maintenance_issue_id: context.maintenanceIssueId || null,
        work_order_id: context.workOrderId || null,
        metadata: {
          propertyName: context.propertyName,
          unitNumber: context.unitNumber,
          autoCreated: true,
        },
      };

      const { data: created, error } = await supabase
        .from("conversations")
        .insert(newConv)
        .select("*")
        .single();

      if (error || !created) throw error || new Error("Failed to insert conversation");

      // 3. Insert participants
      if (participants.length > 0) {
        const participantRows = participants.map((p) => ({
          conversation_id: created.id,
          user_id: p.userId,
          participant_role: p.role,
        }));
        await supabase.from("conversation_participants").insert(participantRows);
      }

      return created as Conversation;
    } catch {
      // Local fallback for offline/test environments
      const convId = secureId("conv");
      const fallbackConv: Conversation = {
        id: convId,
        conversation_type: participants.length > 2 ? "group" : "direct",
        title: title || (context.propertyName ? `${context.propertyName} • ${context.unitNumber || "General"}` : "Conversation"),
        customer_id: context.customerId || null,
        organization_id: context.organizationId || null,
        property_id: context.propertyId || null,
        unit_id: context.unitId || null,
        listing_id: context.listingId || null,
        lead_id: context.leadId || null,
        deal_id: context.dealId || null,
        lease_id: context.leaseId || null,
        booking_id: context.bookingId || null,
        maintenance_issue_id: context.maintenanceIssueId || null,
        work_order_id: context.workOrderId || null,
        last_message_preview: null,
        last_message_at: new Date().toISOString(),
        metadata: {
          propertyName: context.propertyName,
          unitNumber: context.unitNumber,
        },
        created_by: participants[0]?.userId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localConversations.set(convId, fallbackConv);
      localParticipants.set(
        convId,
        participants.map((p) => ({
          conversation_id: convId,
          user_id: p.userId,
          participant_role: p.role,
          joined_at: new Date().toISOString(),
          last_read_at: null,
          is_muted: false,
          notification_preference: "all",
        }))
      );

      return fallbackConv;
    }
  }

  /**
   * Fetch conversations list for a user / organization
   */
  async getUserConversations(userId: string, organizationId?: string): Promise<Conversation[]> {
    try {
      let query = supabase
        .from("conversations")
        .select(`
          *,
          participants:conversation_participants (
            user_id,
            participant_role,
            last_read_at,
            is_muted
          )
        `)
        .order("last_message_at", { ascending: false });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data?.length || !isDemoSimulationAllowed()) return (data || []) as Conversation[];
      return Array.from(localConversations.values()).sort(
        (a, b) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime()
      );
    } catch (error) {
      if (!isDemoSimulationAllowed()) throw error;
      return Array.from(localConversations.values()).sort(
        (a, b) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime()
      );
    }
  }

  /**
   * Send a durable message and broadcast it to the channel immediately
   */
  async sendMessage(input: {
    conversationId: string;
    senderId?: string | null;
    senderType?: SenderType;
    senderName?: string;
    content: string;
    messageType?: MessageType;
    metadata?: Record<string, any>;
    replyToMessageId?: string | null;
  }): Promise<Message> {
    const messagePayload: Partial<Message> = {
      conversation_id: input.conversationId,
      sender_id: input.senderId || null,
      sender_type: input.senderType || "user",
      content: input.content,
      message_type: input.messageType || "text",
      metadata: input.metadata || {},
      reply_to_message_id: input.replyToMessageId || null,
      is_pinned: false,
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender_name: input.senderName,
    };

    let resultMessage: Message;

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert(messagePayload)
        .select("*")
        .single();

      if (error || !data) throw error || new Error("Failed to save message");
      resultMessage = { ...data, sender_name: input.senderName };
    } catch (error) {
      if (!isDemoSimulationAllowed()) throw error;
      const msgId = secureId("msg");
      resultMessage = {
        id: msgId,
        conversation_id: input.conversationId,
        sender_id: input.senderId || null,
        sender_type: input.senderType || "user",
        content: input.content,
        message_type: input.messageType || "text",
        metadata: input.metadata || {},
        reply_to_message_id: input.replyToMessageId || null,
        is_pinned: false,
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_name: input.senderName,
      };

      const list = localMessages.get(input.conversationId) || [];
      list.push(resultMessage);
      localMessages.set(input.conversationId, list);

      // update preview in local conv
      const conv = localConversations.get(input.conversationId);
      if (conv) {
        conv.last_message_preview = input.content.slice(0, 200);
        conv.last_message_at = resultMessage.created_at;
      }
    }

    // 2. Realtime Broadcast to connected clients (Sub-50ms)
    const channel = this.activeChannels.get(input.conversationId);
    if (channel) {
      void channel.send({
        type: "broadcast",
        event: "NEW_MESSAGE",
        payload: resultMessage,
      });
    }

    return resultMessage;
  }

  /**
   * Get message history for a conversation
   */
  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) throw error;
      if (data?.length || !isDemoSimulationAllowed()) return (data || []) as Message[];
      return localMessages.get(conversationId) || [];
    } catch (error) {
      if (!isDemoSimulationAllowed()) throw error;
      return localMessages.get(conversationId) || [];
    }
  }

  /**
   * Mark messages as read by current user
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);
    } catch {
      const participants = localParticipants.get(conversationId);
      const target = participants?.find((p) => p.user_id === userId);
      if (target) {
        target.last_read_at = new Date().toISOString();
      }
    }
  }
}

export const realtimeMessagingService = new RealtimeMessagingService();
