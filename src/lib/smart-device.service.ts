import { supabase } from "./supabase";
import { communicationService } from "./communication.service";

export type SmartDeviceType =
  | "door_lock"
  | "thermostat"
  | "energy_meter"
  | "water_meter"
  | "camera"
  | "other";

export type ResidentHomeProfile = {
  id: string;
  lease_id: string;
  tenant_user_id: string;
  smart_access_enabled: boolean;
  smart_access_granted_at?: string | null;
  smart_access_granted_by?: string | null;
  smart_access_revoked_at?: string | null;
  door_access_code?: string | null;
  visitor_pass_enabled?: boolean;
  energy_kwh?: number | null;
  water_m3?: number | null;
  announcements?: unknown;
  emergency_contact?: string | null;
};

async function getResidentProfileByLease(leaseId: string) {
  const { data, error } = await supabase
    .from("resident_home_profiles")
    .select("*")
    .eq("lease_id", leaseId)
    .maybeSingle();

  if (error) throw error;
  return data as ResidentHomeProfile | null;
}

export const smartDeviceService = {
  async getOrganizationDevices(organizationId: string) {
    const { data, error } = await supabase
      .from("smart_devices")
      .select(`
        *,
        listing:listings(id, property:properties(address, city)),
        lease:leases(id, tenant:users(full_name, email))
      `)
      .eq("organization_id", organizationId)
      .order("label");

    if (error) throw error;
    return data || [];
  },

  async getListingDevices(listingId: string) {
    const { data, error } = await supabase
      .from("smart_devices")
      .select("*")
      .eq("listing_id", listingId)
      .order("label");

    if (error) throw error;
    return data || [];
  },

  async getLeaseDevices(leaseId: string) {
    const profile = await getResidentProfileByLease(leaseId);
    if (!profile?.smart_access_enabled) {
      return [];
    }

    const { data: lease, error: leaseError } = await supabase
      .from("leases")
      .select("id, listing_id")
      .eq("id", leaseId)
      .maybeSingle();

    if (leaseError) throw leaseError;
    if (!lease) return [];

    const filters = [`lease_id.eq.${leaseId}`];
    if (lease.listing_id) {
      filters.push(`listing_id.eq.${lease.listing_id}`);
    }

    const { data, error } = await supabase
      .from("smart_devices")
      .select("*")
      .or(filters.join(","))
      .order("label");

    if (error) throw error;
    return data || [];
  },

  async getLeaseAccessProfile(leaseId: string) {
    return getResidentProfileByLease(leaseId);
  },

  async grantTenantAccess(input: {
    leaseId: string;
    grantedBy: string;
    tenantUserId: string;
    organizationId: string;
  }) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("resident_home_profiles")
      .upsert(
        {
          lease_id: input.leaseId,
          tenant_user_id: input.tenantUserId,
          smart_access_enabled: true,
          smart_access_granted_at: now,
          smart_access_granted_by: input.grantedBy,
          smart_access_revoked_at: null,
          updated_at: now,
        },
        { onConflict: "lease_id" }
      )
      .select("*")
      .single();

    if (error) throw error;

    await communicationService
      .createInAppNotification({
        userId: input.tenantUserId,
        notificationType: "smart_property_access",
        subject: "Smart property access enabled",
        content:
          "Your property manager enabled smart building access. Open My Home to view devices and door codes.",
        actionUrl: "/app/home",
      })
      .catch((notifyError) => {
        console.error("Failed to notify tenant about smart access:", notifyError);
      });

    return data;
  },

  async revokeTenantAccess(input: { leaseId: string; revokedBy: string; tenantUserId: string }) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("resident_home_profiles")
      .update({
        smart_access_enabled: false,
        smart_access_revoked_at: now,
        smart_access_granted_by: input.revokedBy,
        updated_at: now,
      })
      .eq("lease_id", input.leaseId)
      .select("*")
      .single();

    if (error) throw error;

    await communicationService
      .createInAppNotification({
        userId: input.tenantUserId,
        notificationType: "smart_property_access",
        subject: "Smart property access revoked",
        content: "Your property manager revoked smart building access for this lease.",
        actionUrl: "/app/home",
      })
      .catch((notifyError) => {
        console.error("Failed to notify tenant about smart access revocation:", notifyError);
      });

    return data;
  },

  async registerDevice(input: {
    organizationId?: string | null;
    listingId?: string | null;
    leaseId?: string | null;
    deviceType: SmartDeviceType;
    label: string;
    room?: string;
    accessCode?: string;
  }) {
    const { data, error } = await supabase
      .from("smart_devices")
      .insert({
        organization_id: input.organizationId || null,
        listing_id: input.listingId || null,
        lease_id: input.leaseId || null,
        device_type: input.deviceType,
        label: input.label,
        room: input.room || null,
        access_code: input.accessCode || null,
        status: "online",
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async removeDevice(deviceId: string) {
    const { error } = await supabase.from("smart_devices").delete().eq("id", deviceId);
    if (error) throw error;
  },

  async updateReading(deviceId: string, reading: Record<string, unknown>, status?: string) {
    const { data, error } = await supabase
      .from("smart_devices")
      .update({
        last_reading: reading,
        status: status || "online",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deviceId)
      .select("*")
      .single();

    if (error) throw error;

    await supabase.from("smart_device_events").insert({
      device_id: deviceId,
      event_type: "reading_update",
      payload: reading,
    });

    return data;
  },

  async getRecentEvents(deviceId: string, limit = 20) {
    const { data, error } = await supabase
      .from("smart_device_events")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};
