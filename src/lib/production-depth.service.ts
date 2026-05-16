import { supabase } from "./supabase";
import {
  buildCrmTaskDrafts,
  buildDefaultEscrowMilestoneDrafts,
  buildPropertyMediaReadiness,
  type CrmTaskDraft,
  type EscrowMilestoneStatus,
} from "./production-depth.helpers";

const db = supabase as any;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(value?: string | null) {
  if (!value) return null;
  return UUID_PATTERN.test(value) ? value : null;
}

export interface TrackAnalyticsEventInput {
  userId?: string | null;
  organizationId?: string | null;
  listingId?: string | null;
  dealCaseId?: string | null;
  eventType: string;
  source?: "web" | "mobile" | "workspace" | "edge";
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AskConciergeInput {
  userId: string;
  listingId?: string | null;
  dealCaseId?: string | null;
  prompt: string;
  context?: Record<string, unknown>;
}

export interface CreateBuyerGroupInput {
  ownerUserId: string;
  ownerEmail?: string | null;
  listingId?: string | null;
  dealCaseId?: string | null;
  title: string;
}

export interface InviteBuyerGroupMemberInput {
  groupId: string;
  email: string;
  role: "buyer" | "family_reviewer" | "legal_reviewer" | "local_representative" | "advisor";
  invitedByUserId: string;
  note?: string | null;
}

export interface AddBuyerGroupCommentInput {
  groupId: string;
  authorUserId: string;
  authorName?: string | null;
  listingId?: string | null;
  dealCaseId?: string | null;
  body: string;
  visibility?: "group" | "buyer_only" | "legal_only";
}

export const analyticsService = {
  async trackEvent(input: TrackAnalyticsEventInput) {
    const { error } = await db
      .from("analytics_events")
      .insert({
        user_id: normalizeUuid(input.userId),
        organization_id: normalizeUuid(input.organizationId),
        listing_id: normalizeUuid(input.listingId),
        deal_case_id: normalizeUuid(input.dealCaseId),
        event_type: input.eventType,
        source: input.source || "web",
        session_id: input.sessionId || null,
        metadata: input.metadata || {},
      });

    if (error) {
      if (error.code === "PGRST205") return null;
      throw error;
    }
    return null;
  },
};

export const aiConciergeService = {
  async ask(input: AskConciergeInput) {
    const { data, error } = await supabase.functions.invoke("ai-concierge", {
      body: {
        listingId: input.listingId || null,
        dealCaseId: input.dealCaseId || null,
        prompt: input.prompt,
        context: input.context || {},
      },
    });

    if (error) throw error;
    return data as {
      response: string;
      conversation?: any;
    };
  },

  async getHistory(userId: string, limit = 10) {
    const { data, error } = await db
      .from("ai_concierge_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};

export const buyerGroupService = {
  async getVisibleGroups() {
    const { data, error } = await db
      .from("buyer_groups")
      .select(
        `
        *,
        members:buyer_group_members(*),
        comments:buyer_group_comments(*)
      `
      )
      .order("updated_at", { ascending: false })
      .limit(25);

    if (error) throw error;
    return data || [];
  },

  async createGroup(input: CreateBuyerGroupInput) {
    const { data: group, error } = await db
      .from("buyer_groups")
      .insert({
        owner_user_id: input.ownerUserId,
        listing_id: input.listingId || null,
        deal_case_id: input.dealCaseId || null,
        title: input.title,
      })
      .select()
      .single();

    if (error) throw error;

    if (input.ownerEmail) {
      await db.from("buyer_group_members").insert({
        group_id: group.id,
        user_id: input.ownerUserId,
        email: input.ownerEmail,
        role: "buyer",
        status: "accepted",
        invited_by_user_id: input.ownerUserId,
        last_activity_at: new Date().toISOString(),
      });
    }

    return group;
  },

  async inviteMember(input: InviteBuyerGroupMemberInput) {
    const { data, error } = await db
      .from("buyer_group_members")
      .upsert(
        {
          group_id: input.groupId,
          email: input.email.trim().toLowerCase(),
          role: input.role,
          status: "invited",
          invited_by_user_id: input.invitedByUserId,
          note: input.note || null,
          last_activity_at: new Date().toISOString(),
        },
        { onConflict: "group_id,email" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async acceptInvite(memberId: string, userId: string) {
    const { data, error } = await db
      .from("buyer_group_members")
      .update({
        user_id: userId,
        status: "accepted",
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", memberId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addComment(input: AddBuyerGroupCommentInput) {
    const { data, error } = await db
      .from("buyer_group_comments")
      .insert({
        group_id: input.groupId,
        listing_id: input.listingId || null,
        deal_case_id: input.dealCaseId || null,
        author_user_id: input.authorUserId,
        author_name: input.authorName || null,
        body: input.body,
        visibility: input.visibility || "group",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export const escrowMilestoneService = {
  async getMilestonesForDeal(dealCaseId: string) {
    const { data, error } = await db
      .from("escrow_milestones")
      .select("*")
      .eq("deal_case_id", dealCaseId)
      .order("due_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async ensureDefaultMilestones(input: { dealCase: any; createdBy: string }) {
    const existing = await this.getMilestonesForDeal(input.dealCase.id);
    if (existing.length > 0) return existing;

    const drafts = buildDefaultEscrowMilestoneDrafts({ dealCase: input.dealCase }).map((draft) => ({
      ...draft,
      deal_case_id: input.dealCase.id,
      organization_id: input.dealCase.organization_id,
      listing_id: input.dealCase.listing_id || input.dealCase.listing?.id || null,
      user_id: input.dealCase.user_id,
      currency: input.dealCase.listing?.currency || "GHS",
      created_by: input.createdBy,
    }));

    const { data, error } = await db
      .from("escrow_milestones")
      .insert(drafts)
      .select()
      .order("due_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateMilestoneStatus(id: string, status: EscrowMilestoneStatus) {
    const { data, error } = await db
      .from("escrow_milestones")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export const crmTaskService = {
  async getOrganizationTasks(organizationId: string) {
    const { data, error } = await db
      .from("crm_tasks")
      .select("*")
      .eq("organization_id", organizationId)
      .order("due_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async generateSuggestedTasks(input: {
    organizationId: string;
    cases?: any[];
    leads?: any[];
    viewings?: any[];
    payments?: any[];
  }) {
    const existing = await this.getOrganizationTasks(input.organizationId);
    const drafts = buildCrmTaskDrafts(input).filter((draft) => {
      return !existing.some((task: any) => isSameOpenTask(task, draft));
    });

    if (drafts.length === 0) return existing;

    const { data, error } = await db
      .from("crm_tasks")
      .insert(
        drafts.map((draft) => ({
          ...draft,
          organization_id: input.organizationId,
        }))
      )
      .select()
      .order("due_at", { ascending: true });

    if (error) throw error;
    return [...(data || []), ...existing].sort((a, b) => {
      return new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime();
    });
  },

  async updateTaskStatus(taskId: string, status: "open" | "in_progress" | "completed" | "snoozed" | "cancelled") {
    const { data, error } = await db
      .from("crm_tasks")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export const propertyMediaReadinessService = {
  buildReadiness: buildPropertyMediaReadiness,

  async updateMediaMetadata(
    mediaId: string,
    updates: {
      mediaType?: string;
      roomLabel?: string | null;
      caption?: string | null;
      width?: number | null;
      height?: number | null;
      durationSeconds?: number | null;
      externalEmbedUrl?: string | null;
      processingStatus?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const { data, error } = await db
      .from("property_media")
      .update({
        media_type: updates.mediaType,
        room_label: updates.roomLabel,
        caption: updates.caption,
        width: updates.width,
        height: updates.height,
        duration_seconds: updates.durationSeconds,
        external_embed_url: updates.externalEmbedUrl,
        processing_status: updates.processingStatus,
        metadata: updates.metadata,
      })
      .eq("id", mediaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

function isSameOpenTask(existing: any, draft: CrmTaskDraft) {
  if (!["open", "in_progress", "snoozed"].includes(String(existing.status || ""))) return false;
  if (existing.task_type !== draft.task_type) return false;
  if (draft.lead_id && existing.lead_id === draft.lead_id) return true;
  if (draft.deal_case_id && existing.deal_case_id === draft.deal_case_id) return true;

  const metadata = existing.metadata || {};
  return Boolean(
    (draft.metadata.viewingId && metadata.viewingId === draft.metadata.viewingId) ||
      (draft.metadata.paymentId && metadata.paymentId === draft.metadata.paymentId)
  );
}
