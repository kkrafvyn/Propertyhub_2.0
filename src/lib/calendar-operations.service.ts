import { supabase } from "./supabase";

function pad(num: number) {
  return String(num).padStart(2, "0");
}

function formatIcsDate(value: string) {
  const date = new Date(value);
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function createDownload(filename: string, content: string, mimeType: string) {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const calendarOperationsService = {
  async getAvailabilityRules(organizationId: string) {
    const { data, error } = await supabase
      .from("agent_availability_rules")
      .select("*, user:users(id, full_name, email)")
      .eq("organization_id", organizationId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async saveAvailabilityRule(input: {
    id?: string;
    organizationId: string;
    userId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    timezone?: string;
    bufferMinutes?: number;
    isActive?: boolean;
  }) {
    const payload = {
      organization_id: input.organizationId,
      user_id: input.userId,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      timezone: input.timezone || "Africa/Accra",
      buffer_minutes: input.bufferMinutes ?? 15,
      is_active: input.isActive ?? true,
    };

    if (input.id) {
      const { data, error } = await supabase
        .from("agent_availability_rules")
        .update(payload)
        .eq("id", input.id)
        .select("*")
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from("agent_availability_rules")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAvailabilityRule(id: string) {
    const { error } = await supabase.from("agent_availability_rules").delete().eq("id", id);
    if (error) throw error;
  },

  async getConnections(organizationId: string) {
    const { data, error } = await supabase
      .from("calendar_sync_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async upsertConnection(input: {
    organizationId: string;
    userId: string;
    provider: "google" | "outlook" | "ics";
    status: "pending" | "connected" | "error" | "disconnected";
    externalAccountEmail?: string;
    externalCalendarId?: string;
    connectionMetadata?: Record<string, unknown>;
  }) {
    const { data, error } = await supabase
      .from("calendar_sync_connections")
      .upsert(
        {
          organization_id: input.organizationId,
          user_id: input.userId,
          provider: input.provider,
          status: input.status,
          external_account_email: input.externalAccountEmail || null,
          external_calendar_id: input.externalCalendarId || null,
          connection_metadata: input.connectionMetadata || null,
          last_synced_at: input.status === "connected" ? new Date().toISOString() : null,
        },
        { onConflict: "organization_id,user_id,provider" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async createOrRefreshRescheduleLink(viewingId: string, createdByUserId: string, hours = 72) {
    const token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `reschedule-${Date.now()}`;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("viewing_reschedule_links")
      .upsert(
        {
          viewing_id: viewingId,
          created_by_user_id: createdByUserId,
          token,
          expires_at: expiresAt,
          used_at: null,
        },
        { onConflict: "viewing_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  buildRescheduleUrl(token: string) {
    if (typeof window === "undefined") return `/app/viewings?reschedule=${token}`;
    return `${window.location.origin}/app/viewings?reschedule=${token}`;
  },

  downloadViewingIcs(viewing: any) {
    const start = viewing.confirmed_datetime || viewing.requested_datetime;
    const durationMinutes = Number(viewing.duration_minutes || 45);
    const end = new Date(new Date(start).getTime() + durationMinutes * 60 * 1000).toISOString();
    const title = `Property Viewing - ${viewing.listing?.property?.address || "BaytMiftah"}`;
    const description = [
      `Lead: ${viewing.user?.full_name || viewing.user?.email || "Prospect"}`,
      `Status: ${viewing.status}`,
      viewing.requester_note ? `Notes: ${viewing.requester_note}` : null,
    ]
      .filter(Boolean)
      .join("\\n");
    const location = [
      viewing.listing?.property?.address,
      viewing.listing?.property?.city,
      viewing.listing?.property?.region,
    ]
      .filter(Boolean)
      .join(", ");

    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BaytMiftah//Viewing Scheduler//EN",
      "BEGIN:VEVENT",
      `UID:${viewing.id}@baytmiftah`,
      `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    createDownload(`viewing-${viewing.id}.ics`, content, "text/calendar;charset=utf-8");
  },
};
