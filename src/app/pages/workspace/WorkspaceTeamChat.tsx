import { useEffect, useMemo, useRef, useState } from "react";
import { Hash, Loader2, MessageSquare, Plus, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { workspaceChatService, type WorkspaceChannel, type MessageCursor } from "../../../lib/workspace-chat.service";
import { organizationService } from "../../../lib/organization.service";
import { canWorkspace } from "../../../lib/workspace-permissions";
import type { MemberRole } from "../../../lib/workspace";

type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

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
    setMessages(previous => before ? [...page.messages, ...previous].filter((message,index,all)=>all.findIndex(m=>m.id===message.id)===index) as ChatMessage[] : page.messages as ChatMessage[]);
    setOlderCursor(page.olderCursor);
    setHistoryError("");
  };

  const loadOlder = async () => {
    if (!activeConversationId || !olderCursor || historyLock.current === activeConversationId) return;
    const id = activeConversationId;
    historyLock.current = id; setLoadingHistory(true);
    try { await loadMessages(id, olderCursor); }
    catch { if (activeId.current === id) setHistoryError('History could not be loaded. Retry to keep your current messages.'); }
    finally { if (historyLock.current === id) { historyLock.current = null; setLoadingHistory(false); } }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadSidebar()
      .catch((error) => toast.error(error.message || "Failed to load team chat"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    setMessages([]); setOlderCursor(null); setHistoryError(""); setLoadingHistory(false);
    const id = activeConversationId;
    void loadMessages(id).catch(() => { if (activeId.current === id) setHistoryError('Messages could not be loaded. Retry.'); });
  }, [activeConversationId]);

  const send = async () => {
    if (!activeConversationId || !draft.trim() || sendLock.current) return;
    const id = activeConversationId, content = draft;
    sendLock.current = true; setSending(true);
    try {
      const message = await workspaceChatService.sendMessage({
        conversationId: id,
        senderId: currentUserId,
        content,
      });
      if (activeId.current === id) {
        setDraft(current => current === content ? '' : current);
        setMessages(current => current.some(m=>m.id===message.id) ? current : [...current,message]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send");
    } finally {
      sendLock.current = false; setSending(false);
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
      toast.success(`#${channel.slug} created`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create channel");
    } finally {
      setCreating(false);
    }
  };

  const assignTask = async (message: ChatMessage) => {
    if (!assignUserId) {
      toast.error("Select a teammate to assign");
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
      toast.success("Task assigned from chat");
    } catch (error: any) {
      toast.error(error.message || "Failed to assign task");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-16 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading team chat…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 min-h-[70vh]">
      <Card className="p-3 space-y-4 overflow-y-auto">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold">Channels</h2>
          </div>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => {
                  setActiveConversationId(channel.conversation_id);
                  setActiveLabel(`#${channel.slug}`);
                }}
                className={`w-full text-left rounded-lg px-2 py-1.5 text-sm ${
                  activeConversationId === channel.conversation_id
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "hover:bg-muted/60"
                }`}
              >
                #{channel.slug}
              </button>
            ))}
          </div>
          {canManage ? (
            <div className="mt-3 flex gap-2">
              <Input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="New channel"
                className="h-8 text-xs"
              />
              <Button size="sm" onClick={() => void createChannel()} disabled={creating}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <UserRound className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold">Direct messages</h2>
          </div>
          <div className="space-y-1">
            {members
              .filter((member) => member.user_id !== currentUserId)
              .map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => void openDm(member.user_id)}
                  className="w-full text-left rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  {memberNameById.get(member.user_id)}
                </button>
              ))}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col min-h-[70vh]">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {activeLabel}
            </h1>
            <p className="text-xs text-muted-foreground">
              Assign work from any message. Channels are for the whole team.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-xs"
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
            >
              <option value="">Assign to…</option>
              {members
                .filter((member) => member.user_id !== currentUserId)
                .map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {memberNameById.get(member.user_id)}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {historyError && <p role="alert" className="text-destructive text-sm">{historyError} <button className="underline" onClick={() => olderCursor ? void loadOlder() : activeConversationId && void loadMessages(activeConversationId).catch(()=>{})}>Retry</button></p>}
          {olderCursor && <Button variant="outline" disabled={loadingHistory} onClick={()=>void loadOlder()}>{loadingHistory ? 'Loading history…' : 'Load older messages'}</Button>}
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No messages yet. Start the conversation.
            </p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">
                    {memberNameById.get(message.sender_id) || "Member"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {new Date(message.created_at).toLocaleString()}
                  </Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <Button size="sm" variant="outline" onClick={() => void assignTask(message as any)}>
                  Assign task
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-3 flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the team…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button disabled={sending || !draft.trim() || !activeConversationId} onClick={() => void send()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
