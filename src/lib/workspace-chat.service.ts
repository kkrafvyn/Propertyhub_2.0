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

export const workspaceChatService = {
  async ensureDefaults(organizationId: string) {
    const { error } = await db.rpc("ensure_default_workspace_channels", {
      p_organization_id: organizationId,
    });
    if (error) throw error;
  },

  async listChannels(organizationId: string) {
    await this.ensureDefaults(organizationId).catch(() => undefined);
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
    const { data: conversation, error: convError } = await db
      .from("conversations")
      .insert({
        conversation_type: "channel",
        organization_id: input.organizationId,
      })
      .select("id")
      .single();
    if (convError) throw convError;

    const { data: members } = await db
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", input.organizationId);

    if (!input.isPrivate) {
      const rows = (members || []).map((m: { user_id: string }) => ({
        conversation_id: conversation.id,
        user_id: m.user_id,
        participant_role: "member",
      }));
      if (rows.length) {
        await db.from("conversation_participants").insert(rows);
      }
    } else {
      await db.from("conversation_participants").insert({
        conversation_id: conversation.id,
        user_id: input.createdBy,
        participant_role: "admin",
      });
    }

    const { data, error } = await db
      .from("workspace_channels")
      .insert({
        organization_id: input.organizationId,
        conversation_id: conversation.id,
        slug,
        name: input.name.trim(),
        description: input.description || null,
        is_private: Boolean(input.isPrivate),
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as WorkspaceChannel;
  },

  async listMemberDirectThreads(organizationId: string, userId: string) {
    const { data: members } = await db
      .from("organization_members")
      .select("user_id, users:users(id, full_name, email)")
      .eq("organization_id", organizationId);

    const { data: participations } = await db
      .from("conversation_participants")
      .select("conversation_id, conversations:conversations(id, conversation_type, organization_id, updated_at)")
      .eq("user_id", userId);

    const direct = (participations || [])
      .map((row: any) => row.conversations)
      .filter(
        (c: any) =>
          c &&
          c.conversation_type === "direct" &&
          (!c.organization_id || c.organization_id === organizationId),
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
    const { data: existingMine } = await db
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", input.currentUserId);

    const mineIds = (existingMine || []).map((r: any) => r.conversation_id);
    if (mineIds.length) {
      const { data: shared } = await db
        .from("conversation_participants")
        .select("conversation_id, conversations:conversations(id, conversation_type, organization_id)")
        .eq("user_id", input.otherUserId)
        .in("conversation_id", mineIds);

      const hit = (shared || []).find(
        (row: any) =>
          row.conversations?.conversation_type === "direct" &&
          (!row.conversations.organization_id ||
            row.conversations.organization_id === input.organizationId),
      );
      if (hit?.conversation_id) return hit.conversation_id as string;
    }

    const { data: conversation, error } = await db
      .from("conversations")
      .insert({
        conversation_type: "direct",
        organization_id: input.organizationId,
      })
      .select("id")
      .single();
    if (error) throw error;

    await db.from("conversation_participants").insert([
      { conversation_id: conversation.id, user_id: input.currentUserId, participant_role: "member" },
      { conversation_id: conversation.id, user_id: input.otherUserId, participant_role: "member" },
    ]);

    return conversation.id as string;
  },

  async listMessages(conversationId: string, limit = 80) {
    const { data, error } = await db
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at, message_type")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
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
