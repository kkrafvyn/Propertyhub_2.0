/**
 * BaytMiftah REOS — Realtime Messaging Context
 * ────────────────────────────────────────────
 * React context providing real-time live messaging state,
 * broadcast subscriptions, typing indicators, and autonomous AI intent handling.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  realtimeMessagingService,
  type Conversation,
  type Message,
  type TypingState,
} from "../../lib/realtime-messaging.service";
import { aiIntentActionEngine } from "../../lib/ai-intent-action-engine.service";
import { useAuth } from "./AuthContext";

interface RealtimeMessagingContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  activeTypingUsers: TypingState[];
  setActiveConversationId: (conversationId: string | null) => void;
  sendMessage: (content: string, metadata?: Record<string, any>) => Promise<Message>;
  broadcastTypingStatus: (isTyping: boolean) => void;
  refreshConversations: () => Promise<void>;
  enableAiAgent: boolean;
  setEnableAiAgent: (enabled: boolean) => void;
}

const RealtimeMessagingContext = createContext<RealtimeMessagingContextType | null>(null);

export function RealtimeMessagingProvider({
  children,
  organizationId,
}: {
  children: React.ReactNode;
  organizationId?: string;
}) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTypingUsers, setActiveTypingUsers] = useState<TypingState[]>([]);
  const [enableAiAgent, setEnableAiAgent] = useState(true);

  const activeConvRef = useRef<Conversation | null>(null);
  activeConvRef.current = activeConversation;

  // Load conversations
  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await realtimeMessagingService.getUserConversations(user.id, organizationId);
      setConversations(list);
      if (!activeConvRef.current && list.length > 0) {
        setActiveConversation(list[0]);
      }
    } catch (err) {
      console.warn("[RealtimeMessagingContext] Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [user, organizationId]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Load messages & subscribe when active conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    let isSubscribed = true;

    const loadHistory = async () => {
      try {
        const history = await realtimeMessagingService.getMessages(activeConversation.id);
        if (isSubscribed) {
          setMessages(history);
          if (user) {
            void realtimeMessagingService.markAsRead(activeConversation.id, user.id);
          }
        }
      } catch (err) {
        console.warn("[RealtimeMessagingContext] Failed to load messages:", err);
      }
    };

    void loadHistory();

    const unsubscribe = realtimeMessagingService.subscribeToConversation(
      activeConversation.id,
      {
        onMessage: (newMsg) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        },
        onTyping: (typingState) => {
          if (user && typingState.userId === user.id) return;
          setActiveTypingUsers((prev) => {
            const filtered = prev.filter((u) => u.userId !== typingState.userId);
            if (typingState.isTyping) {
              return [...filtered, typingState];
            }
            return filtered;
          });
        },
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [activeConversation?.id, user]);

  // Send message handler with Agentic AI integration
  const sendMessage = useCallback(
    async (content: string, metadata?: Record<string, any>) => {
      if (!activeConversation || !user) {
        throw new Error("No active conversation or authenticated user");
      }

      // 1. Send user message
      const sent = await realtimeMessagingService.sendMessage({
        conversationId: activeConversation.id,
        senderId: user.id,
        senderType: "user",
        senderName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        content,
        metadata,
      });

      // Update local state immediately
      setMessages((prev) => [...prev, sent]);

      // 2. Trigger Autonomous AI Intent Engine if enabled
      if (enableAiAgent) {
        setTimeout(async () => {
          try {
            await aiIntentActionEngine.processIncomingMessage({
              conversationId: activeConversation.id,
              message: sent,
              userId: user.id,
              organizationId: activeConversation.organization_id || organizationId,
              propertyId: activeConversation.property_id,
              unitId: activeConversation.unit_id,
              leaseId: activeConversation.lease_id,
              propertyName: activeConversation.metadata?.propertyName,
              unitNumber: activeConversation.metadata?.unitNumber,
            });
          } catch (err) {
            console.warn("[RealtimeMessagingContext] AI Intent Engine error:", err);
          }
        }, 300);
      }

      return sent;
    },
    [activeConversation, user, enableAiAgent, organizationId]
  );

  const broadcastTypingStatus = useCallback(
    (isTyping: boolean) => {
      if (!activeConversation || !user) return;
      void realtimeMessagingService.broadcastTyping(
        activeConversation.id,
        user.id,
        user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        isTyping
      );
    },
    [activeConversation, user]
  );

  const setActiveConversationId = useCallback(
    (conversationId: string | null) => {
      if (!conversationId) {
        setActiveConversation(null);
        return;
      }
      const found = conversations.find((c) => c.id === conversationId);
      if (found) {
        setActiveConversation(found);
      }
    },
    [conversations]
  );

  return (
    <RealtimeMessagingContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        loading,
        activeTypingUsers,
        setActiveConversationId,
        sendMessage,
        broadcastTypingStatus,
        refreshConversations,
        enableAiAgent,
        setEnableAiAgent,
      }}
    >
      {children}
    </RealtimeMessagingContext.Provider>
  );
}

export function useRealtimeMessaging() {
  const ctx = useContext(RealtimeMessagingContext);
  if (!ctx) {
    throw new Error("useRealtimeMessaging must be used within RealtimeMessagingProvider");
  }
  return ctx;
}
