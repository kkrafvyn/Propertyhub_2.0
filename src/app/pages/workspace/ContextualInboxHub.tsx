/**
 * BaytMiftah REOS — Contextual Inbox Hub (Workspace)
 * ───────────────────────────────────────────────────
 * Enterprise multi-department communications hub powered by:
 *   - Supabase Realtime Broadcast & Presence
 *   - Autonomous AI Intent & Operational Ticket Engine
 *   - Deep ERP Entity Context (Units, Leases, Maintenance, MoMo Invoices)
 */

import React, { useState, useRef, useEffect } from "react";
import {
  RealtimeMessagingProvider,
  useRealtimeMessaging,
} from "../../context/RealtimeMessagingContext";
import { ContextHeaderBanner } from "../../components/messaging/ContextHeaderBanner";
import { MaintenanceContextCard, PropertyContextCard, LeaseContextCard } from "../../components/messaging/ContextCards";
import { AIMessageDrawer } from "../../components/messaging/AIMessageDrawer";
import {
  Search,
  Filter,
  Send,
  Sparkles,
  Wrench,
  KeyRound,
  CreditCard,
  Building2,
  Users2,
  Brain,
  MessageSquare,
  Paperclip,
  CheckCheck,
  Clock,
  Plus,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";

interface ContextualInboxHubProps {
  organizationId: string;
  currentUserId?: string;
}

function InboxContent() {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    activeTypingUsers,
    setActiveConversationId,
    sendMessage,
    broadcastTypingStatus,
    enableAiAgent,
    setEnableAiAgent,
  } = useRealtimeMessaging();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "maintenance" | "leases" | "payments" | "sales">("all");
  const [inputText, setInputText] = useState("");
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTypingUsers]);

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      (conv.title && conv.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (conv.last_message_preview && conv.last_message_preview.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (conv.metadata?.propertyName && conv.metadata.propertyName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterCategory === "maintenance") return Boolean(conv.maintenance_issue_id || conv.work_order_id);
    if (filterCategory === "leases") return Boolean(conv.lease_id);
    if (filterCategory === "payments") return Boolean(conv.lead_id || conv.deal_id);
    return true;
  });

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText("");
    broadcastTypingStatus(false);
    setIsSending(true);

    try {
      await sendMessage(textToSend);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    broadcastTypingStatus(e.target.value.length > 0);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-2xl border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
      {/* ── Left Column: Conversation Sidebar ──────────────────────────────── */}
      <div className="w-80 sm:w-96 border-r border-border flex flex-col bg-card/90">
        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Inbox</h2>
                <p className="text-[11px] text-muted-foreground">Live conversations</p>
              </div>
            </div>

            {/* AI Toggle */}
            <button
              onClick={() => setEnableAiAgent(!enableAiAgent)}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                enableAiAgent
                  ? "bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400"
                  : "bg-muted border-border text-muted-foreground"
              }`}
              title="Toggle AI Assistant"
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">{enableAiAgent ? "AI On" : "AI Off"}</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations, units, tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-muted/50 border border-border rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {(
              [
                { id: "all", label: "All" },
                { id: "maintenance", label: "Maintenance" },
                { id: "leases", label: "Leases" },
                { id: "payments", label: "Payments" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                  filterCategory === cat.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {loading && conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No conversations found matching your filter.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConversation?.id === conv.id;
              const hasTicket = Boolean(conv.maintenance_issue_id || conv.work_order_id);
              const hasLease = Boolean(conv.lease_id);

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 relative ${
                    isSelected ? "bg-primary/5 border-l-4 border-primary" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {conv.title?.charAt(0) || "C"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {conv.title || "Contextual Thread"}
                      </h4>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground truncate mb-1.5">
                      {conv.last_message_preview || "No messages yet"}
                    </p>

                    {/* Operational Badges */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {conv.metadata?.unitNumber && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-medium text-foreground">
                          Unit {conv.metadata.unitNumber}
                        </span>
                      )}
                      {hasTicket && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.2 rounded font-medium border border-amber-500/20">
                          Ticket Open
                        </span>
                      )}
                      {hasLease && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.2 rounded font-medium border border-emerald-500/20">
                          Active Lease
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Center & Right: Active Chat & AI Copilot ────────────────────────── */}
      <div className="flex-1 flex min-w-0 bg-background/50">
        {activeConversation ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header Banner */}
            <ContextHeaderBanner
              conversation={activeConversation}
              onOpenContextDrawer={() => setShowAiDrawer(true)}
            />

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                const isAI = msg.sender_type === "ai_bot";
                const isSystem = msg.sender_type === "system";

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isMe ? "items-end" : isAI ? "items-start" : isSystem ? "items-center" : "items-start"
                    }`}
                  >
                    {/* Sender Name */}
                    {!isMe && !isSystem && (
                      <span className="text-[10px] text-muted-foreground font-medium mb-1 px-1 flex items-center gap-1">
                        {isAI && <Sparkles className="w-3 h-3 text-violet-500" />}
                        {msg.sender_name || (isAI ? "BaytMiftah AI" : "Participant")}
                      </span>
                    )}

                    {/* Bubble */}
                    <div
                      className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-xs"
                          : isAI
                          ? "bg-violet-500/10 text-foreground border border-violet-500/20 rounded-bl-xs"
                          : isSystem
                          ? "bg-muted/80 text-muted-foreground text-[11px] text-center"
                          : "bg-card border border-border text-foreground rounded-bl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      {/* Embedded Operational Action Cards */}
                      {msg.message_type === "maintenance_card" && (
                        <MaintenanceContextCard metadata={msg.metadata} />
                      )}
                      {msg.message_type === "property_card" && (
                        <PropertyContextCard metadata={msg.metadata} />
                      )}
                      {msg.message_type === "lease_card" && (
                        <LeaseContextCard metadata={msg.metadata} />
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70">
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isMe && <CheckCheck className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicators */}
              {activeTypingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground italic px-2">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span>{activeTypingUsers.map((u) => u.userName).join(", ")} typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex items-center gap-2">
              <input
                type="text"
                placeholder="Type your message or action request..."
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-muted/60 border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />

              <Button
                type="submit"
                size="sm"
                disabled={!inputText.trim() || isSending}
                className="h-9 px-4 rounded-xl font-medium"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mb-3 text-muted-foreground/50" />
            <h3 className="text-sm font-semibold text-foreground">No conversation selected</h3>
            <p className="text-xs max-w-sm mt-1 text-muted-foreground">
              Select a conversation from the left to start messaging.
            </p>
          </div>
        )}

        {/* AI Inspector Drawer */}
        {showAiDrawer && activeConversation && (
          <AIMessageDrawer
            conversation={activeConversation}
            onClose={() => setShowAiDrawer(false)}
            onSendSuggestedReply={(text) => {
              void sendMessage(text);
              setShowAiDrawer(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

export function ContextualInboxHub({ organizationId }: ContextualInboxHubProps) {
  return (
    <RealtimeMessagingProvider organizationId={organizationId}>
      <InboxContent />
    </RealtimeMessagingProvider>
  );
}
