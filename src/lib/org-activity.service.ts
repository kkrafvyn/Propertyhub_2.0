import { supabase } from "./supabase";
import { canWorkspace } from "./workspace-permissions";
import type { MemberRole } from "./workspace";
import type { TimelineActivity } from "../app/components/ux/ActivityTimeline";

const db = supabase as any;

export type OrgActivityScope = "org" | "personal";

function isExecutiveRole(role?: MemberRole | string | null) {
  if (!role) return false;
  return canWorkspace(role as MemberRole, "team:manage");
}

export const orgActivityService = {
  isExecutiveRole,

  async getRecentActivity(input: {
    organizationId: string;
    userId?: string | null;
    role?: MemberRole | string | null;
    workspaceBasePath: string;
    limit?: number;
  }): Promise<TimelineActivity[]> {
    const limit = input.limit ?? 25;
    const scope: OrgActivityScope =
      input.role && isExecutiveRole(input.role) ? "org" : "personal";

    const [tasksRes, dealsRes, fieldRes, eventsRes, inboxRes] = await Promise.all([
      db
        .from("workspace_tasks")
        .select("id, title, status, assigned_to, updated_at, created_at")
        .eq("organization_id", input.organizationId)
        .order("updated_at", { ascending: false })
        .limit(limit),
      db
        .from("deal_cases")
        .select("id, status, assigned_to, updated_at, created_at")
        .eq("organization_id", input.organizationId)
        .order("updated_at", { ascending: false })
        .limit(limit),
      db
        .from("field_activity_logs")
        .select("id, title, details, user_id, created_at")
        .eq("organization_id", input.organizationId)
        .order("created_at", { ascending: false })
        .limit(limit),
      db
        .from("operational_events")
        .select("id, event_type, message, severity, created_at")
        .eq("organization_id", input.organizationId)
        .order("created_at", { ascending: false })
        .limit(limit),
      db
        .from("organization_conversations")
        .select("id, assigned_to, updated_at, created_at")
        .eq("organization_id", input.organizationId)
        .order("updated_at", { ascending: false })
        .limit(limit),
    ].map((query) =>
      Promise.resolve(query).catch(() => ({ data: [], error: null })),
    ));

    const items: TimelineActivity[] = [];

    for (const task of tasksRes.data || []) {
      if (scope === "personal" && input.userId && task.assigned_to && task.assigned_to !== input.userId) {
        continue;
      }
      items.push({
        id: `task-${task.id}`,
        message: `Task “${task.title || "Untitled"}” · ${task.status}`,
        href: `${input.workspaceBasePath}/tasks`,
        createdAt: task.updated_at || task.created_at,
      });
    }

    for (const deal of dealsRes.data || []) {
      if (scope === "personal" && input.userId && deal.assigned_to && deal.assigned_to !== input.userId) {
        continue;
      }
      items.push({
        id: `deal-${deal.id}`,
        message: `Deal case · ${deal.status}`,
        href: `${input.workspaceBasePath}/leads`,
        createdAt: deal.updated_at || deal.created_at,
      });
    }

    for (const log of fieldRes.data || []) {
      if (scope === "personal" && input.userId && log.user_id && log.user_id !== input.userId) {
        continue;
      }
      items.push({
        id: `field-${log.id}`,
        message: log.title || log.details || "Field activity logged",
        href: `${input.workspaceBasePath}/mobile-settings`,
        createdAt: log.created_at,
      });
    }

    for (const event of eventsRes.data || []) {
      items.push({
        id: `ops-${event.id}`,
        message: event.message || `Ops event · ${event.event_type || event.severity || "update"}`,
        href: `${input.workspaceBasePath}/exception-center`,
        createdAt: event.created_at,
      });
    }

    for (const thread of inboxRes.data || []) {
      if (scope === "personal" && input.userId && thread.assigned_to && thread.assigned_to !== input.userId) {
        continue;
      }
      items.push({
        id: `inbox-${thread.id}`,
        message: "Shared inbox thread updated",
        href: `${input.workspaceBasePath}/team-collaboration`,
        createdAt: thread.updated_at || thread.created_at,
      });
    }

    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return items.slice(0, limit);
  },
};
