import { supabase } from "./supabase";

export const operationalObservabilityService = {
  async record(input: { organizationId?: string; service: string; eventType: string; severity?: "debug" | "info" | "warning" | "error" | "critical"; message: string; correlationId?: string; metadata?: Record<string, unknown> }) {
    if (!input.service.trim() || !input.eventType.trim() || !input.message.trim()) throw new Error("Service, event type, and message are required");
    const { data, error } = await supabase.from("operational_events").insert({
      organization_id: input.organizationId || null,
      service: input.service.trim(),
      event_type: input.eventType.trim(),
      severity: input.severity || "info",
      message: input.message.trim(),
      correlation_id: input.correlationId || null,
      metadata: input.metadata || {},
    }).select("*").single();
    if (error) throw error;
    return data;
  },
  async listRecent(organizationId: string, limit = 50) {
    const { data, error } = await supabase.from("operational_events").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  },
};