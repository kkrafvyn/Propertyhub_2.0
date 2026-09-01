import { supabase } from "./supabase";

export function validatePayAngelsSecretName(secretName: string) {
  if (!/^PAYANGELS_[A-Z0-9_]+$/.test(secretName.trim())) {
    throw new Error("Secret name must reference a PAYANGELS_* Edge Function secret");
  }
}

export const payAngelsCredentialsService = {
  async list(organizationId: string) {
    const { data, error } = await supabase.from("payment_provider_credentials").select("id, organization_id, provider, label, public_key_last4, status, created_at").eq("organization_id", organizationId).eq("provider", "payangels").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async saveReference(input: { organizationId: string; label: string; publicKeyLast4?: string; secretName: string; createdBy: string }) {
    if (!input.label.trim() || !input.secretName.trim()) throw new Error("Credential label and server secret name are required");
    validatePayAngelsSecretName(input.secretName);
    const { data, error } = await supabase.from("payment_provider_credentials").insert({ organization_id: input.organizationId, provider: "payangels", label: input.label.trim(), secret_name: input.secretName.trim(), public_key_last4: input.publicKeyLast4?.slice(-4) || null, created_by: input.createdBy }).select("id, organization_id, provider, label, public_key_last4, status, created_at").single();
    if (error) throw error;
    return data;
  },
};