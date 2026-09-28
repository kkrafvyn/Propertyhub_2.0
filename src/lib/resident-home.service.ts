import { supabase } from "./supabase";
import { smartDeviceService } from "./smart-device.service";

export const residentHomeService = {
  async getTenantProfile(userId: string) {
    const { data, error } = await supabase
      .from("resident_home_profiles")
      .select(`
        id,
        lease_id,
        tenant_user_id,
        smart_access_enabled,
        smart_access_granted_at,
        smart_access_granted_by,
        smart_access_revoked_at,
        visitor_pass_enabled,
        energy_kwh,
        water_m3,
        announcements,
        emergency_contact,
        updated_at,
        lease:leases(
          id,
          status,
          start_date,
          listing:listings(
            id,
            property:properties(address, city, region)
          ),
          organization:organizations(name, verified)
        )
      `)
      .eq("tenant_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    const profile = data as any;
    if (!profile?.lease?.id) return profile;

    const devices = profile.smart_access_enabled
      ? await smartDeviceService.getLeaseDevices(profile.lease.id).catch(() => [])
      : [];

    return { ...profile, devices };
  },

  async getActiveTenantProfile(userId: string) {
    const profile = await this.getTenantProfile(userId);
    if (!profile || profile.lease?.status !== "active") return null;
    return profile;
  },
};
