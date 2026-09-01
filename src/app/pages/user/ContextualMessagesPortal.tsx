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
  MessageCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
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
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resident Portal & Messages</h1>
          <p className="text-sm text-muted-foreground">
            Direct real-time connection to your estate manager, leasing team, and 24/7 AI operations.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold border border-violet-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Operations Active</span>
        </div>
      </div>

      <div className="h-[600px] flex rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* ── Left list ──────────────────────────────────────────────────────── */}
        <div className="w-72 sm:w-80 border-r border-border flex flex-col bg-muted/20">
          <div className="p-3.5 border-b border-border font-semibold text-xs text-foreground">
            Your Property Threads
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No active conversations.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full text-left p-3 transition-colors flex items-start gap-2.5 ${
                      isSelected ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {conv.title || "Estate Management"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate">
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
        <div className="flex-1 flex flex-col min-w-0 bg-background/50">
          {activeConversation ? (
            <>
              <ContextHeaderBanner conversation={activeConversation} />

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-3">
                    <p className="text-xs">You can describe any issue or request in your own words.</p>
                    <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                      {samplePrompts.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => setInputText(prompt)}
                          className="text-[11px] px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/40 text-foreground transition-colors text-left"
                        >
                          "{prompt}"
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
                          <span className="text-[10px] text-muted-foreground font-medium mb-1 px-1 flex items-center gap-1">
                            {isAI && <Sparkles className="w-3 h-3 text-violet-500" />}
                            {msg.sender_name || (isAI ? "BaytMiftah AI" : "Property Manager")}
                          </span>
                        )}

                        <div
                          className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-xs"
                              : isAI
                              ? "bg-violet-500/10 text-foreground border border-violet-500/20 rounded-bl-xs"
                              : "bg-card border border-border text-foreground rounded-bl-xs"
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

                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70">
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isMe && <CheckCheck className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {activeTypingUsers.length > 0 && (
                  <div className="text-xs text-muted-foreground italic px-2">
                    Management is typing...
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Describe an issue, request a repair, or ask a question..."
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    broadcastTypingStatus(e.target.value.length > 0);
                  }}
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <MessageCircle className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs">Select a conversation thread to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ContextualMessagesPortal() {
  return (
    <RealtimeMessagingProvider>
      <ResidentInboxContent />
    </RealtimeMessagingProvider>
  );
}
