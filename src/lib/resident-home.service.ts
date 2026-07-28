import { supabase } from "./supabase";
import { smartDeviceService } from "./smart-device.service";

export const residentHomeService = {
  async getTenantProfile(userId: string) {
    const { data, error } = await supabase
      .from("resident_home_profiles")
      .select(`
        *,
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
    if (!data?.lease?.id) return data;

    const devices = data.smart_access_enabled
      ? await smartDeviceService.getLeaseDevices(data.lease.id).catch(() => [])
      : [];

    return { ...data, devices };
  },

  async getActiveTenantProfile(userId: string) {
    const profile = await this.getTenantProfile(userId);
    if (!profile || profile.lease?.status !== "active") return null;
    return profile;
  },
};
