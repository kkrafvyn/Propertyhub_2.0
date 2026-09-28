/**
 * BaytMiftah REOS — Consumer / Resident Messages Portal
 * ────────────────────────────────────────────────────
 * Frictionless resident communications portal with autonomous AI operational intent:
 * - Residents type natural language messages (e.g. "The toilet is leaking")
 * - AI automatically creates maintenance tickets, assigns technician, and posts progress
 * - Interactive context badges for active lease, gate passes, and payments
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  RealtimeMessagingProvider,
  useRealtimeMessaging,
} from "../../context/RealtimeMessagingContext";
import { ContextHeaderBanner } from "../../components/messaging/ContextHeaderBanner";
import { MaintenanceContextCard, PropertyContextCard, LeaseContextCard } from "../../components/messaging/ContextCards";
import {
  Send,
  Sparkles,
  Building2,
  KeyRound,
  Wrench,
  ShieldCheck,
  CheckCheck,
  ChevronLeft,
  MessageCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { PageHeader, PageLayout } from "../../components/ux";
import { useAuth } from "../../context/AuthContext";

function ResidentInboxContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    activeTypingUsers,
    setActiveConversationId,
    sendMessage,
    broadcastTypingStatus,
  } = useRealtimeMessaging();

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTypingUsers]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText("");
    broadcastTypingStatus(false);
    setIsSending(true);

    try {
      await sendMessage(text);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const samplePrompts = [
    "The water has stopped flowing in my apartment.",
    "The kitchen tap is leaking and the bedroom light doesn't work.",
    "How do I pay this month's rent with Mobile Money?",
    "I need a visitor gate pass for tomorrow at 2 PM.",
  ];

  const handleCardAction = (actionName: string, payload?: Record<string, unknown>) => {
    if (actionName === "view_ticket") {
      navigate("/app/maintenance");
      return;
    }
    if (actionName === "view_lease") {
      navigate("/app/leases");
      return;
    }
    if (actionName === "view_property" && payload?.listingId) {
      navigate(`/property/${payload.listingId}`);
    }
  };

  return (
    <PageLayout variant="consumer" maxWidthClassName="max-w-6xl">
      {/* ── Editorial Header ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-6 bg-gradient-to-br from-violet-500/10 via-primary/5 to-surface/80 border border-violet-500/20 shadow-lg backdrop-blur-md">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold border border-violet-500/20 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                24/7 Autonomous Concierge Active
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Real-time Connected
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-ink font-display">
              Resident Portal & Operations Desk
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary max-w-2xl leading-relaxed">
              Direct connection to your estate manager, maintenance dispatch, and AI operations. Request repairs, ask lease questions, or request gate clearances seamlessly.
            </p>
          </div>
        </div>
      </div>

      <div className="h-[650px] flex rounded-3xl border border-surface-border/80 bg-surface/85 shadow-lg backdrop-blur-md overflow-hidden">
        {/* ── Left list: Threads ────────────────────────────────────────────────── */}
        <div className={`w-full sm:w-80 border-r border-surface-border/80 flex-col bg-surface-subtle/60 backdrop-blur-xs ${activeConversation ? "hidden sm:flex" : "flex"}`}>
          <div className="p-4 border-b border-surface-border/80 font-semibold text-xs text-ink flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-primary" />
              Property Threads
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-surface-border text-ink-secondary font-mono">
              {conversations.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-surface-border/40 p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-secondary">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-ink-muted" />
                <p className="font-medium">No active conversations</p>
                <p className="text-[11px] text-ink-muted mt-1">Threads for your active tenancy or inquiry will appear here.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 ${
                      isSelected
                        ? "bg-surface shadow-xs border border-primary/30 text-ink"
                        : "hover:bg-surface/60 text-ink-secondary hover:text-ink"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                      isSelected
                        ? "bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary border border-primary/20"
                        : "bg-surface-subtle text-ink-muted border border-surface-border/60"
                    }`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-semibold truncate text-ink">
                          {conv.title || "Estate Management"}
                        </h4>
                      </div>
                      <p className="text-[11px] text-ink-secondary truncate leading-tight">
                        {conv.last_message_preview || "Say something to management..."}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: Live Feed ───────────────────────────────────────────────── */}
        <div className={`flex-1 flex-col min-w-0 bg-surface/40 ${activeConversation ? "flex" : "hidden sm:flex"}`}>
          {activeConversation ? (
            <>
              {/* Mobile Back Button */}
              <div className="sm:hidden px-4 pt-3 pb-1 border-b border-surface-border/50 bg-surface/90">
                <button
                  type="button"
                  onClick={() => setActiveConversationId("")}
                  className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink font-medium px-2.5 py-1 rounded-lg bg-surface border border-surface-border shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to conversations</span>
                </button>
              </div>

              <ContextHeaderBanner conversation={activeConversation} />

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="py-16 text-center text-ink-secondary space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center border border-violet-500/20 shadow-xs">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">Describe any operational request</h3>
                      <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto leading-relaxed">
                        Our autonomous engine automatically detects maintenance urgency, dispatches work orders, and answers lease questions.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto pt-2">
                      {samplePrompts.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => setInputText(prompt)}
                          className="text-[11px] px-3.5 py-2 rounded-xl bg-surface/90 border border-surface-border/80 hover:border-primary/50 text-ink shadow-2xs hover:shadow-xs transition-all text-left flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>"{prompt}"</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    const isAI = msg.sender_type === "ai_bot";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        {!isMe && (
                          <span className="text-[10px] text-ink-secondary font-medium mb-1 px-1 flex items-center gap-1">
                            {isAI && <Sparkles className="w-3 h-3 text-violet-500" />}
                            {msg.sender_name || (isAI ? "BaytMiftah Operations AI" : "Property Manager")}
                          </span>
                        )}

                        <div
                          className={`max-w-md rounded-2xl px-4 py-3 text-xs shadow-xs transition-all ${
                            isMe
                              ? "bg-gradient-to-r from-primary to-emerald-600 text-white rounded-br-xs"
                              : isAI
                              ? "bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-surface text-ink border border-violet-500/20 rounded-bl-xs"
                              : "bg-surface border border-surface-border/80 text-ink rounded-bl-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                          {msg.message_type === "maintenance_card" && (
                            <MaintenanceContextCard metadata={msg.metadata} onAction={handleCardAction} />
                          )}
                          {msg.message_type === "property_card" && (
                            <PropertyContextCard metadata={msg.metadata} onAction={handleCardAction} />
                          )}
                          {msg.message_type === "lease_card" && (
                            <LeaseContextCard metadata={msg.metadata} onAction={handleCardAction} />
                          )}

                          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? "text-white/80" : "opacity-60"}`}>
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isMe && <CheckCheck className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {activeTypingUsers.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-ink-muted italic px-3 py-1 bg-surface-subtle/80 rounded-full w-fit border border-surface-border/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0.4s]" />
                    <span className="ml-1 text-[11px]">Management is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── Input bar ── */}
              <form onSubmit={handleSend} className="p-3.5 border-t border-surface-border/80 bg-surface/90 backdrop-blur-xs flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Describe an issue, request a repair, ask about lease terms..."
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    broadcastTypingStatus(e.target.value.length > 0);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border bg-surface-subtle text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs transition-all"
                />

                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputText.trim() || isSending}
                  className="bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-500 text-white h-10 px-5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-secondary">
              <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-surface-border flex items-center justify-center mb-3 text-ink-muted">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-ink">No Thread Selected</h3>
              <p className="text-xs text-ink-muted mt-1 max-w-xs">Select a conversation thread from the list on the left to review updates or message management.</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export function ContextualMessagesPortal() {
  return (
    <RealtimeMessagingProvider>
      <ResidentInboxContent />
    </RealtimeMessagingProvider>
  );
}
