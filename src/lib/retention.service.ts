import { supabase } from "./supabase";

const db = supabase as any;

export const DEFAULT_RETENTION_ENTITIES = [
  { entity: "notification_logs", days: 365 },
  { entity: "estate_automation_events", days: 180 },
  { entity: "estate_ai_action_logs", days: 730 },
];

export const retentionService = {
  async listPolicies(organizationId: string) {
    const { data, error } = await db
      .from("data_retention_policies")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) throw error;
    return data || [];
  },

  async upsertPolicy(organizationId: string, entity: string, retentionDays: number, updatedBy?: string) {
    if (retentionDays < 30) throw new Error("Retention must be at least 30 days");
    const { data, error } = await db
      .from("data_retention_policies")
      .upsert({
        organization_id: organizationId,
        entity,
        retention_days: retentionDays,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async listHolds(organizationId: string) {
    const { data, error } = await db
      .from("legal_holds")
      .select("*")
      .eq("organization_id", organizationId)
      .is("released_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async placeHold(input: { organizationId: string; entity: string; entityId?: string; reason: string; createdBy?: string }) {
    if (!input.reason.trim()) throw new Error("A legal-hold reason is required");
    const { data, error } = await db
      .from("legal_holds")
      .insert({
        organization_id: input.organizationId,
        entity: input.entity,
        entity_id: input.entityId || null,
        reason: input.reason.trim(),
        created_by: input.createdBy || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async releaseHold(id: string) {
    const { error } = await db
      .from("legal_holds")
      .update({ released_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
