import { supabase } from "./supabase";

const db = supabase as any;

export const staffTimeService = {
  async listEntries(organizationId: string, userId?: string) {
    let query = db
      .from("staff_time_entries")
      .select("*")
      .eq("organization_id", organizationId)
      .order("work_date", { ascending: false })
      .limit(100);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async logTime(input: {
    organizationId: string;
    userId: string;
    minutes: number;
    workDate?: string;
    issueId?: string;
    notes?: string;
  }) {
    if (!Number.isFinite(input.minutes) || input.minutes <= 0) {
      throw new Error("Minutes must be a positive number");
    }
    const { data, error } = await db
      .from("staff_time_entries")
      .insert({
        organization_id: input.organizationId,
        user_id: input.userId,
        minutes: Math.round(input.minutes),
        work_date: input.workDate || new Date().toISOString().slice(0, 10),
        issue_id: input.issueId || null,
        notes: input.notes?.trim() || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};

export const maintenanceCalendarService = {
  async listEvents(organizationId: string) {
    const { data, error } = await db
      .from("maintenance_calendar_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    return data || [];
  },

  async createEvent(input: {
    organizationId: string;
    title: string;
    startsAt: string;
    endsAt?: string;
    estateId?: string;
    eventType?: string;
    createdBy?: string;
  }) {
    if (!input.title.trim()) throw new Error("Event title is required");
    const { data, error } = await db
      .from("maintenance_calendar_events")
      .insert({
        organization_id: input.organizationId,
        title: input.title.trim(),
        starts_at: input.startsAt,
        ends_at: input.endsAt || null,
        estate_id: input.estateId || null,
        event_type: input.eventType || "planned",
        created_by: input.createdBy || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};
