import { supabase } from "./supabase";
import { workspaceTasksService } from "./workspace-tasks.service";
import { dealCaseService } from "./dealcase.service";

const db = supabase as any;

export type WorkspaceChannel = {
  id: string;
  organization_id: string;
  conversation_id: string;
  slug: string;
  name: string;
  description: string | null;
  is_private: boolean;
  property_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  message_type: string;
};

export type MessageCursor = { createdAt: string; id: string };
export type WorkspaceMessagePage = {
  messages: WorkspaceChatMessage[];
  olderCursor: MessageCursor | null;
};

export const workspaceChatService = {
  async ensureDefaults(organizationId: string) {
    const { error } = await db.rpc("ensure_default_workspace_channels", {
      p_organization_id: organizationId,
    });
    if (error) throw error;
  },

  async listChannels(organizationId: string) {
    await this.ensureDefaults(organizationId);
    const { data, error } = await db
      .from("workspace_channels")
      .select("*")
      .eq("organization_id", organizationId)
      .order("slug", { ascending: true });
    if (error) throw error;
    return (data || []) as WorkspaceChannel[];
  },

  async createChannel(input: {
    organizationId: string;
    createdBy: string;
    slug: string;
    name: string;
    description?: string;
    isPrivate?: boolean;
  }) {
    const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const { data, error } = await db.rpc("create_workspace_channel", {
      p_organization_id: input.organizationId,
      p_slug: slug,
      p_name: input.name.trim(),
      p_description: input.description || null,
      p_is_private: Boolean(input.isPrivate),
    });
    if (error) throw error;
    return data as WorkspaceChannel;
  },

  async listMemberDirectThreads(organizationId: string, userId: string) {
    const { data: members, error: memberError } = await db
      .from("organization_members")
      .select("user_id, users:users(id, full_name, email)")
      .eq("organization_id", organizationId);
    if (memberError) throw memberError;

    const { data: participations, error: participationError } = await db
      .from("conversation_participants")
      .select("conversation_id, conversations:conversations(id, conversation_type, organization_id, updated_at)")
      .eq("user_id", userId);
    if (participationError) throw participationError;

    const direct = (participations || [])
      .map((row: any) => row.conversations)
      .filter(
        (c: any) =>
          c &&
          c.conversation_type === "direct" &&
          c.organization_id === organizationId,
      );

    return {
      members: (members || []).filter((m: any) => m.user_id !== userId),
      threads: direct,
    };
  },

  async openDirectMessage(input: {
    organizationId: string;
    currentUserId: string;
    otherUserId: string;
  }) {
    const { data, error } = await db.rpc("open_workspace_direct_message", {
      p_organization_id: input.organizationId,
      p_other_user_id: input.otherUserId,
    });
    if (error) throw error;
    return data as string;
  },

  async listMessages(conversationId: string, limit = 80) {
    return (await this.listMessagePage(conversationId, { limit })).messages;
  },

  async listMessagePage(
    conversationId: string,
    options: { before?: MessageCursor | null; limit?: number } = {},
  ): Promise<WorkspaceMessagePage> {
    const limit = Math.max(1, Math.min(100, Math.floor(options.limit || 80)));
    const { data, error } = await db.rpc("list_workspace_messages", {
      p_conversation_id: conversationId,
      p_before_created_at: options.before?.createdAt ?? null,
      p_before_id: options.before?.id ?? null,
      p_limit: limit + 1,
    });
    if (error) throw error;
    const rows = (data || []) as WorkspaceChatMessage[];
    const page = rows.slice(0, limit).reverse();
    return {
      messages: page,
      olderCursor: rows.length > limit && page[0]
        ? { createdAt: page[0].created_at, id: page[0].id }
        : null,
    };
  },

  async sendMessage(input: {
    conversationId: string;
    senderId: string;
    content: string;
  }) {
    const { data, error } = await db
      .from("messages")
      .insert({
        conversation_id: input.conversationId,
        sender_id: input.senderId,
        content: input.content.trim(),
        message_type: "text",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async assignTaskFromMessage(input: {
    organizationId: string;
    createdBy: string;
    assignedTo: string;
    title: string;
    description?: string;
    conversationId: string;
    messageId?: string;
  }) {
    return workspaceTasksService.createTask({
      organizationId: input.organizationId,
      createdBy: input.createdBy,
      assignedTo: input.assignedTo,
      title: input.title,
      description:
        input.description ||
        `Assigned from chat${input.messageId ? ` (message ${input.messageId})` : ""} · conversation ${input.conversationId}`,
      taskType: "follow_up",
    });
  },

  async assignLeadFromMessage(input: {
    dealCaseId: string;
    assignedTo: string;
  }) {
    return dealCaseService.updateDealCase(input.dealCaseId, {
      assigned_to: input.assignedTo,
    } as any);
  },
};
