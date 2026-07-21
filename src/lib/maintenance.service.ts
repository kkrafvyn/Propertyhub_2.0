import { supabase } from "./supabase";
import { notificationService } from "./notification.service";

export const maintenanceService = {
  async getTenantRequests(userId: string) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        lease:leases(
          id,
          listing:listings(property:properties(address, city))
        )
      `)
      .eq("tenant_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createRequest(input: {
    tenantUserId: string;
    organizationId: string;
    leaseId?: string | null;
    listingId?: string | null;
    title: string;
    description: string;
    priority?: "low" | "normal" | "high" | "urgent";
  }) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert({
        tenant_user_id: input.tenantUserId,
        organization_id: input.organizationId,
        lease_id: input.leaseId || null,
        listing_id: input.listingId || null,
        title: input.title,
        description: input.description,
        priority: input.priority || "normal",
      })
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyMaintenanceEvent(data.id, "created", {
      actorUserId: input.tenantUserId,
    });

    return data;
  },

  async assignVendor(requestId: string, vendorId: string) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .update({ vendor_id: vendorId, status: "in_progress" })
      .eq("id", requestId)
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyMaintenanceEvent(requestId, "status_updated", {
      status: "in_progress",
    });

    return data;
  },

  async updateRequestStatus(
    requestId: string,
    status: "open" | "in_progress" | "resolved" | "cancelled"
  ) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .update({ status })
      .eq("id", requestId)
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyMaintenanceEvent(requestId, "status_updated", {
      status,
    });

    return data;
  },

  async getOrganizationRequests(organizationId: string) {
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        tenant:users(full_name, email, phone),
        lease:leases(
          listing:listings(property:properties(address, city))
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
