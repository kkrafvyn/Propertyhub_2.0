import { supabase } from "./supabase";
import type { PlatformKycPolicy } from "./kyc-gate.service";

export const platformKycService = {
  async listPolicies() {
    const { data, error } = await supabase
      .from("platform_kyc_policies")
      .select("*")
      .eq("enabled", true)
      .order("label");

    if (error) throw error;
    return (data || []) as PlatformKycPolicy[];
  },

  async getPolicy(jurisdictionId: string) {
    const { data, error } = await supabase
      .from("platform_kyc_policies")
      .select("*")
      .eq("jurisdiction_id", jurisdictionId)
      .maybeSingle();

    if (error) throw error;
    return (data as PlatformKycPolicy | null) ?? null;
  },

  async updatePolicy(
    jurisdictionId: string,
    patch: Partial<
      Pick<
        PlatformKycPolicy,
        "consumer_booking_required" | "workspace_enrollment_required" | "provider_engine" | "enabled"
      >
    >,
  ) {
    const { data, error } = await supabase
      .from("platform_kyc_policies")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("jurisdiction_id", jurisdictionId)
      .select("*")
      .single();

    if (error) throw error;
    return data as PlatformKycPolicy;
  },
};
