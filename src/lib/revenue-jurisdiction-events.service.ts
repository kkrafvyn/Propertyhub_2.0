import { supabase } from "./supabase";
import type { CountryCode } from "./country-rules";

const db = supabase as any;

export type JurisdictionRevenueEventType =
  | "lease_esign_sent"
  | "lease_esign_completed"
  | "lease_esign_voided";

export type JurisdictionRevenueEvent = {
  id: string;
  organization_id: string;
  jurisdiction_id: string;
  subdivision_code: string | null;
  event_type: JurisdictionRevenueEventType;
  amount_minor: number;
  currency: string;
  lease_id: string | null;
  esignature_request_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export const revenueJurisdictionEventsService = {
  async record(input: {
    organizationId: string;
    jurisdictionId: CountryCode | string;
    subdivisionCode?: string | null;
    eventType: JurisdictionRevenueEventType;
    amountMinor?: number;
    currency?: string;
    leaseId?: string | null;
    esignatureRequestId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("revenue_jurisdiction_events")
      .insert({
        organization_id: input.organizationId,
        jurisdiction_id: input.jurisdictionId,
        subdivision_code: input.subdivisionCode?.toUpperCase() || null,
        event_type: input.eventType,
        amount_minor: input.amountMinor ?? 0,
        currency: input.currency || "GHS",
        lease_id: input.leaseId || null,
        esignature_request_id: input.esignatureRequestId || null,
        metadata: input.metadata || {},
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as JurisdictionRevenueEvent;
  },

  async getMonthlyBreakdown(organizationId: string, months = 1) {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await db
      .from("revenue_jurisdiction_events")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data || []) as JurisdictionRevenueEvent[];
    const map = new Map<
      string,
      { jurisdiction: string; sent: number; completed: number; amountMinor: number; count: number }
    >();

    for (const row of rows) {
      const label = row.subdivision_code
        ? `${row.jurisdiction_id} · ${row.subdivision_code}`
        : row.jurisdiction_id;
      const current = map.get(label) || {
        jurisdiction: label,
        sent: 0,
        completed: 0,
        amountMinor: 0,
        count: 0,
      };
      current.count += 1;
      if (row.event_type === "lease_esign_sent") current.sent += 1;
      if (row.event_type === "lease_esign_completed") {
        current.completed += 1;
        current.amountMinor += Number(row.amount_minor || 0);
      }
      map.set(label, current);
    }

    return [...map.values()].sort((a, b) => b.amountMinor - a.amountMinor);
  },

  async getEsignCompletionStats(organizationId: string) {
    const breakdown = await this.getMonthlyBreakdown(organizationId, 1);
    const totalCompleted = breakdown.reduce((sum, row) => sum + row.completed, 0);
    const totalSent = breakdown.reduce((sum, row) => sum + row.sent, 0);
    const attributedGmvMinor = breakdown.reduce((sum, row) => sum + row.amountMinor, 0);
    return { breakdown, totalCompleted, totalSent, attributedGmvMinor };
  },

  async getPlatformEsignStats(months = 1) {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await db
      .from("revenue_jurisdiction_events")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data || []) as JurisdictionRevenueEvent[];
    const map = new Map<
      string,
      { jurisdiction: string; sent: number; completed: number; amountMinor: number }
    >();

    for (const row of rows) {
      const label = row.subdivision_code
        ? `${row.jurisdiction_id} · ${row.subdivision_code}`
        : row.jurisdiction_id;
      const current = map.get(label) || {
        jurisdiction: label,
        sent: 0,
        completed: 0,
        amountMinor: 0,
      };
      if (row.event_type === "lease_esign_sent") current.sent += 1;
      if (row.event_type === "lease_esign_completed") {
        current.completed += 1;
        current.amountMinor += Number(row.amount_minor || 0);
      }
      map.set(label, current);
    }

    const breakdown = [...map.values()].sort((a, b) => b.amountMinor - a.amountMinor);
    return {
      breakdown,
      totalCompleted: breakdown.reduce((s, r) => s + r.completed, 0),
      totalSent: breakdown.reduce((s, r) => s + r.sent, 0),
      attributedGmvMinor: breakdown.reduce((s, r) => s + r.amountMinor, 0),
    };
  },
};
