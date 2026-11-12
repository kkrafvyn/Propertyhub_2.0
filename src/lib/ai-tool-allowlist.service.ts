import { supabase } from "./supabase";

const db = supabase as any;

export const DEFAULT_AI_TOOLS = [
  { toolName: "night_watch_audit", requiredPermission: "finance:read" },
  { toolName: "collections_briefing", requiredPermission: "finance:read" },
  { toolName: "maintenance_triage", requiredPermission: "listings:read" },
  { toolName: "sop_lookup", requiredPermission: "listings:read" },
  { toolName: "asset_registry_scan", requiredPermission: "listings:read" },
  { toolName: "owner_statement_preview", requiredPermission: "finance:read" },
];

export const aiToolAllowlistService = {
  async getOrgControl(organizationId: string) {
    const { data, error } = await db
      .from("ai_org_controls")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) throw error;
    return data as { globally_enabled: boolean } | null;
  },

  async setGlobalKillSwitch(organizationId: string, enabled: boolean, updatedBy?: string) {
    const { data, error } = await db
      .from("ai_org_controls")
      .upsert({
        organization_id: organizationId,
        globally_enabled: enabled,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async listTools(organizationId: string) {
    const { data, error } = await db
      .from("ai_tool_allowlist")
      .select("*")
      .eq("organization_id", organizationId)
      .order("tool_name");
    if (error) throw error;
    return data || [];
  },

  async seedDefaults(organizationId: string, updatedBy?: string) {
    const rows = DEFAULT_AI_TOOLS.map((tool) => ({
      organization_id: organizationId,
      tool_name: tool.toolName,
      enabled: true,
      required_permission: tool.requiredPermission,
      updated_by: updatedBy || null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await db.from("ai_tool_allowlist").upsert(rows);
    if (error) throw error;
  },

  async setToolEnabled(organizationId: string, toolName: string, enabled: boolean, updatedBy?: string) {
    const { data, error } = await db
      .from("ai_tool_allowlist")
      .upsert({
        organization_id: organizationId,
        tool_name: toolName,
        enabled,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async assertToolAllowed(organizationId: string, toolName: string, agentName?: string) {
    const { error } = await db.rpc('consume_ai_action', {
      p_organization: organizationId, p_agent: agentName || toolName,
      p_tool: toolName, p_request: crypto.randomUUID(),
    });
    if (error) throw new Error(error.message || 'AI governance could not be verified.');
    return true;
  },
};
