import { approvalCenterService, type PendingApprovalItem } from "./approval-center.service";
import { exceptionCenterService, type OperationalException } from "./exception-center.service";
import { agenticAIOrchestratorService } from "./agentic-ai-orchestrator.service";
import { supabase } from "./supabase";

const db = supabase as any;

export type WorkItemKind = "approval" | "exception" | "ai_pending" | "task" | "maintenance";

export interface WorkItem {
  id: string;
  kind: WorkItemKind;
  title: string;
  subtitle: string;
  urgency: "low" | "medium" | "high" | "critical";
  href: string;
  createdAt: string;
}

export const workQueueService = {
  async getMyWork(organizationId: string, userId?: string): Promise<WorkItem[]> {
    const items: WorkItem[] = [];

    const [approvals, exceptions] = await Promise.all([
      approvalCenterService.getPendingApprovals(organizationId).catch(() => [] as PendingApprovalItem[]),
      exceptionCenterService.getOperationalExceptions(organizationId).catch(() => [] as OperationalException[]),
    ]);

    for (const a of approvals) {
      items.push({
        id: `approval-${a.id}`,
        kind: "approval",
        title: a.title,
        subtitle: a.subtitle,
        urgency: a.urgency,
        href: "approval-center",
        createdAt: a.createdAt,
      });
    }

    for (const e of exceptions) {
      items.push({
        id: `exception-${e.id}`,
        kind: "exception",
        title: e.title,
        subtitle: e.description,
        urgency: e.severity === "critical" ? "critical" : e.severity === "warning" ? "high" : "low",
        href: "exception-center",
        createdAt: e.occurredAt,
      });
    }

    try {
      const ledger = await agenticAIOrchestratorService.getLedgerEntriesLive(organizationId);
      for (const entry of ledger.filter((l) => l.approvalStatus === "pending_approval")) {
        items.push({
          id: `ai-${entry.id}`,
          kind: "ai_pending",
          title: entry.actionType,
          subtitle: entry.reasoning,
          urgency: entry.riskLevel === "LEVEL_3" || entry.riskLevel === "LEVEL_2" ? "high" : "medium",
          href: "ai-command-center",
          createdAt: entry.createdAt,
        });
      }
    } catch {
      /* ledger optional */
    }

    if (userId) {
      const { data: tasks } = await db
        .from("workspace_tasks")
        .select("id, title, status, due_at, created_at")
        .eq("organization_id", organizationId)
        .eq("assigned_to", userId)
        .not("status", "in", '("done","cancelled","completed")')
        .order("created_at", { ascending: false })
        .limit(20);
      for (const t of (tasks || []) as any[]) {
        items.push({
          id: `task-${t.id}`,
          kind: "task",
          title: t.title || "Open task",
          subtitle: t.due_at ? `Due ${new Date(t.due_at).toLocaleDateString()}` : t.status,
          urgency: "medium",
          href: "tasks",
          createdAt: t.created_at,
        });
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  },
};
