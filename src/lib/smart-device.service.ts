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
    .select("id, lease_id, tenant_user_id, smart_access_enabled, smart_access_granted_at, smart_access_granted_by, smart_access_revoked_at, visitor_pass_enabled, energy_kwh, water_m3, announcements, emergency_contact")
    .eq("lease_id", leaseId)
    .maybeSingle();

  if (error) throw error;
  return data as ResidentHomeProfile | null;
}

export const smartDeviceService = {
  async getOrganizationDevices(organizationId: string) {
    const { data, error } = await (supabase as any)
      .from("smart_devices_safe")
      .select("id, organization_id, listing_id, lease_id, device_type, label, room, status, last_reading, created_at, updated_at")
      .eq("organization_id", organizationId)
      .order("label");

    if (error) throw error;
    return data || [];
  },

  async getListingDevices(listingId: string) {
    const { data, error } = await (supabase as any)
      .from("smart_devices_safe")
      .select("id, organization_id, listing_id, lease_id, device_type, label, room, status, last_reading, created_at, updated_at")
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

    const { data, error } = await (supabase as any)
      .from("smart_devices_safe")
      .select("id, organization_id, listing_id, lease_id, device_type, label, room, status, last_reading, created_at, updated_at")
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
    const { data, error } = await (supabase as any).rpc("grant_lease_smart_access", { p_lease_id: input.leaseId });

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
    const { data, error } = await (supabase as any).rpc("revoke_lease_smart_access", { p_lease_id: input.leaseId });

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
  }) {
    if (!input.organizationId) throw new Error("An organization is required to register a device.");
    const { data, error } = await (supabase as any).rpc("register_smart_device", {
      p_organization_id: input.organizationId,
      p_device_type: input.deviceType,
      p_label: input.label,
      p_listing_id: input.listingId || null,
      p_lease_id: input.leaseId || null,
      p_room: input.room || null,
    });

    if (error) throw error;
    return data as any;
  },

  async removeDevice(deviceId: string) {
    const { error } = await (supabase as any).rpc("remove_smart_device", { p_device_id: deviceId });
    if (error) throw error;
  },

  async updateReading(deviceId: string, reading: Record<string, unknown>, status?: string) {
    const { data, error } = await (supabase as any).rpc("append_smart_device_manual_note", {
      p_device_id: deviceId,
      p_note: `Admin-reported reading (not trusted telemetry): ${JSON.stringify({ reading, status })}`,
    });

    if (error) throw error;
    return data as any;
  },

  async getRecentEvents(deviceId: string, limit = 20) {
    const { data, error } = await (supabase as any)
      .from("smart_device_events_safe")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};
