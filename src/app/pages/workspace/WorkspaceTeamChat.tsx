import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Hash, Loader2, MessageSquare, Plus, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { workspaceChatService, type WorkspaceChannel, type MessageCursor } from "../../../lib/workspace-chat.service";
import { organizationService } from "../../../lib/organization.service";
import { canWorkspace } from "../../../lib/workspace-permissions";
import type { MemberRole } from "../../../lib/workspace";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function WorkspaceTeamChat({
  organizationId,
  currentUserId,
  currentRole,
}: {
  organizationId: string;
  currentUserId: string;
  currentRole?: MemberRole | null;
}) {
  const canManage = canWorkspace(currentRole || "agent", "team:manage");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [channels, setChannels] = useState<WorkspaceChannel[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState("#general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [creating, setCreating] = useState(false);
  const [olderCursor, setOlderCursor] = useState<MessageCursor | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAssignFor, setShowAssignFor] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeId = useRef(activeConversationId);
  activeId.current = activeConversationId;
  const sendLock = useRef(false);
  const historyLock = useRef<string | null>(null);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      map.set(
        member.user_id,
        member.users?.full_name || member.user?.full_name || member.users?.email || "Member",
      );
    }
    return map;
  }, [members]);

  const loadSidebar = async () => {
    const [channelRows, memberRows] = await Promise.all([
      workspaceChatService.listChannels(organizationId),
      organizationService.getOrganizationMembers(organizationId),
    ]);
    setChannels(channelRows);
    setMembers(memberRows || []);
    if (!activeConversationId && channelRows[0]) {
      setActiveConversationId(channelRows[0].conversation_id);
      setActiveLabel(`#${channelRows[0].slug}`);
    }
  };

  const loadMessages = async (conversationId: string, before?: MessageCursor | null) => {
    const page = await workspaceChatService.listMessagePage(conversationId, { before });
    if (activeId.current !== conversationId) return;
    setMessages((previous) =>
      before
        ? [...page.messages, ...previous].filter(
            (message, index, all) => all.findIndex((m) => m.id === message.id) === index,
          ) as ChatMessage[]
        : (page.messages as ChatMessage[]),
    );
    setOlderCursor(page.olderCursor);
    setHistoryError("");
  };

  const loadOlder = async () => {
    if (!activeConversationId || !olderCursor || historyLock.current === activeConversationId) return;
    const id = activeConversationId;
    historyLock.current = id;
    setLoadingHistory(true);
    try {
      await loadMessages(id, olderCursor);
    } catch {
      if (activeId.current === id) setHistoryError("Couldn't load older messages. Tap Retry.");
    } finally {
      if (historyLock.current === id) {
        historyLock.current = null;
        setLoadingHistory(false);
      }
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadSidebar()
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to load team chat";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    setMessages([]);
    setOlderCursor(null);
    setHistoryError("");
    setLoadingHistory(false);
    const id = activeConversationId;
    void loadMessages(id).catch(() => {
      if (activeId.current === id) setHistoryError("Messages could not be loaded. Tap Retry.");
    });
  }, [activeConversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!activeConversationId || !draft.trim() || sendLock.current) return;
    const id = activeConversationId,
      content = draft;
    sendLock.current = true;
    setSending(true);
    try {
      const message = await workspaceChatService.sendMessage({
        conversationId: id,
        senderId: currentUserId,
        content,
      });
      if (activeId.current === id) {
        setDraft((current) => (current === content ? "" : current));
        setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send");
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  const openDm = async (otherUserId: string) => {
    try {
      const conversationId = await workspaceChatService.openDirectMessage({
        organizationId,
        currentUserId,
        otherUserId,
      });
      setActiveConversationId(conversationId);
      setActiveLabel(memberNameById.get(otherUserId) || "Direct message");
      setMobileShowChat(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to open DM");
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    setCreating(true);
    try {
      const slug = newChannelName.trim().toLowerCase().replace(/\s+/g, "-");
      const channel = await workspaceChatService.createChannel({
        organizationId,
        createdBy: currentUserId,
        slug,
        name: newChannelName.trim(),
      });
      setNewChannelName("");
      await loadSidebar();
      setActiveConversationId(channel.conversation_id);
      setActiveLabel(`#${channel.slug}`);
      setMobileShowChat(true);
      toast.success(`#${channel.slug} created`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create channel");
    } finally {
      setCreating(false);
    }
  };

  const assignTask = async (message: ChatMessage) => {
    if (!assignUserId) {
      toast.error("Select a teammate to assign this message to");
      return;
    }
    if (!activeConversationId) return;
    try {
      await workspaceChatService.assignTaskFromMessage({
        organizationId,
        createdBy: currentUserId,
        assignedTo: assignUserId,
        title: `Follow up: ${message.content.slice(0, 80)}`,
        conversationId: activeConversationId,
        messageId: message.id,
      });
      toast.success("Task assigned");
      setShowAssignFor(null);
      setAssignUserId("");
    } catch (error: any) {
      toast.error(error.message || "Failed to assign task");
    }
  };

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  return (
    <WorkspacePageShell
      title="Team Chat"
      description={`${channels.length} ${channels.length === 1 ? "channel" : "channels"} · ${members.length} ${members.length === 1 ? "member" : "members"}`}
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => {
          setLoadError(null);
          setLoading(true);
          void loadSidebar().finally(() => setLoading(false));
        }}
        loadingFallback={
          <div className="space-y-4 animate-pulse">
            <div className="h-10 w-56 bg-muted rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 h-[500px]">
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded-lg" />
                ))}
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-12 bg-muted rounded-xl ${i % 2 === 0 ? "ml-auto w-2/3" : "w-2/3"}`} />
                ))}
                <div className="mt-auto h-10 bg-muted rounded-xl" />
              </div>
            </div>
          </div>
        }
      >
    <div className="space-y-4">
      {/* Chat layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 h-[calc(100vh-13rem)] min-h-[500px]">
        {/* ── Sidebar ── */}
        <Card className={`${mobileShowChat ? "hidden lg:flex" : "flex"} flex-col overflow-hidden p-0`}>
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {/* Channels */}
            <div>
              <div className="flex items-center gap-1.5 px-1 mb-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channels</span>
              </div>
              <div className="space-y-0.5">
                {channels.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">No channels yet.</p>
                )}
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => {
                      setActiveConversationId(channel.conversation_id);
                      setActiveLabel(`#${channel.slug}`);
                      setMobileShowChat(true);
                    }}
                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                      activeConversationId === channel.conversation_id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    # {channel.slug}
                  </button>
                ))}
              </div>

              {canManage && (
                <div className="mt-2.5 flex gap-1.5">
                  <Input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="New channel name"
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void createChannel();
                    }}
                  />
                  <Button size="sm" className="h-7 px-2" onClick={() => void createChannel()} disabled={creating}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Direct Messages */}
            <div>
              <div className="flex items-center gap-1.5 px-1 mb-2">
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Direct Messages</span>
              </div>
              <div className="space-y-0.5">
                {members.filter((m) => m.user_id !== currentUserId).length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">No teammates yet.</p>
                )}
                {members
                  .filter((member) => member.user_id !== currentUserId)
                  .map((member) => {
                    const name = memberNameById.get(member.user_id) || "Member";
                    const isActive =
                      activeLabel === name || activeLabel === (memberNameById.get(member.user_id) || "Direct message");
                    return (
                      <button
                        key={member.user_id}
                        type="button"
                        onClick={() => void openDm(member.user_id)}
                        className={`w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                          {getInitials(name)}
                        </span>
                        <span className="truncate">{name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Chat Panel ── */}
        <Card className={`${mobileShowChat ? "flex" : "hidden lg:flex"} flex-col overflow-hidden p-0`}>
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 lg:hidden text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setMobileShowChat(false)}
                title="Back to channels"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="text-xs">Channels</span>
              </Button>
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-semibold text-foreground truncate">{activeLabel}</span>
            </div>

            {/* Assign-to selector (only visible if a message is being assigned) */}
            {showAssignFor && (
              <div className="flex items-center gap-2 shrink-0">
                <NativeSelectControl
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                >
                  <option value="">Pick teammate…</option>
                  {members
                    .filter((member) => member.user_id !== currentUserId)
                    .map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {memberNameById.get(member.user_id)}
                      </option>
                    ))}
                </NativeSelectControl>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const msg = messages.find((m) => m.id === showAssignFor);
                    if (msg) void assignTask(msg);
                  }}
                  disabled={!assignUserId}
                >
                  Assign
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => {
                    setShowAssignFor(null);
                    setAssignUserId("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Load older */}
            {olderCursor && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" disabled={loadingHistory} onClick={() => void loadOlder()} className="text-xs">
                  {loadingHistory ? "Loading…" : "Load older messages"}
                </Button>
              </div>
            )}

            {/* History error */}
            {historyError && (
              <p role="alert" className="text-center text-xs text-destructive">
                {historyError}{" "}
                <button
                  className="underline"
                  onClick={() =>
                    olderCursor
                      ? void loadOlder()
                      : activeConversationId && void loadMessages(activeConversationId).catch(() => {})
                  }
                >
                  Retry
                </button>
              </p>
            )}

            {/* Empty state */}
            {messages.length === 0 && !historyError && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <MessageSquare className="h-8 w-8 opacity-40" />
                <div className="text-center">
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs mt-1">Be the first to say something in {activeLabel}</p>
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((message) => {
              const isMe = message.sender_id === currentUserId;
              const name = memberNameById.get(message.sender_id) || "Member";
              return (
                <div key={message.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar */}
                  {!isMe && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                      {getInitials(name)}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`group max-w-[70%] space-y-1 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    {!isMe && (
                      <span className="text-[11px] font-medium text-muted-foreground px-1">{name}</span>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {message.content}
                    </div>
                    <div className={`flex items-center gap-2 px-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      <span className="text-[10px] text-muted-foreground">{formatTime(message.created_at)}</span>
                      <button
                        type="button"
                        onClick={() => setShowAssignFor(showAssignFor === message.id ? null : message.id)}
                        className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground underline"
                      >
                        Assign task
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-border bg-card p-3 shrink-0">
            <div className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={activeConversationId ? `Message ${activeLabel}…` : "Select a channel to start chatting"}
                disabled={!activeConversationId}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                className="flex-1"
              />
              <Button
                disabled={sending || !draft.trim() || !activeConversationId}
                onClick={() => void send()}
                size="sm"
                className="shrink-0 h-10 px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground px-1">Press Enter to send · Hover a message to assign it as a task</p>
          </div>
        </Card>
      </div>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
