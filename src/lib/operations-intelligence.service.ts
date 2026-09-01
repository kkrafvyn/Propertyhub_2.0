import { supabase } from "./supabase";
const db = supabase as any;
export const operationsIntelligenceService = {
  async createRootIncident(input: { estateId: string; title: string; category: string; createdBy: string; assignedToUserId?: string }) {
    const { data, error } = await db.from("estate_root_incidents").insert({ estate_id: input.estateId, title: input.title.trim(), category: input.category.trim(), created_by: input.createdBy, assigned_to_user_id: input.assignedToUserId || null }).select("*").single(); if (error) throw error; return data;
  },
  async linkIssue(issueId: string, rootIncidentId: string) { const { data, error } = await db.from("estate_issues").update({ root_incident_id: rootIncidentId }).eq("id", issueId).select("*").single(); if (error) throw error; return data; },
  async raiseAiAlert(input: { organizationId: string; agentName: string; category: string; severity: "low" | "medium" | "high" | "critical"; title: string; evidence?: Record<string, unknown>; approvalRequired?: boolean }) { const { data, error } = await db.from("estate_ai_watch_alerts").insert({ organization_id: input.organizationId, agent_name: input.agentName, category: input.category, severity: input.severity, title: input.title, evidence: input.evidence || {}, approval_required: input.approvalRequired ?? true }).select("*").single(); if (error) throw error; return data; },
};
