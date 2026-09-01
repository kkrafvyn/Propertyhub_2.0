import { supabase } from "./supabase";

const db = supabase as any;

export type ServiceCase = {
  id: string;
  organization_id: string;
  channel: "in_app" | "sms" | "email" | "whatsapp" | "phone" | "web";
  status: "open" | "triaged" | "assigned" | "waiting_customer" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  subject: string;
  summary: string | null;
  unit_id: string | null;
  created_at: string;
};

export const serviceDeskService = {
  async getCases(organizationId: string): Promise<ServiceCase[]> {
    const { data, error } = await db.from("service_cases").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async createCase(input: { organizationId: string; subject: string; summary?: string; channel: ServiceCase["channel"]; priority: ServiceCase["priority"] }) {
    const { data, error } = await db.from("service_cases").insert({ organization_id: input.organizationId, subject: input.subject.trim(), summary: input.summary?.trim() || null, channel: input.channel, priority: input.priority }).select("*").single();
    if (error) throw error;
    await db.from("service_case_events").insert({ case_id: data.id, event_type: "created", body: `Received through ${input.channel}` });
    return data as ServiceCase;
  },
  async updateStatus(id: string, status: ServiceCase["status"]) {
    const { data, error } = await db.from("service_cases").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
    if (error) throw error;
    await db.from("service_case_events").insert({ case_id: id, event_type: "status_changed", body: status });
    return data as ServiceCase;
  },
};
