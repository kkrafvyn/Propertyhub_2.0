import { supabase } from "./supabase";
import { notificationService } from "./notification.service";

export const leaseWorkflowService = {
  async getRentSchedule(leaseId: string) {
    const { data, error } = await supabase
      .from("lease_rent_schedule")
      .select("*")
      .eq("lease_id", leaseId)
      .order("due_date", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async ensureRentSchedule(lease: {
    id: string;
    start_date: string;
    end_date?: string | null;
    rent_minor: number;
    currency?: string;
    next_rent_due_at?: string | null;
  }) {
    const existing = await this.getRentSchedule(lease.id);
    if (existing.length > 0) return existing;

    const rows: Array<{
      lease_id: string;
      due_date: string;
      amount_minor: number;
      currency: string;
      status: "upcoming" | "paid" | "overdue";
    }> = [];

    const start = new Date(`${lease.start_date}T00:00:00`);
    const end = lease.end_date
      ? new Date(`${lease.end_date}T00:00:00`)
      : new Date(start);
    if (!lease.end_date) {
      end.setMonth(end.getMonth() + 12);
    }

    const today = new Date().toISOString().slice(0, 10);

    for (let cursor = new Date(start); cursor <= end; cursor.setMonth(cursor.getMonth() + 1)) {
      const dueDate = cursor.toISOString().slice(0, 10);
      rows.push({
        lease_id: lease.id,
        due_date: dueDate,
        amount_minor: lease.rent_minor,
        currency: lease.currency || "GHS",
        status: dueDate < today ? "overdue" : "upcoming",
      });
      if (rows.length >= 12) break;
    }

    if (rows.length === 0) return [];

    const { data, error } = await supabase
      .from("lease_rent_schedule")
      .insert(rows)
      .select("*");

    if (error) throw error;

    const overdueRows = (data || []).filter((row) => row.status === "overdue");
    await Promise.all(
      overdueRows.map((row) =>
        notificationService.notifyRentDue(
          lease.id,
          row.due_date,
          row.amount_minor,
          row.currency || lease.currency || "GHS"
        )
      )
    );

    return data || [];
  },

  async requestRenewal(leaseId: string) {
    const { data, error } = await supabase
      .from("leases")
      .update({
        renewal_status: "requested",
        renewal_notice_at: new Date().toISOString(),
      })
      .eq("id", leaseId)
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyLeaseEvent(leaseId, "renewal_requested");

    return data;
  },

  async markLeaseSigned(leaseId: string) {
    const { data, error } = await supabase
      .from("leases")
      .update({
        signing_status: "signed",
        signed_at: new Date().toISOString(),
      })
      .eq("id", leaseId)
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyLeaseEvent(leaseId, "signed");

    return data;
  },

  async respondToRenewal(leaseId: string, status: "approved" | "declined") {
    const { data, error } = await supabase
      .from("leases")
      .update({ renewal_status: status })
      .eq("id", leaseId)
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyLeaseEvent(leaseId, "renewal_responded", {
      renewalStatus: status,
    });

    return data;
  },
};
